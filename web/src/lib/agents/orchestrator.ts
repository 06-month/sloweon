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
  type RagContextItem,
  type RagRetrievalDiagnostics,
  type RagRetrievalResult,
  retrievePolicyContextDetailed,
  retrieveProductContextDetailed,
  retrieveRagContextDetailed,
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
import {
  buildProductFactPacks,
  type ProductFactPack,
} from "./productFacts";
import {
  emptyProductCardGenerationMeta,
  productFactPacksToProductCards,
  type ProductCardGenerationMeta,
  type ProductCardPayload,
} from "./productCards";

export interface OrchestrationResult {
  role: "assistant";
  content: string;
  traceId: string;
  productCards: ProductCardPayload[];
}

type ToolCall = NonNullable<AgentTrace["calledTools"]>[number];

interface ProductToolExecution {
  calledTools: ToolCall[];
  productCandidates: ProductCandidate[];
  ragContext: RagContextItem[];
  ragDiagnostics: RagRetrievalDiagnostics;
  productSearchMeta: ProductSearchTraceMeta;
  requestedProductId?: string | null;
  requestedSize?: string | null;
}

function emptyRagDiagnostics(warning?: string): RagRetrievalDiagnostics {
  return {
    rawRagResultsCount: 0,
    acceptedRagResultsCount: 0,
    groupedRagResultsCount: 0,
    droppedLowScoreCount: 0,
    deduplicatedCount: 0,
    productGroupingCollapsedCount: 0,
    lowScoreRagSources: [],
    rejectedRagSources: [],
    groupedProductEvidence: [],
    groundingWarnings: warning ? [warning] : [],
    thresholds: {},
  };
}

function mergeRagResults(results: RagRetrievalResult[]): RagRetrievalResult {
  const merged = new Map<string, RagContextItem>();
  for (const result of results) {
    for (const item of result.items) {
      const key = `${item.sourceType}:${item.sourceId}`;
      const existing = merged.get(key);
      if (!existing || item.score > existing.score) {
        merged.set(key, item);
      }
    }
  }

  const items = Array.from(merged.values()).sort((a, b) => b.score - a.score);
  const diagnostics = results.reduce<RagRetrievalDiagnostics>(
    (acc, result) => ({
      rawRagResultsCount:
        acc.rawRagResultsCount + result.diagnostics.rawRagResultsCount,
      acceptedRagResultsCount:
        acc.acceptedRagResultsCount +
        result.diagnostics.acceptedRagResultsCount,
      groupedRagResultsCount:
        acc.groupedRagResultsCount + result.diagnostics.groupedRagResultsCount,
      droppedLowScoreCount:
        acc.droppedLowScoreCount + result.diagnostics.droppedLowScoreCount,
      deduplicatedCount:
        acc.deduplicatedCount + result.diagnostics.deduplicatedCount,
      productGroupingCollapsedCount:
        acc.productGroupingCollapsedCount +
        result.diagnostics.productGroupingCollapsedCount,
      lowScoreRagSources: [
        ...acc.lowScoreRagSources,
        ...result.diagnostics.lowScoreRagSources,
      ],
      rejectedRagSources: [
        ...acc.rejectedRagSources,
        ...result.diagnostics.rejectedRagSources,
      ],
      groupedProductEvidence: [
        ...acc.groupedProductEvidence,
        ...result.diagnostics.groupedProductEvidence,
      ],
      groundingWarnings: [
        ...acc.groundingWarnings,
        ...result.diagnostics.groundingWarnings,
      ],
      thresholds: {
        ...acc.thresholds,
        ...result.diagnostics.thresholds,
      },
    }),
    emptyRagDiagnostics()
  );

  return {
    items,
    diagnostics: {
      ...diagnostics,
      deduplicatedCount:
        diagnostics.deduplicatedCount +
        Math.max(0, diagnostics.acceptedRagResultsCount - items.length),
      acceptedRagResultsCount: items.length,
      groupedRagResultsCount: Math.max(
        diagnostics.groupedRagResultsCount,
        items.length
      ),
    },
  };
}

