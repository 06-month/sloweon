import { generateGeminiText } from "./providers/gemini";
import { generateClaudeText } from "./providers/claude";
import { generateSkAxText } from "./providers/sk-ax";
import { generateOpenAiText } from "./providers/openai";

export interface LLMResponse {
  content: string;
  error?: string;
  errorCode?: string;
  modelUsed?: string;
}

export interface GenerateTextParams {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: any;
}

export type ModelProvider = "gemini" | "claude" | "sk_ax" | "openai";

export async function routeLLMRequest(
  provider: ModelProvider | string | undefined,
  params: GenerateTextParams
): Promise<LLMResponse> {
  // 1. modelProvider 검증 및 기본값 설정
  const selectedProvider: ModelProvider = 
    provider === "claude" || provider === "sk_ax" || provider === "openai" || provider === "gemini"
      ? (provider as ModelProvider)
      : "gemini"; // 기본값 gemini

  // 2. SK A.X 연결 상태 사전 검증
  if (selectedProvider === "sk_ax") {
    const apiKey = process.env.SK_AX_API_KEY;
    const baseUrl = process.env.SK_AX_BASE_URL;
    if (!apiKey || !baseUrl) {
      console.warn("LLM Provider [sk_ax] Warning: SK_AX_API_KEY or SK_AX_BASE_URL missing");
      return {
        content: "현재 SK A.X 모델 연결 정보가 완전히 설정되지 않았습니다. Gemini 또는 Claude를 선택해 주세요.",
        errorCode: "SK_AX_CONFIG_MISSING"
      };
    }
  }

  // 3. OpenAI 연결 상태 사전 검증
  if (selectedProvider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("LLM Provider [openai] Warning: OPENAI_API_KEY missing");
      return {
        content: "현재 OpenAI 모델 연결 정보가 완전히 설정되지 않았습니다. 다른 모델을 선택해 주세요.",
        errorCode: "OPENAI_CONFIG_MISSING"
      };
    }
  }

  // 4. Provider별 Client 호출
  let result: LLMResponse;

  switch (selectedProvider) {
    case "gemini":
      result = await generateGeminiText(params);
      break;
    case "claude":
      result = await generateClaudeText(params);
      break;
    case "sk_ax":
      result = await generateSkAxText(params);
      break;
    case "openai":
      result = await generateOpenAiText(params);
      break;
    default:
      result = { content: "", error: "지원하지 않는 Provider입니다.", errorCode: "INVALID_PROVIDER" };
  }

  // 5. 실패 시 Fallback 처리 및 보안 가드레일 (요구사항 6: 문구 개선)
  if (result.error) {
    console.error(`LLM Provider [${selectedProvider}] Error (Code: ${result.errorCode}):`, result.error);
    // API 키나 서버의 로우한 에러 원문은 보안 가드레일에 따라 숨기고 정제된 안내 문구를 반환한다.
    return {
      content: "현재 선택한 AI 모델을 사용할 수 없습니다. OpenAI 모델로 다시 시도하거나 잠시 후 이용해 주세요.",
      error: result.error,
      errorCode: result.errorCode,
      modelUsed: result.modelUsed
    };
  }

  return result;
}
