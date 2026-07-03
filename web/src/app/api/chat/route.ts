import { NextRequest, NextResponse } from "next/server";
import { routeLLMRequest } from "@/lib/llm/router";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { addTrace } from "@/lib/agents/trace";
import { searchProducts, getProductDetail, checkStock, addToCart } from "@/lib/tools/productTools";
import { tool } from "ai";
import { z } from "zod";

// 챗봇 시스템 프롬프트 및 가드레일 정의 (AnswerAgent 등에서 사용)
const SYSTEM_PROMPT = `너는 남성 컨템포러리 패션 브랜드 "SLOWEON"의 인공지능 쇼핑 어시스턴트다.
아래 가이드라인에 따라 정중하고 세련된 말투로 대답하라.

[가드레일 및 답변 정책]
1. 품절 상태인 상품(stock이 0이거나 status가 SOLD_OUT)은 절대 추천하지 마라.
2. 주문, 결제, 반품, 취소 및 개인정보 조회 등 민감한 거래 관련 요청은 아직 미구현 상태이므로 지원하지 않음을 정중히 고지하고, 마이페이지(link: /mypage) 또는 고객센터 1:1 게시판을 이용하라고 안내하라.
3. 브랜드 공식 정책문서에 없는 내용은 추측하거나 단정하지 마라.
4. 사용자 질문에 대해 답하기 곤란하거나 에러가 발생한 경우, "상담원 연결"을 할 수 있도록 안내해라.
5. 남성 컨템포러리 브랜드 톤앤매너에 맞게 간결하고, 이모티콘을 남발하지 않는 세련된 존댓말을 써라.
6. 제공된 도구(Tools)를 적극적으로 활용하여 답변하라.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, modelProvider } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content || "";
    
    // modelProvider 검증 및 화이트리스트 필터링 (요구사항 5)
    let provider = modelProvider || "gemini";
    if (provider !== "gemini" && provider !== "claude" && provider !== "sk_ax" && provider !== "openai") {
      provider = "gemini";
    }

    // 1. 환경변수 검증 (보안 가드레일)
    // 만약 로컬에 GEMINI_API_KEY조차 없고, gemini를 선택했다면 MVP 테스트 유지를 위해 Mock Fallback 작동
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    if (provider === "gemini" && !hasGeminiKey) {
      const fallbackResult = await runMockAgent(lastMessage);
      
      // Mock Agent 에칭 결과 디버깅을 위한 Trace 수집
      const traceId = "tr_" + Math.random().toString(36).substr(2, 9);
      const isRefundKeywords = lastMessage.includes("환불") || lastMessage.includes("반품") || lastMessage.includes("결제") || lastMessage.includes("주문") || lastMessage.includes("배송");
      addTrace({
        traceId,
        timestamp: new Date().toLocaleString("ko-KR"),
        userMessage: lastMessage,
        selectedModelProvider: "gemini (Mock Fallback)",
        agentModelMode: "normal (Mock Fallback Mode)",
        classificationResult: {
          category: isRefundKeywords ? "refund" : (lastMessage.includes("추천") || lastMessage.includes("재고") || lastMessage.includes("장바구니") ? "product" : "other"),
          confidence: 1.0,
          reason: "API Key 미비로 인한 Mock 고속 룰매칭 의도 분류",
          nextAgent: isRefundKeywords ? "refundDecisionAgent" : "answerAgent"
        },
        finalAnswer: fallbackResult.content,
        guardrailActions: {
          blockedOrderAction: lastMessage.includes("주문") || lastMessage.includes("결제"),
          blockedRefundAction: isRefundKeywords,
          fallbackUsed: true
        },
        latency: 8,
        error: null
      });

      return NextResponse.json(fallbackResult);
    }

    // 그 외 Provider들의 API Key 누락 체크
    if (provider === "claude" && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        role: "assistant",
        content: "현재 선택한 AI 모델을 사용할 수 없습니다. 다른 모델을 선택하거나 잠시 후 다시 시도해 주세요."
      });
    }

    if (provider === "sk_ax" && (!process.env.SK_AX_API_KEY || !process.env.SK_AX_BASE_URL)) {
      return NextResponse.json({
        role: "assistant",
        content: "현재 SK A.X 모델 연결 정보가 완전히 설정되지 않았습니다. Gemini 또는 Claude를 선택해 주세요."
      });
    }

    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        role: "assistant",
        content: "현재 OpenAI 모델 연결 정보가 완전히 설정되지 않았습니다. 다른 모델을 선택해 주세요."
      });
    }

    // 2. MVP2 Multi-Agent Orchestrator 호출 적용 (요구사항 1 & 3 & 4)
    const orchestratorResult = await runOrchestrator(messages, provider, {
      userId: "user_01", // MVP 임시 가상 세션 ID
      orderId: undefined
    });

    return NextResponse.json({
      role: "assistant",
      content: orchestratorResult.content,
      traceId: orchestratorResult.traceId
    });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({
      role: "assistant",
      content: "죄송합니다. 메시지 처리 중 오류가 발생했습니다. 상세한 답변을 원하시면 고객센터 또는 [상담원 연결]을 이용해 주시기 바랍니다."
    }, { status: 500 });
  }
}

// GEMINI_API_KEY가 존재하지 않을 때 안전하게 작동하는 Mock Agent 규칙 엔진
async function runMockAgent(query: string) {
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, "");

  // Guardrail 1: 주문, 결제, 반품, 개인정보 관련
  if (
    normalizedQuery.includes("주문") ||
    normalizedQuery.includes("결제") ||
    normalizedQuery.includes("반품") ||
    normalizedQuery.includes("취소") ||
    normalizedQuery.includes("환불") ||
    normalizedQuery.includes("배송") ||
    normalizedQuery.includes("내역") ||
    normalizedQuery.includes("조회") ||
    normalizedQuery.includes("개인정보")
  ) {
    return {
      role: "assistant",
      content: "죄송합니다. 현재 1차 MVP 챗봇에서는 안전한 거래 보안 및 정책 유지를 위해 **주문, 결제, 취소, 배송 및 개인정보 조회** 기능은 직접 제공하지 않습니다. \n\n해당 작업은 [마이페이지](/mypage) 또는 주문서 내 공식 UI를 이용해 주시기 바랍니다. 상세한 안내가 필요하신 경우 [고객센터(1:1 문의 게시판)](/mypage) 또는 [상담원 연결]을 요청해 주세요."
    };
  }

  // Guardrail 2: 장바구니 담기 요청 파싱
  if (normalizedQuery.includes("장바구니") || normalizedQuery.includes("담아") || normalizedQuery.includes("카트")) {
    const productIdMatch = query.match(/(top_\d{2}|bottom_\d{2})/i);
    const sizeMatch = query.match(/(s|m|l|xl)/i);
    const colorMatch = query.match(/(차콜|블랙|네이비|그레이|카키|베이지|화이트|charcoal|black|navy|grey|khaki|beige|white)/i);

    if (productIdMatch && sizeMatch && colorMatch) {
      const productId = productIdMatch[0].toLowerCase();
      const size = sizeMatch[0].toUpperCase();
      const colorKo = colorMatch[0];
      
      let color = colorKo;
      if (colorKo === "차콜") color = "Charcoal";
      else if (colorKo === "블랙") color = "Black";
      else if (colorKo === "네이비") color = "Navy";
      else if (colorKo === "그레이") color = "Grey";
      
      const cartResult = await addToCart(productId, color, size, 1);
      if (cartResult.success) {
        return {
          role: "assistant",
          content: `요청하신대로 **[${productId.toUpperCase()}]** 상품의 **${color} / ${size}** 옵션을 장바구니에 성공적으로 담았습니다. [장바구니 바로가기](/cart)를 클릭해 확인해 보세요.`
        };
      } else {
        return {
          role: "assistant",
          content: `장바구니 담기에 실패했습니다: ${cartResult.error || "옵션을 찾을 수 없거나 품절입니다."}`
        };
      }
    }
    return {
      role: "assistant",
      content: "장바구니에 상품을 담으시려면 상품 ID(예: `top_01`), 색상(예: `Black`), 사이즈(예: `M`)를 명확히 말씀해 주세요. \n\n*예: 'top_01 블랙 M 장바구니에 담아줘'*"
    };
  }

  // Guardrail 3: 특정 상품 상세 조회
  const productIdMatch = query.match(/(top_\d{2}|bottom_\d{2})/i);
  if (productIdMatch && (normalizedQuery.includes("상세") || normalizedQuery.includes("정보") || normalizedQuery.includes("치수") || normalizedQuery.includes("사이즈") || normalizedQuery.includes("스펙") || normalizedQuery.includes("소재"))) {
    const productId = productIdMatch[0].toLowerCase();
    const detailResult = await getProductDetail(productId);

    if (detailResult.error || !detailResult.product) {
      return {
        role: "assistant",
        content: `해당 상품(${productId.toUpperCase()})의 정보를 조회할 수 없습니다. 판매 중인 상품인지 확인해 주시기 바랍니다.`
      };
    }

    const { product } = detailResult;
    const sizeSpecText = product.sizeSpecs
      .map((s: any) => `- **${s.size} 사이즈**: 어깨 ${s.shoulder || "-"}cm / 가슴 ${s.chest || "-"}cm / 소매 ${s.sleeve || "-"}cm / 총장 ${s.totalLength || "-"}cm`)
      .join("\n");
      
    const modelText = product.modelFit
      ? `모델 착용: **${product.modelFit.modelName}** (${product.modelFit.height}cm / ${product.modelFit.weight}kg), **${product.modelFit.wearingSize}** 사이즈 착용. \n> *"${product.modelFit.fitComment}"*`
      : "등록된 모델 착용 정보가 없습니다.";

    return {
      role: "assistant",
      content: `### [${product.koreanName} (${product.name})](/products/${product.id})
      
