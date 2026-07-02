import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

// menswear_demo_assets/docs/products.json 스키마
type SourceProduct = {
  id: string;
  category: "top" | "bottom";
  name: string;
  korean_name: string;
  color: string;
  material: string;
  fit: string;
  design_notes: string;
  styling_notes: string;
  price_krw: number;
  detail_image_path: string;
  worn_image_path: string;
  lookbook_image_path: string;
  short_description: string;
};

const SIZES = ["S", "M", "L", "XL"] as const;

// 시드 결과가 항상 같도록 상품 id 기반 결정적 해시
function hashInt(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

// 상품군·핏·사이즈에 따라 그럴듯한 실측값 생성 (cm)
function buildSizeSpec(p: SourceProduct, size: string, sizeIndex: number) {
  const h = hashInt(p.id);
  const jitter = (k: number) => ((h >> k) % 5) * 0.5 - 1; // -1 ~ +1
  const relaxedBoost = /oversized|boxy|loose|wide/.test(p.fit) ? 3 : /relaxed/.test(p.fit) ? 1.5 : 0;
  const step = sizeIndex; // S=0 기준 사이즈 간 증가

  if (p.category === "top") {
    return {
      categoryGroup: "TOP",
      totalLength: round1(68 + step * 2 + jitter(1)),
      shoulder: round1(46 + relaxedBoost + step * 1.5 + jitter(2)),
      chest: round1(56 + relaxedBoost + step * 2.5 + jitter(3)),
      sleeve: round1(/short-sleeve|half-sleeve|sleeveless/i.test(p.name) ? 24 + step : 60 + step * 1.5 + jitter(4)),
      waist: null,
      rise: null,
      thigh: null,
      hem: null,
    };
  }
  const isShorts = /shorts/i.test(p.name);
  return {
    categoryGroup: "BOTTOM",
    totalLength: round1((isShorts ? 50 : 102) + step * 1.5 + jitter(1)),
    shoulder: null,
    chest: null,
    sleeve: null,
    waist: round1(39 + step * 2 + jitter(2)),
    rise: round1(30 + step * 0.7 + jitter(3)),
    thigh: round1(32 + relaxedBoost * 0.5 + step * 1.2 + jitter(4)),
    hem: round1((isShorts ? 30 : 22) + relaxedBoost * 0.5 + step + jitter(5)),
  };
}

function buildModelFit(p: SourceProduct) {
  const h = hashInt(p.id);
  const models = [
    { modelName: "재현", height: 184, weight: 70 },
    { modelName: "도윤", height: 181, weight: 66 },
    { modelName: "시우", height: 186, weight: 74 },
  ];
  const m = models[h % models.length];
  const wearingSize = ["M", "L"][h % 2];
  const fitComment =
    p.category === "top"
      ? `${m.height}cm 모델이 ${wearingSize} 착용 시 ${/oversized|boxy|loose/.test(p.fit) ? "여유 있게 떨어지는 실루엣" : "자연스러운 릴랙스 실루엣"}입니다. 어깨선이 살짝 내려오는 핏으로 데일리하게 입기 좋습니다.`
      : `${m.height}cm 모델이 ${wearingSize} 착용 시 허리는 여유 있고 밑단까지 곧게 떨어집니다. 발목 위 기장을 원하시면 한 사이즈 아래를 추천합니다.`;
  return { ...m, wearingSize, fitComment };
}

// 룩북 구성: styling_notes 기반 상의-하의 매칭 (product_catalog 확인 후 수동 매핑)
const LOOKBOOK_DEFS: { title: string; styleTags: string; description: string; topId: string; bottomId: string }[] = [
  { title: "Sand & Ivory", styleTags: "미니멀,데일리", description: "샌드 린넨 셔츠와 아이보리 와이드 트라우저의 여름 기본 조합.", topId: "top_01", bottomId: "bottom_01" },
  { title: "Pale Blue Office", styleTags: "출근룩,미니멀", description: "페일 블루 포플린 셔츠에 차콜 원턱 트라우저를 더한 단정한 오피스 룩.", topId: "top_02", bottomId: "bottom_02" },
  { title: "Off-White Knit Mood", styleTags: "데이트룩,시티보이", description: "시어 니트 폴로와 페이드 블랙 플리츠 팬츠의 부드러운 대비.", topId: "top_03", bottomId: "bottom_04" },
  { title: "Navy Linen Summer", styleTags: "데일리,원마일웨어", description: "네이비 반팔 린넨 셔츠와 스톤 베이지 투턱 트라우저.", topId: "top_04", bottomId: "bottom_11" },
  { title: "Cream Boxy Denim", styleTags: "시티보이,데일리", description: "크림 박시 티셔츠에 페이드 블랙 썸머 데님을 매치한 이지 룩.", topId: "top_05", bottomId: "bottom_16" },
  { title: "Cream Wide Polo", styleTags: "출근룩,데이트룩", description: "네이비 리브 니트 폴로와 크림 코튼 트윌 와이드 팬츠.", topId: "top_12", bottomId: "bottom_07" },
  { title: "Grey Tailoring", styleTags: "출근룩,미니멀", description: "네이비 언스트럭처드 블레이저와 라이트 그레이 플리츠 슬랙스의 릴랙스 테일러링.", topId: "top_19", bottomId: "bottom_17" },
  { title: "Oxford & Bermuda", styleTags: "원마일웨어,데일리", description: "오버사이즈 옥스포드 셔츠와 라이트 카키 버뮤다 쇼츠의 여름 휴일 룩.", topId: "top_09", bottomId: "bottom_06" },
];

// 품절 데모: 재입고 알림 흐름 확인용으로 일부 variant 재고 0
const SOLD_OUT: Record<string, string[]> = {
  top_01: ["M"],
  top_03: ["L"],
  bottom_01: ["M", "L"],
  bottom_04: ["S"],
};

async function main() {
  const assetsRoot = path.resolve(__dirname, "../../menswear_demo_assets");
  const products: SourceProduct[] = JSON.parse(
    fs.readFileSync(path.join(assetsRoot, "docs/products.json"), "utf-8"),
  );

  // 재실행 안전: 전체 초기화 후 재시드 (데모 DB)
  await prisma.pointLedger.deleteMany();
  await prisma.userCoupon.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.exchangeReturnRequest.deleteMany();
  await prisma.review.deleteMany();
  await prisma.address.deleteMany();
  await prisma.inventoryLedger.deleteMany();
  await prisma.restockRequest.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.lookbookItem.deleteMany();
  await prisma.lookbook.deleteMany();
  await prisma.modelFit.deleteMany();
  await prisma.sizeSpec.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // 계정: 관리자 1 + 데모 회원 1
  const adminHash = await bcrypt.hash("admin1234!", 10);
  const memberHash = await bcrypt.hash("member1234!", 10);
  await prisma.user.create({
    data: { email: "admin@sloweon.demo", passwordHash: adminHash, name: "운영자", role: "ADMIN" },
  });
  const member = await prisma.user.create({
    data: { email: "member@sloweon.demo", passwordHash: memberHash, name: "김도현", height: 176, weight: 68 },
  });

  // 웰컴 쿠폰 + 데모 포인트
  const welcome = await prisma.coupon.create({
    data: { code: "WELCOME10", name: "첫 구매 10% 쿠폰", discountType: "RATE", discountValue: 10, minOrderAmount: 30000 },
  });
  await prisma.userCoupon.create({ data: { userId: member.id, couponId: welcome.id } });
  await prisma.pointLedger.create({
    data: { userId: member.id, changeType: "EARN", amount: 3000, balanceAfter: 3000, referenceType: "DEMO" },
  });

  for (const p of products) {
    await prisma.product.create({
      data: {
        id: p.id,
        name: p.name,
        koreanName: p.korean_name,
        categorySlug: p.category,
        color: p.color,
        material: p.material,
        fit: p.fit,
        designNotes: p.design_notes,
        stylingNotes: p.styling_notes,
        shortDescription: p.short_description,
        price: p.price_krw,
        salePrice: hashInt(p.id) % 5 === 0 ? Math.round((p.price_krw * 0.85) / 1000) * 1000 : null,
        detailImagePath: p.detail_image_path,
        wornImagePath: p.worn_image_path,
        lookbookImagePath: p.lookbook_image_path,
      },
    });

    for (const [i, size] of SIZES.entries()) {
      const soldOut = SOLD_OUT[p.id]?.includes(size) ?? false;
      const stock = soldOut ? 0 : 5 + (hashInt(p.id + size) % 20);
      const variant = await prisma.productVariant.create({
        data: {
          productId: p.id,
          colorName: p.color,
          size,
          sku: `${p.id.toUpperCase()}-${size}`,
          stock,
          status: soldOut ? "SOLD_OUT" : "ON_SALE",
        },
      });
      await prisma.inventoryLedger.create({
        data: {
          variantId: variant.id,
          changeType: "SEED",
          quantityDelta: stock,
          beforeQuantity: 0,
          afterQuantity: stock,
          referenceType: "SEED",
        },
      });
      await prisma.sizeSpec.create({
        data: { productId: p.id, size, ...buildSizeSpec(p, size, i) },
      });
    }

    await prisma.modelFit.create({ data: { productId: p.id, ...buildModelFit(p) } });
  }

  for (const [i, def] of LOOKBOOK_DEFS.entries()) {
    const top = products.find((p) => p.id === def.topId)!;
    await prisma.lookbook.create({
      data: {
        title: def.title,
        season: "26 SUMMER",
        styleTags: def.styleTags,
        imagePath: top.lookbook_image_path,
        description: def.description,
        items: {
          create: [
            { productId: def.topId, displayOrder: 0 },
            { productId: def.bottomId, displayOrder: 1 },
          ],
        },
        publishedAt: new Date(Date.now() - i * 86400000),
      },
    });
  }

  const counts = {
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    sizeSpecs: await prisma.sizeSpec.count(),
    lookbooks: await prisma.lookbook.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
