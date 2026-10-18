/** Controls Pannellum-based 360-degree viewing while preserving the existing Three.js scene state. */
export class PanoramaViewer {
  /** Creates the panorama controller and stores references to the existing 3D viewer. */
  constructor({ scene, camera, controls, currentModel, grid, renderer, viewerElement, beforeOpen, afterClose }) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.getCurrentModel = currentModel;
    this.grid = grid;
    this.renderer = renderer;
    this.viewerElement = viewerElement;
    this.beforeOpen = beforeOpen;
    this.afterClose = afterClose;
    this.savedState = null;
    this.active = false;
    this.pannellumViewer = null;
    this.openToken = 0;
    this.overlay = this.createOverlay();
  }

  /** Creates the Pannellum host, title, close control, and accessible panorama overlay. */
  createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "panorama-overlay hidden";
    overlay.setAttribute("aria-label", "360 degree panorama viewer");
    overlay.innerHTML = '<div class="panorama-topbar"><span class="panorama-title">Panorama</span><button class="panorama-back" type="button">← Back to Walk / 3D</button></div><div class="panorama-pannellum" aria-label="Interactive 360 degree panorama"></div><div class="panorama-hint">Drag to look around · Scroll to zoom</div><div class="panorama-error hidden" role="alert"></div>';
    this.viewerElement.appendChild(overlay);
    overlay.querySelector(".panorama-back").addEventListener("click", () => this.close());
    return overlay;
  }

  /** Opens the selected equirectangular image in Pannellum and temporarily suspends 3D controls. */
  async open(panorama, modelBounds) {
    if (this.active || !panorama || !panorama.image) return;
    if (!window.pannellum || typeof window.pannellum.viewer !== "function") {
      throw new Error("Pannellum did not load. Check the internet connection and the Pannellum 2.5.7 script in index.html.");
    }
    this.openToken += 1;
    const openToken = this.openToken;
    if (this.beforeOpen) this.beforeOpen();
    this.savedState = {
      controlsEnabled: this.controls.enabled,
      modelVisible: this.getCurrentModel()?.visible ?? true,
      gridVisible: this.grid.visible
    };
    const model = this.getCurrentModel();
    if (model) model.visible = false;
    this.grid.visible = false;
    this.controls.enabled = false;
    this.overlay.querySelector(".panorama-title").textContent = panorama.name || "360° Panorama";
    this.overlay.querySelector(".panorama-error").classList.add("hidden");
    this.overlay.classList.remove("hidden");
    this.active = true;

    try {
      const host = this.overlay.querySelector(".panorama-pannellum");
      host.replaceChildren();
      const config = {
        type: "equirectangular",
        panorama: panorama.image,
        autoLoad: true,
        showControls: true,
        showZoomCtrl: true,
        compass: false,
        mouseZoom: true,
        draggable: true,
        keyboardZoom: true,
        hfov: 100,
        minHfov: 35,
        maxHfov: 120,
        yaw: Number(panorama.orientation?.yaw || 0),
        pitch: Number(panorama.orientation?.pitch || 0),
        hotSpotDebug: false
      };
      if (panorama.orientation?.hfov != null) config.hfov = Number(panorama.orientation.hfov);
      this.pannellumViewer = window.pannellum.viewer(host, config);
      this.pannellumViewer.on("error", (message) => {
        if (openToken !== this.openToken) return;
        const errorPanel = this.overlay.querySelector(".panorama-error");
        errorPanel.textContent = `Unable to display panorama: ${String(message || "unknown error")}`;
        errorPanel.classList.remove("hidden");
      });
      this.pannellumViewer.on("load", () => {
        if (openToken !== this.openToken) return;
        this.overlay.querySelector(".panorama-error").classList.add("hidden");
      });
    } catch (error) {
      this.close();
      throw new Error(`Could not open panorama "${panorama.name || panorama.id || "unnamed"}": ${error.message}`);
    }
  }

  /** Closes and destroys Pannellum, then restores the model, grid, and 3D controls. */
  close() {
    if (!this.active && !this.savedState) return;
    this.openToken += 1;
    if (this.pannellumViewer) {
      try {
        this.pannellumViewer.destroy();
      } catch (error) {
        console.warn("Pannellum cleanup reported an issue:", error);
      }
      this.pannellumViewer = null;
    }
    this.overlay.querySelector(".panorama-pannellum").replaceChildren();
    this.overlay.classList.add("hidden");
    if (this.savedState) {
      const model = this.getCurrentModel();
      if (model) model.visible = this.savedState.modelVisible;
      this.grid.visible = this.savedState.gridVisible;
      this.controls.enabled = this.savedState.controlsEnabled;
      this.savedState = null;
    }
    this.active = false;
    if (this.afterClose) this.afterClose();
  }
}
