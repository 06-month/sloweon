# Menswear Demo Assets

This package contains planning documents, structured metadata, image prompts, and generated image slots for a fictional Korean men's contemporary fashion e-commerce demo brand.

## Overview

- Fictional brand: SLOWEON
- Collection: Quiet City Summer 2026
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
- Images should include no visible clothing labels, neck labels, tags, watermarks, typography, printed text, embroidered text, graphic symbols, fake brand names, or readable/unreadable text.
- Product imagery should be cohesive, minimal, calm, summer-focused, and commercially usable.
- Detail images prioritize garment construction and material.
- Worn images prioritize product-page clarity.
- Lookbook images prioritize understated editorial mood.

## Current Generation Status

This package includes full planning documents, metadata, prompts, folder structure, and a partial set of generated images. See `TODO_GENERATE_IMAGES.md` and `image_generation_failures.json` for the exact generated/missing image paths.

No fake placeholder PNGs were created for missing images.

## How To Use

Use `docs/products.json` or `manifest.json` to seed product data in a demo shopping mall. Each product includes Korean and English names, category, color, material, fit, price, image paths, and generation prompts.

The product folders can be copied into a frontend public asset directory. The relative paths in `manifest.json` are designed to be stable for product cards, product detail pages, lookbook modules, and admin previews.
