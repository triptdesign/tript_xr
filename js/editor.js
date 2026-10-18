
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { createSectionCapSystem } from "./section-caps.js";
import { WalkMode } from "./walk-mode.js";

// Collects the editor interface elements required by the script.
const viewerElement = document.querySelector("#viewer");
const loadingElement = document.querySelector("#loading");
const errorElement = document.querySelector("#error");
const dimensionsElement = document.querySelector("#model-dimensions");
const modelNameElement = document.querySelector("#model-name");
const modelSizeElement = document.querySelector("#model-size");
const fileInput = document.querySelector("#model-file");
const panoramaFilesInput = document.querySelector("#panorama-files");
const panoramaUploadButton = document.querySelector("#panorama-upload");
const resetButton = document.querySelector("#reset-view");
const walkStatusElement = document.querySelector("#walk-status");
const walkControlsElement = document.querySelector("#walk-controls");
const walkJoystick = document.querySelector("#walk-joystick");
const walkJoystickKnob = document.querySelector("#walk-joystick-knob");
const walkLookArea = document.querySelector("#walk-look-area");
const editorTouchNavToggle = document.querySelector("#editor-touch-nav-toggle");
const editorTouchFastButton = document.querySelector("#editor-touch-fast");
const materialPickToggle = document.querySelector("#material-pick-toggle");
const sceneNameInput = document.querySelector("#scene-name");
const axisInput = document.querySelector("#section-axis");
const directionInput = document.querySelector("#section-direction");
const positionInput = document.querySelector("#section-position");
const positionValue = document.querySelector("#section-position-value");
const applyCutButton = document.querySelector("#apply-cut");
const clearCutButton = document.querySelector("#clear-cut");
const saveSceneButton = document.querySelector("#save-scene");
const updateSceneButton = document.querySelector("#update-scene");
const saveProjectButton = document.querySelector("#save-project");
const newProjectButton = document.querySelector("#new-project");
const toolTabButtons = [...document.querySelectorAll(".tool-tab")];
const closeDeveloperPanelButton = document.querySelector("#close-developer-panel");
const openDeveloperPanelButton = document.querySelector("#open-developer-panel");
const renderHdriSkyInput = document.querySelector("#render-hdri-sky");
const sceneListElement = document.querySelector("#scene-list");
const sceneCountElement = document.querySelector("#scene-count");
const resetScenesButton = document.querySelector("#reset-scenes");
const statusElement = document.querySelector("#editor-status");
const panoramaSelect = document.querySelector("#panorama-select");
const panoramaYawInput = document.querySelector("#panorama-yaw");
const panoramaPitchInput = document.querySelector("#panorama-pitch");
const panoramaEyeHeightInput = document.querySelector("#panorama-eye-height");
const panoramaPlaceToggle = document.querySelector("#panorama-place-toggle");
const panoramaRemoveButton = document.querySelector("#panorama-remove");
const panoramaProcessButton = document.querySelector("#panorama-process");
const panoramaListElement = document.querySelector("#panorama-list");
const renderBackgroundInput = document.querySelector("#render-background");
const renderExposureInput = document.querySelector("#render-exposure");
const renderExposureValue = document.querySelector("#render-exposure-value");
const renderEnvironmentInput = document.querySelector("#render-environment");
const renderEnvironmentValue = document.querySelector("#render-environment-value");
const renderShadowsInput = document.querySelector("#render-shadows");
const renderQualityInput = document.querySelector("#render-quality");
const renderResetButton = document.querySelector("#render-reset");
const renderApplyButton = document.querySelector("#render-apply");
const renderHdriInput = document.querySelector("#render-hdri");
const renderHdriRotationInput = document.querySelector("#render-hdri-rotation");
const renderHdriRotationValue = document.querySelector("#render-hdri-rotation-value");
const renderHdriStatus = document.querySelector("#render-hdri-status");
const materialSelectInput = document.querySelector("#material-select");
const materialSelectedName = document.querySelector("#material-selected-name");
const materialColorInput = document.querySelector("#material-color");
const materialPreserveColorInput = document.querySelector("#material-preserve-color");
const materialRoughnessInput = document.querySelector("#material-roughness");
const materialRoughnessValue = document.querySelector("#material-roughness-value");
const materialMetalnessInput = document.querySelector("#material-metalness");
const materialMetalnessValue = document.querySelector("#material-metalness-value");
const materialOpacityInput = document.querySelector("#material-opacity");
const materialOpacityValue = document.querySelector("#material-opacity-value");
const materialEmissiveColorInput = document.querySelector("#material-emissive-color");
const materialEmissiveIntensityInput = document.querySelector("#material-emissive-intensity");
const materialEmissiveIntensityValue = document.querySelector("#material-emissive-intensity-value");
const materialApplyButton = document.querySelector("#material-apply");
const materialResetButton = document.querySelector("#material-reset");
const materialStatus = document.querySelector("#material-status");

// Checks that the HTML contains every element required by the editor.
function validateEditorElements() {
  const requiredElements = {
    viewerElement,
    loadingElement,
    errorElement,
    dimensionsElement,
    modelNameElement,
    modelSizeElement,
    fileInput,
    panoramaFilesInput,
    panoramaUploadButton,
    resetButton,
    walkStatusElement,
    walkControlsElement,
    walkJoystick,
    walkJoystickKnob,
    walkLookArea,
    sceneNameInput,
    axisInput,
    directionInput,
    positionInput,
    positionValue,
    applyCutButton,
    clearCutButton,
    saveSceneButton,
    updateSceneButton,
    saveProjectButton,
    newProjectButton,
    sceneListElement,
    sceneCountElement,
    resetScenesButton,
    statusElement,
    closeDeveloperPanelButton,
    openDeveloperPanelButton,
    renderHdriSkyInput,
    panoramaSelect,
    panoramaYawInput,
    panoramaPitchInput,
    panoramaEyeHeightInput,
    panoramaPlaceToggle,
    panoramaRemoveButton,
    panoramaProcessButton,
    panoramaListElement,
    renderBackgroundInput,
    renderExposureInput,
    renderExposureValue,
    renderEnvironmentInput,
    renderEnvironmentValue,
    renderShadowsInput,
    renderQualityInput,
    renderResetButton,
    renderApplyButton,
    renderHdriInput,
    renderHdriRotationInput,
    renderHdriRotationValue,
    renderHdriStatus,
    materialSelectInput,
    materialSelectedName,
    materialColorInput,
    materialPreserveColorInput,
    materialRoughnessInput,
    materialRoughnessValue,
    materialMetalnessInput,
    materialMetalnessValue,
    materialOpacityInput,
    materialOpacityValue,
    materialEmissiveColorInput,
    materialEmissiveIntensityInput,
    materialEmissiveIntensityValue,
    materialApplyButton,
    materialResetButton,
    materialStatus
  };

  const missing = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(
      `Editor HTML is missing required elements: ${missing.join(", ")}`
    );
  }
}

validateEditorElements();

// Creates the Three.js scene and the white architectural viewing background.
const scene = new THREE.Scene();
scene.background = new THREE.Color("#ffffff");

// Initializes the camera; its clipping planes are adjusted after the GLB loads.
const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
camera.position.set(8, 6, 8);

// Creates the WebGL renderer and attaches it to the editor viewport.
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  stencil: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setClearColor("#ffffff", 1);
viewerElement.appendChild(renderer.domElement);

// Enables orbiting, zooming, and panning around the architectural model.
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.screenSpacePanning = true;

// Adds adjustable lighting for readable architectural surfaces and material details.
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xd8d8d8, 2);
scene.add(hemisphereLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(8, 12, 10);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
fillLight.position.set(-8, 5, -6);
scene.add(fillLight);

// Creates a neutral environment map for reflections on model materials.
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
const environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);

scene.environment = environmentTarget.texture;
roomEnvironment.dispose();

// Adds a subtle ground grid for spatial reference beneath the model.
const grid = new THREE.GridHelper(10, 20, 0xd8d8d8, 0xececec);
grid.material.transparent = true;
grid.material.opacity = 0.7;
scene.add(grid);

