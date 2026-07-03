import { LLMResponse, GenerateTextParams } from "../router";

export async function generateSkAxText(params: GenerateTextParams): Promise<LLMResponse> {
  const apiKey = process.env.SK_AX_API_KEY;
  const baseUrl = process.env.SK_AX_BASE_URL;

  // SK_AX_BASE_URL이 누락된 경우 API 호출 없이 즉시 안내 메시지 반환
  if (!baseUrl) {
    console.warn("LLM Provider [sk_ax] Warning: SK_AX_BASE_URL missing");
    return {
      content: "현재 SK A.X 모델 연결 정보가 완전히 설정되지 않았습니다. Gemini 또는 Claude를 선택해 주세요.",
      error: "SK_AX_BASE_URL missing"
    };
  }

  if (!apiKey) {
    return { content: "", error: "SK_AX_API_KEY 환경변수가 존재하지 않습니다." };
  }

  // Base URL 끝에 슬래시가 붙어 있으면 제거하여 URL 결합 오류 방지
  const sanitizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  try {
    const response = await fetch(`${sanitizedBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "skt-ax-llama3-ko",
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
    return { content: "", error: error.message || "SK A.X 호출 오류" };
  }
}
