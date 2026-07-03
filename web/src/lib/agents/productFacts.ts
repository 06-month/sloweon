import { prisma } from "@/lib/db";
import type { ProductCandidate } from "./productAnswer";
import {
  getRagProductId,
  type RagContextItem,
  type RagRejectedSource,
  type RagRetrievalDiagnostics,
} from "../rag/retriever";

export interface ProductFactPack {
  productId: string;
  name: string;
  koreanName: string;
  priceKrw: number;
  category: string;
  color: string;
  material: string;
  fit: string;
  description: string;
  stockSummary: {
    inStock: boolean;
    totalStock: number;
    availableOptions: string[];
  };
  productUrl: string;
  sizeSpecs: Array<{
    size: string;
    totalLength?: number | null;
    shoulder?: number | null;
    chest?: number | null;
    sleeve?: number | null;
    waist?: number | null;
    rise?: number | null;
    thigh?: number | null;
    hem?: number | null;
  }>;
  modelFit?: {
    modelName: string;
    height: number;
    weight: number;
    wearingSize: string;
    fitComment: string;
  } | null;
  reviewFitSummary?: string | null;
  ragEvidenceTitles: string[];
  ragEvidencePreview: string[];
}

export interface ProductFactPackBuildResult {
  productFactPacks: ProductFactPack[];
  dbFactsUsed: string[];
  ragSourcesUsed: RagRejectedSource[];
  rejectedRagSources: RagRejectedSource[];
  groundingWarnings: string[];
}

const PRODUCT_RAG_SOURCE_TYPES = new Set([
  "product",
  "product_detail",
  "size_guide",
  "review_summary",
]);

function toTraceSource(
  item: RagContextItem,
  reason: string
): RagRejectedSource {
  return {
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    title: item.title,
    score: item.score,
    contentPreview: item.contentPreview,
    productId: getRagProductId(item),
    reason,
  };
}

function summarizeReviewFit(params: {
  ragEvidence: RagContextItem[];
  reviews: Array<{ fitFeedback: string }>;
}): string | null {
  const reviewEvidence = params.ragEvidence.find(
    (item) => item.sourceType === "review_summary"
  );
  if (reviewEvidence) return reviewEvidence.contentPreview;

  if (params.reviews.length === 0) return null;

  const counts = { SMALL: 0, JUST: 0, LARGE: 0 };
  for (const review of params.reviews) {
    if (review.fitFeedback in counts) {
      counts[review.fitFeedback as keyof typeof counts]++;
    }
  }

  return `리뷰 핏 피드백: 작아요 ${counts.SMALL}명, 정사이즈 ${counts.JUST}명, 커요 ${counts.LARGE}명`;
}

