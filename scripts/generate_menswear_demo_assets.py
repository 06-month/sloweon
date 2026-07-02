import json
from pathlib import Path


ROOT = Path("menswear_demo_assets")
BRAND_NAME = "SLOWEON"
COLLECTION_NAME = "Quiet City Summer 2026"

LOOKBOOK_LOCATIONS = [
    "white studio with soft shadows",
    "minimal concrete corridor",
    "quiet Seoul side street",
    "gallery-like white interior",
    "minimal cafe exterior",
    "riverside walkway in summer light",
    "shaded urban alley",
    "minimal apartment interior",
    "rooftop terrace with soft daylight",
    "clean stone wall exterior",
]

STRICT_VISUAL_RULE = (
    "Strict visual rule: Do not generate any visible logo, brand mark, clothing label, neck label, tag, watermark, "
    "printed text, embroidered text, typography, graphic symbol, fake brand name, or readable/unreadable text anywhere in the image. "
    "All garments must be completely plain and unbranded. If a garment would normally have a neck label, replace it with a blank seam or no visible label."
)

TOPS = [
    ("top_01", "Sand Linen Open-Collar Shirt", "샌드 린넨 오픈카라 셔츠", "sand beige", "linen blend", "relaxed fit", "open collar, soft collar shape, clean front, natural linen texture, slightly dropped shoulders", "ivory wide trousers, black leather sandals", 109000),
    ("top_02", "Pale Blue Cotton Poplin Relaxed Shirt", "페일 블루 코튼 포플린 릴랙스 셔츠", "pale blue", "cotton poplin", "relaxed fit", "crisp but soft poplin texture, long sleeves, clean cuffs, slightly oversized body", "charcoal one-tuck wide trousers", 98000),
    ("top_03", "Off-White Sheer Summer Knit Polo", "오프화이트 시어 썸머 니트 폴로", "off-white", "sheer summer knit", "loose fit", "subtle open-weave texture, soft collar, breathable summer knit structure", "faded black pleated trousers", 89000),
    ("top_04", "Navy Short-Sleeve Linen Shirt", "네이비 반팔 린넨 셔츠", "washed navy", "linen", "relaxed fit", "short sleeves, clean hidden placket, breathable linen texture, minimal collar", "stone beige one-tuck trousers", 99000),
    ("top_05", "Cream Boxy Cotton T-Shirt", "크림 박시 코튼 티셔츠", "cream", "heavyweight cotton", "boxy fit", "clean crew neck, structured shoulder, minimal silhouette, premium cotton texture", "wide washed charcoal denim", 59000),
    ("top_06", "Sand Half-Sleeve Summer Blazer", "샌드 하프 슬리브 썸머 블레이저", "sand beige", "lightweight summer wool blend", "relaxed tailoring", "unstructured blazer, half sleeves, soft lapel, minimal tailoring", "matching wide trousers", 189000),
    ("top_07", "Faded Black Sleeveless Knit Top", "페이드 블랙 슬리브리스 니트 탑", "faded black", "ribbed summer knit", "relaxed slim-straight", "clean sleeveless cut, subtle rib texture, minimal neckline", "loose ivory linen pants", 69000),
    ("top_08", "Light Khaki Crinkle Shirt Jacket", "라이트 카키 크링클 셔츠 자켓", "light khaki", "crinkle cotton", "relaxed fit", "lightweight shirt jacket, subtle crinkle texture, two hidden pockets, soft structure", "navy wide trousers", 129000),
    ("top_09", "Off-White Oversized Oxford Shirt", "오프화이트 오버사이즈 옥스포드 셔츠", "off-white", "cotton oxford", "oversized fit", "clean collar, slightly long length, dropped shoulder, crisp casual texture", "sand beige bermuda shorts", 109000),
    ("top_10", "Charcoal Sheer Knit Cardigan", "차콜 시어 니트 가디건", "charcoal", "sheer knit", "loose fit", "open-weave cardigan, lightweight summer layering, minimal buttons", "white tank top and wide pleated trousers", 119000),
    ("top_11", "Pale Blue Stripe Relaxed Shirt", "페일 블루 스트라이프 릴랙스 셔츠", "pale blue stripe", "cotton poplin", "relaxed fit", "subtle vertical stripe, clean collar, long sleeves, soft summer shirt texture", "faded black straight trousers", 105000),
    ("top_12", "Navy Ribbed Summer Knit Polo", "네이비 리브 썸머 니트 폴로", "navy", "ribbed summer knit", "regular relaxed fit", "subtle rib texture, open collar polo shape, clean hem", "cream wide-leg trousers", 89000),
    ("top_13", "Stone Grey Utility Pocket Shirt", "스톤 그레이 유틸리티 포켓 셔츠", "stone grey", "linen-cotton blend", "relaxed fit", "two chest pockets, soft utility mood, minimal seams, breathable texture", "black relaxed trousers", 112000),
    ("top_14", "Cream Short-Sleeve Setup Shirt", "크림 반팔 셋업 셔츠", "cream", "linen-rayon blend", "relaxed fit", "clean short-sleeve shirt, matching setup mood, soft drape", "matching drawstring trousers", 98000),
    ("top_15", "Sand Relaxed Cotton T-Shirt", "샌드 릴랙스 코튼 티셔츠", "sand beige", "soft cotton jersey", "relaxed fit", "minimal crew neck T-shirt, smooth surface, casual premium silhouette", "navy one-tuck wide trousers", 52000),
    ("top_16", "Off-White Lightweight Zip Knit Jacket", "오프화이트 라이트웨이트 집 니트 자켓", "off-white", "lightweight knit", "relaxed fit", "minimal zip-up knit jacket, clean front, soft ribbed hem", "charcoal pleated summer trousers", 139000),
    ("top_17", "Pale Khaki Open-Weave Knit Shirt", "페일 카키 오픈위브 니트 셔츠", "pale khaki", "open-weave knit", "loose fit", "semi-transparent texture, shirt-like collar, airy summer knit", "ivory linen pants", 112000),
    ("top_18", "Faded Black Camp-Collar Shirt", "페이드 블랙 캠프카라 셔츠", "faded black", "rayon blend", "oversized relaxed fit", "camp collar, fluid drape, short sleeves, washed black tone", "sand beige wide shorts", 99000),
    ("top_19", "Navy Unstructured Summer Blazer", "네이비 언스트럭처드 썸머 블레이저", "navy", "lightweight summer wool blend", "relaxed tailoring", "soft lapel, unstructured shoulder, breathable lining, minimal tailoring", "white cotton T-shirt and loose grey trousers", 219000),
    ("top_20", "Cream Open-Weave Knit Shirt", "크림 오픈위브 니트 셔츠", "cream", "open-weave cotton knit", "loose fit", "breathable knitted shirt, subtle texture, relaxed collar", "black wide straight trousers", 119000),
]

