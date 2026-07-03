import {
  searchProducts,
  getProductDetail,
  checkStock,
  addToCart,
  type SearchProductsParams,
} from "@/lib/tools/productTools";
import {
  normalizeShoppingQuery,
  type NormalizedShoppingQuery,
} from "./queryNormalizer";
import { retrieveProductContext, type RagContextItem } from "./retriever";
import type { ProductCandidate } from "@/lib/agents/productAnswer";

export interface HybridProductResult {
  dbProducts: NonNullable<
    Awaited<ReturnType<typeof searchProducts>>["products"]
  >;
  ragContext: RagContextItem[];
  normalized: NormalizedShoppingQuery;
  filters: SearchProductsParams;
}

export async function runHybridProductRetrieval(
  query: string,
  overrides?: Partial<SearchProductsParams>
): Promise<HybridProductResult> {
  const normalized = normalizeShoppingQuery(query);

  const filters: SearchProductsParams = {
    categorySlug:
      overrides?.categorySlug || normalized.categoryHints[0],
    color: overrides?.color || normalized.colorHints[0],
    maxPrice: overrides?.maxPrice ?? normalized.maxPrice,
    normalized,
    ...overrides,
  };

  const [dbResult, ragContext] = await Promise.all([
    searchProducts(filters),
    retrieveProductContext(normalized.expandedQuery, { topK: 5 }),
  ]);

  const dbProducts = dbResult.products || [];

  return { dbProducts, ragContext, normalized, filters };
}

export function dbProductsToCandidates(
  products: HybridProductResult["dbProducts"]
): ProductCandidate[] {
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    koreanName: p.koreanName,
    price: p.price,
    color: p.color,
    fit: p.fit,
    material: p.material,
    shortDescription: p.shortDescription,
    designNotes: p.designNotes,
  }));
}

export { checkStock, getProductDetail, addToCart };
