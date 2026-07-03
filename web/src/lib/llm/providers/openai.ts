import { LLMResponse, GenerateTextParams } from "../router";
import { DEFAULT_OPENAI_MODEL } from "../constants";

export async function generateOpenAiText(params: GenerateTextParams): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  const modelName = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

  if (!apiKey) {
    return { 
      content: "", 
      error: "OPENAI_API_KEY 환경변수가 존재하지 않습니다.",
      errorCode: "API_KEY_MISSING",
      modelUsed: modelName
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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

    if (errorMsg.includes("401") || errorMsg.includes("unauthorized") || errorMsg.includes("auth")) {
      errorCode = "API_KEY_INVALID";
    } else if (errorMsg.includes("429") || errorMsg.includes("rate") || errorMsg.includes("limit")) {
      errorCode = "RATE_LIMIT_EXCEEDED";
    } else if (errorMsg.includes("404") || errorMsg.includes("model") || errorMsg.includes("not found")) {
      errorCode = "MODEL_NOT_FOUND_OR_UNAVAILABLE";
    } else if (errorMsg.includes("400") || errorMsg.includes("bad request")) {
      errorCode = "INVALID_REQUEST";
    }

    return { 
      content: "", 
      error: error.message || "OpenAI 호출 오류", 
      errorCode,
      modelUsed: modelName
    };
  }
}