BOTTOMS = [
    ("bottom_01", "Ivory Wide Linen Trousers", "아이보리 와이드 린넨 트라우저", "ivory", "linen blend", "wide straight fit", "clean waistband, soft pleats, natural linen drape, full length", "sand beige open-collar shirt", 129000),
    ("bottom_02", "Charcoal One-Tuck Wide Trousers", "차콜 원턱 와이드 트라우저", "charcoal", "lightweight summer wool", "wide fit", "one-tuck front, clean crease line, soft tailoring, relaxed leg", "pale blue cotton poplin shirt", 139000),
    ("bottom_03", "Sand Drawstring Linen Pants", "샌드 드로스트링 린넨 팬츠", "sand beige", "linen blend", "relaxed easy fit", "drawstring waist, lightweight drape, minimal pocket detail", "cream boxy T-shirt", 109000),
    ("bottom_04", "Faded Black Pleated Trousers", "페이드 블랙 플리츠 트라우저", "faded black", "tencel blend", "relaxed wide fit", "soft pleats, fluid drape, minimal waistband, clean fall", "off-white sheer summer knit polo", 135000),
    ("bottom_05", "Navy Summer Wool Relaxed Trousers", "네이비 썸머울 릴랙스 트라우저", "navy", "lightweight summer wool", "relaxed straight fit", "minimal tailored trouser, light crease, breathable summer wool texture", "sand relaxed cotton T-shirt", 145000),
    ("bottom_06", "Light Khaki Bermuda Shorts", "라이트 카키 버뮤다 쇼츠", "light khaki", "cotton twill", "relaxed knee-length fit", "clean waistband, knee-length bermuda silhouette, minimal pockets", "off-white oversized oxford shirt", 89000),
    ("bottom_07", "Cream Cotton Twill Wide Pants", "크림 코튼 트윌 와이드 팬츠", "cream", "cotton twill", "wide straight fit", "sturdy but soft twill, clean front, casual premium mood", "navy ribbed summer knit polo", 119000),
    ("bottom_08", "Grey Nylon Blend Easy Pants", "그레이 나일론 블렌드 이지 팬츠", "light grey", "nylon blend", "relaxed easy fit", "elastic waist, subtle technical texture, minimal seams", "light khaki crinkle shirt jacket", 99000),
    ("bottom_09", "Black Wide Straight Trousers", "블랙 와이드 스트레이트 트라우저", "black", "lightweight poly-wool blend", "wide straight fit", "clean straight leg, minimal crease, understated tailoring", "cream linen long-sleeve shirt", 129000),
    ("bottom_10", "Pale Blue Washed Denim", "페일 블루 워시드 데님", "pale blue", "washed denim", "relaxed straight fit", "soft washed denim texture, minimal pocket design, clean silhouette", "cream boxy cotton T-shirt", 118000),
    ("bottom_11", "Stone Beige Two-Tuck Trousers", "스톤 베이지 투턱 트라우저", "stone beige", "lightweight summer wool blend", "wide tailored fit", "two-tuck front, soft volume, refined summer tailoring", "navy short-sleeve linen shirt", 149000),
    ("bottom_12", "Off-White Cropped Linen Trousers", "오프화이트 크롭 린넨 트라우저", "off-white", "linen blend", "cropped wide fit", "ankle-length crop, natural wrinkles, clean waistband", "pale khaki open-weave knit shirt", 119000),
    ("bottom_13", "Charcoal Long Bermuda Shorts", "차콜 롱 버뮤다 쇼츠", "charcoal", "lightweight wool blend", "relaxed long shorts", "below-knee bermuda shape, one-tuck front, tailored casual balance", "off-white sleeveless knit top", 98000),
    ("bottom_14", "Navy Lightweight Cargo Trousers", "네이비 라이트웨이트 카고 트라우저", "navy", "nylon-cotton blend", "relaxed straight fit", "minimal cargo pockets, subtle utility mood, clean shape", "stone grey utility pocket shirt", 129000),
    ("bottom_15", "Sand Relaxed Chino Pants", "샌드 릴랙스 치노 팬츠", "sand beige", "cotton chino", "relaxed straight fit", "casual chino construction, clean pockets, understated everyday mood", "faded black camp-collar shirt", 109000),
    ("bottom_16", "Faded Black Summer Denim", "페이드 블랙 썸머 데님", "faded black", "lightweight denim", "wide straight fit", "washed black denim, relaxed leg, minimal detailing", "off-white lightweight zip knit jacket", 125000),
    ("bottom_17", "Light Grey Pleated Slacks", "라이트 그레이 플리츠 슬랙스", "light grey", "lightweight summer wool", "relaxed wide fit", "clean pleats, soft crease, refined office-casual summer mood", "navy unstructured summer blazer", 139000),
    ("bottom_18", "Ivory Drawstring Wide Pants", "아이보리 드로스트링 와이드 팬츠", "ivory", "linen-rayon blend", "relaxed wide fit", "drawstring waist, fluid texture, resort-like minimal mood", "cream open-weave knit shirt", 118000),
    ("bottom_19", "Olive Grey Nylon Shorts", "올리브 그레이 나일론 쇼츠", "olive grey", "nylon blend", "relaxed shorts fit", "lightweight nylon surface, elastic waist, minimal utility detail", "light khaki crinkle shirt jacket", 79000),
    ("bottom_20", "Cream Tailored Summer Shorts", "크림 테일러드 썸머 쇼츠", "cream", "lightweight cotton-wool blend", "relaxed tailored shorts", "clean tailored shorts, subtle pleat, refined summer silhouette", "sand half-sleeve summer blazer", 99000),
]


