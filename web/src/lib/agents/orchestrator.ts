import { runClassificationAgent } from "./classificationAgent";
import { runAnswerAgent } from "./answerAgent";
import { runRefundDecisionAgent } from "./refundDecisionAgent";
import { addTrace, AgentTrace } from "./trace";

export interface OrchestrationResult {
  role: "assistant";
  content: string;
  traceId: string;
}

export async function runOrchestrator(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  selectedProvider: string,
  sessionInfo: { userId?: string; orderId?: string }
): Promise<OrchestrationResult> {
  const startTime = Date.now();
  const traceId = "tr_" + Math.random().toString(36).substr(2, 9);
  const userMessage = messages[messages.length - 1]?.content || "";

  // 1. AGENT_MODEL_MODE 환경변수 획득 (normal | sk_only | sk_classification_test)
  const agentModelMode = process.env.AGENT_MODEL_MODE || "normal";

  let classificationResult: any = undefined;
  let finalAnswer = "";
  let calledTools: any[] = [];
  let ragSources: any[] = [];
  let errorMsg: string | null = null;
  let blockedOrderAction = false;
  let blockedRefundAction = false;

  try {
    // 2. 의도 분류 (Classification Agent 실행)
    classificationResult = await runClassificationAgent(userMessage, agentModelMode, selectedProvider);

    // 3. 에이전트 라우팅 분기
    if (classificationResult.nextAgent === "refundDecisionAgent") {
      // 환불 전문 판단 에이전트 기동
      blockedRefundAction = true;
      const refundResult = await runRefundDecisionAgent(userMessage, sessionInfo);
      
      finalAnswer = refundResult.customerFacingMessage;
      
      ragSources.push({
        sourceType: "RAG Documentation",
        title: "SLOWEON Return Policy Guide",
        score: 0.95,
        documentId: "docs/shopping-mall-chatbot-rag-agent.md"
      });
    } else {
      // 일반 답변 및 CS 대행 에이전트 기동
      const answerResult = await runAnswerAgent(messages, selectedProvider, agentModelMode);
      finalAnswer = answerResult.content;
      calledTools = answerResult.calledTools;

      // 카테고리별 RAG 매핑 시뮬레이션
      if (classificationResult.category === "delivery") {
        ragSources.push({
          sourceType: "RAG Documentation",
          title: "SLOWEON Shipping Guide",
          score: 0.9,
          documentId: "docs/faq-knowledge.json"
        });
      } else if (classificationResult.category === "product") {
        ragSources.push({
          sourceType: "Database",
          title: "Product Seeds Info",
          score: 1.0,
          documentId: "prisma/schema.prisma"
        });
      }
    }
  } catch (err: any) {
    errorMsg = err.message || "Orchestrator 내부 에러";
    finalAnswer = "죄송합니다. 서비스 조율 중 지연이 발생했습니다. [상담원 연결]을 진행해 주시면 안내해 드리겠습니다.";
  } finally {
    const latency = Date.now() - startTime;
    
    // 4. Trace 이력 기록 (addTrace 내부에서 마스킹 자동 처리)
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
        fallbackUsed: errorMsg !== null
      },
      latency,
      error: errorMsg
    };

    addTrace(trace);
  }

  return {
    role: "assistant",
    content: finalAnswer,
    traceId
  };
}
