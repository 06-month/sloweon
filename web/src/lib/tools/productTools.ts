import { prisma } from "@/lib/db";
import { addToCart as serverAddToCart } from "@/app/actions/cart";
import type { NormalizedShoppingQuery } from "@/lib/rag/queryNormalizer";

export interface SearchProductsParams {
  categorySlug?: string;
  color?: string;
  maxPrice?: number;
  query?: string;
  normalized?: NormalizedShoppingQuery;
}

const PRODUCT_SELECT = {
  id: true,
  name: true,
  koreanName: true,
  categorySlug: true,
  color: true,
  price: true,
  status: true,
  fit: true,
  material: true,
  shortDescription: true,
  designNotes: true,
  stylingNotes: true,
  detailImagePath: true,
  wornImagePath: true,
  lookbookImagePath: true,
} as const;

type ProductRow = {
  id: string;
  name: string;
  koreanName: string;
  categorySlug: string;
  color: string;
  price: number;
  status: string;
  fit: string;
  material: string;
  shortDescription: string;
  designNotes: string;
  stylingNotes: string;
  detailImagePath: string;
  wornImagePath: string;
  lookbookImagePath: string;
};

const STOPWORDS = new Set([
  "추천",
  "해줘",
  "검색",
  "찾아줘",
  "목록",
  "재고",
  "사이즈",
  "있어",
  "있나요",
  "남았",
  "남았나요",
  "상품",
]);

function buildInStockWhere(base: Record<string, unknown>) {
  return {
    ...base,
    status: "ON_SALE",
    variants: {
      some: {
        stock: { gt: 0 },
        status: "ON_SALE",
      },
    },
  };
}

function buildSearchOr(terms: string[]) {
  const or: Record<string, unknown>[] = [];
  for (const term of terms) {
    if (!term || term.length < 2) continue;
    or.push(
      { name: { contains: term, mode: "insensitive" } },
      { koreanName: { contains: term, mode: "insensitive" } },
      { fit: { contains: term, mode: "insensitive" } },
      { material: { contains: term, mode: "insensitive" } },
      { designNotes: { contains: term, mode: "insensitive" } },
      { stylingNotes: { contains: term, mode: "insensitive" } },
      { shortDescription: { contains: term, mode: "insensitive" } },
      { color: { contains: term, mode: "insensitive" } }
    );
  }
  return or;
}

async function queryProducts(
  where: Record<string, unknown>,
  take = 5
): Promise<ProductRow[]> {
  return prisma.product.findMany({
    where: buildInStockWhere(where),
    select: PRODUCT_SELECT,
    take,
    orderBy: { publishedAt: "desc" },
  });
}

export async function searchProducts(params: SearchProductsParams) {
  try {
    const { normalized } = params;
    const categorySlug =
      params.categorySlug || normalized?.categoryHints[0];
    const maxPrice = params.maxPrice ?? normalized?.maxPrice;
    const color = params.color || normalized?.colorHints[0];

    const searchTerms = normalized
      ? [
          ...normalized.keywords,
          ...normalized.fitHints,
          ...normalized.colorHints,
          ...normalized.materialHints,
          ...normalized.seasonHints,
        ]
      : [];

    if (params.query) {
      searchTerms.push(
        ...params.query
          .replace(/[?？!！.]/g, " ")
          .split(/\s+/)
          .map((w) => w.trim())
          .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
      );
    }

    const uniqueTerms = [...new Set(searchTerms.filter(Boolean))];

    const baseWhere: Record<string, unknown> = {};
    if (categorySlug) baseWhere.categorySlug = categorySlug;
    if (maxPrice) baseWhere.price = { lte: maxPrice };
    if (color) {
      baseWhere.color = { contains: color, mode: "insensitive" };
    }

    let products: ProductRow[] = [];

    // 1) Strict: category + search terms
    if (uniqueTerms.length > 0) {
      products = await queryProducts(
        { ...baseWhere, OR: buildSearchOr(uniqueTerms) },
        8
      );
    }

    // 2) Relaxed: category + fit hints only
    if (products.length < 3 && categorySlug && normalized && normalized.fitHints.length > 0) {
      const relaxed = await queryProducts(
        {
          ...baseWhere,
          OR: buildSearchOr(normalized.fitHints),
        },
        8
      );
      const merged = new Map(products.map((p) => [p.id, p]));
      for (const p of relaxed) merged.set(p.id, p);
      products = Array.from(merged.values());
    }

    // 3) Fallback: all bottom/top in category with wide/relaxed in fit
    if (products.length < 3 && categorySlug) {
      const fitHints = normalized?.fitHints ?? [];
      const fallbackTerms =
        fitHints.length > 0 ? fitHints : ["wide", "relaxed", "loose"];
      const fallback = await queryProducts(
        {
          categorySlug,
          OR: buildSearchOr(fallbackTerms),
        },
        8
      );
      const merged = new Map(products.map((p) => [p.id, p]));
      for (const p of fallback) merged.set(p.id, p);
      products = Array.from(merged.values());
    }

    // 4) Last resort: entire category in stock
    if (products.length < 3 && categorySlug) {
      const allCat = await queryProducts({ categorySlug }, 8);
      const merged = new Map(products.map((p) => [p.id, p]));
      for (const p of allCat) merged.set(p.id, p);
      products = Array.from(merged.values());
    }

    // No category hint but fit hints (e.g. only "와이드")
    if (products.length === 0 && normalized?.fitHints.length) {
      products = await queryProducts(
        { OR: buildSearchOr(normalized.fitHints) },
        8
      );
    }

    return { products: products.slice(0, 5) };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "상품 검색에 실패했습니다.";
    return { error: message };
  }
}

export async function getProductDetail(productId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        sizeSpecs: true,
        modelFit: true,
        variants: {
          select: {
            id: true,
            colorName: true,
            size: true,
            stock: true,
            status: true,
          },
        },
      },
    });

    if (!product || product.status !== "ON_SALE") {
      return { error: "해당 상품을 찾을 수 없거나 판매 중이 아닙니다." };
    }

    return { product };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "상품 상세 조회에 실패했습니다.";
    return { error: message };
  }
}

export async function checkStock(productId: string, size: string) {
  try {
    const variants = await prisma.productVariant.findMany({
      where: {
        productId,
        size: {
          equals: size,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        colorName: true,
        size: true,
        stock: true,
        status: true,
      },
    });

    if (variants.length === 0) {
      return { message: `${size} 사이즈의 옵션을 찾을 수 없습니다.` };
    }

    return { variants };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "재고 확인에 실패했습니다.";
    return { error: message };
  }
}

export async function addToCart(
  productId: string,
  color: string,
  size: string,
  quantity: number = 1
) {
  try {
    const variant = await prisma.productVariant.findFirst({
      where: {
        productId,
        colorName: {
          equals: color,
          mode: "insensitive",
        },
        size: {
          equals: size,
          mode: "insensitive",
        },
      },
    });

    if (!variant) {
      return { error: "선택하신 색상과 사이즈의 상품 옵션을 찾을 수 없습니다." };
    }

    if (variant.stock <= 0 || variant.status === "SOLD_OUT") {
      return { error: "죄송합니다. 해당 옵션은 품절 상태입니다." };
    }

    const formData = new FormData();
    formData.set("variantId", variant.id);
    formData.set("quantity", String(quantity));

    const result = await serverAddToCart(null, formData);

    if (result && result.error) {
      return { error: result.error };
    }

    return {
      success: true,
      message: "장바구니에 상품을 성공적으로 추가했습니다.",
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "장바구니 담기에 실패했습니다.";
    return { error: message };
  }
}
