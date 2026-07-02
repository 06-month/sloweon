import json
from pathlib import Path


ROOT = Path("menswear_demo_assets")


def main():
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    missing = []
    present = []
    for rel in manifest["image_paths"]:
        path = ROOT / rel
        if path.exists():
            present.append(rel)
        else:
            missing.append(rel)

    status = {
        "expected_images": manifest["total_images"],
        "generated_images": len(present),
        "missing_images": len(missing),
        "generated_image_paths": present,
        "missing_image_paths": missing,
        "status": "partial",
        "reason": "Built-in image generation is available one prompt at a time. Batch CLI generation requires OPENAI_API_KEY, which is not present in this environment.",
        "strict_visual_rule": "Any visible logo, brand mark, clothing label, neck label, tag, watermark, printed text, embroidered text, typography, graphic symbol, fake brand name, or readable/unreadable text should be treated as a failed image and regenerated.",
    }
    (ROOT / "image_generation_failures.json").write_text(
        json.dumps(status, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    lines = [
        "# Image Generation Status",
        "",
        "Status: partial",
        "",
        f"- Expected images: {manifest['total_images']}",
        f"- Generated images present: {len(present)}",
        f"- Missing images: {len(missing)}",
        "",
        "## Reason",
        "",
        "The built-in image generation tool is available, but it only accepts one prompt at a time and saves to its default generated-images directory. The bundled batch CLI requires `OPENAI_API_KEY`, which is not present in this environment.",
        "",
        "No fake placeholder PNGs were created. Missing files should be generated later from `docs/image_generation_prompts.json` and saved to the exact paths listed below.",
        "",
        "## Strict Regeneration Rule",
        "",
        "If any generated image contains a visible logo, brand mark, clothing label, neck label, tag, watermark, printed text, embroidered text, typography, graphic symbol, fake brand name, or readable/unreadable text, treat that image as failed and regenerate it.",
        "",
        "## Generated Images",
        "",
    ]
    lines.extend(f"- `{rel}`" for rel in present)
    lines.extend(["", "## Missing Images", ""])
    lines.extend(f"- `{rel}`" for rel in missing)
    (ROOT / "TODO_GENERATE_IMAGES.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
