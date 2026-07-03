import { routeLLMRequest } from "../llm/router";
import { buildRefundPromptWithContext } from "./prompts";
import type { RagContextItem } from "../rag/retriever";

export interface RefundDecisionOutput {
  decision:
    | "refundable"
    | "conditionally_refundable"
    | "not_refundable"
    | "requires_admin_review";
  reason: string;
  requiredAdminAction: string;
  customerFacingMessage: string;
}

export async function runRefundDecisionAgent(
  customerMessage: string,
  sessionInfo: { userId?: string; orderId?: string },
  ragContext: RagContextItem[] = []
): Promise<RefundDecisionOutput> {
  const targetProvider = "gemini";

  const hasSession =
    sessionInfo.userId && sessionInfo.userId !== "GUEST";
  const hasOrder = !!sessionInfo.orderId;

  // No login/order context → safe fallback without LLM 확정 판정
  if (!hasSession || !hasOrder) {
    return {
      decision: "requires_admin_review",
      reason:
        "로그인 또는 주문 정보가 없어 챗봇에서 환불 가능 여부를 확정할 수 없음",
      requiredAdminAction: "고객 주문 내역 확인 및 반품/환불 요청 수동 검토",
      customerFacingMessage:
        "환불·반품 가능 여부는 주문 상태 확인이 필요합니다. 마이페이지(/mypage)에서 주문 내역을 확인하시거나, 고객센터 1:1 문의를 통해 접수해 주시면 담당자가 검토 후 안내드리겠습니다. 챗봇에서는 자동 환불·결제취소 처리가 불가합니다.",
    };
  }

  const hasPolicyEvidence = ragContext.some((item) =>
    ["refund_policy", "return_policy"].includes(item.sourceType)
  );
  if (!hasPolicyEvidence) {
    return {
      decision: "requires_admin_review",
      reason: "확인 가능한 환불/반품 정책 RAG 근거가 부족함",
      requiredAdminAction: "주문 상태와 최신 환불/반품 정책 수동 확인",
      customerFacingMessage:
        "현재 확인 가능한 SLOWEON 환불/반품 정책 근거가 부족해 챗봇에서 가능 여부를 확정할 수 없습니다. 마이페이지(/mypage) 또는 1:1 문의로 접수해 주시면 담당자가 주문 상태와 상품 상태를 확인한 뒤 안내드리겠습니다. 챗봇에서는 자동 환불·결제취소 처리가 불가합니다.",
    };
  }

  const systemPrompt = buildRefundPromptWithContext({
    customerMessage,
    sessionInfo,
    ragContext,
  });

  const messages = [
    {
      role: "user" as const,
      content: customerMessage,
    },
  ];

  try {
    const response = await routeLLMRequest(targetProvider, {
      systemPrompt,
      messages,
    });

    let cleanContent = response.content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const firstBrace = cleanContent.indexOf("{");
    const lastBrace = cleanContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
    }

    const parsed: RefundDecisionOutput = JSON.parse(cleanContent);

    // Guardrail: never auto-refund messaging that implies immediate action
    if (
      parsed.decision === "refundable" ||
      parsed.decision === "conditionally_refundable"
    ) {
      parsed.customerFacingMessage =
        parsed.customerFacingMessage +
        "\n\n※ 실제 환불·결제취소는 관리자 승인 및 상품 입고 확인 후 처리됩니다.";
    }

    return parsed;
  } catch {
    console.warn(
      "Refund Decision Agent LLM/Parsing failed, using fallback decision."
    );
    return {
      decision: "requires_admin_review",
      reason:
        "환불 에이전트 분석 지연에 따른 관리자 수동 검수 이관 (Fallback)",
      requiredAdminAction:
        "주문 내역 및 결제 취소 요청 상태 수동 검토 요망",
      customerFacingMessage:
        "고객님의 환불/반품 요청은 시스템에 안전하게 기록되었습니다. 담당 부서에서 영업일 기준 1일 이내에 주문 정보를 검토한 후 안내드리겠습니다. (챗봇에서 자동 환불·결제취소는 보안 규정상 불가합니다)",
    };
  }
}
