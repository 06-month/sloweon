import type { ProductFactPack } from "./productFacts";

export interface RagTraceSource {
  sourceType: string;
  sourceId: string;
  title: string;
  score: number;
  contentPreview: string;
  usedByAgent: string;
  reason?: string;
  productId?: string | null;
}

export interface ProductSearchTraceMeta {
  normalizedQuery: string;
  expandedQuery: string;
  productSearchFilters: Record<string, unknown>;
  toolResultsCount: number;
  ragResultsCount: number;
  rawRagResultsCount?: number;
  groupedRagResultsCount?: number;
  droppedLowScoreCount?: number;
  deduplicatedCount?: number;
  productGroupingCollapsedCount?: number;
  productCandidatesCount: number;
  searchProductsCalled: boolean;
}

export interface AgentTrace {
  traceId: string;
  timestamp: string;
  userMessage: string;
  selectedModelProvider: string;
  agentModelMode: string;
  classificationResult?: {
    category: string;
    confidence: number;
    reason: string;
    nextAgent: string;
    requiredTools?: string[];
    requiredRagSources?: string[];
    clarificationQuestion?: string | null;
  };
  calledTools?: Array<{
    toolName: string;
    inputSummary: string;
    outputSummary: string;
    success: boolean;
  }>;
  ragSources?: RagTraceSource[];
  ragSourcesUsed?: RagTraceSource[];
  rejectedRagSources?: RagTraceSource[];
  lowScoreRagSources?: RagTraceSource[];
  productFactPacks?: ProductFactPack[];
  dbFactsUsed?: string[];
  groundingWarnings?: string[];
  answerUsedDbFacts?: boolean;
  answerUsedRag?: boolean;
  hallucinationGuardTriggered?: boolean;
  productSearchMeta?: ProductSearchTraceMeta;
  finalAnswer: string;
  guardrailActions?: {
    blockedOrderAction: boolean;
    blockedRefundAction: boolean;
    fallbackUsed: boolean;
    fallbackReason?: string | null;
  };
  latency: number;
  error?: string | null;
  errorCode?: string | null;
  modelUsed?: string | null;
}

const globalTraces: AgentTrace[] = [];

export function maskSensitiveData(text: string): string {
  if (!text) return text;
  let masked = text;

  masked = masked.replace(
    /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (match, p1, p2) => {
      if (p1.length > 1) {
        return p1[0] + "*".repeat(p1.length - 1) + "@" + p2;
      }
      return "*@" + p2;
    }
  );

  masked = masked.replace(
    /(01[016789])[-. ]?(\d{3,4})[-. ]?(\d{4})/g,
    "$1-****-$3"
  );
  masked = masked.replace(
    /(\d{4})[-. ]?(\d{4})[-. ]?(\d{4})[-. ]?(\d{4})/g,
    "$1-****-****-$4"
  );
  masked = masked.replace(/(\d{6})[-. ]?([1-4])\d{6}/g, "$1-$2******");

  return masked;
}

export function toRagTraceSources(
  items: Array<{
    sourceType: string;
    sourceId: string;
    title: string;
    score: number;
    contentPreview: string;
    reason?: string;
    productId?: string | null;
  }>,
  usedByAgent: string
): RagTraceSource[] {
  return items.map((item) => ({
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    title: item.title,
    score: item.score,
    contentPreview: maskSensitiveData(item.contentPreview),
    usedByAgent,
    reason: item.reason,
    productId: item.productId,
  }));
}

