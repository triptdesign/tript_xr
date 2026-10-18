#!/usr/bin/env python3
"""Run the local TRIPT XR development server and handle asset/project uploads."""
from __future__ import annotations
import io
import json
import re
import sys
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = Path(__file__).resolve().parents[1]
HOST = "127.0.0.1"
PORT = 8000
MAX_MODEL_BYTES = 1_500 * 1024 * 1024
MAX_PANORAMA_BYTES = 250 * 1024 * 1024

def safe_filename(value: str, allowed_extensions: set[str]) -> str:
    """Sanitize a client-supplied filename and enforce the expected extension allowlist."""
    name = Path(value.replace("\\", "/")).name
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", name).strip(" .")
    if not name or Path(name).suffix.lower() not in allowed_extensions:
        raise ValueError("Unsupported filename or file extension.")
    return name

class TRIPTXRHandler(SimpleHTTPRequestHandler):
    """Serve the project and provide localhost-only upload, save, processing, and export endpoints."""
    def __init__(self, *args, **kwargs):
        """Initialize the static server with the TRIPT XR project directory as its root."""
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status: int, payload: dict) -> None:
        """Send a compact JSON API response with caching disabled."""
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_upload(self, destination: Path, limit: int) -> int:
        """Stream the request body to a temporary file, enforce size limits, and atomically replace the destination."""
        length = int(self.headers.get("Content-Length", "0"))
        if length < 1 or length > limit:
            raise ValueError(f"Upload size must be between 1 byte and {limit // (1024 * 1024)} MB.")
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(destination.suffix + ".uploading")
        remaining = length
        try:
            with temporary.open("wb") as output:
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        raise ValueError("Upload ended before all bytes were received.")
                    output.write(chunk)
                    remaining -= len(chunk)
            if temporary.stat().st_size != length:
                raise ValueError("Uploaded file size validation failed.")
            if destination.suffix.lower() == ".glb":
                with temporary.open("rb") as uploaded:
                    if uploaded.read(4) != b"glTF":
                        raise ValueError("The uploaded file does not have a valid GLB header.")
            elif destination.suffix.lower() in {".png", ".webp"}:
                try:
                    from PIL import Image
                    with Image.open(temporary) as image:
                        image.verify()
                    with Image.open(temporary) as image:
                        if image.width < 2 or image.height < 2:
                            raise ValueError("Image dimensions are invalid.")
                except ImportError as exc:
                    raise ValueError("Pillow is required for panorama upload validation. Install it with: python -m pip install Pillow") from exc
                except ValueError:
                    raise
                except Exception as exc:
                    raise ValueError("The uploaded panorama is not a valid PNG or WebP image.") from exc
            temporary.replace(destination)
            return length
        except Exception:
            temporary.unlink(missing_ok=True)
            raise

    def do_POST(self):
        """Route upload and project-management requests to their validated local handlers."""
        endpoint = urlparse(self.path).path.rstrip("/")
        if endpoint == "/api/upload-model":
            self.handle_model_upload(); return
        if endpoint == "/api/upload-panorama":
            self.handle_panorama_upload(); return
        if endpoint == "/api/process-panoramas":
            self.handle_panorama_processing(); return
        if endpoint == "/api/save-project":
            self.handle_project_save(); return
        if endpoint == "/api/export-project":
            self.handle_project_export(); return
        if endpoint == "/api/new-project":
            self.handle_new_project(); return
        self.send_json(404, {"ok": False, "error": "Unknown local developer endpoint."})

    def handle_model_upload(self):
        """Save a standalone GLB and atomically update config/model.json and the section model reference."""
        try:
            query = parse_qs(urlparse(self.path).query)
            filename = safe_filename(query.get("filename", ["building.glb"])[0], {".glb"})
            destination = ROOT / "assets" / "model" / filename
            size = self.read_upload(destination, MAX_MODEL_BYTES)
            relative = destination.relative_to(ROOT).as_posix()
            model_config = {"version": 1, "model": relative}
            self.atomic_json(ROOT / "config" / "model.json", model_config)
            section_path = ROOT / "config" / "sections.json"
            sections = json.loads(section_path.read_text(encoding="utf-8")) if section_path.exists() else {"version": 1, "sections": []}
            sections["model"] = relative
            self.atomic_json(section_path, sections)
            self.send_json(200, {"ok": True, "path": relative, "size": size})
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_json(400, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def handle_panorama_upload(self):
        """Store one PNG/WebP panorama and add it to the manifest without erasing an existing viewpoint placement."""
        try:
            query = parse_qs(urlparse(self.path).query)
            filename = safe_filename(query.get("filename", [""])[0], {".png", ".webp"})
            destination = ROOT / "assets" / "panorama" / filename
            size = self.read_upload(destination, MAX_PANORAMA_BYTES)
            manifest_path = ROOT / "config" / "panoramas.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"version": 1, "panoramas": []}
            stem = destination.stem.lower()
            old = next((item for item in manifest.get("panoramas", []) if str(item.get("id", "")).lower() == stem or Path(str(item.get("image", ""))).stem.lower() == stem), None)
            record = dict(old or {})
            record.update({"id": str(record.get("id") or stem), "name": str(record.get("name") or destination.stem.replace("_", " ").replace("-", " ").title()), "image": "./" + destination.relative_to(ROOT).as_posix()})
            record.setdefault("enabled", True); record.setdefault("position", None); record.setdefault("orientation", {"yaw": 0, "pitch": 0})
            items = [item for item in manifest.get("panoramas", []) if not (str(item.get("id", "")).lower() == stem or Path(str(item.get("image", ""))).stem.lower() == stem)]
            items.append(record); manifest["panoramas"] = items; manifest.setdefault("version", 1)
            self.atomic_json(manifest_path, manifest)
            self.send_json(200, {"ok": True, "path": record["image"], "id": record["id"], "size": size})
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_json(400, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def handle_panorama_processing(self):
        """Run the existing PNG-to-WebP processor and return its diagnostic output."""
        import subprocess
        try:
            result = subprocess.run([sys.executable, str(ROOT / "tools" / "process_panoramas.py")], cwd=ROOT, capture_output=True, text=True, timeout=600, check=False)
            self.send_json(200 if result.returncode == 0 else 500, {"ok": result.returncode == 0, "output": (result.stdout + ("\n" + result.stderr if result.stderr else "")).strip(), "error": result.stderr.strip() if result.returncode else ""})
        except subprocess.TimeoutExpired:
            self.send_json(504, {"ok": False, "error": "Panorama processing timed out."})

    def atomic_json(self, target: Path, data: dict) -> None:
        """Write JSON through a temporary file and atomically replace the target after parsing it back."""
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix(target.suffix + ".tmp")
        temporary.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        json.loads(temporary.read_text(encoding="utf-8"))
        temporary.replace(target)

    def read_project_payload(self):
        """Read and validate section/panorama JSON sent by Save Project or Export Project."""
        length = int(self.headers.get("Content-Length", "0"))
        if length < 1 or length > 2_000_000:
            raise ValueError("Invalid project payload size.")
        payload = json.loads(self.rfile.read(length).decode("utf-8"))
        sections, panoramas = payload.get("sections"), payload.get("panoramas")
        render = payload.get("render", {"version": 1, "background": "white", "exposure": 1, "environmentIntensity": 1, "shadows": True, "quality": "balanced"})
        if not isinstance(sections, dict) or not isinstance(sections.get("sections"), list): raise ValueError("Invalid sections configuration.")
        if not isinstance(panoramas, dict) or not isinstance(panoramas.get("panoramas"), list): raise ValueError("Invalid panorama configuration.")
        if not isinstance(render, dict): raise ValueError("Invalid render settings configuration.")
        if render.get("background", "white") not in {"white", "studio", "dark"}: raise ValueError("Unsupported render background.")
        if render.get("quality", "balanced") not in {"performance", "balanced", "high"}: raise ValueError("Unsupported render quality.")
        if render.get("hdriPreset", "none") not in {"none", "studio", "daylight", "sunset"}: raise ValueError("Unsupported online HDRI preset.")
        try:
            exposure = float(render.get("exposure", 1))
            environment_intensity = float(render.get("environmentIntensity", 1))
            hdri_rotation = float(render.get("hdriRotation", 0))
        except (TypeError, ValueError) as exc:
            raise ValueError("Render exposure, environment intensity, and HDRI rotation must be numbers.") from exc
        if not 0.6 <= exposure <= 1.6 or not 0 <= environment_intensity <= 2 or not 0 <= hdri_rotation <= 360: raise ValueError("Render values are outside supported ranges.")
        if not isinstance(render.get("shadows", True), bool): raise ValueError("Render shadows must be a boolean.")
        raw_overrides = render.get("materialOverrides", [])
        if not isinstance(raw_overrides, list) or len(raw_overrides) > 250: raise ValueError("Material overrides must be a list of at most 250 items.")
        material_overrides = []
        for item in raw_overrides:
            if not isinstance(item, dict) or not isinstance(item.get("key"), str) or not item["key"] or len(item["key"]) > 200: raise ValueError("Each material override requires a valid material key.")
            color = item.get("color")
            if color is not None and (not isinstance(color, str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", color)): raise ValueError("Material colour must be a six-digit hex colour.")
            try:
                roughness = float(item.get("roughness", 0.5)); metalness = float(item.get("metalness", 0)); opacity = float(item.get("opacity", 1))
            except (TypeError, ValueError) as exc:
                raise ValueError("Material roughness, metalness, and opacity must be numbers.") from exc
            if not 0 <= roughness <= 1 or not 0 <= metalness <= 1 or not 0.05 <= opacity <= 1: raise ValueError("Material override values are outside supported ranges.")
            if not isinstance(item.get("preserveColor", True), bool): raise ValueError("Material preserveColor must be a boolean.")
            material_overrides.append({"key": item["key"], "color": color, "preserveColor": item.get("preserveColor", True), "roughness": roughness, "metalness": metalness, "opacity": opacity})
        render = {"version": 2, "background": render.get("background", "white"), "exposure": exposure, "environmentIntensity": environment_intensity, "shadows": render.get("shadows", True), "quality": render.get("quality", "balanced"), "hdriPreset": render.get("hdriPreset", "none"), "hdriRotation": hdri_rotation, "materialOverrides": material_overrides}
        for item in panoramas["panoramas"]:
            if not isinstance(item, dict) or not item.get("id") or not item.get("image"): raise ValueError("Each panorama requires an id and image path.")
            image_path = (ROOT / str(item["image"]).removeprefix("./")).resolve()
            if ROOT.resolve() not in image_path.parents or not image_path.is_file(): raise ValueError(f"Missing or invalid panorama image: {item.get('image')}")
        return sections, panoramas, render

    def handle_project_save(self):
        """Persist section and panorama configurations atomically after validating the submitted project state."""
        try:
            sections, panoramas, render = self.read_project_payload()
            self.atomic_json(ROOT / "config" / "sections.json", sections)
            self.atomic_json(ROOT / "config" / "panoramas.json", panoramas)
            self.atomic_json(ROOT / "config" / "render.json", render)
            self.send_json(200, {"ok": True, "message": "Project configuration saved."})
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_json(400, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def handle_new_project(self):
        """Clear only active project assets and reset project-specific JSON while preserving application code and exported ZIPs."""
        try:
            removed_files = 0
            for relative_dir in (Path("assets") / "model", Path("assets") / "panorama"):
                directory = ROOT / relative_dir
                directory.mkdir(parents=True, exist_ok=True)
                for file_path in directory.iterdir():
                    if file_path.is_file() and file_path.name.lower() != "readme.txt":
                        file_path.unlink()
                        removed_files += 1
                    elif file_path.is_dir():
                        # Remove nested asset directories only within the two dedicated project-asset folders.
                        import shutil
                        shutil.rmtree(file_path)
                        removed_files += 1

            self.atomic_json(ROOT / "config" / "model.json", {"version": 1, "model": None})
            self.atomic_json(ROOT / "config" / "sections.json", {"version": 1, "model": None, "sections": []})
            self.atomic_json(ROOT / "config" / "panoramas.json", {"version": 1, "panoramas": []})
            self.atomic_json(ROOT / "config" / "render.json", {"version": 2, "background": "white", "exposure": 1, "environmentIntensity": 1, "shadows": True, "quality": "balanced", "hdriPreset": "none", "hdriRotation": 0, "materialOverrides": []})
            self.send_json(200, {"ok": True, "message": "New empty project is ready.", "removed_asset_entries": removed_files})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

    def handle_project_export(self):
        """Validate current project configuration and return a ZIP excluding repository/cache internals."""
        try:
            sections, panoramas, render = self.read_project_payload()
            output = io.BytesIO()
            excluded = {".git", "__pycache__", ".venv", "venv"}
            with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
                for file_path in ROOT.rglob("*"):
                    if not file_path.is_file() or any(part in excluded for part in file_path.parts): continue
                    relative = file_path.relative_to(ROOT).as_posix()
                    if relative in {"config/sections.json", "config/panoramas.json", "config/render.json"}: continue
                    archive.write(file_path, relative)
                archive.writestr("config/sections.json", json.dumps(sections, indent=2) + "\n")
                archive.writestr("config/panoramas.json", json.dumps(panoramas, indent=2) + "\n")
                archive.writestr("config/render.json", json.dumps(render, indent=2) + "\n")
                archive.writestr("EXPORT_README.txt", "TRIPT XR project export. Verify paths and test before deployment.\n")
            body = output.getvalue()
            self.send_response(200); self.send_header("Content-Type", "application/zip")
            self.send_header("Content-Disposition", 'attachment; filename="TRIPT_XR_Project_Export.zip"')
            self.send_header("Content-Length", str(len(body))); self.send_header("Cache-Control", "no-store"); self.end_headers(); self.wfile.write(body)
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_json(400, {"ok": False, "error": str(exc)})
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)})

def main():
    """Start the local-only HTTP server for the TRIPT XR Developer Studio."""
    server = ThreadingHTTPServer((HOST, PORT), TRIPTXRHandler)
    print(f"TRIPT XR developer server: http://{HOST}:{PORT}")
    print("Upload endpoints are restricted to the local development server.")
    try: server.serve_forever()
    except KeyboardInterrupt: print("\nStopping TRIPT XR developer server…")
    finally: server.server_close()

if __name__ == "__main__":
    main()
