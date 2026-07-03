import { prisma } from "@/lib/db";
import { generateEmbedding } from "./embeddings";
import {
  CONTENT_PREVIEW_MAX_LENGTH,
  RAG_DIAGNOSTIC_LOW_WATERMARK,
  RAG_POLICY_TOP_K,
  RAG_POLICY_SIMILARITY_THRESHOLD,
  RAG_PRODUCT_TOP_K,
  RAG_RETRIEVAL_DEFAULT_TOP_K,
  RAG_SOURCE_TYPE_POLICIES,
  RAG_SIMILARITY_THRESHOLD,
  type RagSourceType,
} from "./constants";

export interface RagContextItem {
  sourceType: string;
  sourceId: string;
  title: string;
  score: number;
  contentPreview: string;
  metadata: Record<string, unknown>;
}

interface RawRagRow {
  id: string;
  source_type: string;
  source_id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
}

export interface RetrieveOptions {
  topK?: number;
  threshold?: number;
  sourceType?: RagSourceType | string;
}

export interface RagRejectedSource {
  sourceType: string;
  sourceId: string;
  title: string;
  score: number;
  contentPreview: string;
  reason: string;
  productId?: string | null;
}

export interface ProductEvidenceGroup {
  productId: string;
  bestScore: number;
  sourceTypes: string[];
  titles: string[];
  sources: RagContextItem[];
}

export interface RagRetrievalDiagnostics {
  rawRagResultsCount: number;
  acceptedRagResultsCount: number;
  groupedRagResultsCount: number;
  droppedLowScoreCount: number;
  deduplicatedCount: number;
  productGroupingCollapsedCount: number;
  lowScoreRagSources: RagRejectedSource[];
  rejectedRagSources: RagRejectedSource[];
  groupedProductEvidence: ProductEvidenceGroup[];
  groundingWarnings: string[];
  thresholds: Record<string, { topK: number; threshold: number }>;
}

export interface RagRetrievalResult {
  items: RagContextItem[];
  diagnostics: RagRetrievalDiagnostics;
}

function toContentPreview(content: string): string {
  const trimmed = content.replace(/\s+/g, " ").trim();
  if (trimmed.length <= CONTENT_PREVIEW_MAX_LENGTH) return trimmed;
  return trimmed.slice(0, CONTENT_PREVIEW_MAX_LENGTH - 3) + "...";
}

function mapRow(row: RawRagRow): RagContextItem {
  return {
    sourceType: row.source_type,
    sourceId: row.source_id,
    title: row.title,
    score: Number(row.similarity),
    contentPreview: toContentPreview(row.content),
    metadata: row.metadata || {},
  };
}

export function getRagProductId(item: {
  sourceType: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
}): string | null {
  const metadataProductId = item.metadata?.productId;
  if (typeof metadataProductId === "string" && metadataProductId.length > 0) {
    return metadataProductId;
  }

  if (item.sourceType === "product" && /^(top|bottom)_\d{2}$/i.test(item.sourceId)) {
    return item.sourceId.toLowerCase();
  }

  const sourceMatch = item.sourceId.match(/(?:detail|size|review)_((?:top|bottom)_\d{2})/i);
  return sourceMatch?.[1]?.toLowerCase() || null;
}

function toRejectedSource(
  item: RagContextItem,
  reason: string
): RagRejectedSource {
  return {
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    title: item.title,
    score: item.score,
    contentPreview: item.contentPreview,
    reason,
    productId: getRagProductId(item),
  };
}

function emptyDiagnostics(
  thresholds: Record<string, { topK: number; threshold: number }> = {},
  warning?: string
): RagRetrievalDiagnostics {
  return {
    rawRagResultsCount: 0,
    acceptedRagResultsCount: 0,
    groupedRagResultsCount: 0,
    droppedLowScoreCount: 0,
    deduplicatedCount: 0,
    productGroupingCollapsedCount: 0,
    lowScoreRagSources: [],
    rejectedRagSources: [],
    groupedProductEvidence: [],
    groundingWarnings: warning ? [warning] : [],
    thresholds,
  };
}

