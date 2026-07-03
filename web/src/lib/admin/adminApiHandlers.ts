import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTraces } from "@/lib/agents/trace";
import { generateGeminiText } from "@/lib/llm/providers/gemini";
import { generateClaudeText } from "@/lib/llm/providers/claude";
import { generateSkAxText } from "@/lib/llm/providers/sk-ax";
import { generateOpenAiText } from "@/lib/llm/providers/openai";
import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_SK_AX_MODEL,
} from "@/lib/llm/constants";
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
import { syncRagChunks } from "@/lib/rag/sync";

const ADMIN_ACTIONS = ["rag-health", "llm-health", "traces", "rag-sync"] as const;
type AdminAction = (typeof ADMIN_ACTIONS)[number];

function getAction(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get("action");
}

function isAdminDebugAllowed() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ADMIN_TRACE_VIEWER_ENABLED === "true"
  );
}

function adminDebugForbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function methodNotAllowed(message = "Method Not Allowed") {
  return NextResponse.json({ error: message }, { status: 405 });
}

function unsupportedActionResponse(action: string | null) {
  return NextResponse.json(
    {
      error: action ? `Unsupported admin action: ${action}` : "Missing admin action",
      supportedActions: ADMIN_ACTIONS,
    },
    { status: 400 }
  );
}

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

function isRagSyncAuthorized(request: NextRequest): boolean {
  const secret = process.env.RAG_SYNC_SECRET;
  const token = extractBearerToken(request);

  if (process.env.NODE_ENV === "production") {
    return Boolean(secret && token && token === secret);
  }

  if (secret) {
    return token === secret;
  }

  return true;
}

export async function handleAdminGet(request: NextRequest) {
  const action = getAction(request);

  switch (action as AdminAction | null) {
    case "rag-health":
      return handleRagHealth();
    case "llm-health":
      return handleLlmHealth();
    case "traces":
      return handleTraces();
    case "rag-sync":
      return methodNotAllowed("Use POST /api/admin?action=rag-sync");
    default:
      return unsupportedActionResponse(action);
  }
}

export async function handleAdminPost(request: NextRequest) {
  const action = getAction(request);

  switch (action as AdminAction | null) {
    case "rag-sync":
      return handleRagSync(request);
    case "rag-health":
    case "llm-health":
    case "traces":
      return methodNotAllowed(`Use GET /api/admin?action=${action}`);
    default:
      return unsupportedActionResponse(action);
  }
}

async function handleTraces() {
  try {
    if (!isAdminDebugAllowed()) {
      return adminDebugForbidden(
        "Access Denied: Trace viewer is disabled on production by default. Enable it via ADMIN_TRACE_VIEWER_ENABLED=true."
      );
    }

    return NextResponse.json({ traces: getTraces() });
  } catch {
    return NextResponse.json({ error: "Trace 조회 실패" }, { status: 500 });
  }
}

async function handleRagSync(request: NextRequest) {
  if (!isRagSyncAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await syncRagChunks({ delayMs: 0 });

    return NextResponse.json({
      ok: true,
      insertedOrUpdated: result.insertedOrUpdated,
      sourceTypeCounts: result.sourceTypeCounts,
      durationMs: result.durationMs,
    });
  } catch (error: unknown) {
    console.error(
      "RAG sync API failed:",
      error instanceof Error ? error.message : "unknown"
    );

    return NextResponse.json(
      {
        ok: false,
        error: "RAG_SYNC_FAILED",
        message: "RAG sync failed. Check server logs.",
      },
      { status: 500 }
    );
  }
}

async function handleLlmHealth() {
  try {
    if (!isAdminDebugAllowed()) {
      return adminDebugForbidden(
        "Access Denied: Health Check API is restricted to dev environment or admin flag."
      );
    }

    const testParams = {
      systemPrompt: "You are a health check system. Reply with exactly 'ok'.",
      messages: [{ role: "user" as const, content: "ping" }],
    };

    const openAiConfigured = !!process.env.OPENAI_API_KEY;
    const openAiModel = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    let openAiOk = false;
    let openAiError: string | null = null;
    if (openAiConfigured) {
      const res = await generateOpenAiText(testParams);
      if (res.error) {
        openAiError = res.errorCode || "CALL_FAILED";
      } else {
        openAiOk = true;
      }
    } else {
      openAiError = "API_KEY_MISSING";
    }

    const geminiConfigured = !!process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    let geminiOk = false;
    let geminiError: string | null = null;
    if (geminiConfigured) {
      const res = await generateGeminiText(testParams);
      if (res.error) {
        geminiError = res.errorCode || "CALL_FAILED";
      } else {
        geminiOk = true;
      }
    } else {
      geminiError = "API_KEY_MISSING";
    }

    const claudeConfigured = !!process.env.ANTHROPIC_API_KEY;
    const claudeModel = process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
    let claudeOk = false;
    let claudeError: string | null = null;
    if (claudeConfigured) {
      const res = await generateClaudeText(testParams);
      if (res.error) {
        claudeError = res.errorCode || "CALL_FAILED";
      } else {
        claudeOk = true;
      }
    } else {
      claudeError = "API_KEY_MISSING";
    }

    const skAxApiKeyConfigured = !!process.env.SK_AX_API_KEY;
    const skAxBaseUrlConfigured = !!process.env.SK_AX_BASE_URL;
    const skAxModel = process.env.SK_AX_MODEL || DEFAULT_SK_AX_MODEL;
    let skAxOk = false;
    let skAxError: string | null = null;
    if (skAxApiKeyConfigured && skAxBaseUrlConfigured) {
      const res = await generateSkAxText(testParams);
      if (res.error) {
        skAxError = res.errorCode || "CALL_FAILED";
      } else {
        skAxOk = true;
      }
    } else if (!skAxBaseUrlConfigured) {
      skAxError = "BASE_URL_MISSING";
    } else {
      skAxError = "API_KEY_MISSING";
    }

    return NextResponse.json({
      openai: {
        configured: openAiConfigured,
        ok: openAiOk,
        model: openAiModel,
        error: openAiError,
      },
      gemini: {
        configured: geminiConfigured,
        ok: geminiOk,
        model: geminiModel,
        error: geminiError,
      },
      claude: {
        configured: claudeConfigured,
        ok: claudeOk,
        model: claudeModel,
        error: claudeError,
      },
      sk_ax: {
        configured: skAxApiKeyConfigured,
        ok: skAxOk,
        baseUrlConfigured: skAxBaseUrlConfigured,
        model: skAxModel,
        error: skAxError,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error during healthcheck",
      },
      { status: 500 }
    );
  }
}

async function handleRagHealth() {
  try {
    if (!isAdminDebugAllowed()) {
      return adminDebugForbidden(
        "Access Denied: RAG Health API is restricted."
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
        (healthReport.errors as string[]).push(
          "embedding dimension check failed"
        );
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
