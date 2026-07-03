import { routeLLMRequest } from "../llm/router";
import { buildAnswerPromptWithContext } from "./prompts";
import type { RagContextItem } from "../rag/retriever";
import {
  formatProductFactPackAnswer,
  type ProductCandidate,
} from "./productAnswer";
import type { ProductFactPack } from "./productFacts";

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
  fallbackUsed?: boolean;
  fallbackReason?: string | null;
  answerUsedDbFacts?: boolean;
  answerUsedRag?: boolean;
  hallucinationGuardTriggered?: boolean;
}

export interface AnswerAgentInput {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  selectedProvider: string;
  modelMode: string;
  category: string;
  ragContext: RagContextItem[];
  toolResults: AnswerOutput["calledTools"];
  productCandidates?: ProductCandidate[];
  productFactPacks?: ProductFactPack[];
}

function summarizeToolResults(
  tools: AnswerOutput["calledTools"]
): string {
  if (!tools.length) return "";
  return tools
    .map((t) => `${t.toolName}: ${t.outputSummary}`)
    .join("\n");
}

function buildProductIntro(category: string, userMessage: string): string {
  const n = userMessage.toLowerCase();
  if (/와이드|통\s*넓|relaxed|wide/.test(n)) {
    return "현재 SLOWEON에서 확인 가능한 와이드/릴랙스 핏 팬츠는 아래 상품들이 있습니다.";
  }
  if (category === "product") {
    return "현재 SLOWEON에서 확인 가능한 관련 상품은 아래와 같습니다.";
  }
  return "현재 SLOWEON에서 확인 가능한 상품은 아래와 같습니다.";
}

function hasPolicyEvidence(category: string, ragContext: RagContextItem[]) {
  if (category === "delivery") {
    return ragContext.some((item) => item.sourceType === "shipping_policy");
  }
  if (category === "refund") {
    return ragContext.some((item) =>
      ["refund_policy", "return_policy"].includes(item.sourceType)
    );
  }
  return true;
}

export async function runAnswerAgent(
  input: AnswerAgentInput
): Promise<AnswerOutput> {
  const {
    messages,
    selectedProvider,
    modelMode,
    category,
    ragContext,
    toolResults,
    productCandidates = [],
    productFactPacks = [],
  } = input;

  if (category === "product" && productFactPacks.length > 0) {
    const userMessage = messages[messages.length - 1]?.content || "";
    return {
      content: formatProductFactPackAnswer(
        productFactPacks,
        buildProductIntro(category, userMessage)
      ),
      calledTools: toolResults,
      modelUsed: "deterministic-product-facts",
      answerUsedDbFacts: true,
      answerUsedRag: productFactPacks.some(
        (pack) => pack.ragEvidenceTitles.length > 0
      ),
      hallucinationGuardTriggered: false,
    };
  }

  if (category === "product") {
    const hasDbCandidates = productCandidates.length > 0;
    return {
      content: hasDbCandidates
        ? "판매 중인 상품 후보는 찾았지만 답변에 필요한 상품 근거 묶음을 만들지 못했습니다. 색상, 가격대, 핏 조건을 조금 더 좁혀 다시 문의해 주세요."
        : "현재 조건에 맞는 판매 중인 상품을 찾지 못했습니다. 색상, 가격대, 핏(예: 와이드/릴랙스)을 조금 더 구체적으로 말씀해 주시면 다시 찾아드리겠습니다.",
      calledTools: toolResults,
      fallbackUsed: true,
      fallbackReason: hasDbCandidates
        ? "PRODUCT_FACT_PACK_EMPTY"
        : "NO_DB_PRODUCT_CANDIDATES",
      answerUsedDbFacts: hasDbCandidates,
      answerUsedRag: false,
      hallucinationGuardTriggered: true,
    };
  }

  if (!hasPolicyEvidence(category, ragContext)) {
    return {
      content:
        "현재 확인 가능한 SLOWEON 정책 근거가 부족해 확답드리기 어렵습니다. 주문 상태나 문의 유형을 조금 더 구체적으로 알려주시거나 마이페이지(/mypage) 또는 1:1 문의를 이용해 주세요.",
      calledTools: toolResults,
      fallbackUsed: true,
      fallbackReason: "NO_POLICY_RAG_EVIDENCE",
      answerUsedDbFacts: false,
      answerUsedRag: false,
      hallucinationGuardTriggered: true,
    };
  }

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
    productCandidates,
    productFactPacks,
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
      answerUsedDbFacts: toolResults.length > 0,
      answerUsedRag: ragContext.length > 0,
      hallucinationGuardTriggered: false,
    };
  } catch {
    return {
      content:
        "죄송합니다. 답변을 생성하는 중 일시적인 서버 지연이 발생하였습니다. 상세한 내용은 고객센터에 확인을 부탁드립니다.",
      calledTools: toolResults,
      errorCode: "ANSWER_AGENT_ERROR",
      fallbackUsed: true,
      fallbackReason: "ANSWER_AGENT_ERROR",
      answerUsedDbFacts: toolResults.length > 0,
      answerUsedRag: ragContext.length > 0,
      hallucinationGuardTriggered: true,
    };
  }
}
