import type { ProductFactPack } from "./productFacts";

export type ProductCardStockStatus =
  | "available"
  | "out_of_stock"
  | "limited"
  | "unknown";

export interface ProductCardPayload {
  productId: string;
  title: string;
  subtitle?: string;
  priceKrw?: number;
  imageUrl?: string;
  productUrl: string;
  badge?: string;
  stockStatus?: ProductCardStockStatus;
  ctaLabel?: string;
}

export interface ProductCardGenerationMeta {
  productCardsGenerated: boolean;
  productCardsCount: number;
  productCardProductIds: string[];
  missingImageProductIds: string[];
  cardRenderMode: "mini_card" | "markdown_link_fallback";
  linkFallbackReason?: string | null;
}

export interface ProductCardGenerationResult {
  productCards: ProductCardPayload[];
  meta: ProductCardGenerationMeta;
}

export function emptyProductCardGenerationMeta(
  reason: string | null = "NO_PRODUCT_FACT_PACK"
): ProductCardGenerationMeta {
  return {
    productCardsGenerated: false,
    productCardsCount: 0,
    productCardProductIds: [],
    missingImageProductIds: [],
    cardRenderMode: "markdown_link_fallback",
    linkFallbackReason: reason,
  };
}

function findRequestedVariants(
  pack: ProductFactPack,
  requestedSize?: string | null
) {
  if (!requestedSize) return [];
  return pack.inventory.filter(
    (variant) => variant.size.toUpperCase() === requestedSize.toUpperCase()
  );
}

function resolveStockPresentation(params: {
  pack: ProductFactPack;
  requestedSize?: string | null;
}): { stockStatus: ProductCardStockStatus; badge?: string } {
  const requestedVariants = findRequestedVariants(
    params.pack,
    params.requestedSize
  );

  if (requestedVariants.length > 0) {
    const requestedStock = requestedVariants.reduce(
      (sum, variant) =>
        sum + (variant.status === "ON_SALE" ? Math.max(variant.stock, 0) : 0),
      0
    );

    if (requestedStock <= 0) {
      return {
        stockStatus: "out_of_stock",
        badge: params.requestedSize
          ? `${params.requestedSize.toUpperCase()} 품절`
          : "품절",
      };
    }

    if (requestedStock <= 2) {
      return { stockStatus: "limited", badge: "재고 소량" };
    }

    return { stockStatus: "available" };
  }

  if (!params.pack.stockSummary.inStock) {
    return { stockStatus: "out_of_stock", badge: "품절" };
  }

  if (params.pack.stockSummary.totalStock <= 2) {
    return { stockStatus: "limited", badge: "재고 소량" };
  }

  return { stockStatus: "available" };
}

export function productFactPacksToProductCards(
  packs: ProductFactPack[],
  options: {
    requestedProductId?: string | null;
    requestedSize?: string | null;
    limit?: number;
  } = {}
): ProductCardGenerationResult {
  const scopedPacks = options.requestedProductId
    ? packs.filter((pack) => pack.productId === options.requestedProductId)
    : packs;
  const selectedPacks = scopedPacks.slice(0, options.limit ?? 5);

  if (selectedPacks.length === 0) {
    return {
      productCards: [],
      meta: emptyProductCardGenerationMeta(
        options.requestedProductId
          ? "REQUESTED_PRODUCT_NOT_IN_FACT_PACK"
          : "NO_PRODUCT_FACT_PACK"
      ),
    };
  }

  const productCards = selectedPacks.map((pack) => {
    const stock = resolveStockPresentation({
      pack,
      requestedSize: options.requestedSize,
    });
    const subtitleParts = [pack.fit, pack.material].filter(Boolean);
    const title = pack.koreanName || pack.name;

    return {
      productId: pack.productId,
      title,
      subtitle:
        subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined,
      priceKrw: pack.priceKrw,
      imageUrl: pack.thumbnailUrl || pack.imageUrl || undefined,
      productUrl: pack.productUrl,
      badge: stock.badge,
      stockStatus: stock.stockStatus,
      ctaLabel: "상품 보기",
    } satisfies ProductCardPayload;
  });

  const missingImageProductIds = selectedPacks
    .filter((pack) => !pack.imageUrl)
    .map((pack) => pack.productId);

  return {
    productCards,
    meta: {
      productCardsGenerated: productCards.length > 0,
      productCardsCount: productCards.length,
      productCardProductIds: productCards.map((card) => card.productId),
      missingImageProductIds,
      cardRenderMode: productCards.length > 0 ? "mini_card" : "markdown_link_fallback",
      linkFallbackReason: productCards.length > 0 ? null : "NO_PRODUCT_CARDS",
    },
  };
}
