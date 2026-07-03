import { routeLLMRequest } from "../llm/router";
import { REFUND_SYSTEM_PROMPT } from "./prompts";

export interface RefundDecisionOutput {
  decision: "refundable" | "conditionally_refundable" | "not_refundable" | "requires_admin_review";
  reason: string;
  requiredAdminAction: string;
  customerFacingMessage: string;
}

export async function runRefundDecisionAgent(
  customerMessage: string,
  sessionInfo: { userId?: string; orderId?: string }
): Promise<RefundDecisionOutput> {
  // 1. 모델 정책: 비즈니스 리스크 방지를 위해 서버 고정 지정 모델 (gemini) 사용
  const targetProvider = "gemini";
  
  const systemPrompt = REFUND_SYSTEM_PROMPT;
  
  // 세션 및 상태 컨텍스트 주입
  const contextMessage = `[User Message] ${customerMessage}
[Context Info]
- userId: ${sessionInfo.userId || "GUEST"}
- orderId: ${sessionInfo.orderId || "NOT_PROVIDED"}
- paymentStatus: PAID
- shippingStatus: PREPARING (배송 준비 중 상태 - 반품 가능 범위)
- refundPolicyUrl: docs/shopping-mall-chatbot-rag-agent.md`;

  const messages = [{ role: "user" as const, content: contextMessage }];

  try {
    const response = await routeLLMRequest(targetProvider, {
      systemPrompt,
      messages
    });

    let cleanContent = response.content.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = cleanContent.indexOf("{");
    const lastBrace = cleanContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
    }

    const parsed: RefundDecisionOutput = JSON.parse(cleanContent);
    return parsed;
  } catch (err) {
    // LLM 호출 실패 시의 안전 Fallback 판정 (무조건 관리자 수동 검토 안내로 격리)
    console.warn("Refund Decision Agent LLM/Parsing failed, using fallback decision.");
    return {
      decision: "requires_admin_review",
      reason: "환불 에이전트 LLM 분석 지연에 따른 관리자 수동 검수 이관 (Fallback)",
      requiredAdminAction: "주문 내역 및 결제 취소 요청 상태 수동 검토 요망",
      customerFacingMessage: "고객님의 환불/반품 요청은 시스템에 안전하게 기록되었습니다. 담당 부서에서 영업일 기준 1일 이내에 주문 정보를 정밀 검토한 후 환불 진행 문자를 송부해 드리겠습니다. (실제 즉각 자동 환불 및 취소 처리는 보안 규정상 금지되어 있습니다)"
    };
  }
}
