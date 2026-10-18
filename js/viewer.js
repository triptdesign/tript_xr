
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { WalkMode } from "./walk-mode.js";
import { PanoramaViewer } from "./panorama-viewer.js";
import { createSectionCapSystem } from "./section-caps.js";

const viewerElement = document.querySelector("#viewer");
const loadingElement = document.querySelector("#loading");
const errorElement = document.querySelector("#error");
const dimensionsElement = document.querySelector("#model-dimensions");
const modelNameElement = document.querySelector("#model-name");
const modelSizeElement = document.querySelector("#model-size");
const fileInput = document.querySelector("#model-file");
const resetButton = document.querySelector("#reset-view");
const sectionSelect = document.querySelector("#section-scene-select");
const clearSectionButton = document.querySelector("#clear-section");
const sectionStatus = document.querySelector("#section-status");
const walkToggleButton = document.querySelector("#walk-mode-toggle");
const walkStatusElement = document.querySelector("#walk-status");
const walkControlsElement = document.querySelector("#walk-controls");
const walkExitButton = document.querySelector("#walk-exit");
const walkJoystick = document.querySelector("#walk-joystick");
const walkJoystickKnob = document.querySelector("#walk-joystick-knob");
const walkLookArea = document.querySelector("#walk-look-area");
const sectionSpaceMenu = document.querySelector("#section-space-menu");
const enterSectionSpaceButton = document.querySelector("#enter-section-space");
const cancelSectionSpaceButton = document.querySelector("#cancel-section-space");
const panoramaStatusElement = document.querySelector("#panorama-status");
const panoramaViewsToggle = document.querySelector("#panorama-views-toggle");
const panoramaViewsPanel = document.querySelector("#panorama-views-panel");
const panoramaViewsClose = document.querySelector("#panorama-views-close");
const panoramaViewsList = document.querySelector("#panorama-views-list");
const orbitMoveControls = document.querySelector("#orbit-move-controls");
const orbitJoystick = document.querySelector("#orbit-joystick");
const orbitJoystickKnob = document.querySelector("#orbit-joystick-knob");
const orbitMoveFastButton = document.querySelector("#orbit-move-fast");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#ffffff");

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
camera.position.set(8, 6, 8);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  stencil: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor("#ffffff", 1);
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewerElement.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.screenSpacePanning = true;
controls.minDistance = 0.001;
controls.maxDistance = 1e9;

