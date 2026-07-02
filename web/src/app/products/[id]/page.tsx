import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProductImage } from "@/components/ProductImage";
import { OptionSelector } from "@/components/OptionSelector";
import { ProductCard } from "@/components/ProductCard";
import { won, discountRate, fitLabel, effectivePrice, colorHex } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  return { title: product?.koreanName ?? "상품" };
}

const TOP_SPEC_COLUMNS = [
  { key: "totalLength", label: "총장" },
  { key: "shoulder", label: "어깨" },
  { key: "chest", label: "가슴" },
  { key: "sleeve", label: "소매" },
] as const;

const BOTTOM_SPEC_COLUMNS = [
  { key: "totalLength", label: "총장" },
  { key: "waist", label: "허리" },
  { key: "rise", label: "밑위" },
  { key: "thigh", label: "허벅지" },
  { key: "hem", label: "밑단" },
] as const;

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, user] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { sku: "asc" } },
        sizeSpecs: true,
        modelFit: true,
        reviews: {
          where: { status: "PUBLISHED" },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        lookbookItems: { include: { lookbook: { include: { items: { include: { product: { include: { variants: true } } } } } } } },
      },
    }),
    getCurrentUser(),
  ]);
  if (!product || product.status !== "ON_SALE") notFound();

  const sizeOrder = ["S", "M", "L", "XL"];
  const variants = [...product.variants].sort(
    (a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size),
  );
  const specs = [...product.sizeSpecs].sort(
    (a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size),
  );
  const specColumns = product.categorySlug === "top" ? TOP_SPEC_COLUMNS : BOTTOM_SPEC_COLUMNS;

  // 함께 입은 상품: 이 상품이 포함된 룩북의 다른 아이템 (PD-008)
  const outfitProducts = product.lookbookItems
    .flatMap((li) => li.lookbook.items.map((i) => i.product))
    .filter((p, idx, arr) => p.id !== product.id && arr.findIndex((x) => x.id === p.id) === idx)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <nav className="mb-6 text-xs text-ink-soft" aria-label="breadcrumb">
        <Link href="/products" className="hover:text-ink">SHOP</Link>
        <span className="mx-2">/</span>
        <Link href={`/products?category=${product.categorySlug}`} className="hover:text-ink">
          {product.categorySlug === "top" ? "TOPS" : "BOTTOMS"}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* 갤러리: 착용컷 + 디테일컷 (PD-001) */}
        <div className="space-y-3">
          <div className="aspect-[3/4] overflow-hidden bg-surface">
            <ProductImage imagePath={product.wornImagePath} alt={`${product.koreanName} 착용컷`} color={product.color} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="aspect-square overflow-hidden bg-surface">
              <ProductImage imagePath={product.detailImagePath} alt={`${product.koreanName} 디테일`} color={product.color} />
            </div>
            <div className="aspect-square overflow-hidden bg-surface">
              <ProductImage imagePath={product.lookbookImagePath} alt={`${product.koreanName} 룩북컷`} color={product.color} />
            </div>
          </div>
        </div>

        {/* 구매 판단 핵심 정보를 상단에 집약 (design-instruct D안) */}
        <div className="space-y-7">
          <div>
            <p className="label-caps">{product.name}</p>
            <h1 className="display mt-1 text-3xl">{product.koreanName}</h1>
            <div className="mt-3 flex items-baseline gap-3">
              {product.salePrice ? (
                <>
                  <span className="text-xl font-medium text-accent">
                    {discountRate(product.price, product.salePrice)}%
                  </span>
                  <span className="text-xl font-medium">{won(product.salePrice)}</span>
                  <span className="text-sm text-ink-faint line-through">{won(product.price)}</span>
                </>
              ) : (
                <span className="text-xl font-medium">{won(product.price)}</span>
              )}
            </div>
          </div>

          {/* 핏/색상/소재 요약 */}
          <dl className="grid grid-cols-3 gap-3 border-y hairline py-4 text-sm">
            <div>
              <dt className="label-caps mb-1">Fit</dt>
              <dd>{fitLabel(product.fit)}</dd>
            </div>
            <div>
              <dt className="label-caps mb-1">Color</dt>
              <dd className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border hairline" style={{ backgroundColor: colorHex(product.color) }} />
                {product.color}
              </dd>
            </div>
            <div>
              <dt className="label-caps mb-1">Material</dt>
              <dd>{product.material}</dd>
            </div>
          </dl>

          {/* 모델 착용 정보 — 부가 정보가 아닌 구매 판단 핵심으로 상단 배치 (PD-005) */}
          {product.modelFit && (
            <div className="border hairline bg-surface p-4 text-sm">
              <p className="label-caps mb-2">Model Fit</p>
              <p>
                {product.modelFit.modelName} 모델 · {product.modelFit.height}cm ·{" "}
                {product.modelFit.weight}kg · <strong>{product.modelFit.wearingSize}</strong> 착용
              </p>
              <p className="mt-1.5 leading-relaxed text-ink-soft">{product.modelFit.fitComment}</p>
            </div>
          )}

          <OptionSelector
            variants={variants.map((v) => ({ id: v.id, size: v.size, stock: v.stock }))}
            price={effectivePrice(product)}
            isLoggedIn={!!user}
          />

          {/* 배송/교환 요약 — 주문 전 확인 (PD-010) */}
          <div className="space-y-1.5 border-t hairline pt-4 text-xs text-ink-soft">
            <p>배송 — 기본 3,000원 · 10만원 이상 무료 · 평일 오후 2시 이전 주문 당일 출고</p>
            <p>사이즈 교환 — 배송 완료 후 7일 이내, 미착용·택 보존 시 가능</p>
            <p>반품 — 단순변심 7일 이내 (왕복 배송비 고객 부담), 불량은 무상 처리</p>
          </div>
        </div>
      </div>

      {/* 실측 사이즈표 — 상품군별 컬럼 (PD-004) */}
      <section className="mt-16">
        <p className="label-caps">Size Guide</p>
        <h2 className="display mt-1 text-2xl">실측 사이즈</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left">
                <th className="py-2.5 pr-4 font-medium">사이즈</th>
                {specColumns.map((c) => (
                  <th key={c.key} className="py-2.5 pr-4 font-medium">
                    {c.label} (cm)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specs.map((s) => (
                <tr key={s.id} className="border-b hairline">
                  <td className="py-2.5 pr-4 font-medium">{s.size}</td>
                  {specColumns.map((c) => (
                    <td key={c.key} className="py-2.5 pr-4 text-ink-soft">
                      {s[c.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          단면 측정 기준이며 측정 방법에 따라 1~3cm 오차가 있을 수 있습니다.
        </p>
      </section>

      {/* 소재/디테일 */}
      <section className="mt-14 grid gap-8 md:grid-cols-2">
        <div>
          <p className="label-caps">Detail</p>
          <h2 className="display mt-1 text-2xl">디테일</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{product.designNotes}</p>
        </div>
        <div>
          <p className="label-caps">Styling</p>
          <h2 className="display mt-1 text-2xl">스타일링 노트</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {product.stylingNotes}와 함께 매치하는 것을 추천합니다.
          </p>
        </div>
      </section>

      {/* 착용 리뷰 (PD-009, R-002) — 키/몸무게/구매 사이즈로 사이즈 판단 보조 */}
      <section className="mt-16">
        <p className="label-caps">Reviews</p>
        <h2 className="display mt-1 text-2xl">착용 리뷰 ({product.reviews.length})</h2>
        {product.reviews.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">
            아직 작성된 리뷰가 없습니다. 배송 완료 후 마이페이지에서 첫 리뷰를 남겨보세요.
          </p>
        ) : (
          <>
            {(() => {
              const avg = product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length;
              const fitCount = { SMALL: 0, JUST: 0, LARGE: 0 } as Record<string, number>;
              for (const r of product.reviews) fitCount[r.fitFeedback] = (fitCount[r.fitFeedback] ?? 0) + 1;
              const pct = (n: number) => Math.round((n / product.reviews.length) * 100);
              return (
                <div className="mt-4 flex flex-wrap gap-6 border hairline bg-surface p-4 text-sm">
                  <p>
                    <span className="display text-xl">★ {avg.toFixed(1)}</span>
                    <span className="ml-1 text-xs text-ink-soft">/ 5</span>
                  </p>
                  <p className="text-xs text-ink-soft">
                    작아요 {pct(fitCount.SMALL)}% · 정사이즈 {pct(fitCount.JUST)}% · 커요 {pct(fitCount.LARGE)}%
                  </p>
                </div>
              );
            })()}
            <ul className="mt-4 space-y-4">
              {product.reviews.map((r) => (
                <li key={r.id} className="border-b hairline pb-4">
                  <div className="flex flex-wrap items-baseline gap-2 text-xs text-ink-soft">
                    <span className="text-ink">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    <span>{r.user.name.slice(0, 1)}**님</span>
                    {(r.height || r.weight) && (
                      <span>
                        {r.height ? `${r.height}cm` : ""}{r.height && r.weight ? " · " : ""}{r.weight ? `${r.weight}kg` : ""}
                      </span>
                    )}
                    <span>{r.purchasedSize} 구매</span>
                    <span className="border hairline px-1.5 py-0.5">
                      {r.fitFeedback === "SMALL" ? "작아요" : r.fitFeedback === "LARGE" ? "커요" : "정사이즈"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.content}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* 함께 입은 상품 (PD-008) */}
      {outfitProducts.length > 0 && (
        <section className="mt-16">
          <p className="label-caps">Wear With</p>
          <h2 className="display mt-1 text-2xl">함께 입은 상품</h2>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {outfitProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