function detailProductToCandidate(product: {
  id: string;
  name: string;
  koreanName: string;
  price: number;
  color: string;
  fit?: string;
  material?: string;
  shortDescription?: string;
  designNotes?: string;
}): ProductCandidate {
  return {
    id: product.id,
    name: product.name,
    koreanName: product.koreanName,
    price: product.price,
    color: product.color,
    fit: product.fit,
    material: product.material,
    shortDescription: product.shortDescription,
    designNotes: product.designNotes,
  };
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

  if ((wantsDetail || wantsStock) && productId) {
    const detail = await getProductDetail(productId);
    results.push({
      toolName: "getProductDetail",
      inputSummary: `productId: ${productId}`,
      outputSummary: detail.product
        ? `${detail.product.koreanName} (${detail.product.material})`
        : detail.error || "not found",
      success: !!detail.product,
    });

    if (
      detail.product &&
      !productCandidates.some((candidate) => candidate.id === detail.product!.id)
    ) {
      productCandidates = [
        detailProductToCandidate(detail.product),
        ...productCandidates,
      ];
    }
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
    rawRagResultsCount:
      hybridResult?.ragDiagnostics.rawRagResultsCount ?? 0,
    groupedRagResultsCount:
      hybridResult?.ragDiagnostics.groupedRagResultsCount ?? 0,
    droppedLowScoreCount:
      hybridResult?.ragDiagnostics.droppedLowScoreCount ?? 0,
    deduplicatedCount:
      hybridResult?.ragDiagnostics.deduplicatedCount ?? 0,
    productGroupingCollapsedCount:
      hybridResult?.ragDiagnostics.productGroupingCollapsedCount ?? 0,
    productCandidatesCount: productCandidates.length,
    searchProductsCalled: wantsSearch,
  };

  return {
    calledTools: results,
    productCandidates,
    ragContext: hybridResult?.ragContext ?? [],
    ragDiagnostics:
      hybridResult?.ragDiagnostics ??
      emptyRagDiagnostics("Hybrid product retrieval did not run."),
    productSearchMeta,
    requestedProductId: productId ?? null,
    requestedSize: size ?? null,
  };
}

