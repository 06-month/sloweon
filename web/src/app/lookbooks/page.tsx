import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProductImage } from "@/components/ProductImage";
import { won, effectivePrice } from "@/lib/format";

export const metadata = { title: "룩북" };

export default async function LookbooksPage() {
  const lookbooks = await prisma.lookbook.findMany({
    where: { status: "PUBLISHED" },
    include: { items: { include: { product: true }, orderBy: { displayOrder: "asc" } } },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="mb-8">
        <p className="label-caps">26 Summer</p>
        <h1 className="display mt-1 text-4xl">Lookbook</h1>
        <p className="mt-2 text-sm text-ink-soft">정돈된 실루엣과 스타일을 제안하는 26 Summer 아카이브.</p>
      </div>

      <div className="grid gap-x-4 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {lookbooks.map((lb) => {
          const total = lb.items.reduce((sum, i) => sum + effectivePrice(i.product), 0);
          return (
            <Link key={lb.id} href={`/lookbooks/${lb.id}`} className="group block">
              <div className="aspect-[3/4] overflow-hidden bg-surface">
                <ProductImage
                  imagePath={lb.imagePath}
                  alt={lb.title}
                  color={lb.items[0]?.product.color ?? "ivory"}
                  className="transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="pt-4">
                <p className="label-caps">{lb.styleTags.split(",").join(" · ")}</p>
                <h2 className="display mt-1 text-xl">{lb.title}</h2>
                <p className="mt-1 text-xs text-ink-soft">
                  {lb.items.length}개 아이템 · 세트 {won(total)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
