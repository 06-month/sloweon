-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- RAG Knowledge Base chunks table
CREATE TABLE IF NOT EXISTS rag_chunks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_type TEXT NOT NULL, -- product | product_detail | size_guide | review_summary | shipping_policy | return_policy | refund_policy | faq | brand_guide
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for similarity search
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_type ON rag_chunks (source_type);

-- Unique constraint for upsert by source
CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_chunks (source_type, source_id);

-- Similarity search function
CREATE OR REPLACE FUNCTION match_rag_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  filter_source_type text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  source_type text,
  source_id text,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    rc.id,
    rc.source_type,
    rc.source_id,
    rc.title,
    rc.content,
    rc.metadata,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM rag_chunks rc
  WHERE
    (filter_source_type IS NULL OR rc.source_type = filter_source_type)
    AND 1 - (rc.embedding <=> query_embedding) > match_threshold
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
$$;
