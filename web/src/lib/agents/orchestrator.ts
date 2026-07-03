import { runClassificationAgent } from "./classificationAgent";
import { runAnswerAgent } from "./answerAgent";
import { runRefundDecisionAgent } from "./refundDecisionAgent";
import { addTrace, toRagTraceSources, type AgentTrace, type RagTraceSource } from "./trace";
import {
  retrievePolicyContext,
  retrieveProductContext,
  retrieveRagContext,
  type RagContextItem,
} from "../rag/retriever";
import {
  runHybridProductRetrieval,
  checkStock,
  getProductDetail,
  addToCart,
} from "../rag/hybrid";

export interface OrchestrationResult {
  role: "assistant";
  content: string;
  traceId: string;
}

type ToolCall = NonNullable<AgentTrace["calledTools"]>[number];

async function executeProductTools(
  userMessage: string,
  requiredTools: string[]
): Promise<ToolCall[]> {
  const results: ToolCall[] = [];
  const normalized = userMessage.toLowerCase();
  const productIdMatch = userMessage.match(/(top_\d{2}|bottom_\d{2})/i);
  const productId = productIdMatch?.[0]?.toLowerCase();
  const sizeMatch = userMessage.match(/\b(S|M|L|XL)\b/i);
  const size = sizeMatch?.[1]?.toUpperCase();

  const wantsSearch =
    requiredTools.includes("searchProducts") ||
    normalized.includes("추천") ||
    normalized.includes("찾아") ||
    normalized.includes("검색");

  const wantsDetail =
    requiredTools.includes("getProductDetail") ||
    (productId &&
      (normalized.includes("상세") ||
        normalized.includes("소재") ||
        normalized.includes("사이즈") ||
        normalized.includes("스펙")));

  const wantsStock =
    requiredTools.includes("checkStock") ||
    (productId && (normalized.includes("재고") || normalized.includes("남았")));

  const wantsCart =
    requiredTools.includes("addToCart") ||
    normalized.includes("장바구니") ||
    normalized.includes("담아");

  if (wantsSearch) {
    const hybrid = await runHybridProductRetrieval(userMessage);
    results.push({
      toolName: "searchProducts",
      inputSummary: JSON.stringify(hybrid.filters),
      outputSummary: `found ${hybrid.dbProducts.length} in-stock products`,
      success: hybrid.dbProducts.length > 0,
    });
  }

  if (wantsDetail && productId) {
    const detail = await getProductDetail(productId);
    results.push({
      toolName: "getProductDetail",
      inputSummary: `productId: ${productId}`,
      outputSummary: detail.product
        ? `${detail.product.koreanName} (${detail.product.material})`
        : detail.error || "not found",
      success: !!detail.product,
    });
  }

  if (wantsStock && productId) {
    const stock = await checkStock(productId, size || "M");
    results.push({
      toolName: "checkStock",
      inputSummary: `productId: ${productId}, size: ${size || "M"}`,
      outputSummary: stock.variants
        ? JSON.stringify(
            stock.variants.map((v) => ({
              color: v.colorName,
              stock: v.stock,
            }))
          )
        : stock.message || stock.error || "no data",
      success: !!stock.variants,
    });
  }

  if (wantsCart && productId) {
    const colorMatch = userMessage.match(
      /(차콜|블랙|네이비|그레이|카키|베이지|Charcoal|Black|Navy|Grey|Khaki|Beige)/i
    );
    let color = colorMatch?.[0] || "Charcoal";
    if (color === "차콜") color = "Charcoal";
    else if (color === "블랙") color = "Black";
    else if (color === "네이비") color = "Navy";

    const cart = await addToCart(productId, color, size || "M", 1);
    results.push({
      toolName: "addToCart",
      inputSummary: `${productId}, ${color}, ${size || "M"}`,
      outputSummary: cart.success
        ? cart.message || "added"
        : cart.error || "failed",
      success: !!cart.success,
    });
  }

  return results;
}

