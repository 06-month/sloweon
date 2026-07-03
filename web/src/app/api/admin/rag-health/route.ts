import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateEmbedding,
  getEmbeddingConfig,
  EmbeddingError,
} from "@/lib/rag/embeddings";
import { DEFAULT_EMBEDDING_DIMENSION } from "@/lib/rag/constants";

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
      lastSyncTime: null as string | null,
      sampleRetrievalOk: false,
      sampleResults: [] as Array<{
        sourceType: string;
        title: string;
        similarity: number;
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
