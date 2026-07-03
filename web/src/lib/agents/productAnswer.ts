import type { RagContextItem } from "../rag/retriever";

export interface ProductCandidate {
  id: string;
  name: string;
  koreanName: string;
  price: number;
  color: string;
  fit?: string;
  material?: string;
  shortDescription?: string;
  designNotes?: string;
}

export function extractProductsFromRag(
  ragContext: RagContextItem[]
): ProductCandidate[] {
  const products: ProductCandidate[] = [];
  const seen = new Set<string>();

  for (const chunk of ragContext) {
    if (
      chunk.sourceType !== "product" &&
      chunk.sourceType !== "product_detail"
    ) {
      continue;
    }

    const productId =
      (chunk.metadata?.productId as string) ||
      chunk.sourceId.replace(/^detail_/, "");

    if (!productId || seen.has(productId)) continue;
    seen.add(productId);

    const priceMatch = chunk.contentPreview.match(/(\d{1,3}(?:,\d{3})*)\s*원/);
    const price = priceMatch
      ? parseInt(priceMatch[1].replace(/,/g, ""), 10)
      : (chunk.metadata?.price as number) || 0;

    const fitMatch = chunk.contentPreview.match(/핏:\s*([^\n]+)/);
    const materialMatch = chunk.contentPreview.match(/소재:\s*([^\n]+)/);

    products.push({
      id: productId,
      name: chunk.title.replace(/\s*\(.*\)$/, "").trim(),
      koreanName: chunk.title.split("(")[0]?.trim() || chunk.title,
      price,
      color: (chunk.metadata?.colors as string[])?.[0] || "",
      fit: fitMatch?.[1]?.trim() || (chunk.metadata?.fit as string),
      material:
        materialMatch?.[1]?.trim() || (chunk.metadata?.material as string),
      shortDescription: chunk.contentPreview.slice(0, 120),
    });
  }

  return products;
}

export function isUnhelpfulProductResponse(text: string): boolean {
  return /조회할 수 없|정보를 (찾|제공)|확인할 수 없|구체적인 정보|리스트를 제공|어렵습니다/.test(
    text
  );
}

export function formatProductListAnswer(
  products: ProductCandidate[],
  intro?: string
): string {
  if (products.length === 0) {
    return "현재 조건에 맞는 판매 중인 상품을 찾지 못했습니다. 색상, 가격대, 시즌감을 조금 더 구체적으로 말씀해 주시면 다시 찾아드리겠습니다.";
  }

  const header =
    intro ||
    "현재 SLOWEON에서 확인 가능한 관련 상품은 아래와 같습니다.";

  const lines = products.slice(0, 5).map((p, i) => {
    const displayName = p.koreanName || p.name;
    const parts = [
      `${i + 1}. **${displayName}** (${p.name}) — ${p.price.toLocaleString()}원`,
    ];
    if (p.fit) parts.push(`   - 핏: ${p.fit}`);
    if (p.material) parts.push(`   - 소재: ${p.material}`);
    if (p.shortDescription) {
      const desc = p.shortDescription.slice(0, 80);
      parts.push(`   - 특징: ${desc}`);
    }
    parts.push(`   - 상품 페이지: /products/${p.id}`);
    return parts.join("\n");
  });

  return `${header}\n\n${lines.join("\n\n")}\n\n원하시면 색상/가격대/계절감 기준으로 더 좁혀드릴 수 있습니다.`;
}