**소재**: ${product.material}
**실루엣/핏**: ${product.fit}
**소비자가**: ${product.price.toLocaleString()}원
**디자인 코멘트**: ${product.designNotes}

#### 📏 실측 사이즈표
${sizeSpecText}

#### 🧍 모델 피팅 정보
${modelText}

*위 정보는 SLOWEON 데이터베이스에 기반한 실시간 상세 스펙입니다.*`
    };
  }

  // Guardrail 4: 재고 조회
  if (productIdMatch && (normalizedQuery.includes("재고") || normalizedQuery.includes("남았"))) {
    const productId = productIdMatch[0].toLowerCase();
    const sizeMatch = query.match(/(s|m|l|xl)/i);
    const size = sizeMatch ? sizeMatch[0].toUpperCase() : "M";
    
    const stockResult = await checkStock(productId, size);
    if (stockResult.variants && stockResult.variants.length > 0) {
      const variantText = stockResult.variants
        .map((v: any) => `- 색상: **${v.colorName}** | 재고: ${v.stock > 0 ? `**${v.stock}개**` : "**품절 (SOLD_OUT)**"}`)
        .join("\n");
      return {
        role: "assistant",
        content: `### [${productId.toUpperCase()}] 상품 ${size} 사이즈 실시간 재고 현황입니다.
        