const hemisphereLight = new THREE.HemisphereLight(
  0xffffff,
  0xd8d8d8,
  2.0
);
scene.add(hemisphereLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(8, 12, 10);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
fillLight.position.set(-8, 5, -6);
scene.add(fillLight);

// Creates a neutral studio environment for reflections on glossy and metallic materials.
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
const environmentRenderTarget = pmremGenerator.fromScene(
  roomEnvironment,
  0.04
);
scene.environment = environmentRenderTarget.texture;
roomEnvironment.dispose();
let activeHdriTarget = null;
let activeHdriTexture = null;
let hdriLoadSequence = 0;
const onlineHdriPresets = {
  morning: { name: "Morning Meadow", url: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kiara_1_dawn_1k.hdr" },
  day: { name: "Open Daylight", url: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/autumn_field_puresky_1k.hdr" },
  evening: { name: "Evening Sunset", url: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/toposcope_sunset_1k.hdr" }
};

// Builds a camera-following sky dome so online HDRI scenery stays above a clean, plain horizon surface.
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

const grid = new THREE.GridHelper(
  10,
  20,
  0xd8d8d8,
  0xececec
);
grid.material.transparent = true;
grid.material.opacity = 0.7;
scene.add(grid);

let currentModel = null;
let initialCameraPosition = camera.position.clone();
let initialTarget = controls.target.clone();
let currentObjectUrl = null;
let modelBounds = null;
let sectionScenes = [];
let activeSectionId = null;
let walkMode = null;
let sectionBeforeWalk = null;
let pendingSectionSpacePoint = null;
let sectionLongPressTimer = null;
let sectionLongPressStart = null;
let sectionLastTap = null;
const orbitMoveKeys = new Set();
let orbitMoveFast = false;
const orbitJoystickVector = new THREE.Vector2();
let orbitJoystickPointerId = null;
let previousOrbitMoveTime = performance.now();
const orbitMoveSpeed = 3.0;
let panoramaDefinitions = [];
let panoramaMarkers = [];
let panoramaViewer = null;
let panoramaMarkerPointerDown = null;
const panoramaRaycaster = new THREE.Raycaster();
const defaultRenderSettings = { version: 4, background: "white", exposure: 1, environmentIntensity: 1, shadows: true, quality: "balanced", hdriPreset: "none", hdriRotation: 0, showHdriSky: true, materialOverrides: [] };
let activeRenderSettings = { ...defaultRenderSettings };
const panoramaPointer = new THREE.Vector2();
const activeSectionPlane = new THREE.Plane();
let sectionCapSystem = null;
const sectionPickRaycaster = new THREE.Raycaster();
const sectionPickPointer = new THREE.Vector2();

// Resizes the renderer and updates the camera projection to match the viewer element.
function resizeViewer() {
  const width = Math.max(viewerElement.clientWidth, 1);
  const height = Math.max(viewerElement.clientHeight, 1);

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

// Formats a dimension into a readable value without assuming the model's units.
function formatDimension(value) {
  if (!Number.isFinite(value)) return "unknown";

  return Number(value.toPrecision(5)).toLocaleString(
    undefined,
    { maximumFractionDigits: 4 }
  );
}

// Fits the camera to the model and uses a tighter clipping range to reduce depth-buffer z-fighting.
function fitCameraToObject(object) {
  const box = new THREE.Box3().setFromObject(object);

  if (box.isEmpty()) {
    throw new Error(
      "The GLB loaded, but it contains no visible mesh bounds."
    );
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  modelBounds = box.clone();
  const maxDimension = Math.max(size.x, size.y, size.z);

  if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
    throw new Error("The model has invalid or zero-sized geometry.");
  }

  // Keeps the near plane away from zero and limits the far plane to improve depth precision.
  camera.near = Math.max(maxDimension * 0.001, 0.01);
  camera.far = Math.max(maxDimension * 20, camera.near + 1);
  camera.updateProjectionMatrix();

  const fovRadians = THREE.MathUtils.degToRad(camera.fov);
  const fitDistance =
    (maxDimension / 2) / Math.tan(fovRadians / 2);
  const distance = fitDistance * 1.65;
  const direction = new THREE.Vector3(1, 0.72, 1).normalize();

  camera.position.copy(center).addScaledVector(direction, distance);
  controls.target.copy(center);

  controls.minDistance = Math.max(maxDimension / 10000, 0.001);
  controls.maxDistance = Math.max(maxDimension * 20, distance * 5);

  controls.update();

  grid.position.y = box.min.y;
  grid.scale.setScalar(Math.max(maxDimension / 10, 0.001));

  initialCameraPosition = camera.position.clone();
  initialTarget = controls.target.clone();

  dimensionsElement.textContent =
    `Dimensions: ${formatDimension(size.x)} × ` +
    `${formatDimension(size.y)} × ${formatDimension(size.z)} model units`;
}

// Validates and applies saved rendering preferences while preserving the existing camera clipping strategy.
function applyViewerRenderSettings(settings = {}) {
  const backgrounds = { white: "#ffffff", studio: "#e9ebef", dark: "#202329" };
  const qualities = ["performance", "balanced", "high"];
  const hdriPresets = ["none", ...Object.keys(onlineHdriPresets)];
  activeRenderSettings = {
    background: Object.hasOwn(backgrounds, settings.background) ? settings.background : defaultRenderSettings.background,
    exposure: Number.isFinite(Number(settings.exposure)) ? THREE.MathUtils.clamp(Number(settings.exposure), 0.6, 1.6) : defaultRenderSettings.exposure,
    environmentIntensity: Number.isFinite(Number(settings.environmentIntensity)) ? THREE.MathUtils.clamp(Number(settings.environmentIntensity), 0, 2) : defaultRenderSettings.environmentIntensity,
    shadows: typeof settings.shadows === "boolean" ? settings.shadows : defaultRenderSettings.shadows,
    quality: qualities.includes(settings.quality) ? settings.quality : defaultRenderSettings.quality,
    hdriPreset: hdriPresets.includes(settings.hdriPreset) ? settings.hdriPreset : "none",
    hdriRotation: Number.isFinite(Number(settings.hdriRotation)) ? THREE.MathUtils.clamp(Number(settings.hdriRotation), 0, 360) : 0,
    showHdriSky: typeof settings.showHdriSky === "boolean" ? settings.showHdriSky : true,
    materialOverrides: Array.isArray(settings.materialOverrides) ? settings.materialOverrides.slice(0, 250).map((item) => ({
      ...item,
      emissiveColor: /^#[0-9a-fA-F]{6}$/.test(item?.emissiveColor || "") ? item.emissiveColor : "#000000",
      emissiveIntensity: Number.isFinite(Number(item?.emissiveIntensity)) ? THREE.MathUtils.clamp(Number(item.emissiveIntensity), 0, 5) : 0
    })) : []
  };
  const backgroundColor = backgrounds[activeRenderSettings.background];
  scene.background = new THREE.Color(backgroundColor);
  skyDome.visible = Boolean(activeRenderSettings.showHdriSky && activeHdriTexture);
  skyDomeMaterial.uniforms.uEnvironment.value = activeHdriTexture;
  skyDomeMaterial.uniforms.uRotation.value = THREE.MathUtils.degToRad(activeRenderSettings.hdriRotation);
  skyDomeMaterial.uniforms.uGroundColor.value.set("#d6d3cb");
  renderer.setClearColor(backgroundColor, 1);
  renderer.toneMappingExposure = activeRenderSettings.exposure;
  scene.environmentIntensity = activeRenderSettings.environmentIntensity;
  scene.environmentRotation.y = THREE.MathUtils.degToRad(activeRenderSettings.hdriRotation);
  renderer.shadowMap.enabled = activeRenderSettings.shadows;
  keyLight.castShadow = activeRenderSettings.shadows;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, activeRenderSettings.quality === "high" ? 2 : activeRenderSettings.quality === "balanced" ? 1.5 : 1));
  if (currentModel) {
    currentModel.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = activeRenderSettings.shadows;
      object.receiveShadow = activeRenderSettings.shadows;
    });
    applySavedMaterialOverridesToViewer(currentModel);
  }
  resizeViewer();
}

// Loads the online HDRI as a visible sky and as a PMREM environment for material reflections.
async function loadViewerOnlineHdri(presetId) {
  const requestId = ++hdriLoadSequence;
  const backgroundColor = ({ white: "#ffffff", studio: "#e9ebef", dark: "#202329" })[activeRenderSettings.background] || "#ffffff";
  if (presetId === "none") {
    if (activeHdriTarget) { activeHdriTarget.dispose(); activeHdriTarget = null; }
    if (activeHdriTexture) { activeHdriTexture.dispose(); activeHdriTexture = null; }
    scene.environment = environmentRenderTarget.texture;
    scene.background = new THREE.Color(backgroundColor);
    skyDome.visible = false;
    skyDomeMaterial.uniforms.uEnvironment.value = null;
    return;
  }
  const preset = onlineHdriPresets[presetId];
  if (!preset) return;
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
    scene.environmentRotation.y = THREE.MathUtils.degToRad(activeRenderSettings.hdriRotation || 0);
    scene.background = new THREE.Color(backgroundColor);
    skyDomeMaterial.uniforms.uEnvironment.value = hdrTexture;
    skyDomeMaterial.uniforms.uRotation.value = THREE.MathUtils.degToRad(activeRenderSettings.hdriRotation || 0);
    skyDome.visible = Boolean(activeRenderSettings.showHdriSky);
  } catch (error) {
    if (requestId === hdriLoadSequence) {
      scene.environment = environmentRenderTarget.texture;
      scene.background = new THREE.Color(backgroundColor);
      skyDome.visible = false;
      skyDomeMaterial.uniforms.uEnvironment.value = null;
      if (activeHdriTarget) { activeHdriTarget.dispose(); activeHdriTarget = null; }
      if (activeHdriTexture) { activeHdriTexture.dispose(); activeHdriTexture = null; }
      console.warn(`TRIPT XR online HDRI ${presetId} failed; default environment remains active.`, error);
    }
  }
}

