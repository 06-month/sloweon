import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProductImage } from "@/components/ProductImage";
import { OutfitForm } from "@/components/OutfitForm";
import { effectivePrice } from "@/lib/format";

export default async function LookbookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lookbook = await prisma.lookbook.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { include: { variants: true } } },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
  if (!lookbook || lookbook.status !== "PUBLISHED") notFound();

  const sizeOrder = ["S", "M", "L", "XL"];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <nav className="mb-6 text-xs text-ink-soft" aria-label="breadcrumb">
        <Link href="/lookbooks" className="hover:text-ink">LOOKBOOK</Link>
        <span className="mx-2">/</span>
        <span>{lookbook.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-[3/4] overflow-hidden bg-surface">
          <ProductImage
            imagePath={lookbook.imagePath}
            alt={`${lookbook.title} 착장 이미지`}
            color={lookbook.items[0]?.product.color ?? "ivory"}
          />
        </div>

        <div>
          <p className="label-caps">{lookbook.season} · {lookbook.styleTags.split(",").join(" · ")}</p>
          <h1 className="display mt-1 text-3xl">{lookbook.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{lookbook.description}</p>

          <div className="mt-8">
            <p className="label-caps mb-4">착장 구성 상품</p>
            <OutfitForm
              products={lookbook.items.map((item) => ({
                id: item.product.id,
                koreanName: item.product.koreanName,
                price: effectivePrice(item.product),
                variants: [...item.product.variants]
                  .sort((a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size))
                  .map((v) => ({ id: v.id, size: v.size, stock: v.stock })),
              }))}
            />
          </div>

          <div className="mt-8 space-y-3">
            {lookbook.items.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.product.id}`}
                className="flex items-center gap-4 border hairline bg-surface p-3 transition-colors hover:border-line-strong"
              >
                <div className="h-16 w-12 flex-none overflow-hidden">
                  <ProductImage
                    imagePath={item.product.wornImagePath}
                    alt={item.product.koreanName}
                    color={item.product.color}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm">{item.product.koreanName}</p>
                  <p className="label-caps mt-0.5">상품 상세 보기 →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