def prompt_detail(p):
    return (
        "A clean e-commerce product detail image for a fictional Korean men's contemporary fashion brand, summer collection. "
        "Minimal domestic designer brand mood, relaxed silhouette, premium but understated. Studio white or very light grey background, soft diffused lighting, garment-first composition. "
        f"Featured item: {p['name']}, {p['color']}, {p['material']}, {p['fit']}. "
        "Show realistic textile texture, stitching, seams, collar or waistband construction, hem, pocket, buttons, pleats, or natural fabric drape depending on the garment. "
        "The product should be clearly visible and commercially usable for an online shopping mall demo. "
        "No real brand references, no unrealistic clothing construction. "
        f"{STRICT_VISUAL_RULE}"
    )


def prompt_worn(p):
    return (
        "A clean e-commerce worn product image for a fictional Korean men's contemporary fashion brand, summer collection. "
        "Full-body young East Asian male model, neutral expression, natural standing pose, front 3/4 angle, studio white or very light grey background, soft diffused lighting. "
        f"Featured item: {p['name']}, {p['color']}, {p['material']}, {p['fit']}. "
        f"Style it with minimal matching garments from the same fictional summer collection: {p['styling_notes']}. "
        "Product must be clearly visible. Relaxed silhouette, premium but understated, realistic fabric texture, natural drape, accurate seams and proportions. "
        "No excessive styling, no distorted hands, no extra limbs, no unrealistic clothing construction. "
        f"{STRICT_VISUAL_RULE}"
    )


