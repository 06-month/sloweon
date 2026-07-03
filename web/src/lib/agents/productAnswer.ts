import type { ProductFactPack } from "./productFacts";

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
    parts.push(`   - 상품 보기: [${displayName}](/products/${p.id})`);
    return parts.join("\n");
  });

  return `${header}\n\n${lines.join("\n\n")}\n\n원하시면 색상/가격대/계절감 기준으로 더 좁혀드릴 수 있습니다.`;
}

function compactFeature(pack: ProductFactPack): string {
  const preferredEvidence = pack.ragEvidencePreview.find(
    (preview) => !/가격:\s*\d|구매 가능 옵션/.test(preview)
  );
  return (preferredEvidence || pack.description).slice(0, 110);
}

export function formatProductFactPackAnswer(
  packs: ProductFactPack[],
  intro?: string
): string {
  if (packs.length === 0) {
    return "현재 조건에 맞는 판매 중인 상품을 찾지 못했습니다. 색상, 가격대, 계절감 기준을 조금 더 구체적으로 말씀해 주시면 다시 찾아드리겠습니다.";
  }

  const header =
    intro ||
    "현재 SLOWEON에서 확인 가능한 관련 상품은 아래와 같습니다.";

  const lines = packs.slice(0, 5).map((pack, index) => {
    const displayName =
      pack.koreanName && pack.koreanName !== pack.name
        ? `${pack.koreanName} (${pack.name})`
        : pack.name;
    const parts = [
      `${index + 1}. ${displayName} — ${pack.priceKrw.toLocaleString()}원`,
      `   - 핏: ${pack.fit}`,
      `   - 소재: ${pack.material}`,
      `   - 특징: ${compactFeature(pack)}`,
    ];

    return parts.join("\n");
  });

  return `${header}\n\n${lines.join("\n\n")}\n\n원하시면 색상, 가격대, 계절감 기준으로 더 좁혀드릴 수 있습니다.`;
}

function findRequestedSize(
  userMessage: string,
  explicitSize?: string | null
): string | null {
  if (explicitSize) return explicitSize.toUpperCase();
  const match = userMessage.match(/(?:^|[\s(])((?:XS|XL|S|M|L))(?:\s*사이즈|\s|$)/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function findRequestedPack(
  packs: ProductFactPack[],
  userMessage: string,
  requestedProductId?: string | null
): ProductFactPack | null {
  if (requestedProductId) {
    return packs.find((pack) => pack.productId === requestedProductId) ?? null;
  }
  if (packs.length === 1) return packs[0];

  const normalized = userMessage.toLowerCase().replace(/\s+/g, "");
  return (
    packs.find((pack) => {
      const id = pack.productId.toLowerCase();
      const name = pack.name.toLowerCase().replace(/\s+/g, "");
      const koreanName = pack.koreanName.toLowerCase().replace(/\s+/g, "");
      return (
        normalized.includes(id) ||
        normalized.includes(name) ||
        normalized.includes(koreanName)
      );
    }) ?? null
  );
}

function uniqueAvailableSizes(pack: ProductFactPack): string[] {
  const sizes = pack.inventory
    .filter((variant) => variant.status === "ON_SALE" && variant.stock > 0)
    .map((variant) => variant.size.toUpperCase());
  return [...new Set(sizes)].sort((a, b) => {
    const order = ["XS", "S", "M", "L", "XL"];
    return order.indexOf(a) - order.indexOf(b);
  });
}

export function formatInventoryFactPackAnswer(params: {
  packs: ProductFactPack[];
  userMessage: string;
  requestedProductId?: string | null;
  requestedSize?: string | null;
}): string | null {
  if (!/재고|남았|품절|사이즈|옵션/.test(params.userMessage)) {
    return null;
  }

  const pack = findRequestedPack(
    params.packs,
    params.userMessage,
    params.requestedProductId
  );
  if (!pack) return null;

  const displayName = pack.koreanName || pack.name;
  const requestedSize = findRequestedSize(
    params.userMessage,
    params.requestedSize
  );
  const availableSizes = uniqueAvailableSizes(pack);

  if (!requestedSize) {
    return `${displayName}은 현재 판매 중이며, 확인 가능한 사이즈는 ${availableSizes.join(", ") || "없음"}입니다.\n\n원하시는 사이즈를 알려주시면 해당 옵션 재고를 더 정확히 확인해드릴게요.`;
  }

  const requestedVariants = pack.inventory.filter(
    (variant) => variant.size.toUpperCase() === requestedSize
  );

  if (requestedVariants.length === 0) {
    return `${displayName}의 ${requestedSize} 사이즈 옵션은 현재 확인되지 않습니다.\n현재 확인 가능한 사이즈는 ${availableSizes.join(", ") || "없음"}입니다.\n\n다른 사이즈나 비슷한 상품을 추천해드릴까요?`;
  }

  const saleableVariants = requestedVariants.filter(
    (variant) => variant.status === "ON_SALE" && variant.stock > 0
  );

  if (saleableVariants.length === 0) {
    return `${displayName}의 ${requestedSize} 사이즈는 현재 품절입니다.\n현재 확인 가능한 사이즈는 ${availableSizes.join(", ") || "없음"}입니다.\n\n대체 상품을 추천해드릴까요?`;
  }

  const stockText = saleableVariants
    .map((variant) => `${variant.colorName} ${variant.stock}개`)
    .join(", ");

  return `${displayName}의 ${requestedSize} 사이즈는 현재 구매 가능합니다.\n확인 가능한 재고는 ${stockText}입니다.\n\n재고는 주문 상황에 따라 변동될 수 있습니다.`;
}