export function groupProductEvidence(
  items: RagContextItem[]
): ProductEvidenceGroup[] {
  const groups = new Map<string, ProductEvidenceGroup>();

  for (const item of items) {
    const productId = getRagProductId(item);
    if (!productId) continue;

    const existing = groups.get(productId);
    if (!existing) {
      groups.set(productId, {
        productId,
        bestScore: item.score,
        sourceTypes: [item.sourceType],
        titles: [item.title],
        sources: [item],
      });
      continue;
    }

    existing.bestScore = Math.max(existing.bestScore, item.score);
    existing.sources.push(item);
    if (!existing.sourceTypes.includes(item.sourceType)) {
      existing.sourceTypes.push(item.sourceType);
    }
    if (!existing.titles.includes(item.title)) {
      existing.titles.push(item.title);
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.bestScore - a.bestScore);
}

async function vectorSearchDetailed(
  queryEmbedding: number[],
  options: RetrieveOptions
): Promise<{
  accepted: RagContextItem[];
  raw: RagContextItem[];
  lowScore: RagContextItem[];
  thresholds: Record<string, { topK: number; threshold: number }>;
}> {
  const {
    topK = RAG_RETRIEVAL_DEFAULT_TOP_K,
    threshold = RAG_SIMILARITY_THRESHOLD,
    sourceType,
  } = options;

  const fetchK = Math.min(30, Math.max(topK * 3, topK + 5));
  const diagnosticThreshold = Math.min(
    threshold,
    Math.max(RAG_DIAGNOSTIC_LOW_WATERMARK, threshold - 0.15)
  );
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const rows: RawRagRow[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM match_rag_chunks($1::vector, $2::float, $3::int, $4::text)`,
    embeddingStr,
    diagnosticThreshold,
    fetchK,
    sourceType || null
  );

  const raw = rows.map(mapRow).sort((a, b) => b.score - a.score);
  const accepted = raw.filter((item) => item.score >= threshold).slice(0, topK);
  const lowScore = raw.filter((item) => item.score < threshold);
  const thresholdKey = sourceType || "all";

  return {
    accepted,
    raw,
    lowScore,
    thresholds: {
      [thresholdKey]: { topK, threshold },
    },
  };
}

function buildDetailedResult(params: {
  accepted: RagContextItem[];
  raw: RagContextItem[];
  lowScore: RagContextItem[];
  thresholds: Record<string, { topK: number; threshold: number }>;
  deduplicatedCount?: number;
  productEvidence?: ProductEvidenceGroup[];
  warnings?: string[];
}): RagRetrievalResult {
  const groupedProductEvidence =
    params.productEvidence ?? groupProductEvidence(params.accepted);
  const lowScoreRagSources = params.lowScore.map((item) =>
    toRejectedSource(item, "LOW_SIMILARITY")
  );
  const groundingWarnings = [...(params.warnings ?? [])];

  if (params.raw.length > 0 && params.accepted.length === 0) {
    groundingWarnings.push("RAG results existed but all were below threshold.");
  }
  if (params.raw.length === 0) {
    groundingWarnings.push("No RAG sources retrieved.");
  }

  return {
    items: params.accepted,
    diagnostics: {
      rawRagResultsCount: params.raw.length,
      acceptedRagResultsCount: params.accepted.length,
      groupedRagResultsCount:
        groupedProductEvidence.length > 0
          ? groupedProductEvidence.length
          : params.accepted.length,
      droppedLowScoreCount: params.lowScore.length,
      deduplicatedCount: params.deduplicatedCount ?? 0,
      productGroupingCollapsedCount:
        groupedProductEvidence.length > 0
          ? Math.max(0, params.accepted.length - groupedProductEvidence.length)
          : 0,
      lowScoreRagSources,
      rejectedRagSources: [...lowScoreRagSources],
      groupedProductEvidence,
      groundingWarnings,
      thresholds: params.thresholds,
    },
  };
}

export async function retrieveRagContext(
  query: string,
  options: RetrieveOptions = {}
): Promise<RagContextItem[]> {
  const result = await retrieveRagContextDetailed(query, options);
  return result.items;
}

export async function retrieveRagContextDetailed(
  query: string,
  options: RetrieveOptions = {}
): Promise<RagRetrievalResult> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const detailed = await vectorSearchDetailed(queryEmbedding, options);
    return buildDetailedResult({
      accepted: detailed.accepted,
      raw: detailed.raw,
      lowScore: detailed.lowScore,
      thresholds: detailed.thresholds,
    });
  } catch (error) {
    console.error(
      "RAG retrieval error:",
      error instanceof Error ? error.message : "unknown"
    );
    return {
      items: [],
      diagnostics: emptyDiagnostics({}, "RAG retrieval failed."),
    };
  }
}

export async function retrievePolicyContext(
  query: string,
  category: "shipping_policy" | "return_policy" | "refund_policy" | "faq"
): Promise<RagContextItem[]> {
  const result = await retrievePolicyContextDetailed(query, category);
  return result.items;
}

export async function retrievePolicyContextDetailed(
  query: string,
  category: "shipping_policy" | "return_policy" | "refund_policy" | "faq"
): Promise<RagRetrievalResult> {
  const policy = RAG_SOURCE_TYPE_POLICIES[category] || {
    topK: RAG_POLICY_TOP_K,
    threshold: RAG_POLICY_SIMILARITY_THRESHOLD,
  };
  return retrieveRagContextDetailed(query, {
    topK: policy.topK,
    threshold: policy.threshold,
    sourceType: category,
  });
}

export async function retrieveProductContext(
  query: string,
  options: { topK?: number } = {}
): Promise<RagContextItem[]> {
  const result = await retrieveProductContextDetailed(query, options);
  return result.items;
}

export async function retrieveProductContextDetailed(
  query: string,
  options: { topK?: number } = {}
): Promise<RagRetrievalResult> {
  const { topK = RAG_PRODUCT_TOP_K } = options;

  try {
    const queryEmbedding = await generateEmbedding(query);
    const sourceTypes: RagSourceType[] = [
      "product",
      "product_detail",
      "size_guide",
      "review_summary",
    ];

    const batches = await Promise.all(
      sourceTypes.map((sourceType) => {
        const policy = RAG_SOURCE_TYPE_POLICIES[sourceType];
        return vectorSearchDetailed(queryEmbedding, {
          topK: policy.topK,
          threshold: policy.threshold,
          sourceType,
        });
      })
    );

    const raw = batches.flatMap((batch) => batch.raw);
    const lowScore = batches.flatMap((batch) => batch.lowScore);
    const acceptedBeforeDedupe = batches
      .flatMap((batch) => batch.accepted)
      .sort((a, b) => b.score - a.score);
    const merged = new Map<string, RagContextItem>();

    for (const item of acceptedBeforeDedupe) {
      const key = `${item.sourceType}:${item.sourceId}`;
      const existing = merged.get(key);
      if (!existing || item.score > existing.score) {
        merged.set(key, item);
      }
    }

    const accepted = Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    const groupedProductEvidence = groupProductEvidence(accepted);
    const thresholds = batches.reduce<Record<string, { topK: number; threshold: number }>>(
      (acc, batch) => ({ ...acc, ...batch.thresholds }),
      {}
    );

    return buildDetailedResult({
      accepted,
      raw,
      lowScore,
      thresholds,
      deduplicatedCount: Math.max(
        0,
        acceptedBeforeDedupe.length - merged.size
      ),
      productEvidence: groupedProductEvidence,
      warnings:
        accepted.length > 0 && groupedProductEvidence.length === 0
          ? ["Product RAG sources did not include matchable productId metadata."]
          : [],
    });
  } catch (error) {
    console.error(
      "Product RAG retrieval error:",
      error instanceof Error ? error.message : "unknown"
    );
    return {
      items: [],
      diagnostics: emptyDiagnostics({}, "Product RAG retrieval failed."),
    };
  }
}

/** Hybrid: DB structured filter + RAG semantic search for product queries */
export interface ProductFilterHints {
  categorySlug?: string;
  color?: string;
  maxPrice?: number;
  query?: string;
}

export function parseProductFiltersFromMessage(
  message: string
): ProductFilterHints {
  const normalized = message.toLowerCase();
  const hints: ProductFilterHints = { query: message };

  if (
    normalized.includes("상의") ||
    normalized.includes("셔츠") ||
    normalized.includes("티셔츠") ||
    normalized.includes("아우터")
  ) {
    hints.categorySlug = "top";
  } else if (
    normalized.includes("하의") ||
    normalized.includes("바지") ||
    normalized.includes("팬츠") ||
    normalized.includes("슬랙스")
  ) {
    hints.categorySlug = "bottom";
  }

  const colorMap: Record<string, string> = {
    차콜: "Charcoal",
    블랙: "Black",
    네이비: "Navy",
    그레이: "Grey",
    카키: "Khaki",
    베이지: "Beige",
    화이트: "White",
    charcoal: "Charcoal",
    black: "Black",
    navy: "Navy",
    grey: "Grey",
    khaki: "Khaki",
    beige: "Beige",
    white: "White",
  };
  for (const [keyword, color] of Object.entries(colorMap)) {
    if (normalized.includes(keyword)) {
      hints.color = color;
      break;
    }
  }

  const priceMatch = message.match(/(\d+)\s*만\s*원\s*이하/);
  if (priceMatch) {
    hints.maxPrice = parseInt(priceMatch[1], 10) * 10000;
  } else {
    const wonMatch = message.match(/(\d{4,})\s*원\s*이하/);
    if (wonMatch) {
      hints.maxPrice = parseInt(wonMatch[1], 10);
    }
  }

  return hints;
}

export async function getRagChunkStats(): Promise<{
  totalChunks: number;
  bySourceType: Array<{ source_type: string; count: bigint }>;
  lastUpdated: string | null;
}> {
  try {
    const totalResult: Array<{ count: bigint }> = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM rag_chunks`
    );
    const totalChunks = Number(totalResult[0]?.count || 0);

    const bySourceType: Array<{ source_type: string; count: bigint }> =
      await prisma.$queryRawUnsafe(
        `SELECT source_type, COUNT(*) as count FROM rag_chunks GROUP BY source_type ORDER BY count DESC`
      );

    const lastResult: Array<{ updated_at: Date }> = await prisma.$queryRawUnsafe(
      `SELECT updated_at FROM rag_chunks ORDER BY updated_at DESC LIMIT 1`
    );
    const lastUpdated = lastResult[0]?.updated_at?.toISOString() || null;

    return { totalChunks, bySourceType, lastUpdated };
  } catch (error) {
    console.error(
      "RAG stats error:",
      error instanceof Error ? error.message : "unknown"
    );
    return { totalChunks: 0, bySourceType: [], lastUpdated: null };
  }
}