// Derives the same stable material key used by the Developer Studio for persisted overrides.
function getViewerMaterialKey(material, fallbackIndex) {
  return material.name && material.name.trim() ? material.name.trim() : `__unnamed_material_${fallbackIndex + 1}`;
}

// Applies saved material overrides to the loaded model while retaining its original texture maps.
function applySavedMaterialOverridesToViewer(model) {
  if (!model) return;
  const overrides = new Map((activeRenderSettings.materialOverrides || []).filter((item) => item && typeof item.key === "string").map((item) => [item.key, item]));
  let materialIndex = 0;
  model.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      const key = getViewerMaterialKey(material, materialIndex++);
      const override = overrides.get(key);
      if (!override) return;
      if (override.preserveColor === false && /^#[0-9a-fA-F]{6}$/.test(override.color || "") && material.color) material.color.set(override.color);
      if ("roughness" in material && Number.isFinite(Number(override.roughness))) material.roughness = THREE.MathUtils.clamp(Number(override.roughness), 0, 1);
      if ("metalness" in material && Number.isFinite(Number(override.metalness))) material.metalness = THREE.MathUtils.clamp(Number(override.metalness), 0, 1);
      if (Number.isFinite(Number(override.opacity))) {
        material.opacity = THREE.MathUtils.clamp(Number(override.opacity), 0.05, 1);
        material.transparent = material.opacity < 0.999 || Boolean(material.alphaMap) || Boolean(material.transparent);
      }
      if (material.emissive && /^#[0-9a-fA-F]{6}$/.test(override.emissiveColor || "")) material.emissive.set(override.emissiveColor);
      if ("emissiveIntensity" in material) material.emissiveIntensity = THREE.MathUtils.clamp(Number(override.emissiveIntensity) || 0, 0, 5);
      material.needsUpdate = true;
    });
  });
}

// Fetches the saved rendering preferences and restores the selected online HDRI when configured.
async function loadViewerRenderSettings() {
  try {
    const response = await fetch("./config/render.json", { cache: "no-store" });
    if (response.ok) {
      const settings = await response.json();
      applyViewerRenderSettings(settings);
      await loadViewerOnlineHdri(activeRenderSettings.hdriPreset);
    } else applyViewerRenderSettings(defaultRenderSettings);
  } catch (error) {
    applyViewerRenderSettings(defaultRenderSettings);
    console.warn("TRIPT XR render settings could not be loaded; defaults are active.", error);
  }
}

// Loads saved section scenes from config/sections.json and populates the viewer selector.
async function loadSectionConfiguration() {
  if (!sectionSelect || !sectionStatus) return;

  try {
    const response = await fetch("./config/sections.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const config = await response.json();
    if (!config || !Array.isArray(config.sections)) {
      throw new Error("sections.json must contain a sections array.");
    }

    sectionScenes = config.sections.filter((item) =>
      item &&
      item.enabled !== false &&
      ["x", "y", "z"].includes(item.axis) &&
      Number.isFinite(Number(item.position)) &&
      Number(item.position) >= 0 &&
      Number(item.position) <= 1
    );

    sectionSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = sectionScenes.length
      ? "Choose a section scene…"
      : "No enabled sections";
    sectionSelect.appendChild(placeholder);

    sectionScenes.forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item.id);
      option.textContent = String(item.name || "Unnamed section");
      sectionSelect.appendChild(option);
    });

    sectionStatus.textContent = sectionScenes.length
      ? `${sectionScenes.length} saved section(s) loaded`
      : "No enabled section scenes found";

    // Opens the first enabled saved scene automatically once the model is ready.
    if (sectionScenes.length) {
      sectionSelect.value = String(sectionScenes[0].id);
      if (modelBounds) applySavedSection(sectionScenes[0]);
    }
  } catch (error) {
    sectionSelect.replaceChildren();
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Could not load sections";
    sectionSelect.appendChild(option);
    sectionStatus.textContent =
      "Sections unavailable — check config/sections.json and run via HTTP.";
    console.error("TRIPT XR section configuration failed:", error);
  }
}

