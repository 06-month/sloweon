import { routeLLMRequest } from "../llm/router";
import { ANSWER_SYSTEM_PROMPT } from "./prompts";

export interface AnswerOutput {
  content: string;
  calledTools: Array<{
    toolName: string;
    inputSummary: string;
    outputSummary: string;
    success: boolean;
  }>;
  errorCode?: string;
  modelUsed?: string;
}

export async function runAnswerAgent(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  selectedProvider: string,
  modelMode: string
): Promise<AnswerOutput> {
  // 1. 모델 정책 결정 (sk_only 모드일 경우 sk_ax 고정)
  const targetProvider = modelMode === "sk_only" ? "sk_ax" : selectedProvider;

  // 2. 도구 실행 내역 트래킹 (일반 AnswerAgent 텍스트 생성은 도구 직접 기동을 route.ts의 Gemini SDK에 위임함)
  const traceTools: AnswerOutput["calledTools"] = [];

  try {
    const response = await routeLLMRequest(targetProvider, {
      systemPrompt: ANSWER_SYSTEM_PROMPT,
      messages: messages
    });

    return {
      content: response.content,
      calledTools: traceTools,
      errorCode: response.errorCode,
      modelUsed: response.modelUsed
    };
  } catch (error: any) {
    return {
      content: "죄송합니다. 답변을 생성하는 중 일시적인 서버 지연이 발생하였습니다. 상세한 내용은 고객센터에 확인을 부탁드립니다.",
      calledTools: [],
      errorCode: "ANSWER_AGENT_ERROR"
    };
  }
}
