import { LLMResponse, GenerateTextParams } from "../router";
import { DEFAULT_ANTHROPIC_MODEL } from "../constants";

export async function generateClaudeText(params: GenerateTextParams): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const modelName = process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;

  if (!apiKey) {
    return { 
      content: "", 
      error: "ANTHROPIC_API_KEY 환경변수가 존재하지 않습니다.",
      errorCode: "API_KEY_MISSING",
      modelUsed: modelName
    };
  }

  try {
    let formattedMessages = params.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Anthropic Messages API 제약: 첫 번째 메시지는 반드시 'user' 역할이어야 함.
    // 웰컴 메시지가 'assistant'로 시작하는 경우 슬라이싱하여 첫 유저 메시지부터 시작하도록 보정.
    if (formattedMessages.length > 0 && formattedMessages[0].role === "assistant") {
      formattedMessages = formattedMessages.slice(1);
    }

    // 만약 유저 메시지가 전혀 없는 예외 상황이라면 API 호출 불필요
    if (formattedMessages.length === 0) {
      return { content: "안녕하세요! SLOWEON 쇼핑 챗봇입니다. 어떤 도움이 필요하신가요?", modelUsed: modelName };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 1024,
        system: params.systemPrompt,
        messages: formattedMessages
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP error ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    return { content, modelUsed: modelName };
  } catch (error: any) {
    const errorMsg = error.message || "";
    let errorCode = "UNKNOWN_ERROR";

    if (errorMsg.includes("api_key") || errorMsg.includes("authentication") || errorMsg.includes("401")) {
      errorCode = "API_KEY_INVALID";
    } else if (errorMsg.includes("rate_limit") || errorMsg.includes("429") || errorMsg.includes("overloaded")) {
      errorCode = "RATE_LIMIT_EXCEEDED";
    } else if (errorMsg.includes("model") || errorMsg.includes("not_found") || errorMsg.includes("404")) {
      errorCode = "MODEL_NOT_FOUND_OR_UNAVAILABLE";
    } else if (errorMsg.includes("invalid") || errorMsg.includes("400")) {
      errorCode = "INVALID_REQUEST";
    }

    return { 
      content: "", 
      error: error.message || "Claude 호출 오류", 
      errorCode,
      modelUsed: modelName
    };
  }
}
