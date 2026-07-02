import Link from "next/link";
import type { Product, ProductVariant } from "@prisma/client";
import { ProductImage } from "./ProductImage";
import { won, discountRate, fitLabel } from "@/lib/format";

export function ProductCard({
  product,
}: {
  product: Product & { variants: ProductVariant[] };
}) {
  const allSoldOut = product.variants.every((v) => v.stock === 0);
  const someSoldOut = !allSoldOut && product.variants.some((v) => v.stock === 0);

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-surface">
        <ProductImage
          imagePath={product.wornImagePath}
          alt={product.koreanName}
          color={product.color}
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {allSoldOut && (
          <span className="absolute left-2 top-2 bg-ink px-2 py-1 text-[11px] tracking-wider text-bg">
            SOLD OUT
          </span>
        )}
        {someSoldOut && (
          <span className="absolute left-2 top-2 border border-line-strong bg-surface/90 px-2 py-1 text-[11px] tracking-wider text-ink-soft">
            일부 품절
          </span>
        )}
        {product.salePrice && (
          <span className="absolute right-2 top-2 bg-accent px-2 py-1 text-[11px] tracking-wider text-bg">
            SALE
          </span>
        )}
      </div>
      <div className="space-y-1 pt-3">
        <p className="label-caps">{fitLabel(product.fit)}</p>
        <h3 className="truncate text-sm text-ink">{product.koreanName}</h3>
        <div className="flex items-baseline gap-2 text-sm">
          {product.salePrice ? (
            <>
              <span className="font-medium text-accent">
                {discountRate(product.price, product.salePrice)}%
              </span>
              <span className="font-medium">{won(product.salePrice)}</span>
              <span className="text-xs text-ink-faint line-through">{won(product.price)}</span>
            </>
          ) : (
            <span className="font-medium">{won(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