def prompt_lookbook(p, location):
    return (
        "A summer lookbook image for a fictional Korean men's contemporary domestic fashion brand. "
        "Quiet luxury, minimal Seoul menswear mood, relaxed tailoring, breathable summer fabrics, muted neutral color palette. "
        "Young East Asian male model, calm expression, natural editorial pose. "
        f"Featured item: {p['name']}, {p['color']}, {p['material']}, {p['fit']}. "
        f"Style it with: {p['styling_notes']}. "
        f"Location: {location}. Soft natural light, refined composition, clean negative space, premium editorial e-commerce lookbook photography, realistic fabric movement. "
        "No real brand references, no distorted anatomy. "
        f"{STRICT_VISUAL_RULE}"
    )


def short_description(p):
    return f"{p['color']} {p['material']} item with {p['fit']} and {p['design_notes']}."


def product_dict(row, category, index):
    pid, name, kr_name, color, material, fit, design, styling, price = row
    folder = f"{category}s/{pid}" if category == "top" else f"{category}s/{pid}"
    p = {
        "id": pid,
        "category": category,
        "name": name,
        "korean_name": kr_name,
        "color": color,
        "material": material,
        "fit": fit,
        "design_notes": design,
        "styling_notes": styling,
        "price_krw": price,
        "detail_image_path": f"{folder}/detail_image.png",
        "worn_image_path": f"{folder}/worn_image.png",
        "lookbook_image_path": f"{folder}/lookbook_image.png",
        "lookbook_location": LOOKBOOK_LOCATIONS[index % len(LOOKBOOK_LOCATIONS)],
    }
    p["short_description"] = short_description(p)
    p["detail_image_prompt"] = prompt_detail(p)
    p["worn_image_prompt"] = prompt_worn(p)
    p["lookbook_image_prompt"] = prompt_lookbook(p, p["lookbook_location"])
    return p


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_brand_direction():
    content = f"""# Brand Direction

## Fictional Brand Concept

**{BRAND_NAME}** is a fictional Korean men's contemporary fashion brand created for a shopping mall demo project. The collection, **{COLLECTION_NAME}**, focuses on minimal summer dressing, relaxed silhouettes, breathable materials, and understated premium styling.

The brand is fictional and does not copy or reference any real brand, logo, campaign, product, pattern, or trademark.

## Target Customer

- Men in their 20s and 30s who prefer calm contemporary summer clothing.
- Customers who want relaxed Korean menswear styling without loud graphics.
- Online shoppers who need clear product images, accurate material cues, and practical styling.
- Customers looking for city-boy summer styling, relaxed tailoring, linen shirts, summer knits, wide trousers, and easy pants.

## Visual Language

- Minimal, calm, refined, and understated.
- Clean e-commerce usability with cohesive product imagery.
- Premium but practical styling.
- Relaxed tailoring and natural fabric drape.
- No logos, no text inside images, no visible brand marks.

## Color Palette

- off-white
- cream
- ivory
- sand beige
- stone beige
- light khaki
- pale blue
- washed navy
- charcoal
- faded black
- light grey
- olive grey

## Material Palette

- linen
- linen blend
- cotton poplin
- crinkle cotton
- lightweight summer wool
- sheer summer knit
- open-weave knit
- nylon blend
- cotton twill
- washed denim
- rayon blend
- tencel blend

## Fit Direction

- relaxed fit
- semi-oversized
- boxy fit
- dropped shoulder
- wide straight
- one-tuck trousers
- two-tuck trousers
- easy pants
- drawstring waist
- loose summer tailoring
- natural drape

## Image Style Guide

### detail_image.png

Clean e-commerce product/detail image on a white or very light grey studio background. The garment must be clearly visible with emphasis on texture, seams, collar, waistband, pleats, buttons, hem, pocket details, and natural drape.

### worn_image.png

Clean model-worn product page image with a full-body young East Asian male model, neutral expression, front 3/4 angle, natural pose, white or very light grey studio background, and minimal styling.

### lookbook_image.png

Editorial summer lookbook mood with soft natural light, calm Korean contemporary styling, clean negative space, and understated city summer locations.

## Forbidden Elements

- Real brand names
- Real logos
- Text inside images
- Brand marks
- Visible clothing labels
- Neck labels
- Tags
- Watermarks
- Printed text
- Embroidered text
- Typography
- Graphic symbols
- Fake brand names
- Readable or unreadable text
- Loud graphics
- Trademarks
- Exact real product copies
- Excessive styling
- Surreal clothing construction
- Distorted anatomy
- Random labels or fake readable text
"""
    (ROOT / "docs" / "brand_direction.md").write_text(content, encoding="utf-8")


