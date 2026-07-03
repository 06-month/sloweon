/** RAG source types for rag_chunks.source_type */
export const RAG_SOURCE_TYPES = [
  "product",
  "product_detail",
  "size_guide",
  "review_summary",
  "shipping_policy",
  "return_policy",
  "refund_policy",
  "faq",
  "brand_guide",
] as const;

export type RagSourceType = (typeof RAG_SOURCE_TYPES)[number];

/** OpenAI text-embedding-3-small default dimension */
export const DEFAULT_EMBEDDING_DIMENSION = 1536;

export const DEFAULT_EMBEDDING_PROVIDER = "openai" as const;
export const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_GEMINI_EMBEDDING_MODEL = "text-embedding-004";

export const CONTENT_PREVIEW_MAX_LENGTH = 200;

function numberFromEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const RAG_RETRIEVAL_DEFAULT_TOP_K = numberFromEnv(
  "RAG_DEFAULT_TOP_K",
  5
);
export const RAG_PRODUCT_TOP_K = numberFromEnv("RAG_PRODUCT_TOP_K", 8);
export const RAG_POLICY_TOP_K = numberFromEnv("RAG_POLICY_TOP_K", 3);

export const RAG_SIMILARITY_THRESHOLD = numberFromEnv(
  "RAG_MIN_SIMILARITY",
  0.4
);
export const RAG_PRODUCT_SIMILARITY_THRESHOLD = numberFromEnv(
  "RAG_PRODUCT_MIN_SIMILARITY",
  0.38
);
export const RAG_POLICY_SIMILARITY_THRESHOLD = numberFromEnv(
  "RAG_POLICY_MIN_SIMILARITY",
  0.45
);

export const RAG_DIAGNOSTIC_LOW_WATERMARK = numberFromEnv(
  "RAG_DIAGNOSTIC_LOW_WATERMARK",
  0.2
);

export const RAG_SOURCE_TYPE_POLICIES: Record<
  RagSourceType,
  { topK: number; threshold: number }
> = {
  product: {
    topK: Math.max(2, Math.ceil(RAG_PRODUCT_TOP_K / 4)),
    threshold: RAG_PRODUCT_SIMILARITY_THRESHOLD,
  },
  product_detail: {
    topK: Math.max(2, Math.ceil(RAG_PRODUCT_TOP_K / 4)),
    threshold: RAG_PRODUCT_SIMILARITY_THRESHOLD,
  },
  size_guide: {
    topK: Math.max(2, Math.ceil(RAG_PRODUCT_TOP_K / 4)),
    threshold: RAG_PRODUCT_SIMILARITY_THRESHOLD,
  },
  review_summary: {
    topK: Math.max(2, Math.ceil(RAG_PRODUCT_TOP_K / 4)),
    threshold: RAG_PRODUCT_SIMILARITY_THRESHOLD,
  },
  shipping_policy: {
    topK: RAG_POLICY_TOP_K,
    threshold: RAG_POLICY_SIMILARITY_THRESHOLD,
  },
  return_policy: {
    topK: RAG_POLICY_TOP_K,
    threshold: RAG_POLICY_SIMILARITY_THRESHOLD,
  },
  refund_policy: {
    topK: RAG_POLICY_TOP_K,
    threshold: RAG_POLICY_SIMILARITY_THRESHOLD,
  },
  faq: {
    topK: RAG_RETRIEVAL_DEFAULT_TOP_K,
    threshold: RAG_SIMILARITY_THRESHOLD,
  },
  brand_guide: {
    topK: 2,
    threshold: RAG_SIMILARITY_THRESHOLD,
  },
};