// Applies one saved section plane relative to the loaded model's actual bounding box.
function applySavedSection(sectionData) {
  if (!currentModel || !modelBounds || !sectionData) {
    if (sectionStatus) sectionStatus.textContent = "Load the model before opening a section.";
    return;
  }

  const axis = sectionData.axis;
  const position = THREE.MathUtils.clamp(Number(sectionData.position), 0, 1);
  const min = modelBounds.min;
  const max = modelBounds.max;

  const point = new THREE.Vector3(
    axis === "x" ? THREE.MathUtils.lerp(min.x, max.x, position) : (min.x + max.x) / 2,
    axis === "y" ? THREE.MathUtils.lerp(min.y, max.y, position) : (min.y + max.y) / 2,
    axis === "z" ? THREE.MathUtils.lerp(min.z, max.z, position) : (min.z + max.z) / 2
  );

  const normal = new THREE.Vector3(
    axis === "x" ? 1 : 0,
    axis === "y" ? 1 : 0,
    axis === "z" ? 1 : 0
  );

  // Three.js clips the negative side; reverse the normal when JSON requests the negative side to remain visible.
  if (sectionData.reverse) normal.negate();

  activeSectionPlane.setFromNormalAndCoplanarPoint(normal, point);
  sectionCapSystem?.update(true);

  // Clone materials so applying a saved section does not mutate shared material instances.
  currentModel.traverse((object) => {
    if (!object.isMesh || !object.material) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materials.forEach((material) => {
      material.clippingPlanes = [activeSectionPlane];
      material.clipShadows = true;
      material.needsUpdate = true;
    });
  });

  renderer.localClippingEnabled = true;
  activeSectionId = String(sectionData.id);
  if (sectionSelect) sectionSelect.value = activeSectionId;
  if (sectionStatus) {
    sectionStatus.textContent =
      `Opened: ${sectionData.name || "Section"} · ${axis.toUpperCase()} · ${Math.round(position * 100)}%`;
  }
}

// Clears all section clipping planes and restores the full model.
function clearSavedSection() {
  sectionCapSystem?.update(false);
  if (currentModel) {
    currentModel.traverse((object) => {
      if (!object.isMesh || !object.material) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        material.clippingPlanes = [];
        material.clipShadows = false;
        material.needsUpdate = true;
      });
    });
  }

  activeSectionId = null;
  if (sectionSelect) sectionSelect.value = "";
  if (sectionStatus) sectionStatus.textContent = "Section cleared";
}

// Opens the selected saved scene from the section selector.
function handleSectionSelection() {
  const selected = sectionScenes.find(
    (item) => String(item.id) === sectionSelect.value
  );

  if (!selected) {
    clearSavedSection();
    return;
  }

  applySavedSection(selected);
}

// Reports imported mesh, material, and texture information without modifying materials.
function reportMaterialDiagnostics(object) {
  let meshCount = 0;
  let materialCount = 0;
  let textureCount = 0;
  let transparentCount = 0;

  object.traverse((child) => {
    if (!child.isMesh) return;

    meshCount += 1;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (!material) return;

      materialCount += 1;

      if (
        material.transparent ||
        material.opacity < 1 ||
        material.alphaMap
      ) {
        transparentCount += 1;
      }

      [
        "map",
        "normalMap",
        "roughnessMap",
        "metalnessMap",
        "aoMap",
        "emissiveMap",
        "alphaMap"
      ].forEach((key) => {
        if (material[key]) textureCount += 1;
      });
    });
  });

  console.info("TRIPT XR GLB diagnostics:", {
    meshes: meshCount,
    materialSlots: materialCount,
    textureSlots: textureCount,
    transparentMaterialSlots: transparentCount
  });
}