${variantText}

*실시간 재고 데이터이므로 주문 결제 상황에 따라 동적으로 변동될 수 있습니다.*`
      };
    } else {
      return {
        role: "assistant",
        content: `[${productId.toUpperCase()}] 상품의 ${size} 사이즈 재고 정보를 불러올 수 없거나 옵션이 존재하지 않습니다.`
      };
    }
  }

  // Guardrail 5: 상품 검색 및 추천
  if (
    normalizedQuery.includes("추천") ||
    normalizedQuery.includes("검색") ||
    normalizedQuery.includes("찾아") ||
    normalizedQuery.includes("목록") ||
    normalizedQuery.includes("셔츠") ||
    normalizedQuery.includes("바지") ||
    normalizedQuery.includes("의류") ||
    normalizedQuery.includes("아우터") ||
    normalizedQuery.includes("상의") ||
    normalizedQuery.includes("하의")
  ) {
    let categorySlug: string | undefined;
    if (normalizedQuery.includes("상의") || normalizedQuery.includes("셔츠") || normalizedQuery.includes("탑") || normalizedQuery.includes("티셔츠")) {
      categorySlug = "top";
    } else if (normalizedQuery.includes("하의") || normalizedQuery.includes("바지") || normalizedQuery.includes("팬츠")) {
      categorySlug = "bottom";
    }

    const searchResult = await searchProducts({
      categorySlug,
      query: query.replace(/(추천|해줘|검색|찾아줘|목록)/gi, "").trim()
    });

    if (searchResult.products && searchResult.products.length > 0) {
      const productCards = searchResult.products
        .map((p: any) => `- **[${p.koreanName}](/products/${p.id})** (${p.price.toLocaleString()}원) - ${p.color} / ${p.shortDescription}`)
        .join("\n");

      return {
        role: "assistant",
        content: `### 🔍 고객님께 추천하는 SLOWEON 상품 목록입니다.

${productCards}

*원하시는 상품의 자세한 스펙이나 모델 정보는 상품명을 클릭하시거나 'top_01 상세 정보 알려줘'와 같이 질문해 주세요.*`
      };
    } else {
      return {
        role: "assistant",
        content: "죄송합니다. 현재 조건에 부합하는 판매 중인 상품을 찾을 수 없습니다. 다른 키워드(예: '셔츠 추천', '차콜 바지')로 입력해 주시겠습니까?"
      };
    }
  }

  // 기본 Fallback
  return {
    role: "assistant",
    content: "안녕하세요! 남성 컨템포러리 패션 브랜드 **SLOWEON**의 쇼핑 도우미 챗봇(MVP)입니다. \n\n현재 챗봇에서는 아래의 실시간 정보 조회 및 쇼핑 도우미 기능을 지원하고 있습니다.\n\n- **상품 추천 및 검색** *(예: '상의 추천해줘', '차콜색 옷 있어?')*\n- **상품 상세 실측 및 모델 핏 정보** *(예: 'top_01 상세 정보 알려줘')*\n- **실시간 옵션 재고 확인** *(예: 'top_02 M사이즈 재고 확인해줘')*\n- **장바구니 담기 대행** *(예: 'top_01 Charcoal M 장바구니에 담아줘')*\n\n궁금한 부분을 말씀해 주시면 빠르게 안내해 드리겠습니다. (주문/결제 및 개인정보 조회 기능은 현재 준비 중이며, 실패 시 상담원 연결이 가능합니다.)"
  };
}