// Stores the active model, its bounds, and all saved section scenes.
let currentModel = null;
let currentModelUrl = null;
let modelBounds = null;
let sectionPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
let sectionCapSystem = null;
let sectionPreviewActive = false;
let savedScenes = [];
let selectedSceneId = null;
let sceneIdCounter = 1;
let panoramaItems = [];
let currentModelPath = null;
let panoramaPlacementMode = false;
let materialPickMode = false;
let selectedPanoramaId = null;
let panoramaPreviewMarkers = [];
const defaultRenderSettings = { version: 4, background: "white", exposure: 1, environmentIntensity: 1, shadows: true, quality: "balanced", hdriPreset: "none", hdriRotation: 0, showHdriSky: true, materialOverrides: [] };
let renderSettings = { ...defaultRenderSettings };
let activeHdriTarget = null;
let activeHdriTexture = null;
let hdriLoadSequence = 0;
let materialCatalog = [];
let selectedMaterialKey = "";
const materialPickRaycaster = new THREE.Raycaster();
const materialPickPointer = new THREE.Vector2();
const onlineHdriPresets = {
  morning: { name: "Morning Meadow", url: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kiara_1_dawn_1k.hdr" },
  day: { name: "Open Daylight", url: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/autumn_field_puresky_1k.hdr" },
  evening: { name: "Evening Sunset", url: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/toposcope_sunset_1k.hdr" }
};
// Builds a camera-following sky dome that shows HDRI scenery above the horizon and a plain surface below it.
const skyDomeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uEnvironment: { value: null },
    uRotation: { value: 0 },
    uGroundColor: { value: new THREE.Color("#d6d3cb") }
  },
  vertexShader: `
    varying vec3 vDirection;
    void main() {
      vDirection = normalize(position);
      vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      clipPosition.z = clipPosition.w * 0.999;
      gl_Position = clipPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D uEnvironment;
    uniform float uRotation;
    uniform vec3 uGroundColor;
    varying vec3 vDirection;
    const float PI = 3.141592653589793;
    void main() {
      vec3 direction = normalize(vDirection);
      float longitude = atan(direction.z, direction.x) + uRotation;
      float latitude = asin(clamp(direction.y, -1.0, 1.0));
      vec2 uv = vec2(longitude / (2.0 * PI) + 0.5, latitude / PI + 0.5);
      vec3 skyColor = texture2D(uEnvironment, uv).rgb;
      float skyMask = smoothstep(-0.012, 0.022, direction.y);
      gl_FragColor = vec4(mix(uGroundColor, skyColor, skyMask), 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
  side: THREE.BackSide,
  depthWrite: false,
  depthTest: false,
  toneMapped: true
});
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), skyDomeMaterial);
skyDome.name = "TRIPT XR HDRI Sky Dome";
skyDome.renderOrder = -1000;
skyDome.frustumCulled = false;
skyDome.visible = false;
scene.add(skyDome);

const panoramaPickRaycaster = new THREE.Raycaster();
const panoramaPickPointer = new THREE.Vector2();

// Loads existing saved section scenes from config/sections.json so Save Project preserves prior work.
async function loadSavedSectionScenes() {
  try {
    const response = await fetch("./config/sections.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    if (!config || !Array.isArray(config.sections)) throw new Error("sections.json must contain a sections array.");
    savedScenes = config.sections.filter((item) => item && ["x", "y", "z"].includes(item.axis) && Number.isFinite(Number(item.position)))
      .map((item, index) => ({ id: String(item.id || `section-loaded-${index + 1}`), name: String(item.name || `Section ${index + 1}`), enabled: item.enabled !== false, axis: item.axis, position: Math.min(1, Math.max(0, Number(item.position))), reverse: Boolean(item.reverse) }));
    renderSceneList();
    setStatus(`Loaded ${savedScenes.length} saved section scene(s).`);
  } catch (error) {
    setStatus(`Saved section scenes could not be loaded: ${error.message}`);
  }
}

// Loads panorama metadata produced by the Python asset processor and fills the developer selector.
async function loadPanoramaManifest() {
  try {
    const response = await fetch("./config/panoramas.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || !Array.isArray(data.panoramas)) throw new Error("Manifest must contain a panoramas array.");
    panoramaItems = data.panoramas.filter((item) => item && item.id && item.image);
    panoramaSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = panoramaItems.length ? "Choose a panorama…" : "No panorama files found";
    panoramaSelect.appendChild(placeholder);
    panoramaItems.forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item.id);
      option.textContent = String(item.name || item.id);
      panoramaSelect.appendChild(option);
    });
    selectedPanoramaId = panoramaItems[0]?.id ? String(panoramaItems[0].id) : null;
    if (selectedPanoramaId) panoramaSelect.value = selectedPanoramaId;
    renderPanoramaList();
    renderPanoramaPreviewMarkers();
    setStatus(`${panoramaItems.length} panorama asset(s) loaded. Select one and place its viewpoint on the model.`);
  } catch (error) {
    panoramaSelect.replaceChildren();
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Could not load panoramas.json";
    panoramaSelect.appendChild(option);
    setStatus(`Panorama manifest unavailable: ${error.message}. Run tools/process_panoramas.py first.`);
  }
}

// Removes and disposes preview markers before rebuilding them from configured panorama positions.
function clearPanoramaPreviewMarkers() {
  panoramaPreviewMarkers.forEach((marker) => {
    scene.remove(marker);
    marker.material.map?.dispose();
    marker.material.dispose();
  });
  panoramaPreviewMarkers = [];
}

// Renders developer-only 360-degree markers for panorama entries that already have valid coordinates.
function renderPanoramaPreviewMarkers() {
  clearPanoramaPreviewMarkers();
  panoramaItems.filter((item) => item.position && [item.position.x, item.position.y, item.position.z].every((value) => Number.isFinite(Number(value))))
    .forEach((item) => {
      const canvas = document.createElement("canvas");
      canvas.width = 128; canvas.height = 128;
      const context = canvas.getContext("2d");
      context.fillStyle = "#34348e"; context.beginPath(); context.arc(64, 64, 53, 0, Math.PI * 2); context.fill();
      context.strokeStyle = "#fff"; context.lineWidth = 5; context.stroke();
      context.fillStyle = "#fff"; context.font = "bold 28px Arial"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText("360°", 64, 65);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
      const size = modelBounds ? Math.max(...modelBounds.getSize(new THREE.Vector3()).toArray()) * 0.045 : 0.2;
      marker.position.set(Number(item.position.x), Number(item.position.y), Number(item.position.z));
      marker.scale.set(size, size, 1); marker.renderOrder = 2000; marker.userData.panoramaId = String(item.id);
      scene.add(marker); panoramaPreviewMarkers.push(marker);
    });
}

// Lists panorama files and indicates whether each viewpoint has been positioned in the model.
function renderPanoramaList() {
  panoramaListElement.replaceChildren();
  if (!panoramaItems.length) {
    const empty = document.createElement("p"); empty.className = "empty-state"; empty.textContent = "No panorama assets found. Add PNG/WebP files and run the Python processor.";
    panoramaListElement.appendChild(empty); return;
  }
  panoramaItems.forEach((item) => {
    const row = document.createElement("div"); row.className = `scene-item${String(item.id) === String(selectedPanoramaId) ? " selected" : ""}`;
    const info = document.createElement("div");
    const title = document.createElement("div"); title.className = "scene-meta"; title.textContent = item.name || item.id;
    const detail = document.createElement("div"); detail.className = "scene-meta"; detail.textContent = item.position ? `Positioned · ${item.image}` : `Needs position · ${item.image}`;
    info.append(title, detail);
    const select = document.createElement("button"); select.type = "button"; select.textContent = "Select";
    select.addEventListener("click", () => { selectedPanoramaId = String(item.id); panoramaSelect.value = selectedPanoramaId; panoramaYawInput.value = Number(item.orientation?.yaw || 0); panoramaPitchInput.value = Number(item.orientation?.pitch || 0); renderPanoramaList(); });
    row.append(info, select); panoramaListElement.appendChild(row);
  });
}

// Enables placement mode so the next click on a visible model surface sets the selected panorama position.
function togglePanoramaPlacement() {
  if (!currentModel) { setStatus("Load a GLB model before placing panorama viewpoints."); return; }
  if (!selectedPanoramaId) { setStatus("Choose a panorama first."); return; }
  if (!panoramaPlacementMode && flyTouchNavigationActive) setEditorTouchNavigation(false);
  panoramaPlacementMode = !panoramaPlacementMode;
  if (panoramaPlacementMode) setMaterialPickMode(false);
  panoramaPlaceToggle.textContent = panoramaPlacementMode ? "Cancel placement" : "Place viewpoint";
  panoramaPlaceToggle.classList.toggle("primary-button", !panoramaPlacementMode);
  viewerElement.style.cursor = panoramaPlacementMode ? "crosshair" : "";
  setStatus(panoramaPlacementMode ? "Placement mode active: click a visible surface in the 3D model." : "Panorama placement cancelled.");
}

// Raycasts the selected model, accepts upward-facing floor surfaces, and places the panorama camera at configurable eye height.
function handlePanoramaPlacementClick(event) {
  if (!panoramaPlacementMode || !currentModel || event.target !== renderer.domElement) return;
  const rect = renderer.domElement.getBoundingClientRect();
  panoramaPickPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  panoramaPickPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  panoramaPickRaycaster.setFromCamera(panoramaPickPointer, camera);
  const hits = panoramaPickRaycaster.intersectObject(currentModel, true);
  let hit = null;
  let foundNonFloorSurface = false;

  // Select the nearest floor hit that is still visible through the active section clipping plane.
  for (const candidate of hits) {
    if (!candidate.object.isMesh || !candidate.face) continue;
    if (sectionPreviewActive && sectionPlane.distanceToPoint(candidate.point) < -0.001) continue;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(candidate.object.matrixWorld);
    const normal = candidate.face.normal.clone().applyMatrix3(normalMatrix).normalize();
    if (normal.y >= 0.65) {
      hit = candidate;
      break;
    }
    foundNonFloorSurface = true;
  }

  if (!hit) {
    setStatus(foundNonFloorSurface
      ? "No visible floor surface detected at that point. Click an exposed horizontal floor surface in the current section."
      : "No visible model surface detected. Click directly on an exposed surface in the current section.");
    return;
  }
  const panorama = panoramaItems.find((item) => String(item.id) === String(selectedPanoramaId));
  if (!panorama) return;
  const modelSize = modelBounds ? modelBounds.getSize(new THREE.Vector3()) : new THREE.Vector3(1, 1, 1);
  const defaultEyeHeight = Math.max(0.1, Math.min(2.0, modelSize.y * 0.46));
  const eyeHeight = Number(panoramaEyeHeightInput.value || defaultEyeHeight);
  if (!Number.isFinite(eyeHeight) || eyeHeight <= 0 || eyeHeight > modelSize.y) {
    setStatus(`Eye height must be greater than 0 and no higher than the model height (${modelSize.y.toFixed(2)} model units).`);
    return;
  }
  const point = hit.point.clone();
  panorama.position = { x: Number(point.x.toFixed(4)), y: Number((point.y + eyeHeight).toFixed(4)), z: Number(point.z.toFixed(4)) };
  panorama.floorPoint = { x: Number(point.x.toFixed(4)), y: Number(point.y.toFixed(4)), z: Number(point.z.toFixed(4)) };
  panorama.eyeHeight = eyeHeight;
  panorama.orientation = { yaw: Number(panoramaYawInput.value || 0), pitch: Number(panoramaPitchInput.value || 0) };
  panoramaPlacementMode = false; panoramaPlaceToggle.textContent = "Place viewpoint"; panoramaPlaceToggle.classList.add("primary-button"); viewerElement.style.cursor = "";
  renderPanoramaList(); renderPanoramaPreviewMarkers();
  setStatus(`Eye-level viewpoint saved for ${panorama.name || panorama.id} (${eyeHeight.toFixed(2)} model units above the detected floor). Use Export Project to package all changes.`);
}

// Removes the selected panorama from the exported manifest without deleting its image file.
function removeSelectedPanoramaPosition() {
  const panorama = panoramaItems.find((item) => String(item.id) === String(selectedPanoramaId));
  if (!panorama) return;
  panorama.position = null;
  renderPanoramaList(); renderPanoramaPreviewMarkers();
  setStatus(`Removed viewpoint position for ${panorama.name || panorama.id}. The asset file remains untouched.`);
}

// Calls the localhost-only Python developer endpoint to convert panorama assets and refresh the manifest.
async function processPanoramaAssets() {
  panoramaProcessButton.disabled = true;
  setStatus("Scanning panorama assets and converting PNG files to WebP…");
  try {
    const response = await fetch("/api/process-panoramas", { method: "POST" });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
    await loadPanoramaManifest();
    setStatus(result.output || "Panorama processing completed.");
  } catch (error) {
    setStatus(`Python processing failed: ${error.message}. Start the project with python tools/dev_server.py, not python -m http.server.`);
  } finally {
    panoramaProcessButton.disabled = false;
  }
}

// Downloads the updated panorama manifest so it can be copied into config/panoramas.json.
function exportPanoramaManifest() {
  const payload = { version: 1, panoramas: panoramaItems };
  const blob = new Blob([JSON.stringify(payload, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "panoramas.json";
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  setStatus("Exported panoramas.json. Replace config/panoramas.json with the downloaded file.");
}

// Sanitizes saved rendering preferences, online HDRI preset identifiers, and material overrides.
function normalizeRenderSettings(settings = {}) {
  const backgrounds = ["white", "studio", "dark"];
  const qualities = ["performance", "balanced", "high"];
  const hdriPresets = ["none", ...Object.keys(onlineHdriPresets)];
  const materialOverrides = Array.isArray(settings.materialOverrides) ? settings.materialOverrides.slice(0, 250).filter((item) => item && typeof item.key === "string" && item.key.length <= 200).map((item) => ({
    key: item.key,
    color: /^#[0-9a-fA-F]{6}$/.test(item.color || "") ? item.color : null,
    preserveColor: item.preserveColor !== false,
    roughness: Number.isFinite(Number(item.roughness)) ? THREE.MathUtils.clamp(Number(item.roughness), 0, 1) : 0.5,
    metalness: Number.isFinite(Number(item.metalness)) ? THREE.MathUtils.clamp(Number(item.metalness), 0, 1) : 0,
    opacity: Number.isFinite(Number(item.opacity)) ? THREE.MathUtils.clamp(Number(item.opacity), 0.05, 1) : 1,
    emissiveColor: /^#[0-9a-fA-F]{6}$/.test(item.emissiveColor || "") ? item.emissiveColor : "#000000",
    emissiveIntensity: Number.isFinite(Number(item.emissiveIntensity)) ? THREE.MathUtils.clamp(Number(item.emissiveIntensity), 0, 5) : 0
  })) : [];
  return {
    version: 4,
    background: backgrounds.includes(settings.background) ? settings.background : defaultRenderSettings.background,
    exposure: Number.isFinite(Number(settings.exposure)) ? THREE.MathUtils.clamp(Number(settings.exposure), 0.6, 1.6) : defaultRenderSettings.exposure,
    environmentIntensity: Number.isFinite(Number(settings.environmentIntensity)) ? THREE.MathUtils.clamp(Number(settings.environmentIntensity), 0, 2) : defaultRenderSettings.environmentIntensity,
    shadows: typeof settings.shadows === "boolean" ? settings.shadows : defaultRenderSettings.shadows,
    quality: qualities.includes(settings.quality) ? settings.quality : defaultRenderSettings.quality,
    hdriPreset: hdriPresets.includes(settings.hdriPreset) ? settings.hdriPreset : "none",
    hdriRotation: Number.isFinite(Number(settings.hdriRotation)) ? THREE.MathUtils.clamp(Number(settings.hdriRotation), 0, 360) : 0,
    showHdriSky: typeof settings.showHdriSky === "boolean" ? settings.showHdriSky : true,
    materialOverrides
  };
}

// Applies render preferences without changing camera clipping, model geometry, or section logic.
function applyRenderSettings(settings = renderSettings) {
  renderSettings = normalizeRenderSettings(settings);
  const backgrounds = { white: "#ffffff", studio: "#e9ebef", dark: "#202329" };
  const backgroundColor = backgrounds[renderSettings.background];
  scene.background = new THREE.Color(backgroundColor);
  skyDome.visible = Boolean(renderSettings.showHdriSky && activeHdriTexture);
  skyDomeMaterial.uniforms.uEnvironment.value = activeHdriTexture;
  skyDomeMaterial.uniforms.uRotation.value = THREE.MathUtils.degToRad(renderSettings.hdriRotation);
  skyDomeMaterial.uniforms.uGroundColor.value.set("#d6d3cb");
  renderer.setClearColor(backgroundColor, 1);
  renderer.toneMappingExposure = renderSettings.exposure;
  scene.environmentIntensity = renderSettings.environmentIntensity;
  scene.environmentRotation.y = THREE.MathUtils.degToRad(renderSettings.hdriRotation);
  renderer.shadowMap.enabled = renderSettings.shadows;
  keyLight.castShadow = renderSettings.shadows;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, renderSettings.quality === "high" ? 2 : renderSettings.quality === "balanced" ? 1.5 : 1));
  renderBackgroundInput.value = renderSettings.background;
  renderExposureInput.value = String(renderSettings.exposure);
  renderExposureValue.value = renderSettings.exposure.toFixed(2);
  renderEnvironmentInput.value = String(renderSettings.environmentIntensity);
  renderEnvironmentValue.value = renderSettings.environmentIntensity.toFixed(2);
  renderShadowsInput.checked = renderSettings.shadows;
  renderQualityInput.value = renderSettings.quality;
  renderHdriInput.value = renderSettings.hdriPreset;
  renderHdriRotationInput.value = String(renderSettings.hdriRotation);
  renderHdriRotationValue.value = `${Math.round(renderSettings.hdriRotation)}°`;
  renderHdriSkyInput.checked = renderSettings.showHdriSky;
  if (currentModel) {
    currentModel.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = renderSettings.shadows;
      object.receiveShadow = renderSettings.shadows;
    });
    applySavedMaterialOverrides(currentModel);
    loadSelectedMaterialControls();
  }
  resizeViewer();
}

// Loads one online HDRI for both the visible sky and PMREM-based material reflections.
async function loadOnlineHdri(presetId, quiet = false) {
  const requestId = ++hdriLoadSequence;
  const backgroundColor = ({ white: "#ffffff", studio: "#e9ebef", dark: "#202329" })[renderSettings.background] || "#ffffff";
  if (presetId === "none") {
    if (activeHdriTarget) { activeHdriTarget.dispose(); activeHdriTarget = null; }
    if (activeHdriTexture) { activeHdriTexture.dispose(); activeHdriTexture = null; }
    scene.environment = environmentTarget.texture;
    scene.background = new THREE.Color(backgroundColor);
    skyDome.visible = false;
    skyDomeMaterial.uniforms.uEnvironment.value = null;
    if (renderHdriStatus) renderHdriStatus.textContent = "Using the default studio environment.";
    return;
  }
  const preset = onlineHdriPresets[presetId];
  if (!preset) return;
  renderHdriStatus.textContent = `Loading ${preset.name} from the web…`;
  try {
    const hdrTexture = await new RGBELoader().setDataType(THREE.HalfFloatType).loadAsync(preset.url);
    if (requestId !== hdriLoadSequence) { hdrTexture.dispose(); return; }
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    const nextTarget = pmremGenerator.fromEquirectangular(hdrTexture);
    if (activeHdriTarget) activeHdriTarget.dispose();
    if (activeHdriTexture) activeHdriTexture.dispose();
    activeHdriTarget = nextTarget;
    activeHdriTexture = hdrTexture;
    scene.environment = nextTarget.texture;
    scene.environmentRotation.y = THREE.MathUtils.degToRad(Number(renderHdriRotationInput.value || 0));
    scene.background = new THREE.Color(backgroundColor);
    skyDomeMaterial.uniforms.uEnvironment.value = hdrTexture;
    skyDomeMaterial.uniforms.uRotation.value = THREE.MathUtils.degToRad(Number(renderHdriRotationInput.value || 0));
    skyDome.visible = Boolean(renderSettings.showHdriSky);
    renderHdriStatus.textContent = `${preset.name} loaded online${renderSettings.showHdriSky ? " — visible sky enabled" : " — lighting only"}.`;
    setStatus(`${preset.name} environment loaded. Save Project to store the selected preset.`);
  } catch (error) {
    if (requestId !== hdriLoadSequence) return;
    scene.environment = environmentTarget.texture;
    scene.background = new THREE.Color(backgroundColor);
    skyDome.visible = false;
    skyDomeMaterial.uniforms.uEnvironment.value = null;
    if (activeHdriTarget) { activeHdriTarget.dispose(); activeHdriTarget = null; }
    if (activeHdriTexture) { activeHdriTexture.dispose(); activeHdriTexture = null; }
    renderHdriStatus.textContent = `Could not load ${preset.name}. Default studio lighting remains active.`;
    if (!quiet) setStatus(`Online HDRI failed to load. Check network access; the default environment is still active.`);
    console.warn(`TRIPT XR could not load online HDRI ${presetId}.`, error);
  }
}

// Loads the saved render configuration and restores its selected online HDRI and material overrides.
async function loadRenderSettings() {
  try {
    const response = await fetch("./config/render.json", { cache: "no-store" });
    if (!response.ok) return applyRenderSettings(defaultRenderSettings);
    applyRenderSettings(await response.json());
    await loadOnlineHdri(renderSettings.hdriPreset, true);
  } catch (error) {
    applyRenderSettings(defaultRenderSettings);
    console.warn("TRIPT XR render settings could not be loaded; defaults are active.", error);
  }
}

// Builds a stable material key from the source material name and its traversal index.
function getMaterialKey(material, fallbackIndex) {
  return material.name && material.name.trim() ? material.name.trim() : `__unnamed_material_${fallbackIndex + 1}`;
}

// Rebuilds the unique material selector from the currently loaded GLB without changing any materials.
function rebuildMaterialCatalog() {
  materialCatalog = [];
  if (currentModel) {
    const seen = new Set();
    let materialIndex = 0;
    currentModel.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        const key = getMaterialKey(material, materialIndex++);
        if (seen.has(key)) return;
        seen.add(key);
        materialCatalog.push({ key, name: material.name?.trim() || `Material ${materialIndex}`, material });
      });
    });
  }
  const previousValue = selectedMaterialKey;
  materialSelectInput.replaceChildren();
  if (!materialCatalog.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No model materials found";
    materialSelectInput.appendChild(option);
    selectedMaterialKey = "";
    materialSelectedName.textContent = "No material selected";
    return;
  }
  materialCatalog.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.key;
    option.textContent = item.name;
    materialSelectInput.appendChild(option);
  });
  selectedMaterialKey = materialCatalog.some((item) => item.key === previousValue) ? previousValue : materialCatalog[0].key;
  materialSelectInput.value = selectedMaterialKey;
  loadSelectedMaterialControls();
}

// Finds the first current model material that matches a stable material key.
function findMaterialByKey(key) {
  if (!currentModel || !key) return null;
  let found = null;
  let materialIndex = 0;
  currentModel.traverse((object) => {
    if (found || !object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const currentKey = getMaterialKey(material, materialIndex++);
      if (currentKey === key) { found = material; break; }
    }
  });
  return found;
}

// Loads the selected material's current values into the Material Studio controls.
function loadSelectedMaterialControls() {
  const material = findMaterialByKey(selectedMaterialKey);
  if (!material) {
    materialSelectedName.textContent = "No material selected";
    return;
  }
  materialSelectedName.textContent = `${material.name || selectedMaterialKey}${material.transparent ? " · Transparent" : ""}`;
  const override = renderSettings.materialOverrides.find((item) => item.key === selectedMaterialKey);
  materialPreserveColorInput.checked = override ? override.preserveColor : true;
  materialColorInput.value = override?.color || (material.color ? `#${material.color.getHexString()}` : "#cccccc");
  materialRoughnessInput.value = String(Math.round((override?.roughness ?? material.roughness ?? 0.5) * 100));
  materialMetalnessInput.value = String(Math.round((override?.metalness ?? material.metalness ?? 0) * 100));
  materialOpacityInput.value = String(Math.round((override?.opacity ?? material.opacity ?? 1) * 100));
  materialRoughnessValue.value = `${materialRoughnessInput.value}%`;
  materialMetalnessValue.value = `${materialMetalnessInput.value}%`;
  materialOpacityValue.value = `${materialOpacityInput.value}%`;
  materialEmissiveColorInput.value = override?.emissiveColor || (material.emissive ? `#${material.emissive.getHexString()}` : "#000000");
  materialEmissiveIntensityInput.value = String(override?.emissiveIntensity ?? material.emissiveIntensity ?? 0);
  materialEmissiveIntensityValue.value = Number(materialEmissiveIntensityInput.value).toFixed(2);
}

// Applies a saved override to every matching material in a model, preserving all original texture maps.
function applySavedMaterialOverrides(model) {
  if (!model) return;
  const overrides = new Map((renderSettings.materialOverrides || []).map((item) => [item.key, item]));
  let materialIndex = 0;
  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      const key = getMaterialKey(material, materialIndex++);
      const override = overrides.get(key);
      if (!override) return;
      if (!override.preserveColor && override.color && material.color) material.color.set(override.color);
      if ("roughness" in material) material.roughness = override.roughness;
      if ("metalness" in material) material.metalness = override.metalness;
      material.opacity = override.opacity;
      material.transparent = override.opacity < 0.999 || Boolean(material.alphaMap) || Boolean(material.transparent);
      if (material.emissive && override.emissiveColor) material.emissive.set(override.emissiveColor);
      if ("emissiveIntensity" in material) material.emissiveIntensity = THREE.MathUtils.clamp(Number(override.emissiveIntensity) || 0, 0, 5);
      material.needsUpdate = true;
    });
  });
}