// Creates a consistent floating 360-degree icon texture for panorama viewpoint markers.
function createPanoramaMarkerTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.fillStyle = "#202124";
  context.beginPath();
  context.arc(64, 64, 53, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#ffffff";
  context.lineWidth = 5;
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = "bold 29px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("360°", 64, 65);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Removes all current panorama markers and disposes their textures and materials.
function clearPanoramaMarkers() {
  panoramaMarkers.forEach((marker) => {
    scene.remove(marker);
    marker.material.map?.dispose();
    marker.material.dispose();
  });
  panoramaMarkers = [];
}

// Creates always-visible 3D panorama markers for manifest entries with valid world coordinates.
function renderPanoramaMarkers() {
  clearPanoramaMarkers();
  if (!currentModel || !panoramaDefinitions.length) return;
  const markerSize = modelBounds ? Math.max(...modelBounds.getSize(new THREE.Vector3()).toArray()) * 0.045 : 0.2;
  panoramaDefinitions.filter((item) => item.enabled !== false && item.position &&
    [item.position.x, item.position.y, item.position.z].every((value) => Number.isFinite(Number(value))))
    .forEach((item) => {
      const material = new THREE.SpriteMaterial({
        map: createPanoramaMarkerTexture(),
        transparent: true,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: true
      });
      const marker = new THREE.Sprite(material);
      marker.position.set(Number(item.position.x), Number(item.position.y), Number(item.position.z));
      marker.scale.set(markerSize, markerSize, 1);
      marker.renderOrder = 2000;
      marker.userData.panoramaId = String(item.id);
      marker.userData.panoramaName = String(item.name || "360° Panorama");
      marker.userData.panorama = item;
      scene.add(marker);
      panoramaMarkers.push(marker);
    });
  if (panoramaStatusElement) {
    const unplaced = panoramaDefinitions.filter((item) => item.enabled !== false && !item.position).length;
    panoramaStatusElement.textContent = `${panoramaMarkers.length} panorama marker(s) active${unplaced ? ` · ${unplaced} need positioning in Developer Option` : ""}`;
  }
}

// Loads the generated panorama manifest and prepares its configured viewpoint markers.
async function loadPanoramaConfiguration() {
  try {
    const response = await fetch("./config/panoramas.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    if (!config || !Array.isArray(config.panoramas)) throw new Error("panoramas.json must contain a panoramas array.");
    panoramaDefinitions = config.panoramas.filter((item) => item && item.id && item.image);
    if (currentModel) renderPanoramaMarkers();
    renderPanoramaViewsList();
    if (panoramaStatusElement && !panoramaDefinitions.length) {
      panoramaStatusElement.textContent = "No panoramas configured yet. Add files in assets/panorama/ and run the Python processor.";
    }
  } catch (error) {
    if (panoramaStatusElement) panoramaStatusElement.textContent = "Panoramas unavailable: check config/panoramas.json.";
    console.warn("TRIPT XR panorama configuration could not be loaded:", error);
  }
}

// Rebuilds the accessible viewpoint list from the same manifest used to create 3D panorama markers.
function renderPanoramaViewsList() {
  if (!panoramaViewsList) return;
  panoramaViewsList.replaceChildren();
  const available = panoramaDefinitions.filter((item) => item.enabled !== false && item.image);
  if (!available.length) {
    const empty = document.createElement("p");
    empty.textContent = "No panorama viewpoints are configured yet.";
    panoramaViewsList.appendChild(empty);
    return;
  }
  available.forEach((panorama) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "panorama-view-item";
    button.textContent = `360°  ${panorama.name || panorama.id || "Panorama viewpoint"}`;
    button.addEventListener("click", () => {
      closePanoramaViewsPanel();
      if (!panoramaViewer || panoramaViewer.active) return;
      panoramaViewer.open(panorama, modelBounds).catch((error) => showError(error.message || String(error)));
    });
    panoramaViewsList.appendChild(button);
  });
}

// Opens or closes the persistent viewpoint list without changing Walk Mode or the current camera.
function togglePanoramaViewsPanel(forceOpen) {
  if (!panoramaViewsPanel || !panoramaViewsToggle) return;
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : panoramaViewsPanel.classList.contains("hidden");
  panoramaViewsPanel.classList.toggle("hidden", !shouldOpen);
  panoramaViewsToggle.setAttribute("aria-expanded", String(shouldOpen));
}

// Closes the viewpoint list and updates its accessible expanded state.
function closePanoramaViewsPanel() {
  togglePanoramaViewsPanel(false);
}

// Detects taps/clicks on panorama markers in Orbit or active Walk Mode and opens the linked panorama.
function handlePanoramaMarkerClick(event) {
  if (!panoramaViewer || panoramaViewer.active || !["orbit", "active"].includes(walkMode?.mode)) return;
  if (event.target.closest("button, input, select, label, .section-space-menu, .panorama-overlay, .panorama-views-panel")) return;
  const rect = renderer.domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  if (walkMode?.mode === "active" && document.pointerLockElement === renderer.domElement) {
    panoramaPointer.set(0, 0);
  } else {
    panoramaPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    panoramaPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
  panoramaRaycaster.setFromCamera(panoramaPointer, camera);
  const hits = panoramaRaycaster.intersectObjects(panoramaMarkers, false);
  if (!hits.length) return;
  event.preventDefault();
  event.stopPropagation();
  closePanoramaViewsPanel();
  panoramaViewer.open(hits[0].object.userData.panorama, modelBounds).catch((error) => showError(error.message || String(error)));
}

// Loads a GLB model, frames the camera, and reports loading errors when necessary.
function loadModel(url, displayName, revokeUrlAfterLoad = false) {
  loadingElement.classList.remove("hidden");
  loadingElement.textContent = `Loading ${displayName}…`;
  errorElement.classList.add("hidden");

  const loader = new GLTFLoader();

  loader.load(
    url,
    (gltf) => {
      if (currentModel) {
        sectionCapSystem?.dispose();
        sectionCapSystem = null;
        scene.remove(currentModel);
      }

      currentModel = gltf.scene;
      currentModel.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = activeRenderSettings.shadows;
        object.receiveShadow = activeRenderSettings.shadows;
      });
      applySavedMaterialOverridesToViewer(currentModel);
      scene.add(currentModel);

      try {
        fitCameraToObject(currentModel);
        sectionCapSystem = createSectionCapSystem(THREE, scene, currentModel, activeSectionPlane, modelBounds);
        reportMaterialDiagnostics(currentModel);
        renderPanoramaMarkers();

        // Reapply the currently selected saved section after a model is loaded or replaced.
        const selectedSection = sectionScenes.find(
          (item) => String(item.id) === sectionSelect?.value
        );
        if (selectedSection) applySavedSection(selectedSection);

        modelNameElement.textContent = displayName;
        loadingElement.classList.add("hidden");

        if (revokeUrlAfterLoad && currentObjectUrl) {
          URL.revokeObjectURL(currentObjectUrl);
          currentObjectUrl = null;
        }
      } catch (error) {
        loadingElement.classList.add("hidden");
        showError(error.message || String(error));
      }
    },
    (progress) => {
      if (progress.total > 0) {
        const percent = Math.round(
          (progress.loaded / progress.total) * 100
        );

        loadingElement.textContent =
          `Loading ${displayName}… ${percent}%`;
      }
    },
    (error) => {
      loadingElement.classList.add("hidden");

      showError(
        `Could not load ${displayName}.\n\n` +
        `Check that the file exists and that you started the viewer with a local HTTP server.\n` +
        `Upload a standalone GLB through Developer Studio (editor.html).\n\n` +
        `Details: ${error?.message || "GLB loading failed"}`
      );

      console.error("TRIPT XR model load failed:", error);
    }
  );
}

