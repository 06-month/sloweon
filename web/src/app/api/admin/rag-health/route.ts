import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateEmbedding,
  getEmbeddingConfig,
  EmbeddingError,
} from "@/lib/rag/embeddings";
import {
  DEFAULT_EMBEDDING_DIMENSION,
  RAG_DIAGNOSTIC_LOW_WATERMARK,
  RAG_POLICY_SIMILARITY_THRESHOLD,
  RAG_POLICY_TOP_K,
  RAG_PRODUCT_SIMILARITY_THRESHOLD,
  RAG_PRODUCT_TOP_K,
  RAG_RETRIEVAL_DEFAULT_TOP_K,
  RAG_SOURCE_TYPE_POLICIES,
  RAG_SIMILARITY_THRESHOLD,
} from "@/lib/rag/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const isDev = process.env.NODE_ENV === "development";
    const isEnabled = process.env.ADMIN_TRACE_VIEWER_ENABLED === "true";
    if (!isDev && !isEnabled) {
      return NextResponse.json(
        { error: "Access Denied: RAG Health API is restricted." },
        { status: 403 }
      );
    }

    const embeddingConfig = getEmbeddingConfig();

    const healthReport: Record<string, unknown> = {
      pgvectorExtension: false,
      ragChunksTableExists: false,
      totalChunks: 0,
      chunksBySourceType: [] as Array<{ sourceType: string; count: number }>,
      embeddingDimension: null as number | null,
      embeddingProvider: embeddingConfig.provider,
      embeddingModel:
        embeddingConfig.provider === "gemini"
          ? embeddingConfig.geminiModel
          : embeddingConfig.openAiModel,
      expectedDimension: DEFAULT_EMBEDDING_DIMENSION,
      embeddingDimensionMismatch: false,
      lastSyncTime: null as string | null,
      recentSyncSummary: null as null | {
        lastSyncTime: string | null;
        totalChunks: number;
        chunksBySourceType: Array<{ sourceType: string; count: number }>;
      },
      retrievalThresholds: {
        defaultTopK: RAG_RETRIEVAL_DEFAULT_TOP_K,
        productTopK: RAG_PRODUCT_TOP_K,
        policyTopK: RAG_POLICY_TOP_K,
        minSimilarity: RAG_SIMILARITY_THRESHOLD,
        productMinSimilarity: RAG_PRODUCT_SIMILARITY_THRESHOLD,
        policyMinSimilarity: RAG_POLICY_SIMILARITY_THRESHOLD,
        diagnosticLowWatermark: RAG_DIAGNOSTIC_LOW_WATERMARK,
        sourceTypePolicies: RAG_SOURCE_TYPE_POLICIES,
      },
      sampleRetrievalOk: false,
      sampleResults: [] as Array<{
        sourceType: string;
        title: string;
        similarity: number;
      }>,
      sourceTypeSimilaritySamples: [] as Array<{
        sourceType: string;
        avgSimilarity: number;
        sampleCount: number;
      }>,
      productIdMatchSamples: [] as Array<{
        sourceType: string;
        sourceId: string;
        title: string;
        productId: string | null;
        dbProductExists: boolean;
      }>,
      errors: [] as string[],
    };

    try {
      const extResult: Array<{ extname: string }> = await prisma.$queryRawUnsafe(
        `SELECT extname FROM pg_extension WHERE extname = 'vector'`
      );
      healthReport.pgvectorExtension = extResult.length > 0;
    } catch {
      (healthReport.errors as string[]).push("pgvector extension check failed");
    }

    try {
      const countResult: Array<{ count: bigint }> = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM rag_chunks`
      );
      healthReport.ragChunksTableExists = true;
      healthReport.totalChunks = Number(countResult[0]?.count || 0);
    } catch {
      (healthReport.errors as string[]).push("rag_chunks table not found");
    }

    if (healthReport.ragChunksTableExists) {
      try {
        const byType: Array<{ source_type: string; count: bigint }> =
          await prisma.$queryRawUnsafe(
            `SELECT source_type, COUNT(*) as count FROM rag_chunks GROUP BY source_type ORDER BY count DESC`
          );
        healthReport.chunksBySourceType = byType.map((r) => ({
          sourceType: r.source_type,
          count: Number(r.count),
        }));
      } catch {
        (healthReport.errors as string[]).push("chunk stats query failed");
      }

      try {
        const dimResult: Array<{ dim: number }> = await prisma.$queryRawUnsafe(
          `SELECT vector_dims(embedding) as dim FROM rag_chunks WHERE embedding IS NOT NULL LIMIT 1`
        );
        healthReport.embeddingDimension = dimResult[0]?.dim ?? null;
        healthReport.embeddingDimensionMismatch =
          healthReport.embeddingDimension !== null &&
          healthReport.embeddingDimension !== DEFAULT_EMBEDDING_DIMENSION;
      } catch {
        (healthReport.errors as string[]).push("embedding dimension check failed");
      }

      try {
        const lastResult: Array<{ updated_at: Date }> =
          await prisma.$queryRawUnsafe(
            `SELECT updated_at FROM rag_chunks ORDER BY updated_at DESC LIMIT 1`
          );
        healthReport.lastSyncTime =
          lastResult[0]?.updated_at?.toISOString() ?? null;
        healthReport.recentSyncSummary = {
          lastSyncTime: healthReport.lastSyncTime as string | null,
          totalChunks: healthReport.totalChunks as number,
          chunksBySourceType: healthReport.chunksBySourceType as Array<{
            sourceType: string;
            count: number;
          }>,
        };
      } catch {
        (healthReport.errors as string[]).push("last sync time query failed");
      }

      if ((healthReport.totalChunks as number) > 0) {
        try {
          const testEmbedding = await generateEmbedding("셔츠 추천");
          const embStr = `[${testEmbedding.join(",")}]`;
          const testResults: Array<{
            source_type: string;
            title: string;
            similarity: number;
          }> = await prisma.$queryRawUnsafe(
            `SELECT source_type, title, 1 - (embedding <=> $1::vector) as similarity
             FROM rag_chunks ORDER BY embedding <=> $1::vector LIMIT 3`,
            embStr
          );
          healthReport.sampleRetrievalOk = testResults.length > 0;
          healthReport.sampleResults = testResults.map((r) => ({
            sourceType: r.source_type,
            title: r.title,
            similarity: parseFloat(Number(r.similarity).toFixed(4)),
          }));

          const sourceTypeSamples: Array<{
            source_type: string;
            avg_similarity: number;
            sample_count: bigint;
          }> = await prisma.$queryRawUnsafe(
            `WITH ranked AS (
               SELECT source_type,
                      1 - (embedding <=> $1::vector) as similarity,
                      row_number() OVER (PARTITION BY source_type ORDER BY embedding <=> $1::vector) as rn
               FROM rag_chunks
               WHERE embedding IS NOT NULL
             )
             SELECT source_type, AVG(similarity) as avg_similarity, COUNT(*) as sample_count
             FROM ranked
             WHERE rn <= 3
             GROUP BY source_type
             ORDER BY source_type`,
            embStr
          );
          healthReport.sourceTypeSimilaritySamples = sourceTypeSamples.map(
            (r) => ({
              sourceType: r.source_type,
              avgSimilarity: parseFloat(Number(r.avg_similarity).toFixed(4)),
              sampleCount: Number(r.sample_count),
            })
          );

          const productIdSamples: Array<{
            source_type: string;
            source_id: string;
            title: string;
            product_id: string | null;
            db_product_exists: boolean;
          }> = await prisma.$queryRawUnsafe(
            `SELECT rc.source_type,
                    rc.source_id,
                    rc.title,
                    rc.metadata->>'productId' as product_id,
                    (p.id IS NOT NULL) as db_product_exists
             FROM rag_chunks rc
             LEFT JOIN "Product" p ON p.id = rc.metadata->>'productId'
             WHERE rc.source_type IN ('product', 'product_detail', 'size_guide', 'review_summary')
             ORDER BY rc.source_type, rc.source_id
             LIMIT 12`
          );
          healthReport.productIdMatchSamples = productIdSamples.map((r) => ({
            sourceType: r.source_type,
            sourceId: r.source_id,
            title: r.title,
            productId: r.product_id,
            dbProductExists: Boolean(r.db_product_exists),
          }));
        } catch (err) {
          const code =
            err instanceof EmbeddingError
              ? err.errorCode
              : "EMBEDDING_REQUEST_FAILED";
          (healthReport.errors as string[]).push(
            `sample retrieval failed: ${code}`
          );
        }
      }
    }

    return NextResponse.json(healthReport);
  } catch {
    return NextResponse.json(
      { error: "RAG health check failed" },
      { status: 500 }
    );
  }
}
