import { routeLLMRequest } from "../llm/router";
import { buildAnswerPromptWithContext } from "./prompts";
import type { RagContextItem } from "../rag/retriever";
import {
  extractProductsFromRag,
  formatProductListAnswer,
  isUnhelpfulProductResponse,
  type ProductCandidate,
} from "./productAnswer";

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
}

export interface AnswerAgentInput {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  selectedProvider: string;
  modelMode: string;
  category: string;
  ragContext: RagContextItem[];
  toolResults: AnswerOutput["calledTools"];
  productCandidates?: ProductCandidate[];
}

function summarizeToolResults(
  tools: AnswerOutput["calledTools"]
): string {
  if (!tools.length) return "";
  return tools
    .map((t) => `${t.toolName}: ${t.outputSummary}`)
    .join("\n");
}

function hasProductEvidence(
  candidates: ProductCandidate[],
  ragContext: RagContextItem[]
): boolean {
  if (candidates.length > 0) return true;
  return ragContext.some((r) =>
    ["product", "product_detail", "size_guide"].includes(r.sourceType)
  );
}

function mergeProductCandidates(
  dbCandidates: ProductCandidate[],
  ragContext: RagContextItem[]
): ProductCandidate[] {
  const merged = new Map<string, ProductCandidate>();
  for (const p of dbCandidates) merged.set(p.id, p);
  for (const p of extractProductsFromRag(ragContext)) {
    if (!merged.has(p.id)) merged.set(p.id, p);
  }
  return Array.from(merged.values());
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
  } = input;

  const mergedProducts = mergeProductCandidates(
    productCandidates,
    ragContext
  );

  // Deterministic product answer when we have DB/RAG evidence
  if (category === "product" && mergedProducts.length > 0) {
    const userMessage = messages[messages.length - 1]?.content || "";
    const structuredAnswer = formatProductListAnswer(
      mergedProducts,
      buildProductIntro(category, userMessage)
    );

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
      productCandidates: mergedProducts,
    });

    try {
      const response = await routeLLMRequest(targetProvider, {
        systemPrompt,
        messages,
      });

      if (
        response.errorCode ||
        isUnhelpfulProductResponse(response.content)
      ) {
        return {
          content: structuredAnswer,
          calledTools: toolResults,
          errorCode: response.errorCode,
          modelUsed: response.modelUsed,
          fallbackUsed: true,
          fallbackReason: response.errorCode
            ? "LLM_ERROR_WITH_PRODUCT_DATA"
            : "UNHELPFUL_LLM_RESPONSE",
        };
      }

      return {
        content: response.content,
        calledTools: toolResults,
        modelUsed: response.modelUsed,
      };
    } catch {
      return {
        content: structuredAnswer,
        calledTools: toolResults,
        fallbackUsed: true,
        fallbackReason: "ANSWER_AGENT_ERROR_WITH_PRODUCT_DATA",
      };
    }
  }

  // Product category but no results at all
  if (category === "product" && !hasProductEvidence(mergedProducts, ragContext)) {
    return {
      content:
        "현재 조건에 맞는 판매 중인 상품을 찾지 못했습니다. 색상, 가격대, 핏(예: 와이드/릴랙스)을 조금 더 구체적으로 말씀해 주시면 다시 찾아드리겠습니다.",
      calledTools: toolResults,
      fallbackUsed: true,
      fallbackReason: "NO_PRODUCT_EVIDENCE",
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
      fallbackUsed: true,
      fallbackReason: "ANSWER_AGENT_ERROR",
    };
  }
}