// Displays a readable error message inside the viewer and logs technical details.
function showError(message) {
  errorElement.textContent = message;
  errorElement.classList.remove("hidden");
}

// Restores the camera position and orbit target saved when the model was loaded.
function resetView() {
  if (walkMode && walkMode.mode !== "orbit") {
    walkMode.exitWalkMode();
    return;
  }
  camera.position.copy(initialCameraPosition);
  controls.target.copy(initialTarget);
  controls.update();
}

// Loads a user-selected local GLB file without requiring it to be copied into assets/.
function handleFileSelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }

  currentObjectUrl = URL.createObjectURL(file);
  modelSizeElement.textContent =
    `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

  loadModel(currentObjectUrl, file.name, true);
}

// Connects the Walk Mode controller to the existing viewer and preserves the active section across entry/exit.
function initializeWalkMode() {
  const requiredElements = [
    walkToggleButton,
    walkStatusElement,
    walkControlsElement,
    walkExitButton,
    walkJoystick,
    walkJoystickKnob,
    walkLookArea
  ];

  if (requiredElements.some((element) => !element)) {
    console.error("TRIPT XR Walk Mode could not initialize: one or more Walk Mode UI elements are missing.");
    return;
  }

  walkMode = new WalkMode({
    camera,
    controls,
    renderer,
    viewerElement,
    getModel: () => currentModel,
    getBounds: () => modelBounds,
    toggleButton: walkToggleButton,
    statusElement: walkStatusElement,
    controlsElement: walkControlsElement,
    exitButton: walkExitButton,
    joystick: walkJoystick,
    joystickKnob: walkJoystickKnob,
    lookArea: walkLookArea,
    onEnter: () => {
      // Stop Orbit Mode movement before Walk Mode takes control of the camera.
      orbitMoveKeys.clear();
      orbitMoveControls?.classList.add("hidden");
      // Remember the selected section, then temporarily clear clipping for a complete-building walkthrough.
      sectionBeforeWalk = activeSectionId;
      clearSavedSection();
    },
    onExit: () => {
      // Restore the Orbit Mode touch pad when returning from Walk Mode.
      orbitMoveControls?.classList.remove("hidden");
      // Restore the saved section scene after Walk Mode returns to Orbit View.
      const previousSection = sectionScenes.find(
        (item) => String(item.id) === String(sectionBeforeWalk)
      );
      if (previousSection) applySavedSection(previousSection);
      else clearSavedSection();
      sectionBeforeWalk = null;
    }
  });
}


// Finds an upward-facing floor point on the currently visible side of the active section.
function pickSectionSpacePoint(clientX, clientY) {
  if (!currentModel || !activeSectionId || !modelBounds) return null;

  const rect = renderer.domElement.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  sectionPickPointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  sectionPickPointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  sectionPickRaycaster.setFromCamera(sectionPickPointer, camera);
  sectionPickRaycaster.near = 0;
  sectionPickRaycaster.far = Infinity;

  const hits = sectionPickRaycaster.intersectObject(currentModel, true);
  for (const hit of hits) {
    if (!hit.object.isMesh || !hit.face) continue;
    // Ignore ray hits on geometry removed by the active clipping plane.
    if (activeSectionPlane.distanceToPoint(hit.point) < -0.001) continue;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
    if (worldNormal.y > 0.68) return hit.point.clone();
  }
  return null;
}

// Opens the small contextual menu at a picked floor point while a section is active.
function openSectionSpaceMenu(clientX, clientY, point) {
  if (!sectionSpaceMenu || !point) return;
  pendingSectionSpacePoint = point.clone();
  const viewerRect = viewerElement.getBoundingClientRect();
  const menuWidth = 180;
  const menuHeight = 92;
  const left = THREE.MathUtils.clamp(clientX - viewerRect.left, 8, Math.max(8, viewerRect.width - menuWidth - 8));
  const top = THREE.MathUtils.clamp(clientY - viewerRect.top, 8, Math.max(8, viewerRect.height - menuHeight - 8));
  sectionSpaceMenu.style.left = `${left}px`;
  sectionSpaceMenu.style.top = `${top}px`;
  sectionSpaceMenu.classList.remove("hidden");
}

// Hides the contextual menu and discards its pending destination.
function closeSectionSpaceMenu() {
  if (sectionSpaceMenu) sectionSpaceMenu.classList.add("hidden");
  pendingSectionSpacePoint = null;
}

// Starts Walk Mode at the selected section floor after validating the destination.
function enterPendingSectionSpace() {
  if (!pendingSectionSpacePoint || !walkMode) return;
  const destination = pendingSectionSpacePoint.clone();
  closeSectionSpaceMenu();
  walkMode.enterAtPoint(destination);
}

// Handles desktop double-click entry into a floor space while a saved section is active.
function handleSectionSpaceDoubleClick(event) {
  if (!activeSectionId || walkMode?.mode !== "orbit") return;
  if (event.target.closest("button, input, select, label, .section-space-menu")) return;
  const point = pickSectionSpacePoint(event.clientX, event.clientY);
  if (!point) return;
  event.preventDefault();
  walkMode.enterAtPoint(point);
}

// Handles right-click contextual navigation for a floor space in the active section.
function handleSectionSpaceContextMenu(event) {
  if (!activeSectionId || walkMode?.mode !== "orbit") return;
  const point = pickSectionSpacePoint(event.clientX, event.clientY);
  if (!point) return;
  event.preventDefault();
  openSectionSpaceMenu(event.clientX, event.clientY, point);
}

// Begins a mobile long-press gesture and opens the space menu if the finger remains still.
function handleSectionLongPressStart(event) {
  if (event.pointerType === "mouse" || !activeSectionId || walkMode?.mode !== "orbit") return;
  sectionLongPressStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  if (sectionLongPressTimer) window.clearTimeout(sectionLongPressTimer);
  sectionLongPressTimer = window.setTimeout(() => {
    if (!sectionLongPressStart) return;
    const point = pickSectionSpacePoint(sectionLongPressStart.x, sectionLongPressStart.y);
    if (point) openSectionSpaceMenu(sectionLongPressStart.x, sectionLongPressStart.y, point);
    sectionLongPressStart = null;
    sectionLongPressTimer = null;
  }, 550);
}

// Cancels long-press activation when the finger moves, lifts, or the pointer is cancelled.
function handleSectionLongPressEnd(event) {
  if (!sectionLongPressStart || event.pointerId !== sectionLongPressStart.pointerId) return;
  const start = sectionLongPressStart;
  const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12;
  if (sectionLongPressTimer && (moved || event.type !== "pointerdown")) window.clearTimeout(sectionLongPressTimer);

  // A second short touch within the double-tap window enters the selected floor space.
  if (event.type === "pointerup" && !moved && event.pointerType !== "mouse" && activeSectionId && walkMode?.mode === "orbit") {
    const now = performance.now();
    if (sectionLastTap && now - sectionLastTap.time < 360 && Math.hypot(event.clientX - sectionLastTap.x, event.clientY - sectionLastTap.y) < 28) {
      const point = pickSectionSpacePoint(event.clientX, event.clientY);
      sectionLastTap = null;
      if (point) walkMode.enterAtPoint(point);
    } else {
      sectionLastTap = { x: event.clientX, y: event.clientY, time: now };
    }
  }

  if (moved || event.type !== "pointerdown") {
    sectionLongPressTimer = null;
    sectionLongPressStart = null;
  }
}

// Returns true when keyboard focus is inside a control that should receive text or form input.
function isTypingTarget(target) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName));
}

// Records WASD and Shift input only while Orbit Mode is active and focus is not in a UI control.
function handleOrbitMovementKeyDown(event) {
  if (walkMode?.mode !== "orbit" || panoramaViewer?.active || isTypingTarget(event.target)) return;
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d"].includes(key)) {
    orbitMoveKeys.add(key);
    event.preventDefault();
  }
  if (event.key === "Shift") orbitMoveFast = true;
}

// Clears released movement keys so the camera never continues moving after key release.
function handleOrbitMovementKeyUp(event) {
  orbitMoveKeys.delete(event.key.toLowerCase());
  if (event.key === "Shift") orbitMoveFast = false;
}

// Moves the camera and orbit target together along the ground plane, preserving the current orbit relationship.
function updateOrbitKeyboardMovement(deltaSeconds) {
  if (walkMode?.mode !== "orbit" || panoramaViewer?.active || !controls.enabled || (orbitMoveKeys.size === 0 && orbitJoystickVector.lengthSq() < 0.0001)) return;
  const forward = new THREE.Vector3().subVectors(controls.target, camera.position);
  forward.y = 0;
  if (forward.lengthSq() < 1e-8) forward.set(0, 0, -1);
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const movement = new THREE.Vector3();
  if (orbitMoveKeys.has("w")) movement.add(forward);
  if (orbitMoveKeys.has("s")) movement.sub(forward);
  if (orbitMoveKeys.has("d")) movement.add(right);
  if (orbitMoveKeys.has("a")) movement.sub(right);
  movement.addScaledVector(forward, -orbitJoystickVector.y);
  movement.addScaledVector(right, orbitJoystickVector.x);
  if (movement.lengthSq() === 0) return;
  movement.normalize().multiplyScalar(orbitMoveSpeed * (orbitMoveFast ? 3 : 1) * deltaSeconds);
  camera.position.add(movement);
  controls.target.add(movement);
}

// Binds the touch joystick and speed toggle for Orbit Mode on phones and tablets.
function initializeOrbitTouchMovement() {
  if (!orbitJoystick || !orbitJoystickKnob || !orbitMoveFastButton) return;

  // Captures the joystick pointer so movement remains continuous while the thumb is held down.
  orbitJoystick.addEventListener("pointerdown", (event) => {
    if (walkMode?.mode !== "orbit" || panoramaViewer?.active) return;
    event.preventDefault();
    orbitJoystickPointerId = event.pointerId;
    try { orbitJoystick.setPointerCapture(event.pointerId); } catch (_) { /* Pointer capture may be unavailable in older browsers. */ }
    updateOrbitJoystick(event);
  });

  // Updates the joystick vector while the captured pointer moves within or beyond the base.
  orbitJoystick.addEventListener("pointermove", (event) => {
    if (event.pointerId !== orbitJoystickPointerId) return;
    event.preventDefault();
    updateOrbitJoystick(event);
  });

  // Releases the joystick and clears movement when the pointer ends or is cancelled.
  const stopOrbitJoystick = (event) => {
    if (event && event.pointerId !== orbitJoystickPointerId) return;
    orbitJoystickPointerId = null;
    orbitJoystickVector.set(0, 0);
    orbitJoystickKnob.style.left = "50%";
    orbitJoystickKnob.style.top = "50%";
  };
  orbitJoystick.addEventListener("pointerup", stopOrbitJoystick);
  orbitJoystick.addEventListener("pointercancel", stopOrbitJoystick);
  orbitJoystick.addEventListener("lostpointercapture", stopOrbitJoystick);
  orbitJoystick.addEventListener("contextmenu", (event) => event.preventDefault());

  // Toggles the faster movement multiplier for touch navigation.
  orbitMoveFastButton.addEventListener("click", () => {
    orbitMoveFast = !orbitMoveFast;
    orbitMoveFastButton.setAttribute("aria-pressed", String(orbitMoveFast));
  });
}

// Converts a pointer position into a normalized two-axis joystick vector and updates the knob position.
function updateOrbitJoystick(event) {
  const rect = orbitJoystick.getBoundingClientRect();
  const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34);
  let dx = event.clientX - (rect.left + rect.width / 2);
  let dy = event.clientY - (rect.top + rect.height / 2);
  const length = Math.hypot(dx, dy);
  if (length > radius) { dx = dx / length * radius; dy = dy / length * radius; }
  orbitJoystickVector.set(dx / radius, dy / radius);
  orbitJoystickKnob.style.left = `${50 + orbitJoystickVector.x * 34}%`;
  orbitJoystickKnob.style.top = `${50 + orbitJoystickVector.y * 34}%`;
}

// Keeps the viewer responsive and continuously updates orbit movement, controls and the rendered scene.
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const deltaSeconds = Math.min(0.05, Math.max(0, (now - previousOrbitMoveTime) / 1000));
  previousOrbitMoveTime = now;
  updateOrbitKeyboardMovement(deltaSeconds);
  if (controls.enabled) controls.update();
  if (walkMode) walkMode.update(Math.min(0.05, walkMode.clock.getDelta()));
  skyDome.position.copy(camera.position);
  skyDome.scale.setScalar(Math.max(100, Math.min(camera.far * 0.8, 10000)));
  renderer.render(scene, camera);
}

window.addEventListener("resize", resizeViewer);
window.addEventListener("keydown", handleOrbitMovementKeyDown);
window.addEventListener("keyup", handleOrbitMovementKeyUp);
window.addEventListener("blur", () => { orbitMoveKeys.clear(); orbitMoveFast = false; orbitJoystickVector.set(0, 0); orbitMoveFastButton?.setAttribute("aria-pressed", "false"); if (orbitJoystickKnob) { orbitJoystickKnob.style.left = "50%"; orbitJoystickKnob.style.top = "50%"; } });
initializeOrbitTouchMovement();
resetButton.addEventListener("click", resetView);
fileInput.addEventListener("change", handleFileSelection);
sectionSelect?.addEventListener("change", handleSectionSelection);
clearSectionButton?.addEventListener("click", clearSavedSection);
renderer.domElement.addEventListener("click", handlePanoramaMarkerClick);
panoramaViewsToggle?.addEventListener("click", () => togglePanoramaViewsPanel());
panoramaViewsClose?.addEventListener("click", closePanoramaViewsPanel);
renderer.domElement.addEventListener("dblclick", handleSectionSpaceDoubleClick);
renderer.domElement.addEventListener("contextmenu", handleSectionSpaceContextMenu);
renderer.domElement.addEventListener("pointerdown", handleSectionLongPressStart, { passive: true });
renderer.domElement.addEventListener("pointerup", handleSectionLongPressEnd, { passive: true });
renderer.domElement.addEventListener("pointercancel", handleSectionLongPressEnd, { passive: true });
renderer.domElement.addEventListener("pointermove", handleSectionLongPressEnd, { passive: true });
enterSectionSpaceButton?.addEventListener("click", enterPendingSectionSpace);
cancelSectionSpaceButton?.addEventListener("click", closeSectionSpaceMenu);
window.addEventListener("keydown", (event) => { if (event.key === "Escape") closeSectionSpaceMenu(); });

initializeWalkMode();
panoramaViewer = new PanoramaViewer({
  scene, camera, controls, currentModel: () => currentModel, grid, renderer, viewerElement,
  beforeOpen: () => {
    closePanoramaViewsPanel();
    if (walkMode?.mode === "active") walkMode.suspendForPanorama();
    if (walkToggleButton) walkToggleButton.disabled = true;
  },
  afterClose: () => {
    if (walkToggleButton) walkToggleButton.disabled = false;
    if (walkMode?.mode === "panorama") walkMode.resumeAfterPanorama();
  }
});
window.addEventListener("keydown", (event) => { if (event.key === "Escape" && panoramaViewer?.active) panoramaViewer.close(); });
resizeViewer();
animate();
// Loads the configured model only when a GLB has been uploaded to this project.
async function loadConfiguredModel() {
  try {
    const response = await fetch("./config/model.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Model configuration is unavailable.");
    const config = await response.json();
    if (!config.model) throw new Error("No model uploaded.");
    loadModel(`./${config.model}`, config.model.split("/").pop() || "Building.glb");
  } catch (error) {
    loadingElement.classList.add("hidden");
    modelNameElement.textContent = "No model uploaded";
    if (errorElement) { errorElement.textContent = "No building model has been uploaded yet. Open Developer Studio to upload a GLB."; errorElement.classList.remove("hidden"); }
  }
}

loadConfiguredModel();
loadViewerRenderSettings();
loadSectionConfiguration();
loadPanoramaConfiguration();
