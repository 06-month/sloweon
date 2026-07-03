import { NextRequest, NextResponse } from "next/server";
import { syncRagChunks } from "@/lib/rag/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.RAG_SYNC_SECRET;
  const token = extractBearerToken(request);

  if (process.env.NODE_ENV === "production") {
    if (!secret || !token || token !== secret) return false;
    return true;
  }

  // development: require secret when configured
  if (secret) {
    return token === secret;
  }

  return true;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
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

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
