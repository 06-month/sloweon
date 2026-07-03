import { runClassificationAgent } from "./classificationAgent";
import { runAnswerAgent } from "./answerAgent";
import { runRefundDecisionAgent } from "./refundDecisionAgent";
import {
  addTrace,
  toRagTraceSources,
  type AgentTrace,
  type RagTraceSource,
  type ProductSearchTraceMeta,
} from "./trace";
import {
  retrievePolicyContext,
  retrieveProductContext,
  retrieveRagContext,
  type RagContextItem,
} from "../rag/retriever";
import {
  runHybridProductRetrieval,
  dbProductsToCandidates,
  checkStock,
  getProductDetail,
  addToCart,
} from "../rag/hybrid";
import {
  normalizeShoppingQuery,
} from "../rag/queryNormalizer";
import type { ProductCandidate } from "./productAnswer";

export interface OrchestrationResult {
  role: "assistant";
  content: string;
  traceId: string;
}

type ToolCall = NonNullable<AgentTrace["calledTools"]>[number];

interface ProductToolExecution {
  calledTools: ToolCall[];
  productCandidates: ProductCandidate[];
  productSearchMeta: ProductSearchTraceMeta;
}

async function executeProductTools(
  userMessage: string,
  requiredTools: string[]
): Promise<ProductToolExecution> {
  const results: ToolCall[] = [];
  const normalized = normalizeShoppingQuery(userMessage);
  const lower = userMessage.toLowerCase();
  const productIdMatch = userMessage.match(/(top_\d{2}|bottom_\d{2})/i);
  const productId = productIdMatch?.[0]?.toLowerCase();
  const sizeMatch = userMessage.match(/\b(S|M|L|XL)\b/i);
  const size = sizeMatch?.[1]?.toUpperCase();

  let productCandidates: ProductCandidate[] = [];
  let hybridResult: Awaited<ReturnType<typeof runHybridProductRetrieval>> | null =
    null;

  const wantsSearch = true; // product category에서만 호출됨 — 항상 DB+RAG 검색 수행

  const wantsDetail =
    requiredTools.includes("getProductDetail") ||
    (productId &&
      (lower.includes("상세") ||
        lower.includes("소재") ||
        lower.includes("사이즈") ||
        lower.includes("스펙")));

  const wantsStock =
    requiredTools.includes("checkStock") ||
    (productId && (lower.includes("재고") || lower.includes("남았")));

  const wantsCart =
    requiredTools.includes("addToCart") ||
    lower.includes("장바구니") ||
    lower.includes("담아");

  if (wantsSearch) {
    hybridResult = await runHybridProductRetrieval(userMessage);
    productCandidates = dbProductsToCandidates(hybridResult.dbProducts);

    results.push({
      toolName: "searchProducts",
      inputSummary: JSON.stringify({
        normalizedQuery: normalized.originalQuery,
        expandedQuery: normalized.expandedQuery,
        filters: hybridResult.filters,
      }),
      outputSummary: JSON.stringify({
        count: productCandidates.length,
        products: productCandidates.map((p) => ({
          id: p.id,
          name: p.name,
          koreanName: p.koreanName,
          price: p.price,
          fit: p.fit,
          material: p.material,
        })),
      }),
      success: productCandidates.length > 0,
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

  const productSearchMeta: ProductSearchTraceMeta = {
    normalizedQuery: normalized.originalQuery,
    expandedQuery: normalized.expandedQuery,
    productSearchFilters: (hybridResult?.filters || {
      categorySlug: normalized.categoryHints[0],
      normalized,
    }) as Record<string, unknown>,
    toolResultsCount: results.length,
    ragResultsCount: hybridResult?.ragContext.length ?? 0,
    productCandidatesCount: productCandidates.length,
    searchProductsCalled: wantsSearch,
  };

  return { calledTools: results, productCandidates, productSearchMeta };
}

async function retrieveRagForCategory(
  category: string,
  userMessage: string
): Promise<RagContextItem[]> {
  const normalized = normalizeShoppingQuery(userMessage);
  const ragQuery =
    category === "product" ? normalized.expandedQuery : userMessage;

  switch (category) {
    case "product":
      return retrieveProductContext(ragQuery, { topK: 5 });
    case "delivery":
      return retrievePolicyContext(userMessage, "shipping_policy");
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
  let productSearchMeta: ProductSearchTraceMeta | undefined;
  let productCandidates: ProductCandidate[] = [];
  let errorMsg: string | null = null;
  let errorCode: string | null = null;
  let modelUsed: string | null = null;
  let blockedOrderAction = false;
  let blockedRefundAction = false;
  let fallbackUsed = false;
  let fallbackReason: string | null = null;

  try {
    classificationResult = await runClassificationAgent(
      userMessage,
      agentModelMode,
      selectedProvider
    );

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
        const toolExec = await executeProductTools(
          userMessage,
          classificationResult.requiredTools || []
        );
        calledTools = toolExec.calledTools;
        productCandidates = toolExec.productCandidates;
        productSearchMeta = toolExec.productSearchMeta;
      }

      const answerResult = await runAnswerAgent({
        messages,
        selectedProvider,
        modelMode: agentModelMode,
        category,
        ragContext,
        toolResults: calledTools,
        productCandidates,
      });

      finalAnswer = answerResult.content;
      calledTools = answerResult.calledTools;
      errorCode = answerResult.errorCode || null;
      modelUsed = answerResult.modelUsed || null;
      fallbackUsed = answerResult.fallbackUsed || false;
      fallbackReason = answerResult.fallbackReason || null;

      if (answerResult.errorCode) {
        errorMsg = `AnswerAgent failed: ${answerResult.errorCode}`;
      }
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Orchestrator 내부 에러";
    errorCode = "ORCHESTRATOR_INTERNAL_ERROR";
    fallbackUsed = true;
    fallbackReason = "ORCHESTRATOR_INTERNAL_ERROR";
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
      productSearchMeta,
      finalAnswer,
      guardrailActions: {
        blockedOrderAction,
        blockedRefundAction,
        fallbackUsed: fallbackUsed || errorMsg !== null || errorCode !== null,
        fallbackReason,
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
