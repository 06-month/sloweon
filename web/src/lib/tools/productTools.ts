import { prisma } from "@/lib/db";
import { addToCart as serverAddToCart } from "@/app/actions/cart";

export interface SearchProductsParams {
  categorySlug?: string;
  color?: string;
  maxPrice?: number;
  query?: string;
}

export async function searchProducts(params: SearchProductsParams) {
  try {
    const { categorySlug, color, maxPrice, query } = params;
    
    // Guardrail: status가 ON_SALE인 상품만 노출
    const whereClause: any = {
      status: "ON_SALE"
    };

    if (categorySlug) {
      whereClause.categorySlug = categorySlug;
    }

    if (color) {
      whereClause.color = {
        contains: color,
        mode: "insensitive"
      };
    }

    if (maxPrice) {
      whereClause.price = {
        lte: maxPrice
      };
    }

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { koreanName: { contains: query, mode: "insensitive" } },
        { designNotes: { contains: query, mode: "insensitive" } },
        { stylingNotes: { contains: query, mode: "insensitive" } }
      ];
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        koreanName: true,
        categorySlug: true,
        color: true,
        price: true,
        status: true,
        shortDescription: true,
        detailImagePath: true
      },
      take: 6
    });

    return { products };
  } catch (error: any) {
    return { error: error.message || "상품 검색에 실패했습니다." };
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
            status: true
          }
        }
      }
    });

    if (!product || product.status !== "ON_SALE") {
      return { error: "해당 상품을 찾을 수 없거나 판매 중이 아닙니다." };
    }

    return { product };
  } catch (error: any) {
    return { error: error.message || "상품 상세 조회에 실패했습니다." };
  }
}

export async function checkStock(productId: string, size: string) {
  try {
    const variants = await prisma.productVariant.findMany({
      where: {
        productId,
        size: {
          equals: size,
          mode: "insensitive"
        }
      },
      select: {
        id: true,
        colorName: true,
        size: true,
        stock: true,
        status: true
      }
    });

    if (variants.length === 0) {
      return { message: `${size} 사이즈의 옵션을 찾을 수 없습니다.` };
    }

    return { variants };
  } catch (error: any) {
    return { error: error.message || "재고 확인에 실패했습니다." };
  }
}

export async function addToCart(productId: string, color: string, size: string, quantity: number = 1) {
  try {
    // 1. variantId 찾기
    const variant = await prisma.productVariant.findFirst({
      where: {
        productId,
        colorName: {
          equals: color,
          mode: "insensitive"
        },
        size: {
          equals: size,
          mode: "insensitive"
        }
      }
    });

    if (!variant) {
      return { error: "선택하신 색상과 사이즈의 상품 옵션을 찾을 수 없습니다." };
    }

    if (variant.stock <= 0 || variant.status === "SOLD_OUT") {
      return { error: "죄송합니다. 해당 옵션은 품절 상태입니다." };
    }

    // 2. Server Action 호출
    const formData = new FormData();
    formData.set("variantId", variant.id);
    formData.set("quantity", String(quantity));

    const result = await serverAddToCart(null, formData);

    if (result && result.error) {
      return { error: result.error };
    }

    return { success: true, message: "장바구니에 상품을 성공적으로 추가했습니다." };
  } catch (error: any) {
    return { error: error.message || "장바구니 담기에 실패했습니다." };
  }
}
