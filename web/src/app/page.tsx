import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  assetExists,
  assetUrl,
  HERO_IMAGE_PATH,
  NEW_ARRIVAL_IMAGE_PATH,
  TOPS_IMAGE_PATH,
  BOTTOMS_IMAGE_PATH,
  SETUP_IMAGE_PATH,
} from "@/lib/assets";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { won, effectivePrice } from "@/lib/format";

/** 메인 비주얼 슬롯 — 파일이 있으면 이미지, 없으면 무지 배경으로 폴백 */
function OverviewImage({ path, alt, className = "" }: { path: string; alt: string; className?: string }) {
  if (assetExists(path)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={assetUrl(path)} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} />
    );
  }
  return <div aria-hidden className={`h-full w-full bg-sand/40 ${className}`} />;
}

export default async function HomePage() {
  const [bestProducts, newProducts, lookbooks, restockPopular] = await Promise.all([
    // 베스트 스트립: 히어로 아래 상시 노출 (design-instruct A안)
    prisma.product.findMany({
      where: { status: "ON_SALE" },
      include: { variants: true },
      orderBy: [{ salePrice: "asc" }, { publishedAt: "desc" }],
      take: 6,
    }),
    prisma.product.findMany({
      where: { status: "ON_SALE" },
      include: { variants: true },
      orderBy: { publishedAt: "desc" },
      take: 8,
    }),
    prisma.lookbook.findMany({
      where: { status: "PUBLISHED" },
      include: { items: { include: { product: true }, orderBy: { displayOrder: "asc" } } },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    prisma.restockRequest.groupBy({
      by: ["variantId"],
      where: { status: "REQUESTED" },
      _count: true,
      orderBy: { _count: { variantId: "desc" } },
      take: 4,
    }),
  ]);

  const heroReady = assetExists(HERO_IMAGE_PATH);

  return (
    <div>
      {/* 히어로 — 풀블리드 캠페인 + 텍스트 세이프 존 그라디언트 + 단일 CTA (design-instruct A안) */}
      <section className="relative border-b hairline">
        {heroReady ? (
          <div className="relative h-[72vh] min-h-[440px] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetUrl(HERO_IMAGE_PATH)}
              alt="Quiet City Summer 2026 캠페인 — 린넨 셔츠와 아이보리 와이드 트라우저"
              className="h-full w-full object-cover object-[center_30%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 text-white md:p-14">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/85">26 Summer Collection</p>
              <h1 className="display mt-2 text-4xl md:text-6xl">Quiet City Summer</h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/90">
                린넨과 시어 니트, 릴랙스 테일러링 — 여름의 도시를 위한 차분한 옷들.
              </p>
              <Link
                href="/products"
                className="mt-6 inline-block bg-white px-9 py-3.5 text-xs tracking-[0.2em] text-ink transition-opacity hover:opacity-90"
              >
                SHOP 26 SUMMER
              </Link>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex min-h-[56vh] max-w-6xl flex-col items-center justify-center px-4 py-20 text-center md:py-28">
            <p className="label-caps">Quiet City Summer 2026</p>
            <h1 className="display mt-4 text-5xl leading-tight md:text-7xl">
              여름의 도시,
              <br />
              차분한 옷들
            </h1>
            <Link
              href="/products"
              className="mt-8 inline-block bg-ink px-10 py-3.5 text-xs tracking-[0.2em] text-bg transition-opacity hover:opacity-85"
            >
              SHOP 26 SUMMER
            </Link>
          </div>
        )}

        {/* 베스트 상품 스트립 — 감성과 상업성 동시 달성 (design-instruct A안) */}
        <div className="border-t hairline bg-surface">
          <div className="mx-auto max-w-6xl overflow-x-auto px-4 md:px-6">
            <ul className="flex gap-6 py-4">
              {bestProducts.map((p) => (
                <li key={p.id} className="w-36 flex-none">
                  <Link href={`/products/${p.id}`} className="group block">
                    <div className="aspect-[3/4] overflow-hidden">
                      <ProductImage
                        imagePath={p.wornImagePath}
                        alt={p.koreanName}
                        color={p.color}
                        className="transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                    <p className="mt-2 truncate text-xs">{p.koreanName}</p>
                    <p className="text-xs font-medium">
                      {p.salePrice && <span className="mr-1 text-accent">SALE</span>}
                      {won(effectivePrice(p))}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 카테고리 카드 — 이미지 위 카피, 세이프 존 그라디언트 */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              href: "/products?category=top",
              title: "Tops",
              desc: "린넨 셔츠 · 니트 폴로 · 썸머 블레이저",
              image: TOPS_IMAGE_PATH,
            },
            {
              href: "/products?category=bottom",
              title: "Bottoms",
              desc: "와이드 트라우저 · 플리츠 슬랙스 · 쇼츠",
              image: BOTTOMS_IMAGE_PATH,
            },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="group relative block overflow-hidden">
              <div className="aspect-[3/2]">
                <OverviewImage
                  path={c.image}
                  alt={`${c.title} 카테고리`}
                  className="transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-7 text-white">
                <h2 className="display text-3xl">{c.title}</h2>
                <p className="mt-1 text-xs text-white/85">{c.desc}</p>
                <span className="mt-4 inline-block text-[11px] uppercase tracking-[0.2em] text-white/90 underline-offset-4 group-hover:underline">
                  Shop now →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 신상품 — 에디토리얼 밴드 + 상품 그리드 */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <Link href="/products" className="group relative block overflow-hidden">
          <div className="aspect-[3/1] min-h-44">
            <OverviewImage
              path={NEW_ARRIVAL_IMAGE_PATH}
              alt="New Arrivals — 26 Summer 신상품"
              className="transition-transform duration-700 group-hover:scale-[1.02]"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-ink/50 via-ink/10 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-8 text-white md:p-12">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/85">New Arrivals</p>
            <h2 className="display mt-1 text-3xl md:text-4xl">신규 입고</h2>
            <span className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/90 underline-offset-4 group-hover:underline">
              View all →
            </span>
          </div>
        </Link>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {newProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* 셋업 컬렉션 밴드 */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <Link href="/lookbooks" className="group relative block overflow-hidden">
          <div className="aspect-[3/1] min-h-44">
            <OverviewImage
              path={SETUP_IMAGE_PATH}
              alt="셋업 컬렉션 — 상하의를 한 번에"
              className="transition-transform duration-700 group-hover:scale-[1.02]"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-l from-ink/50 via-ink/10 to-transparent" />
          <div className="absolute inset-y-0 right-0 flex flex-col items-end justify-center p-8 text-right text-white md:p-12">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/85">Setup Collection</p>
            <h2 className="display mt-1 text-3xl md:text-4xl">LookBook</h2>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-white/85">
              같은 소재의 조화로 완성하는 정돈된 실루엣. 유연한 착용감의 여름 셋업 컬렉션.
            </p>
            <span className="mt-4 text-[11px] uppercase tracking-[0.2em] text-white/90 underline-offset-4 group-hover:underline">
              룩북 보러가기 →
            </span>
          </div>
        </Link>
      </section>

      {/* 룩북 — 착장 단위 탐색 (design-instruct F안) */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="label-caps">Lookbook</p>
            <h2 className="display mt-1 text-3xl">시즌 에디토리얼</h2>
          </div>
          <Link href="/lookbooks" className="label-caps hover:text-ink">
            View all →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {lookbooks.map((lb) => (
            <Link key={lb.id} href={`/lookbooks/${lb.id}`} className="group block">
              <div className="aspect-[3/4] overflow-hidden bg-surface">
                <ProductImage
                  imagePath={lb.imagePath}
                  alt={lb.title}
                  color={lb.items[0]?.product.color ?? "ivory"}
                  className="transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="pt-3">
                <h3 className="display text-lg">{lb.title}</h3>
                <p className="mt-1 text-xs text-ink-soft">
                  {lb.items.length}개 아이템 · {lb.styleTags.split(",").join(" · ")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {restockPopular.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
          <p className="border hairline bg-surface px-4 py-3 text-xs text-ink-soft">
            현재 {restockPopular.reduce((n, r) => n + r._count, 0)}명의 고객님이 품절 옵션의 재입고 알림을 신청하셨습니다.
            원하는 사이즈가 품절인 경우 상품 상세 페이지에서 재입고 알림을 신청해 주세요.
          </p>
        </section>
      )}
    </div>
  );
}
