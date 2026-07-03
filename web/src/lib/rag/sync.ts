import { prisma } from "@/lib/db";
import { generateEmbedding } from "./embeddings";

export interface RagChunkInput {
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface SyncRagChunksResult {
  ok: true;
  insertedOrUpdated: number;
  sourceTypeCounts: Record<string, number>;
  durationMs: number;
}

export class RagSyncError extends Error {
  constructor(
    message: string,
    public readonly code: string = "RAG_SYNC_FAILED"
  ) {
    super(message);
    this.name = "RagSyncError";
  }
}

type SourceTypeCounts = Record<string, number>;

async function upsertChunk(
  chunk: RagChunkInput,
  counts: SourceTypeCounts
): Promise<void> {
  const embedding = await generateEmbedding(chunk.content);
  const embeddingStr = `[${embedding.join(",")}]`;

  await prisma.$executeRawUnsafe(
    `INSERT INTO rag_chunks (id, source_type, source_id, title, content, metadata, embedding, updated_at)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::jsonb, $6::vector, now())
     ON CONFLICT (source_type, source_id)
     DO UPDATE SET title = $3, content = $4, metadata = $5::jsonb, embedding = $6::vector, updated_at = now()`,
    chunk.sourceType,
    chunk.sourceId,
    chunk.title,
    chunk.content,
    JSON.stringify(chunk.metadata),
    embeddingStr
  );

  counts[chunk.sourceType] = (counts[chunk.sourceType] || 0) + 1;
}

async function syncProducts(counts: SourceTypeCounts, delayMs: number) {
  const products = await prisma.product.findMany({
    where: { status: "ON_SALE" },
    include: { variants: true },
  });

  for (const product of products) {
    const colors = [...new Set(product.variants.map((v) => v.colorName))];
    const sizes = [...new Set(product.variants.map((v) => v.size))];
    const availableSizes = product.variants
      .filter((v) => v.stock > 0 && v.status === "ON_SALE")
      .map((v) => `${v.colorName} ${v.size}`);

    const content = [
      `상품명: ${product.koreanName} (${product.name})`,
      `카테고리: ${product.categorySlug === "top" ? "상의" : "하의"}`,
      `색상: ${colors.join(", ")}`,
      `소재: ${product.material}`,
      `핏: ${product.fit}`,
      `가격: ${product.price.toLocaleString()}원${product.salePrice ? ` (세일가: ${product.salePrice.toLocaleString()}원)` : ""}`,
      `디자인: ${product.designNotes}`,
      `스타일링: ${product.stylingNotes}`,
      `사이즈: ${sizes.join(", ")}`,
      `구매 가능 옵션: ${availableSizes.length > 0 ? availableSizes.join(", ") : "품절"}`,
    ].join("\n");

    await upsertChunk(
      {
        sourceType: "product",
        sourceId: product.id,
        title: `${product.koreanName} (${product.name})`,
        content,
        metadata: {
          productId: product.id,
          category: product.categorySlug,
          price: product.price,
          salePrice: product.salePrice,
          colors,
          material: product.material,
          fit: product.fit,
          status: product.status,
        },
      },
      counts
    );

    const detailContent = [
      `상품: ${product.koreanName} (${product.name})`,
      `상태: ${product.status}`,
      `상세 설명: ${product.shortDescription}`,
      `디자인 노트: ${product.designNotes}`,
      `스타일링 노트: ${product.stylingNotes}`,
      `소재: ${product.material}`,
      `핏: ${product.fit}`,
    ].join("\n");

    await upsertChunk(
      {
        sourceType: "product_detail",
        sourceId: `detail_${product.id}`,
        title: `${product.koreanName} 상세 정보`,
        content: detailContent,
        metadata: {
          productId: product.id,
          category: product.categorySlug,
          material: product.material,
          fit: product.fit,
        },
      },
      counts
    );

    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
}

async function syncSizeSpecs(counts: SourceTypeCounts, delayMs: number) {
  const products = await prisma.product.findMany({
    where: { status: "ON_SALE" },
    include: { sizeSpecs: true, modelFit: true },
  });

  for (const product of products) {
    if (product.sizeSpecs.length === 0) continue;

    const isTop = product.categorySlug === "top";
    const sizeLines = product.sizeSpecs.map((s) => {
      if (isTop) {
        return `${s.size}: 어깨 ${s.shoulder || "-"}cm, 가슴 ${s.chest || "-"}cm, 소매 ${s.sleeve || "-"}cm, 총장 ${s.totalLength || "-"}cm`;
      }
      return `${s.size}: 허리 ${s.waist || "-"}cm, 힙 ${s.rise || "-"}cm, 허벅지 ${s.thigh || "-"}cm, 밑단 ${s.hem || "-"}cm, 총장 ${s.totalLength || "-"}cm`;
    });

    let content = `${product.koreanName} 사이즈 가이드\n${sizeLines.join("\n")}`;

    if (product.modelFit) {
      const mf = product.modelFit;
      content += `\n모델 착용 정보: ${mf.modelName} (${mf.height}cm / ${mf.weight}kg), ${mf.wearingSize} 사이즈 착용. ${mf.fitComment}`;
    }

    await upsertChunk(
      {
        sourceType: "size_guide",
        sourceId: `size_${product.id}`,
        title: `${product.koreanName} 사이즈 가이드`,
        content,
        metadata: { productId: product.id, category: product.categorySlug },
      },
      counts
    );

    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
}

async function syncReviews(counts: SourceTypeCounts, delayMs: number) {
  const products = await prisma.product.findMany({
    where: { status: "ON_SALE" },
    include: {
      reviews: {
        where: { status: "PUBLISHED" },
        select: {
          rating: true,
          content: true,
          fitFeedback: true,
          purchasedSize: true,
          height: true,
          weight: true,
        },
      },
    },
  });

  for (const product of products) {
    if (product.reviews.length === 0) continue;

    const avgRating = (
      product.reviews.reduce((sum, r) => sum + r.rating, 0) /
      product.reviews.length
    ).toFixed(1);
    const fitCounts = { SMALL: 0, JUST: 0, LARGE: 0 };
    product.reviews.forEach((r) => {
      if (r.fitFeedback in fitCounts) {
        fitCounts[r.fitFeedback as keyof typeof fitCounts]++;
      }
    });

    const reviewTexts = product.reviews.slice(0, 5).map((r) => {
      const bodyInfo =
        r.height && r.weight
          ? `(${r.height}cm/${r.weight}kg, ${r.purchasedSize})`
          : `(${r.purchasedSize})`;
      return `★${r.rating} ${bodyInfo}: ${r.content.slice(0, 100)}`;
    });

    const content = [
      `${product.koreanName} 리뷰 요약`,
      `평균 평점: ${avgRating}점 (${product.reviews.length}개 리뷰)`,
      `핏 피드백: 작아요 ${fitCounts.SMALL}명, 딱 맞아요 ${fitCounts.JUST}명, 커요 ${fitCounts.LARGE}명`,
      `대표 리뷰:`,
      ...reviewTexts,
    ].join("\n");

    await upsertChunk(
      {
        sourceType: "review_summary",
        sourceId: `review_${product.id}`,
        title: `${product.koreanName} 리뷰 요약`,
        content,
        metadata: {
          productId: product.id,
          avgRating: parseFloat(avgRating),
          reviewCount: product.reviews.length,
          fitCounts,
        },
      },
      counts
    );

    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
}

async function syncPolicies(counts: SourceTypeCounts, delayMs: number) {
  const policies: RagChunkInput[] = [
    {
      sourceType: "shipping_policy",
      sourceId: "shipping_main",
      title: "SLOWEON 배송 정책",
      content: `SLOWEON 배송 정책 안내\n- 배송비: 전 상품 무료배송 (도서산간 지역 추가 3,000원)\n- 배송 소요: 결제 완료 후 영업일 기준 1~3일 이내 출고, 출고 후 1~2일 배송\n- 당일 출고: 오후 2시 이전 결제 완료 주문은 당일 출고 (영업일 기준)\n- 배송 추적: 출고 완료 시 SMS/알림톡으로 운송장 번호 안내\n- 배송사: CJ대한통운\n- 부재 시: 경비실 또는 문 앞 배송 (배송 메모에 요청 가능)`,
      metadata: { category: "shipping" },
    },
    {
      sourceType: "return_policy",
      sourceId: "return_main",
      title: "SLOWEON 교환/반품 정책",
      content: `SLOWEON 교환/반품 정책 안내\n- 교환/반품 접수: 상품 수령 후 7일 이내 접수 가능\n- 교환/반품 사유: 사이즈 교환, 색상 교환, 단순 변심, 상품 불량\n- 교환 배송비: 사이즈/색상 교환 시 왕복 배송비 6,000원 고객 부담 (불량 시 무료)\n- 반품 배송비: 단순 변심 반품 시 왕복 배송비 6,000원 고객 부담 (불량 시 무료)\n- 교환/반품 불가: 착용 흔적, 세탁, 수선, 택 제거, 향수/화장품 이염\n- 처리 기간: 반품 상품 입고 확인 후 영업일 기준 1~3일 이내 환불 처리`,
      metadata: { category: "return" },
    },
    {
      sourceType: "refund_policy",
      sourceId: "refund_main",
      title: "SLOWEON 환불 정책",
      content: `SLOWEON 환불 정책 안내\n- 환불 조건: 반품 접수 및 상품 입고 확인 완료 후 환불 처리\n- 환불 방법: 결제 수단에 따라 자동 환불 (카드 취소 3~5 영업일, 계좌이체 1~3 영업일)\n- 부분 환불: 주문 내 일부 상품만 반품 시 해당 상품 금액만 환불\n- 쿠폰/적립금: 주문 시 사용한 쿠폰은 복원 불가, 적립금은 반환\n- 환불 불가: 교환/반품 불가 사유에 해당하는 경우\n- 문의: 마이페이지 > 1:1 문의 또는 고객센터를 통해 문의`,
      metadata: { category: "refund" },
    },
    {
      sourceType: "faq",
      sourceId: "faq_size",
      title: "사이즈 선택 FAQ",
      content: `Q: 사이즈를 어떻게 선택하나요?\nA: 각 상품 페이지의 실측 사이즈표를 참고해 주세요. 모델 착용 정보에서 모델의 키, 체중, 착용 사이즈를 확인하시면 선택에 도움이 됩니다. 리뷰의 핏 피드백(작아요/딱 맞아요/커요)도 참고해 보세요.\n\nQ: 평소 사이즈와 다를 수 있나요?\nA: 브랜드와 핏에 따라 사이즈 편차가 있을 수 있습니다. SLOWEON 제품은 실측 사이즈표를 기준으로 주문하시는 것을 권장드립니다. 오버핏 상품은 평소보다 한 사이즈 작게, 슬림핏은 평소 사이즈로 주문하시면 됩니다.`,
      metadata: { category: "faq" },
    },
    {
      sourceType: "faq",
      sourceId: "faq_order",
      title: "주문/결제 FAQ",
      content: `Q: 주문 후 변경이 가능한가요?\nA: 배송 준비 전(PAID 상태)까지 마이페이지에서 주문 취소 후 재주문해 주세요. 배송 준비 시작(PREPARING) 이후에는 취소가 불가하며, 수령 후 교환/반품을 이용하셔야 합니다.\n\nQ: 결제 수단은 무엇이 있나요?\nA: 신용/체크카드, 간편결제(카카오페이, 네이버페이, 토스페이), 계좌이체를 지원합니다.\n\nQ: 품절된 상품은 다시 입고되나요?\nA: 상품 페이지에서 재입고 알림 신청을 해주시면, 재입고 시 알림을 보내드립니다.`,
      metadata: { category: "faq" },
    },
    {
      sourceType: "brand_guide",
      sourceId: "brand_sloweon",
      title: "SLOWEON 브랜드 스타일 가이드",
      content: `SLOWEON 브랜드 스타일 가이드\n- 콘셉트: 남성 컨템포러리 캐주얼. 편안하면서도 세련된 일상복.\n- 타겟: 20~30대 남성. 깔끔하고 심플한 스타일을 선호하는 직장인/대학생.\n- 핵심 소재: 코튼, 린넨, 울 블렌드, 나일론. 시즌별 소재 차별화.\n- 핏 방향: 레귤러핏~오버핏 중심. 과도한 루즈핏은 지양.\n- 색상 팔레트: 차콜, 네이비, 블랙, 베이지, 카키 등 뉴트럴 컬러 중심.\n- 스타일 제안: 셔츠+슬랙스 출근룩, 티셔츠+치노 데일리룩, 오버핏 상의+와이드 팬츠 캐주얼룩.\n- 시즌 키워드: S/S - 린넨, 시어서커, 쿨맥스. F/W - 울, 플리스, 코듀로이.`,
      metadata: { category: "brand" },
    },
  ];

  for (const policy of policies) {
    await upsertChunk(policy, counts);
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
}

async function assertRagChunksTable(): Promise<void> {
  try {
    await prisma.$queryRawUnsafe(`SELECT COUNT(*) FROM rag_chunks`);
  } catch {
    throw new RagSyncError(
      "rag_chunks table does not exist. Run rag_pgvector_setup.sql migration first.",
      "RAG_TABLE_MISSING"
    );
  }
}

export interface SyncRagChunksOptions {
  /** Delay between embedding calls (ms). CLI uses 200; API may use 0 for speed within timeout. */
  delayMs?: number;
}

export async function syncRagChunks(
  options: SyncRagChunksOptions = {}
): Promise<SyncRagChunksResult> {
  const start = Date.now();
  const delayMs = options.delayMs ?? 200;
  const sourceTypeCounts: SourceTypeCounts = {};

  await assertRagChunksTable();

  await syncProducts(sourceTypeCounts, delayMs);
  await syncSizeSpecs(sourceTypeCounts, delayMs);
  await syncReviews(sourceTypeCounts, delayMs);
  await syncPolicies(sourceTypeCounts, delayMs);

  const insertedOrUpdated = Object.values(sourceTypeCounts).reduce(
    (sum, n) => sum + n,
    0
  );

  return {
    ok: true,
    insertedOrUpdated,
    sourceTypeCounts,
    durationMs: Date.now() - start,
  };
}
