export interface NormalizedShoppingQuery {
  originalQuery: string;
  expandedQuery: string;
  keywords: string[];
  categoryHints: ("top" | "bottom")[];
  fitHints: string[];
  colorHints: string[];
  materialHints: string[];
  seasonHints: string[];
  maxPrice?: number;
}

const FIT_MAP: Record<string, string[]> = {
  와이드: ["wide", "relaxed wide", "wide fit", "wide tailored fit", "wide straight"],
  "통 넓은": ["wide", "relaxed", "loose"],
  "통넓은": ["wide", "relaxed", "loose"],
  릴랙스: ["relaxed", "relaxed wide", "relaxed straight", "relaxed easy"],
  루즈: ["loose", "relaxed", "oversized"],
  오버핏: ["oversized", "boxy", "relaxed"],
  슬림: ["slim", "tailored"],
  스트레이트: ["straight", "wide straight"],
  크롭: ["cropped"],
  플리츠: ["pleated", "pleats"],
  투턱: ["two-tuck", "tuck"],
};

const CATEGORY_MAP: Record<string, "bottom" | "top"> = {
  팬츠: "bottom",
  바지: "bottom",
  슬랙스: "bottom",
  트라우저: "bottom",
  데님: "bottom",
  청바지: "bottom",
  쇼츠: "bottom",
  버뮤다: "bottom",
  하의: "bottom",
  셔츠: "top",
  티셔츠: "top",
  티: "top",
  니트: "top",
  폴로: "top",
  아우터: "top",
  자켓: "top",
  블레이저: "top",
  상의: "top",
};

const COLOR_MAP: Record<string, string[]> = {
  베이지: ["beige", "sand", "stone beige", "cream"],
  아이보리: ["ivory", "cream", "off-white"],
  크림: ["cream", "off-white"],
  검정: ["black", "faded black"],
  블랙: ["black", "faded black"],
  네이비: ["navy"],
  남색: ["navy"],
  회색: ["grey", "gray", "light grey"],
  그레이: ["grey", "gray", "light grey"],
  차콜: ["charcoal"],
  카키: ["khaki", "light khaki"],
  화이트: ["white", "off-white"],
  스톤: ["stone beige"],
};

const MATERIAL_MAP: Record<string, string[]> = {
  여름: ["linen", "lightweight", "summer", "breathable", "open-weave", "cotton"],
  시원한: ["linen", "lightweight", "breathable", "open-weave", "cool"],
  린넨: ["linen"],
  코튼: ["cotton"],
  울: ["wool"],
  데님: ["denim"],
};

const ENGLISH_ALIASES: Record<string, string[]> = {
  pants: ["pants", "trousers", "bottom"],
  trousers: ["trousers", "pants", "bottom"],
  shirt: ["shirt", "top"],
  wide: ["wide", "relaxed wide", "wide fit"],
  relaxed: ["relaxed", "relaxed wide", "relaxed straight"],
};

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function normalizeShoppingQuery(userMessage: string): NormalizedShoppingQuery {
  const originalQuery = userMessage.trim();
  const lower = originalQuery.toLowerCase();

  const keywords: string[] = [];
  const categoryHints: ("top" | "bottom")[] = [];
  const fitHints: string[] = [];
  const colorHints: string[] = [];
  const materialHints: string[] = [];
  const seasonHints: string[] = [];

  for (const [ko, enList] of Object.entries(FIT_MAP)) {
    if (lower.includes(ko)) {
      fitHints.push(...enList);
      keywords.push(ko);
    }
  }

  for (const [ko, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(ko)) {
      categoryHints.push(cat);
      keywords.push(ko);
    }
  }

  for (const [ko, colors] of Object.entries(COLOR_MAP)) {
    if (lower.includes(ko)) {
      colorHints.push(...colors);
      keywords.push(ko);
    }
  }

  for (const [ko, materials] of Object.entries(MATERIAL_MAP)) {
    if (lower.includes(ko)) {
      if (ko === "여름" || ko === "시원한") {
        seasonHints.push(...materials);
      } else {
        materialHints.push(...materials);
      }
      keywords.push(ko);
    }
  }

  for (const [en, aliases] of Object.entries(ENGLISH_ALIASES)) {
    if (lower.includes(en)) {
      fitHints.push(...aliases.filter((a) => a.includes("wide") || a.includes("relaxed")));
      keywords.push(en);
    }
  }

  // bare English tokens
  for (const token of ["wide", "relaxed", "loose", "linen", "trousers", "pants"]) {
    if (lower.includes(token)) {
      if (["wide", "relaxed", "loose"].includes(token)) fitHints.push(token);
      if (token === "linen") materialHints.push("linen");
      if (["trousers", "pants"].includes(token)) categoryHints.push("bottom");
    }
  }

  let maxPrice: number | undefined;
  const priceMan = originalQuery.match(/(\d+)\s*만\s*원\s*이하/);
  if (priceMan) {
    maxPrice = parseInt(priceMan[1], 10) * 10000;
  } else {
    const priceWon = originalQuery.match(/(\d{4,})\s*원\s*이하/);
    if (priceWon) maxPrice = parseInt(priceWon[1], 10);
  }

  const expandedParts = unique([
    originalQuery,
    ...fitHints,
    ...colorHints,
    ...materialHints,
    ...seasonHints,
    categoryHints.includes("bottom") ? "pants trousers bottom wide" : "",
    categoryHints.includes("top") ? "shirt top" : "",
  ]);

  return {
    originalQuery,
    expandedQuery: expandedParts.join(" "),
    keywords: unique(keywords),
    categoryHints: unique(categoryHints) as ("top" | "bottom")[],
    fitHints: unique(fitHints),
    colorHints: unique(colorHints),
    materialHints: unique([...materialHints, ...seasonHints]),
    seasonHints: unique(seasonHints),
    maxPrice,
  };
}

/** Detect product listing / recommendation intent */
export function isProductListingQuery(message: string): boolean {
  const n = message.toLowerCase();
  return (
    /추천|찾아|검색|있어|있나|뭐\s*있|어떤|보여|알려|소개|목록|골라|추천해/.test(n) ||
    /팬츠|바지|슬랙스|트라우저|셔츠|티셔츠|상의|하의|니트|폴로|자켓|아우터|데님|와이드|릴랙스|오버핏|통\s*넓/.test(
      n
    ) ||
    /(top|bottom)_\d{2}/i.test(message)
  );
}