export function addTrace(trace: AgentTrace) {
  const maskRagSource = (r: RagTraceSource): RagTraceSource => ({
    ...r,
    contentPreview: maskSensitiveData(r.contentPreview),
    title: maskSensitiveData(r.title),
  });

  const sanitizedTrace: AgentTrace = {
    ...trace,
    userMessage: maskSensitiveData(trace.userMessage),
    finalAnswer: maskSensitiveData(trace.finalAnswer),
    error: trace.error ? maskSensitiveData(trace.error) : null,
    ragSources: trace.ragSources?.map(maskRagSource),
    ragSourcesUsed: trace.ragSourcesUsed?.map(maskRagSource),
    rejectedRagSources: trace.rejectedRagSources?.map(maskRagSource),
    lowScoreRagSources: trace.lowScoreRagSources?.map(maskRagSource),
    productFactPacks: trace.productFactPacks?.map((pack) => ({
      ...pack,
      name: maskSensitiveData(pack.name),
      koreanName: maskSensitiveData(pack.koreanName),
      description: maskSensitiveData(pack.description),
      ragEvidenceTitles: pack.ragEvidenceTitles.map(maskSensitiveData),
      ragEvidencePreview: pack.ragEvidencePreview.map(maskSensitiveData),
      modelFit: pack.modelFit
        ? {
            ...pack.modelFit,
            fitComment: maskSensitiveData(pack.modelFit.fitComment),
          }
        : pack.modelFit,
      reviewFitSummary: pack.reviewFitSummary
        ? maskSensitiveData(pack.reviewFitSummary)
        : pack.reviewFitSummary,
    })),
  };

  globalTraces.unshift(sanitizedTrace);

  if (globalTraces.length > 50) {
    globalTraces.pop();
  }
}

export function getTraces(): AgentTrace[] {
  if (globalTraces.length === 0) {
    globalTraces.push({
      traceId: "tr_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(Date.now() - 300000).toLocaleString("ko-KR"),
      userMessage: "top_01 셔츠 블랙 L사이즈 재고 남았나요?",
      selectedModelProvider: "gemini",
      agentModelMode: "normal",
      classificationResult: {
        category: "product",
        confidence: 0.95,
        reason: "특정 상품(top_01)의 실시간 재고 확인 요구",
        nextAgent: "answerAgent",
        requiredTools: ["checkStock"],
        requiredRagSources: ["size_guide"],
      },
      calledTools: [
        {
          toolName: "checkStock",
          inputSummary: "productId: top_01, size: L",
          outputSummary:
            "variants: [{colorName: Black, stock: 4}, {colorName: Charcoal, stock: 0}]",
          success: true,
        },
      ],
      ragSources: [
        {
          sourceType: "size_guide",
          sourceId: "size_top_01",
          title: "오버사이즈 코튼 셔츠 사이즈 가이드",
          score: 0.82,
          contentPreview:
            "M 사이즈: 어깨 50cm, 가슴 58cm... 모델 185cm/73kg, L 착용",
          usedByAgent: "answerAgent",
        },
      ],
      finalAnswer:
        "요청하신 top_01 블랙 L 사이즈는 실시간 재고가 4개 남아있습니다. 차콜 L 사이즈는 현재 품절 상태입니다.",
      guardrailActions: {
        blockedOrderAction: false,
        blockedRefundAction: false,
        fallbackUsed: false,
      },
      latency: 480,
      error: null,
    });

    globalTraces.push({
      traceId: "tr_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(Date.now() - 60000).toLocaleString("ko-KR"),
      userMessage:
        "어제 주문한 거 환불해 줘. 카드 결제 취소 요청함. 연락처는 010-9999-8888임.",
      selectedModelProvider: "openai",
      agentModelMode: "sk_classification_test",
      classificationResult: {
        category: "refund",
        confidence: 0.98,
        reason: "고객의 주문 환불 및 결제취소 명시적 요구",
        nextAgent: "refundDecisionAgent",
        requiredTools: [],
        requiredRagSources: ["refund_policy", "return_policy"],
      },
      calledTools: [],
      ragSources: [
        {
          sourceType: "refund_policy",
          sourceId: "refund_main",
          title: "SLOWEON 환불 정책",
          score: 0.91,
          contentPreview:
            "반품 접수 및 상품 입고 확인 완료 후 환불 처리. 카드 취소 3~5 영업일...",
          usedByAgent: "refundDecisionAgent",
        },
      ],
      finalAnswer:
        "죄송합니다. 챗봇에서는 자동 결제 취소나 자동 환불 처리를 직접 처리해 드리지 못합니다. 마이페이지(/mypage)를 이용해 주시기 바랍니다.",
      guardrailActions: {
        blockedOrderAction: false,
        blockedRefundAction: true,
        fallbackUsed: false,
      },
      latency: 720,
      error: null,
    });
  }
  return globalTraces;
}