async function retrieveRagForCategory(
  category: string,
  userMessage: string
): Promise<RagContextItem[]> {
  switch (category) {
    case "product":
      return retrieveProductContext(userMessage, { topK: 5 });
    case "delivery": {
      const shipping = await retrievePolicyContext(
        userMessage,
        "shipping_policy"
      );
      return shipping;
    }
    case "refund": {
      const [refund, returnPolicy] = await Promise.all([
        retrievePolicyContext(userMessage, "refund_policy"),
        retrievePolicyContext(userMessage, "return_policy"),
      ]);
      const merged = new Map<string, RagContextItem>();
      for (const item of [...refund, ...returnPolicy]) {
        merged.set(`${item.sourceType}:${item.sourceId}`, item);
      }
      return Array.from(merged.values()).sort((a, b) => b.score - a.score);
    }
    case "other": {
      const [faq, brand] = await Promise.all([
        retrieveRagContext(userMessage, { topK: 3, sourceType: "faq" }),
        retrieveRagContext(userMessage, { topK: 2, sourceType: "brand_guide" }),
      ]);
      return [...faq, ...brand].sort((a, b) => b.score - a.score);
    }
    default:
      return [];
  }
}

export async function runOrchestrator(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  selectedProvider: string,
  sessionInfo: { userId?: string; orderId?: string }
): Promise<OrchestrationResult> {
  const startTime = Date.now();
  const traceId = "tr_" + Math.random().toString(36).substr(2, 9);
  const userMessage = messages[messages.length - 1]?.content || "";
  const agentModelMode = process.env.AGENT_MODEL_MODE || "normal";

  let classificationResult: AgentTrace["classificationResult"];
  let finalAnswer = "";
  let calledTools: ToolCall[] = [];
  let ragSources: RagTraceSource[] = [];
  let errorMsg: string | null = null;
  let errorCode: string | null = null;
  let modelUsed: string | null = null;
  let blockedOrderAction = false;
  let blockedRefundAction = false;

  try {
    classificationResult = await runClassificationAgent(
      userMessage,
      agentModelMode,
      selectedProvider
    );

    // Low confidence → clarification
    if (
      classificationResult.confidence < 0.6 &&
      classificationResult.clarificationQuestion
    ) {
      finalAnswer = classificationResult.clarificationQuestion;
      modelUsed = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    } else if (classificationResult.nextAgent === "refundDecisionAgent") {
      blockedRefundAction = true;

      const ragContext = await retrieveRagForCategory("refund", userMessage);
      ragSources = toRagTraceSources(ragContext, "refundDecisionAgent");

      const refundResult = await runRefundDecisionAgent(
        userMessage,
        sessionInfo,
        ragContext
      );

      finalAnswer = refundResult.customerFacingMessage;
      modelUsed = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    } else {
      const category = classificationResult.category;
      const ragContext = await retrieveRagForCategory(category, userMessage);
      ragSources = toRagTraceSources(ragContext, "answerAgent");

      if (category === "product") {
        calledTools = await executeProductTools(
          userMessage,
          classificationResult.requiredTools || []
        );
      }

      const answerResult = await runAnswerAgent({
        messages,
        selectedProvider,
        modelMode: agentModelMode,
        category,
        ragContext,
        toolResults: calledTools,
      });

      finalAnswer = answerResult.content;
      calledTools = answerResult.calledTools;
      errorCode = answerResult.errorCode || null;
      modelUsed = answerResult.modelUsed || null;

      if (answerResult.errorCode) {
        errorMsg = `AnswerAgent failed: ${answerResult.errorCode}`;
      }
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Orchestrator 내부 에러";
    errorCode = "ORCHESTRATOR_INTERNAL_ERROR";
    finalAnswer =
      "현재 선택한 AI 모델을 사용할 수 없습니다. OpenAI 모델로 다시 시도하거나 잠시 후 이용해 주세요.";
  } finally {
    const latency = Date.now() - startTime;

    const trace: AgentTrace = {
      traceId,
      timestamp: new Date().toLocaleString("ko-KR"),
      userMessage,
      selectedModelProvider: selectedProvider,
      agentModelMode,
      classificationResult,
      calledTools,
      ragSources,
      finalAnswer,
      guardrailActions: {
        blockedOrderAction,
        blockedRefundAction,
        fallbackUsed: errorMsg !== null || errorCode !== null,
      },
      latency,
      error: errorMsg ? `Sanitized Error (Code: ${errorCode})` : null,
      errorCode,
      modelUsed,
    };

    addTrace(trace);
  }

  return {
    role: "assistant",
    content: finalAnswer,
    traceId,
  };
}