def write_catalog(products):
    lines = [
        "# Product Catalog",
        "",
        f"Brand: {BRAND_NAME}",
        f"Collection: {COLLECTION_NAME}",
        "",
        "| id | Korean name | English name | category | color | material | fit | price_krw | short description | styling notes |",
        "|---|---|---|---|---|---|---|---:|---|---|",
    ]
    for p in products:
        lines.append(
            f"| {p['id']} | {p['korean_name']} | {p['name']} | {p['category']} | {p['color']} | {p['material']} | {p['fit']} | {p['price_krw']} | {p['short_description']} | {p['styling_notes']} |"
        )
    (ROOT / "docs" / "product_catalog.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_readme():
    content = f"""# Menswear Demo Assets

This package contains planning documents, structured metadata, image prompts, and generated image slots for a fictional Korean men's contemporary fashion e-commerce demo brand.

## Overview

- Fictional brand: {BRAND_NAME}
- Collection: {COLLECTION_NAME}
- Total products: 40
- Tops: 20
- Bottoms: 20
- Expected images: 120
- Images per product: detail, worn, lookbook

The package is for a shopping mall demo project. It does not reference or copy any real commercial brand, logo, campaign, product, pattern, or trademark.

## Folder Structure

```text
menswear_demo_assets/
  docs/
    brand_direction.md
    product_catalog.md
    products.json
    image_generation_prompts.json
  tops/
    top_01/
      metadata.json
      detail_image.png
      worn_image.png
      lookbook_image.png
  bottoms/
    bottom_01/
      metadata.json
      detail_image.png
      worn_image.png
      lookbook_image.png
  manifest.json
  README.md
```

## Image Generation Assumptions

- All prompts describe a fictional Korean men's contemporary fashion brand.
- Image prompts intentionally avoid real brand names.
- Images should include no logos, no text, no brand marks, and no random labels.
- Product imagery should be cohesive, minimal, calm, summer-focused, and commercially usable.
- Detail images prioritize garment construction and material.
- Worn images prioritize product-page clarity.
- Lookbook images prioritize understated editorial mood.

## How To Use

Use `docs/products.json` or `manifest.json` to seed product data in a demo shopping mall. Each product includes Korean and English names, category, color, material, fit, price, image paths, and generation prompts.

The product folders can be copied into a frontend public asset directory. The relative paths in `manifest.json` are designed to be stable for product cards, product detail pages, lookbook modules, and admin previews.
"""
    (ROOT / "README.md").write_text(content, encoding="utf-8")


def main():
    products = []
    for i, row in enumerate(TOPS):
        products.append(product_dict(row, "top", i))
    for i, row in enumerate(BOTTOMS):
        products.append(product_dict(row, "bottom", i + len(TOPS)))

    for p in products:
        product_dir = ROOT / ("tops" if p["category"] == "top" else "bottoms") / p["id"]
        product_dir.mkdir(parents=True, exist_ok=True)

    (ROOT / "docs").mkdir(parents=True, exist_ok=True)

    for p in products:
        product_dir = ROOT / ("tops" if p["category"] == "top" else "bottoms") / p["id"]
        write_json(product_dir / "metadata.json", p)

    write_brand_direction()
    write_catalog(products)
    write_json(ROOT / "docs" / "products.json", products)

    prompts = {
        p["id"]: {
            "detail_image_prompt": p["detail_image_prompt"],
            "worn_image_prompt": p["worn_image_prompt"],
            "lookbook_image_prompt": p["lookbook_image_prompt"],
        }
        for p in products
    }
    write_json(ROOT / "docs" / "image_generation_prompts.json", prompts)

    manifest = {
        "brand_name": BRAND_NAME,
        "collection_name": COLLECTION_NAME,
        "total_products": len(products),
        "total_images": len(products) * 3,
        "products": products,
        "image_paths": [
            p[path_key]
            for p in products
            for path_key in ("detail_image_path", "worn_image_path", "lookbook_image_path")
        ],
    }
    write_json(ROOT / "manifest.json", manifest)
    write_readme()


if __name__ == "__main__":
    main()
