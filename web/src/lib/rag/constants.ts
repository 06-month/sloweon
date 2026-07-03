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

export const RAG_RETRIEVAL_DEFAULT_TOP_K = 5;
export const RAG_POLICY_TOP_K = 3;
export const RAG_SIMILARITY_THRESHOLD = 0.4;
export const RAG_PRODUCT_SIMILARITY_THRESHOLD = 0.35;
