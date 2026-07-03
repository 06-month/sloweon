import { routeLLMRequest } from "../llm/router";
import { buildAnswerPromptWithContext } from "./prompts";
import type { RagContextItem } from "../rag/retriever";

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

export interface AnswerAgentInput {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  selectedProvider: string;
  modelMode: string;
  category: string;
  ragContext: RagContextItem[];
  toolResults: AnswerOutput["calledTools"];
}

function summarizeToolResults(
  tools: AnswerOutput["calledTools"]
): string {
  if (!tools.length) return "";
  return tools
    .map(
      (t) =>
        `${t.toolName}(${t.inputSummary}) → ${t.success ? t.outputSummary : "FAILED"}`
    )
    .join("\n");
}

export async function runAnswerAgent(
  input: AnswerAgentInput
): Promise<AnswerOutput> {
  const { messages, selectedProvider, modelMode, category, ragContext, toolResults } =
    input;

  const targetProvider = modelMode === "sk_only" ? "sk_ax" : selectedProvider;

  const systemPrompt = buildAnswerPromptWithContext({
    ragContext: ragContext.map((r) => ({
      sourceType: r.sourceType,
      title: r.title,
      contentPreview: r.contentPreview,
      score: r.score,
    })),
    toolResults: summarizeToolResults(toolResults),
    category,
  });

  try {
    const response = await routeLLMRequest(targetProvider, {
      systemPrompt,
      messages,
    });

    return {
      content: response.content,
      calledTools: toolResults,
      errorCode: response.errorCode,
      modelUsed: response.modelUsed,
    };
  } catch {
    return {
      content:
        "죄송합니다. 답변을 생성하는 중 일시적인 서버 지연이 발생하였습니다. 상세한 내용은 고객센터에 확인을 부탁드립니다.",
      calledTools: toolResults,
      errorCode: "ANSWER_AGENT_ERROR",
    };
  }
}
