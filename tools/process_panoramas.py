#!/usr/bin/env python3
"""Convert TRIPT XR panorama PNG files to validated WebP and maintain panoramas.json.

Usage: python tools/process_panoramas.py [--quality 88] [--max-width 8192] [--keep-png]
Requires Pillow: python -m pip install Pillow
"""
from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path
from PIL import Image, ImageFile

ROOT = Path(__file__).resolve().parents[1]
PANORAMA_DIR = ROOT / "assets" / "panorama"
MANIFEST_PATH = ROOT / "config" / "panoramas.json"
SUPPORTED = {".png", ".webp"}


def load_manifest(path: Path) -> dict:
    """Load and validate the existing panorama manifest, preserving saved viewpoint metadata."""
    if not path.exists():
        return {"version": 1, "panoramas": []}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cannot read {path}: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("panoramas", []), list):
        raise RuntimeError("panoramas.json must contain a 'panoramas' array.")
    data.setdefault("version", 1)
    data.setdefault("panoramas", [])
    return data


def convert_png(source: Path, quality: int, max_width: int) -> tuple[Path, int, int]:
    """Convert one PNG to WebP, optionally resize oversized panoramas, then reopen to validate the result."""
    target = source.with_suffix(".webp")
    with Image.open(source) as image:
        image.load()
        if image.width < 2 or image.height < 2:
            raise ValueError("image dimensions are invalid")
        if image.width > max_width:
            new_height = max(2, round(image.height * max_width / image.width))
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        image.save(target, "WEBP", quality=quality, method=6)
    with Image.open(target) as check:
        check.verify()
    with Image.open(target) as check:
        if check.width < 2 or check.height < 2:
            raise ValueError("converted WebP failed dimension validation")
    return target, source.stat().st_size, target.stat().st_size


def main() -> int:
    """Scan panorama assets, convert PNGs safely, and write an updated manifest without losing coordinates."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quality", type=int, default=88, help="WebP quality from 1 to 100 (default: 88)")
    parser.add_argument("--max-width", type=int, default=8192, help="Maximum panorama width; 0 disables resizing")
    parser.add_argument("--keep-png", action="store_true", help="Keep source PNGs after successful validation")
    args = parser.parse_args()
    if not 1 <= args.quality <= 100:
        parser.error("--quality must be between 1 and 100")
    if args.max_width < 0:
        parser.error("--max-width cannot be negative")

    PANORAMA_DIR.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest(MANIFEST_PATH)
    existing = {str(item.get("id")): item for item in manifest["panoramas"] if isinstance(item, dict) and item.get("id")}
    files = sorted(path for path in PANORAMA_DIR.iterdir() if path.is_file() and path.suffix.lower() in SUPPORTED)
    if not files:
        print(f"No PNG/WebP files found in {PANORAMA_DIR}")

    records: list[dict] = []
    seen: set[str] = set()
    converted = 0
    errors = 0
    for path in files:
        if path.suffix.lower() == ".png":
            try:
                target, before, after = convert_png(path, args.quality, args.max_width or 10**9)
                converted += 1
                print(f"CONVERTED {path.name} -> {target.name} | {before / 1024:.0f} KB -> {after / 1024:.0f} KB")
                if not args.keep_png:
                    path.unlink()
                    print(f"REMOVED source PNG after validation: {path.name}")
                path = target
            except Exception as exc:
                errors += 1
                print(f"ERROR {path.name}: {exc}", file=sys.stderr)
                # Preserve the original PNG and retain a manifest entry pointing at it if conversion failed.
        if path.suffix.lower() not in SUPPORTED:
            continue
        key = path.stem.lower()
        if key in seen:
            print(f"WARNING duplicate panorama stem '{path.stem}' ignored: {path.name}", file=sys.stderr)
            continue
        seen.add(key)
        old = next((item for item in manifest["panoramas"] if isinstance(item, dict) and str(item.get("id", "")).lower() == key), None)
        if old is None:
            old = next((item for item in manifest["panoramas"] if isinstance(item, dict) and Path(str(item.get("image", ""))).stem.lower() == key), None)
        item = dict(old or {})
        item.setdefault("id", key)
        item.setdefault("name", path.stem.replace("_", " ").replace("-", " ").title())
        item["image"] = "./assets/panorama/" + path.name
        item.setdefault("enabled", True)
        item.setdefault("position", None)
        item.setdefault("orientation", {"yaw": 0, "pitch": 0})
        records.append(item)

    manifest["panoramas"] = records
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = MANIFEST_PATH.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    json.loads(temporary.read_text(encoding="utf-8"))
    temporary.replace(MANIFEST_PATH)
    print(f"\nManifest updated: {MANIFEST_PATH.relative_to(ROOT)}")
    print(f"Panoramas listed: {len(records)} | Converted: {converted} | Errors: {errors}")
    print("Unpositioned panoramas remain in the manifest until configured in Developer Option.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