// Applies the current Material Studio values as a reversible project override to matching materials.
function applySelectedMaterialOverride() {
  if (!selectedMaterialKey || !findMaterialByKey(selectedMaterialKey)) {
    materialStatus.textContent = "Load a model and select a material first.";
    return;
  }
  const override = {
    key: selectedMaterialKey,
    color: materialColorInput.value,
    preserveColor: materialPreserveColorInput.checked,
    roughness: Number(materialRoughnessInput.value) / 100,
    metalness: Number(materialMetalnessInput.value) / 100,
    opacity: Number(materialOpacityInput.value) / 100,
    emissiveColor: materialEmissiveColorInput.value,
    emissiveIntensity: Number(materialEmissiveIntensityInput.value)
  };
  renderSettings.materialOverrides = renderSettings.materialOverrides.filter((item) => item.key !== selectedMaterialKey);
  renderSettings.materialOverrides.push(override);
  applySavedMaterialOverrides(currentModel);
  materialStatus.textContent = `Applied to material “${selectedMaterialKey}”. Save Project to keep this override.`;
  loadSelectedMaterialControls();
}

// Removes the selected material override and restores the source material values on a freshly loaded GLB.
function resetSelectedMaterialOverride() {
  if (!selectedMaterialKey) return;
  renderSettings.materialOverrides = renderSettings.materialOverrides.filter((item) => item.key !== selectedMaterialKey);
  if (currentModelPath) {
    loadModelFromCurrentPath();
  } else if (currentModel) {
    materialStatus.textContent = "Reset is safest after reloading the source GLB; upload the model again to restore its original values.";
  }
  materialStatus.textContent = `Removed saved override for “${selectedMaterialKey}”. Save Project to persist the reset.`;
}

