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
  ragSources?: Array<{
    sourceType: string;
    title: string;
    score: number;
    documentId: string;
  }>;
  finalAnswer: string;
  guardrailActions?: {
    blockedOrderAction: boolean;
    blockedRefundAction: boolean;
    fallbackUsed: boolean;
  };
  latency: number;
  error?: string | null;
  errorCode?: string | null;
  modelUsed?: string | null;
}

// 런타임 간이 디버깅을 위한 메모리 기반 global cache
// Next.js 개발/프로덕션 서버 구동 중 HMR이나 메모리 리프레시로 날아갈 수 있으나
// 런타임 확인용 MVP로는 완벽히 기능함.
const globalTraces: AgentTrace[] = [];

// 개인정보 마스킹 헬퍼 (요구사항 4 & 5)
export function maskSensitiveData(text: string): string {
  if (!text) return text;
  let masked = text;
  
  // 1. 이메일 마스킹 (ex: user@example.com -> u***@example.com)
  masked = masked.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match, p1, p2) => {
    if (p1.length > 1) {
      return p1[0] + "*".repeat(p1.length - 1) + "@" + p2;
    }
    return "*@" + p2;
  });

  // 2. 휴대전화번호 마스킹 (ex: 010-1234-5678 -> 010-****-5678)
  masked = masked.replace(/(01[016789])[-. ]?(\d{3,4})[-. ]?(\d{4})/g, "$1-****-$3");

  // 3. 카드번호 마스킹 (ex: 1234-5678-1234-5678 -> 1234-****-****-5678)
  masked = masked.replace(/(\d{4})[-. ]?(\d{4})[-. ]?(\d{4})[-. ]?(\d{4})/g, "$1-****-****-$4");

  // 4. 주민등록번호 마스킹
  masked = masked.replace(/(\d{6})[-. ]?([1-4])\d{6}/g, "$1-$2******");

  return masked;
}

export function addTrace(trace: AgentTrace) {
  // 수집 및 기록 시 개인정보 마스킹 강제화
  const sanitizedTrace: AgentTrace = {
    ...trace,
    userMessage: maskSensitiveData(trace.userMessage),
    finalAnswer: maskSensitiveData(trace.finalAnswer),
    error: trace.error ? maskSensitiveData(trace.error) : null
  };
  
  globalTraces.unshift(sanitizedTrace); // 최신 목록을 맨 앞으로
  
  // 최대 50개 유지 (메모리 제어)
  if (globalTraces.length > 50) {
    globalTraces.pop();
  }
}

export function getTraces(): AgentTrace[] {
  // Next.js hot-reload 환경에서도 메모리에 mock 데이터가 일부 유지되도록 초기 모의 데이터 지원
  if (globalTraces.length === 0) {
    // 웰컴 성격의 목업 트레이스 미리 채워두기 (HTML Viewer 렌더링 확인용)
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
        requiredRagSources: ["size_specs"]
      },
      calledTools: [
        {
          toolName: "checkStock",
          inputSummary: "productId: top_01, size: L",
          outputSummary: "variants: [{colorName: Black, stock: 4}, {colorName: Charcoal, stock: 0}]",
          success: true
        }
      ],
      ragSources: [
        {
          sourceType: "Database",
          title: "Product Variant Stock",
          score: 1.0,
          documentId: "top_01"
        }
      ],
      finalAnswer: "요청하신 top_01 블랙 L 사이즈는 실시간 재고가 4개 남아있습니다. 차콜 L 사이즈는 현재 품절 상태입니다.",
      guardrailActions: {
        blockedOrderAction: false,
        blockedRefundAction: false,
        fallbackUsed: false
      },
      latency: 480,
      error: null
    });

    globalTraces.push({
      traceId: "tr_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(Date.now() - 60000).toLocaleString("ko-KR"),
      userMessage: "어제 주문한 거 환불해 줘. 카드 결제 취소 요청함. 연락처는 010-9999-8888임.",
      selectedModelProvider: "openai",
      agentModelMode: "sk_classification_test",
      classificationResult: {
        category: "refund",
        confidence: 0.98,
        reason: "고객의 주문 환불 및 결제취소 명시적 요구",
        nextAgent: "refundDecisionAgent",
        requiredTools: [],
        requiredRagSources: ["refund_policy"]
      },
      calledTools: [],
      ragSources: [
        {
          sourceType: "RAG Documentation",
          title: "SLOWEON Return and Cancellation Guide",
          score: 0.92,
          documentId: "docs/shopping-mall-chatbot-rag-agent.md"
        }
      ],
      finalAnswer: "죄송합니다. 챗봇에서는 자동 결제 취소나 자동 환불 처리를 직접 처리해 드리지 못합니다. 고객님의 반품 요청을 대기 상태로 접수해 드리겠으며, 관리자 승인 검수가 끝난 뒤 안전하게 결제취소가 반영됩니다. 상세한 안내는 [마이페이지](/mypage)를 이용해 주시기 바랍니다. (개인정보는 마스킹되었습니다)",
      guardrailActions: {
        blockedOrderAction: false,
        blockedRefundAction: true,
        fallbackUsed: false
      },
      latency: 720,
      error: null
    });
  }
  return globalTraces;
}
