import { LLMResponse, GenerateTextParams } from "../router";
import { DEFAULT_SK_AX_MODEL, DEFAULT_SK_AX_CHAT_PATH } from "../constants";

export async function generateSkAxText(params: GenerateTextParams): Promise<LLMResponse> {
  const apiKey = process.env.SK_AX_API_KEY;
  const baseUrl = process.env.SK_AX_BASE_URL;
  const modelName = process.env.SK_AX_MODEL || DEFAULT_SK_AX_MODEL;
  const chatPath = process.env.SK_AX_CHAT_PATH || DEFAULT_SK_AX_CHAT_PATH;

  // SK_AX_BASE_URL이 누락된 경우 API 호출 없이 즉시 안내 메시지 반환
  if (!baseUrl) {
    console.warn("LLM Provider [sk_ax] Warning: SK_AX_BASE_URL missing");
    return {
      content: "현재 SK A.X 모델 연결 정보가 완전히 설정되지 않았습니다. Gemini 또는 Claude를 선택해 주세요.",
      error: "SK_AX_BASE_URL missing",
      errorCode: "BASE_URL_MISSING",
      modelUsed: modelName
    };
  }

  if (!apiKey) {
    return { 
      content: "", 
      error: "SK_AX_API_KEY 환경변수가 존재하지 않습니다.",
      errorCode: "API_KEY_MISSING",
      modelUsed: modelName
    };
  }

  // Base URL 끝에 슬래시가 붙어 있으면 제거하여 URL 결합 오류 방지
  const sanitizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  
  // 최종 endpoint 조립 (요구사항 5)
  const endpoint = `${sanitizedBaseUrl}${chatPath}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: params.systemPrompt },
          ...params.messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        ],
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { content, modelUsed: modelName };
  } catch (error: any) {
    const errorMsg = error.message || "";
    let errorCode = "UNKNOWN_ERROR";

    if (errorMsg.includes("401") || errorMsg.includes("unauthorized") || errorMsg.includes("Unauthorized")) {
      errorCode = "API_KEY_INVALID";
    } else if (errorMsg.includes("429") || errorMsg.includes("rate") || errorMsg.includes("limit")) {
      errorCode = "RATE_LIMIT_EXCEEDED";
    } else if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      errorCode = "MODEL_NOT_FOUND_OR_UNAVAILABLE";
    } else if (errorMsg.includes("400") || errorMsg.includes("bad request")) {
      errorCode = "INVALID_REQUEST";
    }

    // 보안 가드: API Key나 Authorization 정보는 절대 로그/응답 원문에 출력되지 않도록 정제
    return { 
      content: "", 
      error: error.message || "SK A.X 호출 오류", 
      errorCode,
      modelUsed: modelName
    };
  }
}
