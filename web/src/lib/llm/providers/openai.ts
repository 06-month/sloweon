import { LLMResponse, GenerateTextParams } from "../router";

// OpenAI 기본 모델 상수화 (요구사항 1)
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export async function generateOpenAiText(params: GenerateTextParams): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  const customModel = process.env.OPENAI_MODEL;
  const model = customModel || DEFAULT_OPENAI_MODEL;

  if (!apiKey) {
    return { content: "", error: "OPENAI_API_KEY 환경변수가 존재하지 않습니다." };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
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
    return { content };
  } catch (error: any) {
    return { content: "", error: error.message || "OpenAI 호출 오류" };
  }
}
