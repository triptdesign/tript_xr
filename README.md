# TRIPT XR — Trial Starter

A local browser-based architectural model viewer and Developer Studio.

## Run locally
1. Install Python 3.10+ and Pillow: `python -m pip install Pillow`.
2. Run `python tools/dev_server.py`.
3. Open `http://127.0.0.1:8000/editor.html`.
4. Upload a standalone GLB using **Upload GLB**.
5. Open **360° Viewpoint**, select PNG/WebP files, and choose **Upload selected panoramas**. Use **Scan & Convert PNG to WebP** to process PNG files.
6. Place panorama viewpoints, create section scenes, then use **Save Project** or **Export Project**.
7. Open `http://127.0.0.1:8000/index.html` to view the saved model and panoramas.

## Project assets
- `assets/model/`: uploaded GLB models.
- `assets/panorama/`: uploaded PNG/WebP panoramas.
- `config/model.json`: currently selected model path.
- `config/sections.json`: saved section scenes.
- `config/panoramas.json`: panorama paths and viewpoint metadata.

The starter begins with no model, panoramas, or saved sections. The upload API enforces file extensions, size limits, filename sanitization, and basic GLB/image validation. Keep this development server bound to localhost; it is not intended as a public production upload server.

## Current scope and testing note
This is an initial trial implementation. Syntax and API checks should be run locally; full browser/WebGL testing and testing with a real architectural GLB are still required before production use.


## Render settings

The Developer Studio includes a Render tab for live viewport background, exposure, environment intensity, shadows, graphics quality, online HDRI presets, and a Material Studio. Online HDRIs are fetched only when selected and are not bundled with the project; browser access depends on the remote host and its CORS policy. The Material Studio can select a material from the dropdown or by clicking a model surface, then apply reversible roughness, metalness, opacity, and optional colour overrides while retaining source texture maps. Render settings and material overrides are saved to `config/render.json` using **Save Project** and loaded by the main viewer. Rendering remains browser-based through the existing Three.js engine; these controls do not replace the GLB loader, camera fitting, section clipping, Walk Mode, or panorama system.

## Render workspace updates
- The Developer Studio now opens as a slide-over panel so the 3D viewport remains full-width underneath it. Use the × control to close the panel and the floating Developer tools button to reopen it.
- Online HDRI presets are fetched on demand. Enable **Show selected HDRI as visible sky** to display the selected equirectangular environment around the model while also using it for reflections.
- The selected sky, rotation, lighting controls, and material overrides are stored in `config/render.json` through Save Project.

## Render, material, and editor Walk Mode update

- Online HDRI presets are loaded on demand from Poly Haven: Morning Meadow (`kiara_1_dawn`), Open Daylight (`autumn_field_puresky`), and Evening Sunset (`toposcope_sunset`). These are not bundled with the project.
- The visible HDRI is rendered above a horizon mask; the lower hemisphere uses a plain neutral surface colour to avoid showing the HDRI's foreground ground/road.
- Material Studio supports emissive colour and emissive intensity in addition to the existing base colour, roughness, metalness, and opacity overrides.
- The editor reuses the existing `WalkMode` module and displays WASD/mouse-look guidance. Section clipping is temporarily cleared while selecting a walk start point and restored when Walk Mode exits.
- The original camera near/far calculation and section clipping implementation are retained.

Online HDRI downloads require network access and a browser that permits the asset host. If an HDRI fails, the viewer falls back to the default environment.
