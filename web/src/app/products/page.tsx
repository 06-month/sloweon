import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";

export const metadata = { title: "상품" };

// 필터 그룹 정의 — 원본 fit/color 문자열을 탐색 친화적인 그룹으로 묶는다 (P-003)
const FIT_GROUPS: { key: string; label: string; match: string[] }[] = [
  { key: "relaxed", label: "릴랙스", match: ["relaxed"] },
  { key: "wide", label: "와이드", match: ["wide"] },
  { key: "boxy", label: "박시·오버", match: ["boxy", "oversized", "loose"] },
  { key: "tailoring", label: "테일러링", match: ["tailoring", "tailored"] },
];

const COLOR_GROUPS: { key: string; label: string; hex: string; match: string[] }[] = [
  { key: "beige", label: "베이지", hex: "#CBBBA0", match: ["beige", "sand", "cream", "ivory", "khaki"] },
  { key: "white", label: "화이트", hex: "#F2EFE8", match: ["off-white", "white"] },
  { key: "blue", label: "블루", hex: "#B8C9D9", match: ["blue"] },
  { key: "navy", label: "네이비", hex: "#333E52", match: ["navy"] },
  { key: "grey", label: "그레이", hex: "#A8A398", match: ["grey", "charcoal", "stone grey"] },
  { key: "black", label: "블랙", hex: "#26241F", match: ["black"] },
];

const SORTS: { key: string; label: string }[] = [
  { key: "new", label: "신상품순" },
  { key: "price_asc", label: "낮은 가격순" },
  { key: "price_desc", label: "높은 가격순" },
];

type Search = {
  category?: string;
  fit?: string;
  color?: string;
  sort?: string;
  q?: string;
  sale?: string;
};

function buildQuery(current: Search, patch: Partial<Search>): string {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...current, ...patch })) {
    if (v) next[k] = v;
  }
  const qs = new URLSearchParams(next).toString();
  return qs ? `/products?${qs}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const { category, fit, color, sort = "new", q, sale } = params;

  const where: Prisma.ProductWhereInput = { status: "ON_SALE" };
  if (category) where.categorySlug = category;
  if (sale) where.salePrice = { not: null };
  if (fit) {
    const group = FIT_GROUPS.find((g) => g.key === fit);
    if (group) where.OR = group.match.map((m) => ({ fit: { contains: m } }));
  }
  if (color) {
    const group = COLOR_GROUPS.find((g) => g.key === color);
    if (group) {
      const colorOr = group.match.map((m) => ({ color: { contains: m } }));
      where.AND = [{ OR: colorOr }];
    }
  }
  if (q) {
    const keyword = q.trim();
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { koreanName: { contains: keyword } },
          { name: { contains: keyword } },
          { material: { contains: keyword } },
          { fit: { contains: keyword } },
        ],
      },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc" ? { price: "asc" } : sort === "price_desc" ? { price: "desc" } : { publishedAt: "desc" };

  const products = await prisma.product.findMany({ where, include: { variants: true }, orderBy });

  const title = q
    ? `"${q}" 검색 결과`
    : sale
      ? "Sale"
      : category === "top"
        ? "Tops"
        : category === "bottom"
          ? "Bottoms"
          : "All Products";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="mb-8">
        <p className="label-caps">26 Summer</p>
        <h1 className="display mt-1 text-4xl">{title}</h1>
      </div>

      {/* 필터 — 적용 즉시 갱신되는 링크 기반, 결과 수 상시 표시 (design-instruct D안) */}
      <div className="mb-8 space-y-3 border-y hairline py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps w-14 flex-none">분류</span>
          {[
            { key: "", label: "전체" },
            { key: "top", label: "상의" },
            { key: "bottom", label: "하의" },
          ].map((c) => (
            <Link
              key={c.key || "all"}
              href={buildQuery(params, { category: c.key || undefined })}
              className={`border px-3 py-1.5 text-xs transition-colors ${
                (category ?? "") === c.key
                  ? "border-ink bg-ink text-bg"
                  : "hairline text-ink-soft hover:border-line-strong"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps w-14 flex-none">핏</span>
          {FIT_GROUPS.map((g) => (
            <Link
              key={g.key}
              href={buildQuery(params, { fit: fit === g.key ? undefined : g.key })}
              className={`border px-3 py-1.5 text-xs transition-colors ${
                fit === g.key ? "border-ink bg-ink text-bg" : "hairline text-ink-soft hover:border-line-strong"
              }`}
            >
              {g.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps w-14 flex-none">색상</span>
          {COLOR_GROUPS.map((g) => (
            <Link
              key={g.key}
              href={buildQuery(params, { color: color === g.key ? undefined : g.key })}
              className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs transition-colors ${
                color === g.key ? "border-ink" : "hairline text-ink-soft hover:border-line-strong"
              }`}
            >
              <span className="h-3 w-3 rounded-full border hairline" style={{ backgroundColor: g.hex }} />
              {g.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <p className="text-xs text-ink-soft">
            {products.length}개 상품
            {(fit || color || category || q || sale) && (
              <Link href="/products" className="ml-3 underline hover:text-ink">
                필터 초기화
              </Link>
            )}
          </p>
          <div className="flex gap-3">
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={buildQuery(params, { sort: s.key })}
                className={`text-xs ${sort === s.key ? "font-medium text-ink" : "text-ink-soft hover:text-ink"}`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="display text-2xl">조건에 맞는 상품이 없습니다</p>
          <p className="mt-2 text-sm text-ink-soft">필터를 변경하거나 다른 검색어를 입력해 보세요.</p>
          <Link href="/products" className="label-caps mt-6 inline-block underline">
            전체 상품 보기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