// Reloads the currently configured GLB so reset material values come from the original source file.
async function loadModelFromCurrentPath() {
  if (!currentModelPath) return;
  try {
    const response = await fetch(`./${currentModelPath}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const file = new File([blob], currentModelPath.split("/").pop() || "building.glb", { type: "model/gltf-binary" });
    loadModelFile(file, `./${currentModelPath}`);
  } catch (error) {
    materialStatus.textContent = `Could not reload the original model: ${error.message}`;
  }
}

// Enables or disables explicit material sampling and keeps panorama placement mutually exclusive.
function setMaterialPickMode(enabled) {
  if (enabled && flyTouchNavigationActive) setEditorTouchNavigation(false);
  materialPickMode = Boolean(enabled) && !panoramaPlacementMode;
  materialPickToggle?.setAttribute("aria-pressed", String(materialPickMode));
  if (materialPickToggle) materialPickToggle.textContent = materialPickMode ? "Cancel material picking" : "Pick Material";
  viewerElement.style.cursor = materialPickMode ? "crosshair" : (panoramaPlacementMode ? "crosshair" : "");
  materialStatus.textContent = materialPickMode ? "Pick Material is active. Click or tap a model surface to sample its material." : "Material picking is inactive. Activate Pick Material to sample a surface.";
}

// Selects the material assigned to the surface under the pointer in the editor viewport.
function handleMaterialPick(event) {
  if (!currentModel || !materialPickMode || panoramaPlacementMode || event.button !== 0) return;
  const rect = renderer.domElement.getBoundingClientRect();
  materialPickPointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  materialPickRaycaster.setFromCamera(materialPickPointer, camera);
  const hits = materialPickRaycaster.intersectObject(currentModel, true);
  if (!hits.length) return;
  const hit = hits[0];
  const materials = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
  const materialIndex = Number.isInteger(hit.face?.materialIndex) ? hit.face.materialIndex : 0;
  const pickedMaterial = materials[materialIndex] || materials[0];
  if (!pickedMaterial) return;
  let traversalIndex = 0;
  let selectedKey = "";
  currentModel.traverse((object) => {
    if (selectedKey || !object.isMesh || !object.material) return;
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of objectMaterials) {
      const key = getMaterialKey(material, traversalIndex++);
      if (material === pickedMaterial || (material.name && material.name === pickedMaterial.name)) { selectedKey = key; break; }
    }
  });
  if (selectedKey && materialCatalog.some((item) => item.key === selectedKey)) {
    selectedMaterialKey = selectedKey;
    materialSelectInput.value = selectedKey;
    loadSelectedMaterialControls();
    setMaterialPickMode(false);
    materialStatus.textContent = `Selected “${pickedMaterial.name || selectedKey}”. Adjust the values and apply the override.`;
  }
}

// Reads the Render panel controls and immediately previews their settings in the editor viewport.
function previewRenderSettings() {
  const previousHdriPreset = renderSettings.hdriPreset;
  applyRenderSettings({
    background: renderBackgroundInput.value,
    exposure: Number(renderExposureInput.value),
    environmentIntensity: Number(renderEnvironmentInput.value),
    shadows: renderShadowsInput.checked,
    quality: renderQualityInput.value,
    hdriPreset: renderHdriInput.value,
    hdriRotation: Number(renderHdriRotationInput.value),
    showHdriSky: renderHdriSkyInput.checked,
    materialOverrides: renderSettings.materialOverrides
  });
  if (previousHdriPreset !== renderSettings.hdriPreset) loadOnlineHdri(renderSettings.hdriPreset);
  setStatus("Render settings preview updated. Select Save Project to publish these settings to the main viewer.");
}

// Resets the Render panel to the safe balanced defaults and previews the result immediately.
function resetRenderSettings() {
  applyRenderSettings(defaultRenderSettings);
  loadOnlineHdri("none");
  setStatus("Render settings reset to defaults. Select Save Project to persist the change.");
}

// Resizes the viewport and updates the camera projection for its aspect ratio.
function resizeViewer() {
  const width = Math.max(viewerElement.clientWidth, 1);
  const height = Math.max(viewerElement.clientHeight, 1);

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// Formats model dimensions without assuming a particular model unit.
function formatDimension(value) {
  if (!Number.isFinite(value)) return "unknown";

  return Number(value.toPrecision(5)).toLocaleString(undefined, {
    maximumFractionDigits: 4
  });
}

// Displays editor feedback in the status area.
function setStatus(message) {
  statusElement.textContent = message;
}

// Displays an error in the viewport and logs its technical details.
function showError(message, error = null) {
  errorElement.textContent = message;
  errorElement.classList.remove("hidden");

  if (error) console.error("TRIPT XR editor:", error);
}

// Fits the camera to the model and tightens the depth-buffer clipping range.
function fitCameraToObject(object) {
  const box = new THREE.Box3().setFromObject(object);

  if (box.isEmpty()) {
    throw new Error("The GLB contains no visible mesh bounds.");
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);

  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    throw new Error("The model has invalid or zero-sized geometry.");
  }

  // Uses the same clipping strategy as the main viewer to reduce z-fighting.
  camera.near = Math.max(maxDimension * 0.001, 0.01);
  camera.far = Math.max(maxDimension * 20, camera.near + 1);
  camera.updateProjectionMatrix();

  const fovRadians = THREE.MathUtils.degToRad(camera.fov);
  const fitDistance = (maxDimension / 2) / Math.tan(fovRadians / 2);
  const distance = fitDistance * 1.65;
  const direction = new THREE.Vector3(1, 0.72, 1).normalize();

  camera.position.copy(center).addScaledVector(direction, distance);
  controls.target.copy(center);
  controls.minDistance = Math.max(maxDimension / 10000, 0.001);
  controls.maxDistance = Math.max(maxDimension * 20, distance * 5);
  controls.update();

  grid.position.y = box.min.y;
  grid.scale.setScalar(Math.max(maxDimension / 10, 0.001));

  modelBounds = box;

  dimensionsElement.textContent =
    `Dimensions: ${formatDimension(size.x)} × ` +
    `${formatDimension(size.y)} × ${formatDimension(size.z)}`;
}

// Enables or disables the section clipping plane on every model material.
function setModelClipping(enabled) {
  if (!currentModel) return;

  currentModel.traverse((object) => {
    if (!object.isMesh || !object.material) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materials.forEach((material) => {
      material.clippingPlanes = enabled ? [sectionPlane] : [];
      material.clipShadows = enabled;
      material.needsUpdate = true;
    });
  });

  renderer.localClippingEnabled = enabled;
  sectionCapSystem?.update(enabled);
}

// Applies an X, Y, or Z clipping plane at the current normalized slider position.
function applySectionPreview() {
  if (!currentModel || !modelBounds) {
    setStatus("Load a GLB model before previewing a section.");
    return;
  }

  const min = modelBounds.min;
  const max = modelBounds.max;
  const t = Number(positionInput.value) / 100;
  const axis = axisInput.value;

  const point = new THREE.Vector3(
    axis === "x" ? THREE.MathUtils.lerp(min.x, max.x, t) : (min.x + max.x) / 2,
    axis === "y" ? THREE.MathUtils.lerp(min.y, max.y, t) : (min.y + max.y) / 2,
    axis === "z" ? THREE.MathUtils.lerp(min.z, max.z, t) : (min.z + max.z) / 2
  );

  const normal = new THREE.Vector3(
    axis === "x" ? 1 : 0,
    axis === "y" ? 1 : 0,
    axis === "z" ? 1 : 0
  );

  if (directionInput.value === "negative") {
    normal.negate();
  }

  sectionPlane.setFromNormalAndCoplanarPoint(normal, point);
  sectionPreviewActive = true;
  setModelClipping(true);

  positionValue.value = `${positionInput.value}%`;
  positionValue.textContent = `${positionInput.value}%`;

  setStatus(
    `Previewing ${axis.toUpperCase()}-axis section at ${positionInput.value}%.`
  );
}

// Clears the section clipping plane and restores the complete model.
function clearSectionPreview() {
  sectionPreviewActive = false;
  setModelClipping(false);
  setStatus("Section preview cleared.");
}

// Reads the current controls and creates a portable section-scene object.
function readSceneFromControls(id = null) {
  const fallbackName =
    `${axisInput.value.toUpperCase()} Section ${savedScenes.length + 1}`;

  return {
    id: id || `section-${Date.now()}-${sceneIdCounter++}`,
    name: sceneNameInput.value.trim() || fallbackName,
    enabled: true,
    axis: axisInput.value,
    position: Number(positionInput.value) / 100,
    reverse: directionInput.value === "negative"
  };
}

// Loads a saved scene into the controls and previews its clipping plane.
function loadSceneIntoControls(sectionScene) {
  selectedSceneId = sectionScene.id;
  sceneNameInput.value = sectionScene.name;
  axisInput.value = sectionScene.axis;
  directionInput.value = sectionScene.reverse ? "negative" : "positive";
  positionInput.value = String(Math.round(sectionScene.position * 100));

  positionValue.value = `${positionInput.value}%`;
  positionValue.textContent = `${positionInput.value}%`;

  updateSceneButton.disabled = false;
  renderSceneList();
  applySectionPreview();
}

// Rebuilds the saved-scene list and its selection, apply, and delete controls.
function renderSceneList() {
  sceneCountElement.textContent =
    `${savedScenes.length} ${savedScenes.length === 1 ? "scene" : "scenes"}`;

  sceneListElement.replaceChildren();

  if (savedScenes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent =
      "No saved scenes yet. Configure a cut and select “Save scene”.";
    sceneListElement.appendChild(empty);
    return;
  }

  savedScenes.forEach((item) => {
    const row = document.createElement("div");
    row.className =
      `scene-item${item.id === selectedSceneId ? " selected" : ""}`;

    const main = document.createElement("div");
    const select = document.createElement("button");

    select.type = "button";
    select.className = "scene-select";
    select.textContent = item.name;
    select.addEventListener("click", () => loadSceneIntoControls(item));

    const meta = document.createElement("div");
    meta.className = "scene-meta";
    meta.textContent =
      `${item.axis.toUpperCase()} axis · ` +
      `${Math.round(item.position * 100)}% · ` +
      `${item.reverse ? "negative side" : "positive side"}`;

    main.append(select, meta);

    const actions = document.createElement("div");
    actions.className = "scene-actions";

    const apply = document.createElement("button");
    apply.type = "button";
    apply.textContent = "Apply";
    apply.title = "Load and preview this section scene";
    apply.addEventListener("click", () => loadSceneIntoControls(item));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = `Delete ${item.name}`;
    remove.addEventListener("click", () => deleteScene(item.id));

    actions.append(apply, remove);
    row.append(main, actions);
    sceneListElement.appendChild(row);
  });
}

// Saves the current section settings as a new scene.
function saveScene() {
  if (!currentModel) {
    setStatus("Load a GLB model before saving a section scene.");
    return;
  }

  const item = readSceneFromControls();
  savedScenes.push(item);
  selectedSceneId = item.id;

  updateSceneButton.disabled = false;
  renderSceneList();
  setStatus(`Saved scene "${item.name}" in the current project. Select Save Project to persist it to disk.`);
}

// Updates the currently selected scene without changing its ID.
function updateSelectedScene() {
  if (!selectedSceneId) {
    setStatus("Select a saved scene before updating it.");
    return;
  }

  const index = savedScenes.findIndex(
    (item) => item.id === selectedSceneId
  );

  if (index < 0) return;

  savedScenes[index] = readSceneFromControls(selectedSceneId);
  renderSceneList();
  setStatus(`Updated scene "${savedScenes[index].name}".`);
}

// Deletes a saved scene and clears the selection when necessary.
function deleteScene(id) {
  const item = savedScenes.find((entry) => entry.id === id);
  savedScenes = savedScenes.filter((entry) => entry.id !== id);

  if (selectedSceneId === id) {
    selectedSceneId = null;
    updateSceneButton.disabled = true;
  }

  renderSceneList();
  setStatus(item ? `Deleted scene "${item.name}".` : "Scene deleted.");
}

// Builds the JSON configuration expected by the future published viewer.
function buildConfigObject() {
  return {
    version: 1,
    model: currentModelPath,
    sections: savedScenes.map(
      ({ id, name, enabled, axis, position, reverse }) => ({
        id,
        name,
        enabled,
        axis,
        position,
        reverse
      })
    )
  };
}

// Builds the complete editable project configuration used by Save Project and Export Project.
function buildProjectPayload() {
  return { sections: buildConfigObject(), panoramas: { version: 1, panoramas: panoramaItems }, render: normalizeRenderSettings(renderSettings) };
}

// Saves section scenes and panorama metadata to the local project through the localhost-only Python server.
async function saveWholeProject() {
  saveProjectButton.disabled = true;
  setStatus("Saving section scenes, panorama settings, and render preferences…");
  try {
    const response = await fetch("/api/save-project", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildProjectPayload()) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
    setStatus("Project saved. Sections, panoramas, and render settings are ready for the main viewer.");
  } catch (error) {
    setStatus(`Save Project failed: ${error.message}`);
  } finally {
    saveProjectButton.disabled = false;
  }
}

// Requests a confirmed clean workspace from the local server, then reloads the editor from empty configuration.
async function startNewProject() {
  const confirmed = window.confirm(
    "Start a new TRIPT XR project? This clears the active model, panorama files, section scenes, and panorama placements from this workspace. Exported ZIP files already downloaded will not be affected. This action cannot be undone."
  );
  if (!confirmed) return;

  newProjectButton.disabled = true;
  saveProjectButton.disabled = true;
  const exportButton = document.querySelector("#export-project");
  if (exportButton) exportButton.disabled = true;
  setStatus("Clearing the current workspace and preparing a new project…");

  try {
    const response = await fetch("/api/new-project", { method: "POST" });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
    window.location.reload();
  } catch (error) {
    setStatus(`Could not start a new project: ${error.message}`);
    newProjectButton.disabled = false;
    saveProjectButton.disabled = false;
    if (exportButton) exportButton.disabled = false;
  }
}

// Opens or closes the Developer Studio as an overlay so the 3D workspace keeps its full width.
function setDeveloperPanelOpen(isOpen) {
  document.body.classList.toggle("developer-panel-closed", !isOpen);
  openDeveloperPanelButton.setAttribute("aria-expanded", String(isOpen));
  openDeveloperPanelButton.hidden = isOpen;
  closeDeveloperPanelButton.setAttribute("aria-expanded", String(isOpen));
}

setDeveloperPanelOpen(true);

// Switches between the three mutually exclusive Developer Studio tool panels.
function activateToolPanel(panelId) {
  toolTabButtons.forEach((button) => {
    const active = button.dataset.panel === panelId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".tool-panel").forEach((panel) => {
    const active = panel.id === panelId;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
}

// Requests a validated project ZIP from the local developer server, including current exported configuration files and assets.
async function exportWholeProject() {
  const button = document.querySelector("#export-project");
  if (!button) return;
  button.disabled = true;
  setStatus("Preparing project export and validating configuration…");
  try {
    const response = await fetch("/api/export-project", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildProjectPayload()) });
    if (!response.ok) throw new Error(await response.text());
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "TRIPT_XR_Project_Export.zip";
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    setStatus("Project ZIP exported. Review the included files before deploying.");
  } catch (error) {
    setStatus(`Project export failed: ${error.message}`);
  } finally { button.disabled = false; }
}

// Loads a GLB, clones its materials for independent clipping, and frames the model.
function loadModelFile(file, url = null) {
  loadingElement.classList.remove("hidden");
  loadingElement.textContent = `Loading ${file.name}…`;
  errorElement.classList.add("hidden");

  const modelUrl = url || URL.createObjectURL(file);
  const loader = new GLTFLoader();

  loader.load(
    modelUrl,
    (gltf) => {
      try {
        if (currentModel) {
          sectionCapSystem?.dispose();
          sectionCapSystem = null;
          scene.remove(currentModel);
        }

        currentModel = gltf.scene;

        // Clones materials so section clipping does not mutate shared materials.
        currentModel.traverse((object) => {
          if (!object.isMesh || !object.material) return;

          object.material = Array.isArray(object.material)
            ? object.material.map((material) => material.clone())
            : object.material.clone();
        });

        scene.add(currentModel);
        renderer.localClippingEnabled = false;
        fitCameraToObject(currentModel);
        sectionCapSystem = createSectionCapSystem(THREE, scene, currentModel, sectionPlane, modelBounds);
        setModelClipping(false);
        applySavedMaterialOverrides(currentModel);
        rebuildMaterialCatalog();

        modelNameElement.textContent = file.name;
        modelSizeElement.textContent = file.size
          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          : "";

        loadingElement.classList.add("hidden");
        setStatus(`Loaded ${file.name}. Configure and save section scenes.`);

        if (currentModelUrl) {
          URL.revokeObjectURL(currentModelUrl);
        }

        currentModelUrl = url ? null : modelUrl;
      } catch (error) {
        loadingElement.classList.add("hidden");
        showError(`Model setup failed: ${error.message}`, error);

        if (!url) URL.revokeObjectURL(modelUrl);
      }
    },
    (progress) => {
      if (progress.total > 0) {
        const percent = Math.round(
          (progress.loaded / progress.total) * 100
        );

        loadingElement.textContent = `Loading ${file.name}… ${percent}%`;
      }
    },
    (error) => {
      loadingElement.classList.add("hidden");

      showError(
        `Could not load ${file.name}. Check the GLB and run the project through a local HTTP server.`,
        error
      );

      setStatus("Model loading failed. Check the file and local server.");

      if (!url) URL.revokeObjectURL(modelUrl);
    }
  );
}

// Restores the initial model framing by fitting the camera to the current model.
function resetView() {
  if (currentModel) fitCameraToObject(currentModel);
  controls.update();
}

// Runs the render loop and updates orbit controls on each frame.
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const deltaSeconds = previousFlyFrameTime ? (now - previousFlyFrameTime) / 1000 : 0;
  previousFlyFrameTime = now;
  updateFlyMovement(deltaSeconds);
  // Applies and smoothly damps wheel-driven forward/backward movement while free-fly is active.
  if (flyModeActive && deltaSeconds > 0) {
    camera.position.addScaledVector(flyScrollVelocity, deltaSeconds);
    flyScrollVelocity.multiplyScalar(Math.exp(-4.5 * Math.min(deltaSeconds, 0.05)));
    if (flyScrollVelocity.lengthSq() < 0.0001) flyScrollVelocity.set(0, 0, 0);
  }
  // Keep OrbitControls from overwriting the custom free-fly camera rotation.
  if (!flyModeActive) {
    controls.update();
  }
  skyDome.position.copy(camera.position);
  skyDome.scale.setScalar(Math.max(100, Math.min(camera.far * 0.8, 10000)));
  renderer.render(scene, camera);
}

// Loads the previously uploaded model path from config/model.json when the project is not empty.
async function loadDefaultModel() {
  try {
    const configResponse = await fetch("./config/model.json", { cache: "no-store" });
    if (!configResponse.ok) throw new Error("Model configuration is unavailable.");
    const config = await configResponse.json();
    if (!config.model) throw new Error("No model has been uploaded yet.");
    currentModelPath = config.model;
    const modelResponse = await fetch(`./${config.model}`, { cache: "no-store" });
    if (!modelResponse.ok) throw new Error("The configured model file is missing.");
    const blob = await modelResponse.blob();
    const file = new File([blob], config.model.split("/").pop() || "building.glb", { type: "model/gltf-binary" });
    loadModelFile(file, `./${config.model}`);
  } catch (error) {
    loadingElement.classList.add("hidden");
    modelNameElement.textContent = "No model uploaded";
    setStatus("Empty project ready. Use Upload GLB to add a building model.");
  }
}

// Uploads each selected PNG/WebP panorama to the local server, then refreshes the manifest.
async function uploadSelectedPanoramas() {
  const files = [...(panoramaFilesInput.files || [])];
  if (!files.length) { setStatus("Choose one or more PNG/WebP panorama images first."); return; }
  panoramaUploadButton.disabled = true;
  try {
    for (const file of files) {
      const validType = /\.(png|webp)$/i.test(file.name);
      if (!validType) throw new Error(`Unsupported panorama file: ${file.name}`);
      setStatus(`Uploading ${file.name}…`);
      const response = await fetch(`/api/upload-panorama?filename=${encodeURIComponent(file.name)}`, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
    }
    panoramaFilesInput.value = "";
    await loadPanoramaManifest();
    setStatus(`Uploaded ${files.length} panorama image(s). Use Scan & Convert to process PNG files.`);
  } catch (error) {
    setStatus(`Panorama upload failed: ${error.message}`);
  } finally { panoramaUploadButton.disabled = false; }
}

// Connects the UI buttons and inputs to their editor operations.
function bindEditorEvents() {
  window.addEventListener("resize", resizeViewer);

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setStatus("Please upload a standalone .glb file.");
      fileInput.value = "";
      return;
    }
    fileInput.disabled = true;
    setStatus(`Uploading ${file.name} to the project…`);
    try {
      const response = await fetch(`/api/upload-model?filename=${encodeURIComponent(file.name)}`, { method: "POST", headers: { "Content-Type": "model/gltf-binary" }, body: file });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || `HTTP ${response.status}`);
      currentModelPath = result.path;
      loadModelFile(file, `./${result.path}`);
      setStatus(`Uploaded ${file.name}. The model is stored in the project.`);
    } catch (error) {
      setStatus(`Model upload failed: ${error.message}`);
    } finally {
      fileInput.disabled = false;
      fileInput.value = "";
    }
  });
  panoramaUploadButton.addEventListener("click", uploadSelectedPanoramas);

  resetButton.addEventListener("click", resetView);
  panoramaSelect.addEventListener("change", () => { selectedPanoramaId = panoramaSelect.value || null; const item = panoramaItems.find((entry) => String(entry.id) === String(selectedPanoramaId)); panoramaYawInput.value = Number(item?.orientation?.yaw || 0); panoramaPitchInput.value = Number(item?.orientation?.pitch || 0); renderPanoramaList(); });
  panoramaPlaceToggle.addEventListener("click", togglePanoramaPlacement);
  panoramaRemoveButton.addEventListener("click", removeSelectedPanoramaPosition);
  panoramaProcessButton.addEventListener("click", processPanoramaAssets);
  saveProjectButton.addEventListener("click", saveWholeProject);
  newProjectButton.addEventListener("click", startNewProject);
  document.querySelector("#export-project")?.addEventListener("click", exportWholeProject);
  toolTabButtons.forEach((button) => button.addEventListener("click", () => activateToolPanel(button.dataset.panel)));
  renderBackgroundInput.addEventListener("change", previewRenderSettings);
  renderExposureInput.addEventListener("input", previewRenderSettings);
  renderEnvironmentInput.addEventListener("input", previewRenderSettings);
  renderShadowsInput.addEventListener("change", previewRenderSettings);
  renderQualityInput.addEventListener("change", previewRenderSettings);
  renderHdriInput.addEventListener("change", previewRenderSettings);
  renderHdriSkyInput.addEventListener("change", previewRenderSettings);
  closeDeveloperPanelButton.addEventListener("click", () => setDeveloperPanelOpen(false));
  openDeveloperPanelButton.addEventListener("click", () => setDeveloperPanelOpen(true));
  renderHdriRotationInput.addEventListener("input", () => {
    renderHdriRotationValue.value = `${renderHdriRotationInput.value}°`;
    previewRenderSettings();
  });
  renderResetButton.addEventListener("click", resetRenderSettings);
  renderApplyButton.addEventListener("click", previewRenderSettings);
  materialSelectInput.addEventListener("change", () => { selectedMaterialKey = materialSelectInput.value; loadSelectedMaterialControls(); });
  materialColorInput.addEventListener("input", () => { materialPreserveColorInput.checked = false; });
  materialRoughnessInput.addEventListener("input", () => { materialRoughnessValue.value = `${materialRoughnessInput.value}%`; });
  materialMetalnessInput.addEventListener("input", () => { materialMetalnessValue.value = `${materialMetalnessInput.value}%`; });
  materialOpacityInput.addEventListener("input", () => { materialOpacityValue.value = `${materialOpacityInput.value}%`; });
  materialEmissiveIntensityInput.addEventListener("input", () => { materialEmissiveIntensityValue.value = Number(materialEmissiveIntensityInput.value).toFixed(2); });
  materialApplyButton.addEventListener("click", applySelectedMaterialOverride);
  materialResetButton.addEventListener("click", resetSelectedMaterialOverride);
  materialPickToggle.addEventListener("click", () => setMaterialPickMode(!materialPickMode));
  // Routes an intentional viewport click to panorama placement or material picking, while ignoring camera drags.
  renderer.domElement.addEventListener("click", (event) => {
    if (flyPointerDragged || flyTouchNavigationActive) return;
    if (panoramaPlacementMode) {
      handlePanoramaPlacementClick(event);
      return;
    }
    handleMaterialPick(event);
  });
  applyCutButton.addEventListener("click", applySectionPreview);
  clearCutButton.addEventListener("click", clearSectionPreview);
  saveSceneButton.addEventListener("click", saveScene);
  updateSceneButton.addEventListener("click", updateSelectedScene);
  resetScenesButton.addEventListener("click", () => {
    if (!savedScenes.length) return;

    if (
      !window.confirm(
        "Clear all saved section scenes? Save Project first if you need to keep them."
      )
    ) {
      return;
    }

    savedScenes = [];
    selectedSceneId = null;
    updateSceneButton.disabled = true;
    renderSceneList();
    setStatus("All saved section scenes cleared.");
  });

  positionInput.addEventListener("input", () => {
    positionValue.value = `${positionInput.value}%`;
    positionValue.textContent = `${positionInput.value}%`;

    if (renderer.localClippingEnabled) {
      applySectionPreview();
    }
  });

  [axisInput, directionInput].forEach((control) => {
    control.addEventListener("change", () => {
      if (renderer.localClippingEnabled) {
        applySectionPreview();
      }
    });
  });
}

// Initializes the renderer, editor controls, animation, and default GLB loading.

let flyModeActive = false;
const flyKeys = new Set();
let flyYaw = 0;
let flyPitch = 0;
let previousFlyFrameTime = 0;
let flyMouseDragging = false;
let flyPointerDragged = false;
let flyMouseDownX = 0;
let flyMouseDownY = 0;
let previousFlyMouseX = 0;
let previousFlyMouseY = 0;
const flyForward = new THREE.Vector3();
const flyRight = new THREE.Vector3();
const flyUp = new THREE.Vector3(0, 1, 0);
const flyVelocity = new THREE.Vector3();
const flyScrollVelocity = new THREE.Vector3();
const flyDesiredMovement = new THREE.Vector3();
const flyJoystickVector = new THREE.Vector2();
let flyTouchNavigationActive = false;
let flyTouchFast = false;
let flyJoystickPointerId = null;
let flyTouchLookPointerId = null;
let flyTouchLookX = 0;
let flyTouchLookY = 0;
const flyModelSize = new THREE.Vector3();

// Keeps free-fly navigation enabled by default in the Developer Studio without changing the separate Walk Mode module.
function initializeFlyMode() {
  flyModeActive = true;
  flyKeys.clear();
  flyVelocity.set(0, 0, 0);
  flyScrollVelocity.set(0, 0, 0);
  const direction = camera.getWorldDirection(new THREE.Vector3());
  flyYaw = Math.atan2(-direction.x, -direction.z);
  flyPitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
  controls.enabled = false;
  walkControlsElement.classList.remove("hidden");
  walkStatusElement.textContent = "Free-fly ready — right-click and drag to look. WASD moves; Q/E flies up/down; Shift moves faster.";
  walkStatusElement.classList.remove("hidden");
  previousFlyFrameTime = performance.now();
}

// Starts camera look only when the right mouse button is pressed on the 3D viewport; left clicks remain available for editing.
function beginFlyMouseLook(event) {
  if (event.button === 0 && event.target === renderer.domElement) {
    flyPointerDragged = false;
    return;
  }
  if (!flyModeActive || event.button !== 2 || event.target !== renderer.domElement) return;
  flyMouseDragging = true;
  flyPointerDragged = false;
  flyMouseDownX = event.clientX;
  flyMouseDownY = event.clientY;
  previousFlyMouseX = event.clientX;
  previousFlyMouseY = event.clientY;
  renderer.domElement.style.cursor = "grabbing";
  event.preventDefault();
}

// Rotates the free-fly camera while the right mouse button is held and dragged.
function handleFlyMouseMove(event) {
  if (!flyModeActive || !flyMouseDragging) return;
  const totalDragX = event.clientX - flyMouseDownX;
  const totalDragY = event.clientY - flyMouseDownY;
  if ((totalDragX * totalDragX) + (totalDragY * totalDragY) > 25) flyPointerDragged = true;
  const deltaX = event.clientX - previousFlyMouseX;
  const deltaY = event.clientY - previousFlyMouseY;
  previousFlyMouseX = event.clientX;
  previousFlyMouseY = event.clientY;
  const sensitivity = 0.004;
  flyYaw -= deltaX * sensitivity;
  flyPitch -= deltaY * sensitivity;
  flyPitch = THREE.MathUtils.clamp(flyPitch, -Math.PI * 0.49, Math.PI * 0.49);
  camera.rotation.order = "YXZ";
  camera.rotation.set(flyPitch, flyYaw, 0);
}

// Converts mouse-wheel input into a smooth forward/backward impulse along the current camera view direction.
function handleFlyMouseWheel(event) {
  if (!flyModeActive || event.target !== renderer.domElement) return;
  event.preventDefault();
  const wheelAmount = THREE.MathUtils.clamp(-event.deltaY / 100, -3, 3);
  if (wheelAmount === 0) return;
  camera.getWorldDirection(flyForward).normalize();
  const modelDiagonal = modelBounds ? modelBounds.getSize(flyModelSize).length() : 0;
  const baseSpeed = modelBounds ? Math.max(modelDiagonal * 0.22, 0.8) : 2.5;
  flyScrollVelocity.addScaledVector(flyForward, wheelAmount * baseSpeed * 2.2);
}

// Ends drag-to-look cleanly when the mouse button is released or the pointer leaves the window.
function endFlyMouseLook(event) {
  if (event && event.button !== 2) return;
  flyMouseDragging = false;
  if (renderer?.domElement) renderer.domElement.style.cursor = "";
}

// Smoothly accelerates and decelerates free-fly movement while keeping speed independent of frame rate.
function updateFlyMovement(deltaSeconds) {
  if (!flyModeActive) return;

  const delta = Math.min(Math.max(deltaSeconds, 0), 0.05);
  const forwardAmount = Number(flyKeys.has("KeyW")) - Number(flyKeys.has("KeyS")) - flyJoystickVector.y;
  const sideAmount = Number(flyKeys.has("KeyD")) - Number(flyKeys.has("KeyA")) + flyJoystickVector.x;
  const verticalAmount = Number(flyKeys.has("KeyE")) - Number(flyKeys.has("KeyQ"));
  const hasMovementInput = Boolean(forwardAmount || sideAmount || verticalAmount);

  flyDesiredMovement.set(0, 0, 0);
  if (hasMovementInput) {
    camera.getWorldDirection(flyForward).normalize();
    flyRight.crossVectors(flyForward, flyUp).normalize();
    flyDesiredMovement.addScaledVector(flyForward, forwardAmount);
    flyDesiredMovement.addScaledVector(flyRight, sideAmount);
    flyDesiredMovement.addScaledVector(flyUp, verticalAmount);
    if (flyDesiredMovement.lengthSq() > 0) flyDesiredMovement.normalize();
  }

  const modelDiagonal = modelBounds ? modelBounds.getSize(flyModelSize).length() : 0;
  const baseSpeed = modelBounds ? Math.max(modelDiagonal * 0.22, 0.8) : 2.5;
  const speedMultiplier = (flyKeys.has("ShiftLeft") || flyKeys.has("ShiftRight") || flyTouchFast) ? 3 : 1;
  const targetSpeed = hasMovementInput ? baseSpeed * speedMultiplier : 0;
  flyDesiredMovement.multiplyScalar(targetSpeed);

  // Use a quicker response while accelerating and a softer ease-out when the keys are released.
  const response = hasMovementInput ? 7.5 : 5.5;
  const smoothing = 1 - Math.exp(-response * delta);
  flyVelocity.lerp(flyDesiredMovement, smoothing);

  if (flyVelocity.lengthSq() < 0.0001 && !hasMovementInput) flyVelocity.set(0, 0, 0);
  camera.position.addScaledVector(flyVelocity, delta);
}

// Binds desktop free-fly controls and touch navigation without changing panorama or material picking logic.
function bindDefaultFlyControls() {
  renderer.domElement.addEventListener("mousedown", beginFlyMouseLook);
  renderer.domElement.addEventListener("contextmenu", (event) => { event.preventDefault(); });
  renderer.domElement.addEventListener("wheel", handleFlyMouseWheel, { passive: false });
  document.addEventListener("mousemove", handleFlyMouseMove);
  document.addEventListener("mouseup", endFlyMouseLook);
  window.addEventListener("blur", endFlyMouseLook);
  document.addEventListener("keydown", (event) => {
    if (!flyModeActive) return;
    const targetTag = event.target?.tagName;
    if (targetTag === "INPUT" || targetTag === "TEXTAREA" || targetTag === "SELECT" || event.target?.isContentEditable) return;
    // Escape clears held movement keys; free-fly remains the default navigation mode.
    if (event.code === "Escape") {
      flyKeys.clear();
      endFlyMouseLook();
      if (flyTouchNavigationActive) setEditorTouchNavigation(false);
      return;
    }
    if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ShiftLeft", "ShiftRight"].includes(event.code)) {
      event.preventDefault();
      flyKeys.add(event.code);
    }
  });
  document.addEventListener("keyup", (event) => { flyKeys.delete(event.code); });
  window.addEventListener("blur", () => { flyKeys.clear(); flyJoystickVector.set(0, 0); });

  // Lets touch users explicitly switch between camera navigation gestures and editing taps.
  editorTouchNavToggle?.addEventListener("click", () => setEditorTouchNavigation(!flyTouchNavigationActive));
  editorTouchFastButton?.addEventListener("click", () => {
    flyTouchFast = !flyTouchFast;
    editorTouchFastButton.setAttribute("aria-pressed", String(flyTouchFast));
  });
  document.querySelectorAll("[data-fly-vertical]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      if (!flyTouchNavigationActive) return;
      event.preventDefault();
      flyKeys.add(button.dataset.flyVertical);
      try { button.setPointerCapture(event.pointerId); } catch (_) { /* Pointer capture may be unavailable on older browsers. */ }
    });
    const stopVertical = () => flyKeys.delete(button.dataset.flyVertical);
    button.addEventListener("pointerup", stopVertical);
    button.addEventListener("pointercancel", stopVertical);
    button.addEventListener("lostpointercapture", stopVertical);
  });
  // Adds a short forward/backward camera impulse from touch zoom buttons.
  document.querySelectorAll("[data-fly-zoom]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      if (!flyTouchNavigationActive) return;
      event.preventDefault();
      camera.getWorldDirection(flyForward).normalize();
      const modelDiagonal = modelBounds ? modelBounds.getSize(flyModelSize).length() : 0;
      const baseSpeed = modelBounds ? Math.max(modelDiagonal * 0.22, 0.8) : 2.5;
      flyScrollVelocity.addScaledVector(flyForward, Number(button.dataset.flyZoom) * baseSpeed * 2.2);
    });
  });
  walkJoystick?.addEventListener("pointerdown", beginEditorJoystick);
  walkJoystick?.addEventListener("pointermove", moveEditorJoystick);
  walkJoystick?.addEventListener("pointerup", endEditorJoystick);
  walkJoystick?.addEventListener("pointercancel", endEditorJoystick);
  walkJoystick?.addEventListener("lostpointercapture", endEditorJoystick);
  walkLookArea?.addEventListener("pointerdown", beginEditorTouchLook);
  walkLookArea?.addEventListener("pointermove", moveEditorTouchLook);
  walkLookArea?.addEventListener("pointerup", endEditorTouchLook);
  walkLookArea?.addEventListener("pointercancel", endEditorTouchLook);
  walkLookArea?.addEventListener("lostpointercapture", endEditorTouchLook);
  walkJoystick?.addEventListener("contextmenu", (event) => event.preventDefault());
  walkLookArea?.addEventListener("contextmenu", (event) => event.preventDefault());
  walkStatusElement.textContent = "Free-fly ready — right-click and drag to look. WASD moves; Q/E flies up/down; Shift moves faster. On touch devices, enable Navigation.";
}

// Enables or disables touch navigation so camera gestures cannot accidentally trigger editor tools.
function setEditorTouchNavigation(enabled) {
  if (enabled) {
    if (panoramaPlacementMode) {
      panoramaPlacementMode = false;
      panoramaPlaceToggle.textContent = "Place viewpoint";
      panoramaPlaceToggle.classList.add("primary-button");
    }
    if (materialPickMode) setMaterialPickMode(false);
  }
  flyTouchNavigationActive = Boolean(enabled);
  viewerElement.classList.toggle("touch-navigation-active", flyTouchNavigationActive);
  viewerElement.style.cursor = materialPickMode || panoramaPlacementMode ? "crosshair" : "";
  editorTouchNavToggle?.setAttribute("aria-pressed", String(flyTouchNavigationActive));
  if (editorTouchNavToggle) editorTouchNavToggle.textContent = flyTouchNavigationActive ? "Exit touch navigation" : "Enable touch navigation";
  flyJoystickVector.set(0, 0);
  flyTouchFast = false;
  editorTouchFastButton?.setAttribute("aria-pressed", "false");
  if (walkJoystickKnob) { walkJoystickKnob.style.left = "50%"; walkJoystickKnob.style.top = "50%"; }
  walkStatusElement.textContent = flyTouchNavigationActive ? "Touch navigation active — joystick to move, drag the right area to look. Turn navigation off to pick materials or place panoramas." : "Editing ready — tap Pick Material or Place Viewpoint, or enable touch navigation to move the camera.";
}

// Captures the touch joystick and starts a movement vector for the free-fly camera.
function beginEditorJoystick(event) {
  if (!flyTouchNavigationActive) return;
  event.preventDefault();
  flyJoystickPointerId = event.pointerId;
  try { walkJoystick.setPointerCapture(event.pointerId); } catch (_) { /* Pointer capture is optional on older browsers. */ }
  updateEditorJoystick(event);
}

// Converts joystick movement into normalized horizontal and vertical movement input.
function updateEditorJoystick(event) {
  const rect = walkJoystick.getBoundingClientRect();
  const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34);
  let dx = event.clientX - (rect.left + rect.width / 2);
  let dy = event.clientY - (rect.top + rect.height / 2);
  const length = Math.hypot(dx, dy);
  if (length > radius) { dx = dx / length * radius; dy = dy / length * radius; }
  flyJoystickVector.set(dx / radius, dy / radius);
  walkJoystickKnob.style.left = `${50 + flyJoystickVector.x * 34}%`;
  walkJoystickKnob.style.top = `${50 + flyJoystickVector.y * 34}%`;
}

// Updates free-fly movement while the touch joystick is held.
function moveEditorJoystick(event) {
  if (!flyTouchNavigationActive || event.pointerId !== flyJoystickPointerId) return;
  event.preventDefault();
  updateEditorJoystick(event);
}

// Stops touch joystick movement and recentres its knob when the gesture ends.
function endEditorJoystick(event) {
  if (event && event.pointerId !== flyJoystickPointerId) return;
  flyJoystickPointerId = null;
  flyJoystickVector.set(0, 0);
  if (walkJoystickKnob) { walkJoystickKnob.style.left = "50%"; walkJoystickKnob.style.top = "50%"; }
}

// Captures a touch-look gesture on the dedicated right-side area.
function beginEditorTouchLook(event) {
  if (!flyTouchNavigationActive) return;
  event.preventDefault();
  flyTouchLookPointerId = event.pointerId;
  flyTouchLookX = event.clientX;
  flyTouchLookY = event.clientY;
  try { walkLookArea.setPointerCapture(event.pointerId); } catch (_) { /* Pointer capture is optional on older browsers. */ }
}

// Rotates the free-fly camera from touch deltas while the dedicated look area is active.
function moveEditorTouchLook(event) {
  if (!flyTouchNavigationActive || event.pointerId !== flyTouchLookPointerId) return;
  event.preventDefault();
  const deltaX = event.clientX - flyTouchLookX;
  const deltaY = event.clientY - flyTouchLookY;
  flyTouchLookX = event.clientX;
  flyTouchLookY = event.clientY;
  flyYaw -= deltaX * 0.004;
  flyPitch = THREE.MathUtils.clamp(flyPitch - deltaY * 0.004, -Math.PI * 0.49, Math.PI * 0.49);
  camera.rotation.order = "YXZ";
  camera.rotation.set(flyPitch, flyYaw, 0);
}

// Ends the dedicated touch-look gesture when the pointer is released or cancelled.
function endEditorTouchLook(event) {
  if (event && event.pointerId !== flyTouchLookPointerId) return;
  flyTouchLookPointerId = null;
}

function initializeEditor() {
  try {
    renderer.localClippingEnabled = true;
    resizeViewer();
    bindEditorEvents();
    renderSceneList();
    loadSavedSectionScenes();
    loadPanoramaManifest();
    loadRenderSettings();
    initializeFlyMode();
    bindDefaultFlyControls();
    animate();
    loadDefaultModel();
  } catch (error) {
    showError(`Editor initialization failed: ${error.message}`, error);
    setStatus("Editor failed to initialize. Check the browser console.");
  }
}

initializeEditor();
