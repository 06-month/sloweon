import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { LLMResponse, GenerateTextParams } from "../router";

export async function generateGeminiText(params: GenerateTextParams): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { content: "", error: "GEMINI_API_KEY 환경변수가 존재하지 않습니다." };
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const response = await generateText({
      model: google("gemini-1.5-flash"),
      system: params.systemPrompt,
      messages: params.messages,
      tools: params.tools
    });

    return { content: response.text };
  } catch (error: any) {
    return { content: "", error: error.message || "Gemini 호출 오류" };
  }
}
