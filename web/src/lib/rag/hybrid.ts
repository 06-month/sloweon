import {
  searchProducts,
  getProductDetail,
  checkStock,
  addToCart,
  type SearchProductsParams,
} from "@/lib/tools/productTools";
import {
  parseProductFiltersFromMessage,
  retrieveProductContext,
  type ProductFilterHints,
  type RagContextItem,
} from "./retriever";

export interface HybridProductResult {
  dbProducts: NonNullable<
    Awaited<ReturnType<typeof searchProducts>>["products"]
  >;
  ragContext: RagContextItem[];
  filters: ProductFilterHints;
}

/** Exclude sold-out products from DB results (variants with stock > 0) */
async function filterInStockProducts(
  products: HybridProductResult["dbProducts"]
): Promise<HybridProductResult["dbProducts"]> {
  const inStock: HybridProductResult["dbProducts"] = [];
  for (const p of products) {
    const detail = await getProductDetail(p.id);
    if (detail.product) {
      const hasStock = detail.product.variants.some(
        (v) => v.stock > 0 && v.status === "ON_SALE"
      );
      if (hasStock) inStock.push(p);
    }
  }
  return inStock;
}

export async function runHybridProductRetrieval(
  query: string,
  overrides?: Partial<SearchProductsParams>
): Promise<HybridProductResult> {
  const filters = { ...parseProductFiltersFromMessage(query), ...overrides };

  const [dbResult, ragContext] = await Promise.all([
    searchProducts({
      categorySlug: filters.categorySlug,
      color: filters.color,
      maxPrice: filters.maxPrice,
      query: filters.query,
    }),
    retrieveProductContext(query, { topK: 5 }),
  ]);

  let dbProducts = dbResult.products || [];
  dbProducts = await filterInStockProducts(dbProducts);

  return { dbProducts, ragContext, filters };
}

export { checkStock, getProductDetail, addToCart };
