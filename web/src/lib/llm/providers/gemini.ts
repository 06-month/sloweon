import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { LLMResponse, GenerateTextParams } from "../router";
import { DEFAULT_GEMINI_MODEL } from "../constants";

export async function generateGeminiText(params: GenerateTextParams): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    return { 
      content: "", 
      error: "GEMINI_API_KEY 환경변수가 존재하지 않습니다.",
      errorCode: "API_KEY_MISSING",
      modelUsed: modelName
    };
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const response = await generateText({
      model: google(modelName),
      system: params.systemPrompt,
      messages: params.messages,
      tools: params.tools
    });

    return { content: response.text, modelUsed: modelName };
  } catch (error: any) {
    const errorMsg = error.message || "";
    let errorCode = "UNKNOWN_ERROR";

    if (errorMsg.includes("API_KEY_INVALID") || errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY")) {
      errorCode = "API_KEY_INVALID";
    } else if (errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("LimitExceeded") || errorMsg.includes("Quota")) {
      errorCode = "RATE_LIMIT_EXCEEDED";
    } else if (errorMsg.includes("not found") || errorMsg.includes("model") || errorMsg.includes("404") || errorMsg.includes("MODEL_NOT_FOUND")) {
      errorCode = "MODEL_NOT_FOUND_OR_UNAVAILABLE";
    } else if (errorMsg.includes("bad request") || errorMsg.includes("400") || errorMsg.includes("INVALID_ARGUMENT")) {
      errorCode = "INVALID_REQUEST";
    }

    return { 
      content: "", 
      error: error.message || "Gemini 호출 오류", 
      errorCode,
      modelUsed: modelName
    };
  }
}
