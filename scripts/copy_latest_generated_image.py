import json
import shutil
import sys
from pathlib import Path


GENERATED_ROOT = Path.home() / ".codex" / "generated_images"
USED_LOG = Path(".asset_generation_state") / "generation_used_sources.json"


def load_used():
    if USED_LOG.exists():
        return set(json.loads(USED_LOG.read_text(encoding="utf-8")))
    return set()


def save_used(used):
    USED_LOG.parent.mkdir(parents=True, exist_ok=True)
    USED_LOG.write_text(json.dumps(sorted(used), indent=2) + "\n", encoding="utf-8")


def main():
    if len(sys.argv) == 2 and sys.argv[1] == "--mark-existing":
        used = {str(p) for p in GENERATED_ROOT.glob("*/*.png")}
        save_used(used)
        print(f"MARKED {len(used)} existing generated images as used")
        return

    used = load_used()
    candidates = sorted(
        GENERATED_ROOT.glob("*/*.png"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    remaining = [p for p in candidates if str(p) not in used]

    destinations = [Path(arg) for arg in sys.argv[1:]]
    if not destinations:
        raise SystemExit("usage: python3 scripts/copy_latest_generated_image.py <destination_png> [<destination_png>...]|--mark-existing")

    if len(remaining) < len([d for d in destinations if not d.exists()]):
        raise SystemExit("not enough unused generated images found")

    source_index = 0
    for destination in destinations:
        if destination.exists():
            print(f"SKIP existing {destination}")
            continue
        src = remaining[source_index]
        source_index += 1
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, destination)
        used.add(str(src))
        print(f"COPIED {src} -> {destination}")

    save_used(used)


if __name__ == "__main__":
    main()