export async function buildProductFactPacks(params: {
  dbCandidates: ProductCandidate[];
  ragContext: RagContextItem[];
  ragDiagnostics?: RagRetrievalDiagnostics;
}): Promise<ProductFactPackBuildResult> {
  const candidateIds = [
    ...new Set(params.dbCandidates.map((candidate) => candidate.id)),
  ];

  if (candidateIds.length === 0) {
    return {
      productFactPacks: [],
      dbFactsUsed: [],
      ragSourcesUsed: [],
      rejectedRagSources: params.ragContext
        .filter((item) => PRODUCT_RAG_SOURCE_TYPES.has(item.sourceType))
        .map((item) => toTraceSource(item, "NO_DB_PRODUCT_CANDIDATES")),
      groundingWarnings: ["DB product search returned no candidates."],
    };
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: candidateIds },
      status: "ON_SALE",
      variants: {
        some: {
          stock: { gt: 0 },
          status: "ON_SALE",
        },
      },
    },
    include: {
      variants: {
        select: {
          colorName: true,
          size: true,
          stock: true,
          status: true,
        },
      },
      sizeSpecs: true,
      modelFit: true,
      reviews: {
        where: { status: "PUBLISHED" },
        select: { fitFeedback: true },
      },
    },
  });

  const productById = new Map(products.map((product) => [product.id, product]));
  const sortedProducts = candidateIds
    .map((id) => productById.get(id))
    .filter((product): product is NonNullable<typeof product> => !!product);
  const validProductIds = new Set(sortedProducts.map((product) => product.id));
  const ragByProductId = new Map<string, RagContextItem[]>();
  const rejectedRagSources: RagRejectedSource[] = [
    ...(params.ragDiagnostics?.rejectedRagSources ?? []),
  ];
  const ragSourcesUsed: RagRejectedSource[] = [];

  for (const item of params.ragContext) {
    if (!PRODUCT_RAG_SOURCE_TYPES.has(item.sourceType)) continue;

    const productId = getRagProductId(item);
    if (!productId) {
      rejectedRagSources.push(toTraceSource(item, "RAG_PRODUCT_ID_NOT_MATCHED"));
      continue;
    }

    if (!validProductIds.has(productId)) {
      rejectedRagSources.push(
        toTraceSource(item, "RAG_PRODUCT_NOT_IN_DB_FACT_PACK")
      );
      continue;
    }

    const bucket = ragByProductId.get(productId) ?? [];
    bucket.push(item);
    ragByProductId.set(productId, bucket);
    ragSourcesUsed.push(toTraceSource(item, "USED_AS_RAG_EVIDENCE"));
  }

  const productFactPacks = sortedProducts
    .map((product) => {
      const availableVariants = product.variants.filter(
        (variant) => variant.status === "ON_SALE" && variant.stock > 0
      );
      const totalStock = availableVariants.reduce(
        (sum, variant) => sum + variant.stock,
        0
      );
      const ragEvidence = ragByProductId
        .get(product.id)
        ?.sort((a, b) => b.score - a.score) ?? [];

      return {
        productId: product.id,
        name: product.name,
        koreanName: product.koreanName,
        priceKrw: product.price,
        category: product.categorySlug,
        color: product.color,
        material: product.material,
        fit: product.fit,
        description: product.shortDescription || product.designNotes,
        stockSummary: {
          inStock: totalStock > 0,
          totalStock,
          availableOptions: availableVariants.map(
            (variant) => `${variant.colorName} ${variant.size}`
          ),
        },
        productUrl: `/products/${product.id}`,
        sizeSpecs: product.sizeSpecs
          .map((spec) => ({
            size: spec.size,
            totalLength: spec.totalLength,
            shoulder: spec.shoulder,
            chest: spec.chest,
            sleeve: spec.sleeve,
            waist: spec.waist,
            rise: spec.rise,
            thigh: spec.thigh,
            hem: spec.hem,
          }))
          .sort((a, b) => a.size.localeCompare(b.size)),
        modelFit: product.modelFit
          ? {
              modelName: product.modelFit.modelName,
              height: product.modelFit.height,
              weight: product.modelFit.weight,
              wearingSize: product.modelFit.wearingSize,
              fitComment: product.modelFit.fitComment,
            }
          : null,
        reviewFitSummary: summarizeReviewFit({
          ragEvidence,
          reviews: product.reviews,
        }),
        ragEvidenceTitles: ragEvidence.map((item) => item.title),
        ragEvidencePreview: ragEvidence.map((item) => item.contentPreview),
      } satisfies ProductFactPack;
    })
    .filter((pack) => pack.stockSummary.inStock);

  const dbFactsUsed = productFactPacks.flatMap((pack) => [
    `${pack.productId}.name`,
    `${pack.productId}.price`,
    `${pack.productId}.status`,
    `${pack.productId}.variants.stock`,
    `${pack.productId}.productUrl`,
  ]);

  const groundingWarnings = [
    ...(params.ragDiagnostics?.groundingWarnings ?? []),
  ];

  if (productFactPacks.length === 0) {
    groundingWarnings.push("No in-stock DB products survived ProductFactPack filtering.");
  }
  if (params.ragContext.length > 0 && ragSourcesUsed.length === 0) {
    groundingWarnings.push("RAG sources were retrieved but none matched DB product facts.");
  }

  return {
    productFactPacks,
    dbFactsUsed,
    ragSourcesUsed,
    rejectedRagSources,
    groundingWarnings,
  };
}