async function retrieveRagForCategory(
  category: string,
  userMessage: string
): Promise<RagRetrievalResult> {
  const normalized = normalizeShoppingQuery(userMessage);
  const ragQuery =
    category === "product" ? normalized.expandedQuery : userMessage;

  switch (category) {
    case "product":
      return retrieveProductContextDetailed(ragQuery);
    case "delivery":
      return retrievePolicyContextDetailed(userMessage, "shipping_policy");
    case "refund": {
      const [refund, returnPolicy] = await Promise.all([
        retrievePolicyContextDetailed(userMessage, "refund_policy"),
        retrievePolicyContextDetailed(userMessage, "return_policy"),
      ]);
      return mergeRagResults([refund, returnPolicy]);
    }
    case "other": {
      const [faq, brand] = await Promise.all([
        retrieveRagContextDetailed(userMessage, { topK: 3, sourceType: "faq" }),
        retrieveRagContextDetailed(userMessage, {
          topK: 2,
          sourceType: "brand_guide",
        }),
      ]);
      return mergeRagResults([faq, brand]);
    }
    default:
      return {
        items: [],
        diagnostics: emptyRagDiagnostics("No RAG policy for category."),
      };
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
  let ragSourcesUsed: RagTraceSource[] = [];
  let rejectedRagSources: RagTraceSource[] = [];
  let lowScoreRagSources: RagTraceSource[] = [];
  let productSearchMeta: ProductSearchTraceMeta | undefined;
  let productCandidates: ProductCandidate[] = [];
  let productFactPacks: ProductFactPack[] = [];
  let productCards: ProductCardPayload[] = [];
  let productCardMeta: ProductCardGenerationMeta =
    emptyProductCardGenerationMeta();
  let requestedProductId: string | null = null;
  let requestedSize: string | null = null;
  let dbFactsUsed: string[] = [];
  let groundingWarnings: string[] = [];
  let answerUsedDbFacts = false;
  let answerUsedRag = false;
  let hallucinationGuardTriggered = false;
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

      const ragResult = await retrieveRagForCategory("refund", userMessage);
      const ragContext = ragResult.items;
      ragSources = toRagTraceSources(ragContext, "refundDecisionAgent");
      lowScoreRagSources = toRagTraceSources(
        ragResult.diagnostics.lowScoreRagSources,
        "refundDecisionAgent"
      );
      rejectedRagSources = toRagTraceSources(
        ragResult.diagnostics.rejectedRagSources,
        "refundDecisionAgent"
      );
      groundingWarnings = ragResult.diagnostics.groundingWarnings;

      const refundResult = await runRefundDecisionAgent(
        userMessage,
        sessionInfo,
        ragContext
      );

      finalAnswer = refundResult.customerFacingMessage;
      modelUsed = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      answerUsedRag = ragContext.length > 0;
    } else {
      const category = classificationResult.category;
      let ragContext: RagContextItem[] = [];
      let ragDiagnostics = emptyRagDiagnostics();

      if (category === "product") {
        const toolExec = await executeProductTools(
          userMessage,
          classificationResult.requiredTools || []
        );
        calledTools = toolExec.calledTools;
        productCandidates = toolExec.productCandidates;
        productSearchMeta = toolExec.productSearchMeta;
        requestedProductId = toolExec.requestedProductId ?? null;
        requestedSize = toolExec.requestedSize ?? null;
        ragContext = toolExec.ragContext;
        ragDiagnostics = toolExec.ragDiagnostics;

        const factPackResult = await buildProductFactPacks({
          dbCandidates: productCandidates,
          ragContext,
          ragDiagnostics,
        });
        productFactPacks = factPackResult.productFactPacks;
        dbFactsUsed = factPackResult.dbFactsUsed;
        ragSourcesUsed = toRagTraceSources(
          factPackResult.ragSourcesUsed,
          "ProductFactPack"
        );
        rejectedRagSources = toRagTraceSources(
          factPackResult.rejectedRagSources,
          "ProductFactPack"
        );
        groundingWarnings = factPackResult.groundingWarnings;

        const productCardResult = productFactPacksToProductCards(
          productFactPacks,
          {
            requestedProductId: toolExec.requestedProductId,
            requestedSize: toolExec.requestedSize,
          }
        );
        productCards = productCardResult.productCards;
        productCardMeta = {
          ...productCardResult.meta,
          missingImageProductIds: [
            ...new Set([
              ...productCardResult.meta.missingImageProductIds,
              ...factPackResult.missingImageProductIds,
            ]),
          ],
        };
      } else {
        const ragResult = await retrieveRagForCategory(category, userMessage);
        ragContext = ragResult.items;
        ragDiagnostics = ragResult.diagnostics;
        rejectedRagSources = toRagTraceSources(
          ragDiagnostics.rejectedRagSources,
          "answerAgent"
        );
        groundingWarnings = ragDiagnostics.groundingWarnings;
      }

      ragSources = toRagTraceSources(ragContext, "answerAgent");
      lowScoreRagSources = toRagTraceSources(
        ragDiagnostics.lowScoreRagSources,
        "answerAgent"
      );

      const answerResult = await runAnswerAgent({
        messages,
        selectedProvider,
        modelMode: agentModelMode,
        category,
        ragContext,
        toolResults: calledTools,
        productCandidates,
        productFactPacks,
        requestedProductId,
        requestedSize,
      });

      finalAnswer = answerResult.content;
      calledTools = answerResult.calledTools;
      errorCode = answerResult.errorCode || null;
      modelUsed = answerResult.modelUsed || null;
      fallbackUsed = answerResult.fallbackUsed || false;
      fallbackReason = answerResult.fallbackReason || null;
      answerUsedDbFacts = answerResult.answerUsedDbFacts || false;
      answerUsedRag = answerResult.answerUsedRag || false;
      hallucinationGuardTriggered =
        answerResult.hallucinationGuardTriggered || false;

      if (answerResult.errorCode) {
        errorMsg = `AnswerAgent failed: ${answerResult.errorCode}`;
      }
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Orchestrator 내부 에러";
    errorCode = "ORCHESTRATOR_INTERNAL_ERROR";
    fallbackUsed = true;
    fallbackReason = "ORCHESTRATOR_INTERNAL_ERROR";
    hallucinationGuardTriggered = true;
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
      ragSourcesUsed,
      rejectedRagSources,
      lowScoreRagSources,
      productFactPacks,
      productCards,
      productCardsGenerated: productCardMeta.productCardsGenerated,
      productCardsCount: productCardMeta.productCardsCount,
      productCardProductIds: productCardMeta.productCardProductIds,
      missingImageProductIds: productCardMeta.missingImageProductIds,
      cardRenderMode: productCardMeta.cardRenderMode,
      linkFallbackReason: productCardMeta.linkFallbackReason,
      dbFactsUsed,
      groundingWarnings,
      answerUsedDbFacts,
      answerUsedRag,
      hallucinationGuardTriggered,
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
    productCards,
  };
}
