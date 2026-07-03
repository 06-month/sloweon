import { prisma } from "@/lib/db";
import { generateEmbedding } from "./embeddings";
import {
  CONTENT_PREVIEW_MAX_LENGTH,
  RAG_POLICY_TOP_K,
  RAG_PRODUCT_SIMILARITY_THRESHOLD,
  RAG_RETRIEVAL_DEFAULT_TOP_K,
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

async function vectorSearch(
  queryEmbedding: number[],
  options: RetrieveOptions
): Promise<RagContextItem[]> {
  const {
    topK = RAG_RETRIEVAL_DEFAULT_TOP_K,
    threshold = RAG_SIMILARITY_THRESHOLD,
    sourceType,
  } = options;

  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const rows: RawRagRow[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM match_rag_chunks($1::vector, $2::float, $3::int, $4::text)`,
    embeddingStr,
    threshold,
    topK,
    sourceType || null
  );

  return rows.map(mapRow);
}

export async function retrieveRagContext(
  query: string,
  options: RetrieveOptions = {}
): Promise<RagContextItem[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    return await vectorSearch(queryEmbedding, options);
  } catch (error) {
    console.error(
      "RAG retrieval error:",
      error instanceof Error ? error.message : "unknown"
    );
    return [];
  }
}

export async function retrievePolicyContext(
  query: string,
  category: "shipping_policy" | "return_policy" | "refund_policy" | "faq"
): Promise<RagContextItem[]> {
  return retrieveRagContext(query, {
    topK: RAG_POLICY_TOP_K,
    threshold: RAG_SIMILARITY_THRESHOLD,
    sourceType: category,
  });
}

export async function retrieveProductContext(
  query: string,
  options: { topK?: number } = {}
): Promise<RagContextItem[]> {
  const { topK = RAG_RETRIEVAL_DEFAULT_TOP_K } = options;
  const perType = Math.max(2, Math.ceil(topK / 4));

  try {
    const queryEmbedding = await generateEmbedding(query);
    const sourceTypes: RagSourceType[] = [
      "product",
      "product_detail",
      "size_guide",
      "review_summary",
    ];

    const batches = await Promise.all(
      sourceTypes.map((sourceType) =>
        vectorSearch(queryEmbedding, {
          topK: perType,
          threshold: RAG_PRODUCT_SIMILARITY_THRESHOLD,
          sourceType,
        })
      )
    );

    const merged = new Map<string, RagContextItem>();
    for (const batch of batches) {
      for (const item of batch) {
        const key = `${item.sourceType}:${item.sourceId}`;
        const existing = merged.get(key);
        if (!existing || item.score > existing.score) {
          merged.set(key, item);
        }
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  } catch (error) {
    console.error(
      "Product RAG retrieval error:",
      error instanceof Error ? error.message : "unknown"
    );
    return [];
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
