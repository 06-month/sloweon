import { NextRequest, NextResponse } from "next/server";
import { generateGeminiText } from "@/lib/llm/providers/gemini";
import { generateClaudeText } from "@/lib/llm/providers/claude";
import { generateSkAxText } from "@/lib/llm/providers/sk-ax";
import { generateOpenAiText } from "@/lib/llm/providers/openai";
import { DEFAULT_GEMINI_MODEL, DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL, DEFAULT_SK_AX_MODEL } from "@/lib/llm/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. 보안 가드 (ADMIN_TRACE_VIEWER_ENABLED=true 혹은 개발 환경만 허용)
    const isDev = process.env.NODE_ENV === "development";
    const isEnabled = process.env.ADMIN_TRACE_VIEWER_ENABLED === "true";

    if (!isDev && !isEnabled) {
      return NextResponse.json(
        { error: "Access Denied: Health Check API is restricted to dev environment or admin flag." },
        { status: 403 }
      );
    }

    const testParams = {
      systemPrompt: "You are a health check system. Reply with exactly 'ok'.",
      messages: [{ role: "user" as const, content: "ping" }]
    };

    // 2. 각 Provider별 진단
    // OpenAI
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

    // Gemini
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

    // Claude
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

    // SK A.X
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

    // 3. 응답 구조화 (API Key 원문 절대 노출 금지)
    return NextResponse.json({
      openai: {
        configured: openAiConfigured,
        ok: openAiOk,
        model: openAiModel,
        error: openAiError
      },
      gemini: {
        configured: geminiConfigured,
        ok: geminiOk,
        model: geminiModel,
        error: geminiError
      },
      claude: {
        configured: claudeConfigured,
        ok: claudeOk,
        model: claudeModel,
        error: claudeError
      },
      sk_ax: {
        configured: skAxApiKeyConfigured,
        ok: skAxOk,
        baseUrlConfigured: skAxBaseUrlConfigured,
        model: skAxModel,
        error: skAxError
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error during healthcheck" }, { status: 500 });
  }
}
