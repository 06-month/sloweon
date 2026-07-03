import { routeLLMRequest } from "../llm/router";
import { CLASSIFICATION_SYSTEM_PROMPT } from "./prompts";

export interface ClassificationOutput {
  category: "delivery" | "product" | "refund" | "other";
  confidence: number;
  reason: string;
  nextAgent: "answerAgent" | "refundDecisionAgent";
  requiredTools: string[];
  requiredRagSources: string[];
  clarificationQuestion: string | null;
}

export async function runClassificationAgent(
  customerMessage: string,
  modelMode: string,
  selectedProvider: string
): Promise<ClassificationOutput> {
  // 1. 모델 정책 결정 (요구사항 3)
  // sk-only 또는 sk-classification-test 모드인 경우 SK A.X 모델 사용 시도.
  // 그 외 일반 normal 모드에서는 저렴하고 신속한 서버 기본 모델(gemini) 사용.
  const targetProvider = 
    modelMode === "sk_only" || modelMode === "sk_classification_test"
      ? "sk_ax"
      : "gemini";

  const systemPrompt = CLASSIFICATION_SYSTEM_PROMPT;
  const messages = [{ role: "user" as const, content: customerMessage }];

  try {
    const response = await routeLLMRequest(targetProvider, {
      systemPrompt,
      messages
    });

    // markdown json block 트리밍
    let cleanContent = response.content.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    // 간혹 LLM이 JSON 앞뒤에 임의의 설명을 붙일 수 있으므로 중괄호 위치 파싱 보완
    const firstBrace = cleanContent.indexOf("{");
    const lastBrace = cleanContent.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
    }

    const parsed: ClassificationOutput = JSON.parse(cleanContent);
    return parsed;
  } catch (err) {
    // LLM 호출 실패 혹은 JSON 파싱 에러 시 룰 기반 안전 Fallback 분류
    console.warn("Classification Agent LLM/Parsing failed, using fallback rules.");
    return fallbackClassificationRules(customerMessage);
  }
}

function fallbackClassificationRules(message: string): ClassificationOutput {
  const normalized = message.toLowerCase().replace(/\s+/g, "");
  
  if (
    normalized.includes("배송") ||
    normalized.includes("언제") ||
    normalized.includes("택배") ||
    normalized.includes("배달")
  ) {
    return {
      category: "delivery",
      confidence: 0.9,
      reason: "키워드 기반 배송 문의 분류 (Fallback)",
      nextAgent: "answerAgent",
      requiredTools: [],
      requiredRagSources: ["delivery_policy"],
      clarificationQuestion: null
    };
  }

  if (
    normalized.includes("환불") ||
    normalized.includes("반품") ||
    normalized.includes("취소") ||
    normalized.includes("결제취소")
  ) {
    return {
      category: "refund",
      confidence: 0.95,
      reason: "키워드 기반 환불/취소 문의 분류 (Fallback)",
      nextAgent: "refundDecisionAgent",
      requiredTools: [],
      requiredRagSources: ["refund_rules"],
      clarificationQuestion: null
    };
  }

  if (
    normalized.includes("추천") ||
    normalized.includes("재고") ||
    normalized.includes("사이즈") ||
    normalized.includes("상세") ||
    normalized.includes("담아") ||
    normalized.includes("장바구니") ||
    normalized.includes("소재") ||
    normalized.includes("치수")
  ) {
    return {
      category: "product",
      confidence: 0.9,
      reason: "키워드 기반 상품 문의 분류 (Fallback)",
      nextAgent: "answerAgent",
      requiredTools: ["searchProducts", "getProductDetail", "checkStock", "addToCart"],
      requiredRagSources: ["size_specs"],
      clarificationQuestion: null
    };
  }

  return {
    category: "other",
    confidence: 0.7,
    reason: "기타 일반 CS 문의 분류 (Fallback)",
    nextAgent: "answerAgent",
    requiredTools: [],
    requiredRagSources: [],
    clarificationQuestion: null
  };
}
