"use client";

import Link from "next/link";

export type ProductCard = {
  productId: string;
  title: string;
  subtitle?: string;
  priceKrw?: number;
  imageUrl?: string;
  productUrl: string;
  badge?: string;
  stockStatus?: "available" | "out_of_stock" | "limited" | "unknown";
  ctaLabel?: string;
};

function formatWon(value?: number) {
  if (typeof value !== "number") return "";
  return `${value.toLocaleString("ko-KR")}원`;
}

export default function ProductMiniCard({
  product,
  onNavigate,
}: {
  product: ProductCard;
  onNavigate?: () => void;
}) {
  return (
    <div className="chatbot-product-card">
      <Link
        href={product.productUrl}
        onClick={onNavigate}
        className="chatbot-product-media-link"
        aria-label={`${product.title} 상품 보기`}
      >
        <div className="chatbot-product-thumb">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.title}
              className="chatbot-product-img"
              loading="lazy"
            />
          ) : (
            <div className="chatbot-product-placeholder">
              <span>IMAGE</span>
            </div>
          )}
          {product.badge && (
            <span
              className={`chatbot-product-badge chatbot-product-badge--${product.stockStatus || "unknown"}`}
            >
              {product.badge}
            </span>
          )}
        </div>
      </Link>

      <div className="chatbot-product-info">
        <p className="chatbot-product-id">{product.productId}</p>
        <Link
          href={product.productUrl}
          onClick={onNavigate}
          className="chatbot-product-name"
        >
          {product.title}
        </Link>
        {product.subtitle && (
          <p className="chatbot-product-subtitle">{product.subtitle}</p>
        )}
        {product.priceKrw && (
          <p className="chatbot-product-price">{formatWon(product.priceKrw)}</p>
        )}
      </div>

      <Link
        href={product.productUrl}
        onClick={onNavigate}
        className="chatbot-product-cta"
      >
        {product.ctaLabel || "상품 보기"}
      </Link>
    </div>
  );
}
