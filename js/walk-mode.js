import * as THREE from "three";

/**
 * Provides a first-person Walk Mode foundation for the TRIPT XR viewer.
 * It supports validated floor-point selection, keyboard/touch movement,
 * mouse/touch look, conservative raycast collision, and camera restoration.
 */
export class WalkMode {
  /**
   * Creates the Walk Mode controller and connects it to the existing viewer.
   * @param {object} options - Viewer objects, UI elements, and section callbacks.
   */
  constructor(options) {
    this.camera = options.camera;
    this.controls = options.controls;
    this.renderer = options.renderer;
    this.viewerElement = options.viewerElement;
    this.getModel = options.getModel;
    this.getBounds = options.getBounds;
    this.onEnter = options.onEnter;
    this.onExit = options.onExit;
    this.toggleButton = options.toggleButton;
    this.statusElement = options.statusElement;
    this.controlsElement = options.controlsElement;
    this.exitButton = options.exitButton;
    this.joystick = options.joystick;
    this.joystickKnob = options.joystickKnob;
    this.lookArea = options.lookArea;

    this.mode = "orbit";
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.eyeHeight = 1.4;
    this.playerRadius = 0.22;
    this.walkSpeed = 2.0;
    this.fastSpeed = 3.4;
    this.stepHeight = 0.32;
    this.maxDrop = 0.28;
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.joystickVector = new THREE.Vector2();
    this.lookPointerId = null;
    this.lastLookX = 0;
    this.lastLookY = 0;
    this.savedCameraPosition = new THREE.Vector3();
    this.savedCameraQuaternion = new THREE.Quaternion();
    this.savedTarget = new THREE.Vector3();
    this.playerFeet = new THREE.Vector3();
    this.modelMeshes = [];
    this.lastTouchTap = 0;
    this.touchStartPoint = null;

    this.bindEvents();
  }

  /**
   * Attaches the UI, keyboard, pointer, and touch handlers used by Walk Mode.
   */
  bindEvents() {
    this.toggleButton.addEventListener("click", () => {
      if (this.mode === "orbit") this.beginStartSelection();
      else this.exitWalkMode();
    });
    this.exitButton.addEventListener("click", () => this.exitWalkMode());
    this.viewerElement.addEventListener("click", (event) => this.handleViewerClick(event));
    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    window.addEventListener("keyup", (event) => this.handleKeyUp(event));
    window.addEventListener("blur", () => this.keys.clear());
    document.addEventListener("mousemove", (event) => this.handleMouseLook(event));
    document.addEventListener("pointerlockchange", () => this.handlePointerLockChange());
    this.joystick.addEventListener("pointerdown", (event) => this.handleJoystickStart(event));
    this.joystick.addEventListener("pointermove", (event) => this.handleJoystickMove(event));
    this.joystick.addEventListener("pointerup", (event) => this.handleJoystickEnd(event));
    this.joystick.addEventListener("pointercancel", (event) => this.handleJoystickEnd(event));
    this.lookArea.addEventListener("pointerdown", (event) => this.handleTouchLookStart(event));
    this.lookArea.addEventListener("pointermove", (event) => this.handleTouchLookMove(event));
    this.lookArea.addEventListener("pointerup", (event) => this.handleTouchLookEnd(event));
    this.lookArea.addEventListener("pointercancel", (event) => this.handleTouchLookEnd(event));
  }

  /**
   * Starts the location-selection stage before activating first-person movement.
   */
  beginStartSelection() {
    if (!this.getModel()) {
      this.setStatus("Load a building GLB before entering Walk Mode.");
      return;
    }
    this.mode = "selecting";
    if (this.onEnter) this.onEnter();
    this.savedCameraPosition.copy(this.camera.position);
    this.savedCameraQuaternion.copy(this.camera.quaternion);
    this.savedTarget.copy(this.controls.target);
    this.controls.enabled = false;
    this.toggleButton.setAttribute("aria-pressed", "true");
    this.toggleButton.textContent = "Cancel Walk";
    this.setStatus("Click or tap a clear, horizontal floor surface to choose your starting point. Press Esc to cancel.");
    this.viewerElement.classList.add("walk-selecting");
  }

  /**
   * Enters first-person Walk Mode from a section-picked floor point after removing clipping and validating support.
   * @param {THREE.Vector3} point - Candidate floor point selected in Section View.
   */
  enterAtPoint(point) {
    const model = this.getModel();
    if (!model || this.mode !== "orbit" || !point?.isVector3) return;

    this.savedCameraPosition.copy(this.camera.position);
    this.savedCameraQuaternion.copy(this.camera.quaternion);
    this.savedTarget.copy(this.controls.target);
    this.mode = "transitioning";
    this.controls.enabled = false;
    this.toggleButton.setAttribute("aria-pressed", "true");
    this.toggleButton.textContent = "Exit Walk";
    if (this.onEnter) this.onEnter();

    // Recheck the selected location against the un-clipped model so a cut surface cannot become a false floor.
    const floorRayOrigin = point.clone().add(new THREE.Vector3(0, 0.75, 0));
    this.raycaster.set(floorRayOrigin, new THREE.Vector3(0, -1, 0));
    this.raycaster.near = 0;
    this.raycaster.far = 1.8;
    const floorHit = this.raycaster.intersectObject(model, true).find((hit) => {
      if (!hit.object.isMesh || !hit.face || Math.abs(hit.point.y - point.y) > 0.8) return false;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      return hit.face.normal.clone().applyMatrix3(normalMatrix).normalize().y > 0.68;
    });

    if (!floorHit) {
      this.cancelStartSelection();
      this.setStatus("Could not validate a walkable floor at that location. Try another space.");
      return;
    }

    this.playerFeet.copy(floorHit.point);
    if (!this.canMoveTo(this.playerFeet.clone())) {
      this.cancelStartSelection();
      this.setStatus("That space does not have enough clear, supported floor area to enter safely.");
      return;
    }

    this.modelMeshes = [];
    model.traverse((object) => {
      if (object.isMesh && object.visible) this.modelMeshes.push(object);
    });
    this.estimateInitialDirection(this.playerFeet);
    this.controlsElement.classList.remove("hidden");
    this.viewerElement.classList.remove("walk-selecting");
    const destination = new THREE.Vector3(
      this.playerFeet.x,
      this.playerFeet.y + this.eyeHeight,
      this.playerFeet.z
    );
    this.animateEntry(this.camera.position.clone(), destination);
  }

  /**
   * Animates the camera into a validated first-person destination and activates Walk Mode at completion.
   * @param {THREE.Vector3} start - Current camera position before entering the selected space.
   * @param {THREE.Vector3} end - Validated eye position inside the selected space.
   */
  animateEntry(start, end) {
    const duration = 720;
    const startedAt = performance.now();
    const step = () => {
      if (this.mode !== "transitioning") return;
      const t = Math.min((performance.now() - startedAt) / duration, 1);
      const eased = t * t * (3 - 2 * t);
      this.camera.position.copy(start).lerp(end, eased);
      if (t < 1) {
        requestAnimationFrame(step);
        return;
      }
      this.camera.position.copy(end);
      this.mode = "active";
      this.applyLookRotation();
      this.setStatus("Entered space · WASD to move · Mouse to look · Esc to return to Section View.");
      this.requestPointerLockIfDesktop();
    };
    requestAnimationFrame(step);
  }

  /**
   * Handles a viewer click for starting-point selection or surface traversal.
   * @param {MouseEvent} event - Click event originating in the viewer.
   */
  handleViewerClick(event) {
    if (event.target.closest("button, input, select, label")) return;
    if (this.mode === "selecting") {
      this.selectStartingPoint(event.clientX, event.clientY);
      return;
    }
    if (this.mode === "active") {
      if (window.matchMedia("(pointer: fine)").matches && document.pointerLockElement !== this.renderer.domElement) {
        this.requestPointerLockIfDesktop();
        return;
      }
      const now = performance.now();
      if (now - this.lastTouchTap < 330) {
        this.trySurfaceTraversal(event.clientX, event.clientY);
      }
      this.lastTouchTap = now;
    }
  }

  /**
   * Raycasts the chosen screen point and accepts only an upward-facing model surface.
   * @param {number} clientX - Pointer X coordinate in viewport pixels.
   * @param {number} clientY - Pointer Y coordinate in viewport pixels.
   */
  selectStartingPoint(clientX, clientY) {
    const model = this.getModel();
    if (!model) return;
    this.setPointerFromClient(clientX, clientY);
    this.raycaster.near = 0;
    this.raycaster.far = Infinity;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(model, true);
    const floorHit = hits.find((hit) => {
      if (!hit.object.isMesh || !hit.face) return false;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
      return worldNormal.y > 0.68;
    });

    if (!floorHit) {
      this.setStatus("That point is not a detectable upward-facing floor surface. Choose another location.");
      return;
    }

    const bounds = this.getBounds();
    if (!bounds || !bounds.containsPoint(floorHit.point)) {
      this.setStatus("The selected point is outside the building bounds. Choose another location.");
      return;
    }

    this.playerFeet.copy(floorHit.point);
    this.modelMeshes = [];
    model.traverse((object) => {
      if (object.isMesh && object.visible) this.modelMeshes.push(object);
    });
    this.estimateInitialDirection(floorHit.point);
    this.camera.position.set(this.playerFeet.x, this.playerFeet.y + this.eyeHeight, this.playerFeet.z);
    this.applyLookRotation();
    this.mode = "active";
    this.controls.enabled = false;
    this.controlsElement.classList.remove("hidden");
    this.viewerElement.classList.remove("walk-selecting");
    this.setStatus("Walk Mode active · WASD to move · Mouse to look · double-click/tap a surface to request traversal · Esc to exit.");
    this.requestPointerLockIfDesktop();
  }

  /**
   * Estimates a useful initial yaw by facing toward the nearest open direction toward the model centre.
   * @param {THREE.Vector3} point - Selected floor location in world coordinates.
   */
  estimateInitialDirection(point) {
    const directions = [];
    for (let index = 0; index < 16; index += 1) {
      const angle = (Math.PI * 2 * index) / 16;
      directions.push(new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)));
    }
    const origin = point.clone().add(new THREE.Vector3(0, 0.85, 0));
    let bestDirection = new THREE.Vector3(0, 0, -1);
    let bestClearance = -1;
    for (const direction of directions) {
      this.raycaster.set(origin, direction);
      this.raycaster.near = 0.05;
      this.raycaster.far = 2.5;
      const hits = this.raycaster.intersectObject(this.getModel(), true);
      const clearance = hits.length ? hits[0].distance : 2.5;
      if (clearance > bestClearance) {
        bestClearance = clearance;
        bestDirection = direction;
      }
    }
    this.yaw = Math.atan2(-bestDirection.x, -bestDirection.z);
    this.pitch = 0;
  }

  /**
   * Converts browser pointer coordinates into normalized device coordinates for Three.js raycasting.
   * @param {number} clientX - Pointer X coordinate in viewport pixels.
   * @param {number} clientY - Pointer Y coordinate in viewport pixels.
   */
  setPointerFromClient(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Applies the stored yaw and pitch to the first-person camera without moving its position.
   */
  applyLookRotation() {
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI * 0.48, Math.PI * 0.48);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  /**
   * Requests pointer lock after a user gesture when the browser supports desktop pointer lock.
   */
  requestPointerLockIfDesktop() {
    if (window.matchMedia("(pointer: fine)").matches && this.renderer.domElement.requestPointerLock) {
      this.renderer.domElement.requestPointerLock();
    }
  }

  /**
   * Tracks pointer-lock changes so mouse-look state remains consistent with the browser.
   */
  handlePointerLockChange() {
    if (document.pointerLockElement !== this.renderer.domElement && this.mode === "active") {
      this.setStatus("Walk Mode active · click the model to resume mouse-look. WASD to move · Esc to exit.");
    }
  }

  /**
   * Updates first-person yaw and pitch from relative mouse movement while pointer lock is active.
   * @param {MouseEvent} event - Browser mouse movement event.
   */
  handleMouseLook(event) {
    if (this.mode !== "active" || document.pointerLockElement !== this.renderer.domElement) return;
    this.yaw -= event.movementX * 0.0022;
    this.pitch -= event.movementY * 0.0022;
    this.applyLookRotation();
  }

  /**
   * Records a movement key and prevents browser scrolling while walking.
   * @param {KeyboardEvent} event - Keyboard key-down event.
   */
  handleKeyDown(event) {
    if (this.mode === "orbit" || this.mode === "panorama") return;
    if (event.key === "Escape") {
      if (this.mode === "selecting") this.cancelStartSelection();
      else this.exitWalkMode();
      return;
    }
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      event.preventDefault();
      this.keys.add(key);
    }
  }

  /**
   * Removes a released movement key from the active key set.
   * @param {KeyboardEvent} event - Keyboard key-up event.
   */
  handleKeyUp(event) {
    this.keys.delete(event.key.toLowerCase());
  }

  /**
   * Starts a touch-look gesture on the mobile/tablet look area.
   * @param {PointerEvent} event - Pointer-down event on the touch look area.
   */
  handleTouchLookStart(event) {
    if (this.mode !== "active") return;
    this.lookPointerId = event.pointerId;
    this.lastLookX = event.clientX;
    this.lastLookY = event.clientY;
    this.lookArea.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  /**
   * Applies touch drag deltas to the first-person yaw and pitch.
   * @param {PointerEvent} event - Pointer movement event on the look area.
   */
  handleTouchLookMove(event) {
    if (this.mode !== "active" || event.pointerId !== this.lookPointerId) return;
    this.yaw -= (event.clientX - this.lastLookX) * 0.006;
    this.pitch -= (event.clientY - this.lastLookY) * 0.006;
    this.lastLookX = event.clientX;
    this.lastLookY = event.clientY;
    this.applyLookRotation();
    event.preventDefault();
  }

  /**
   * Ends a touch-look gesture and clears its pointer tracking state.
   * @param {PointerEvent} event - Pointer-up or pointer-cancel event.
   */
  handleTouchLookEnd(event) {
    if (event.pointerId === this.lookPointerId) this.lookPointerId = null;
  }

  /**
   * Begins tracking the virtual joystick and captures the pointer for continuous movement input.
   * @param {PointerEvent} event - Pointer-down event on the joystick.
   */
  handleJoystickStart(event) {
    if (this.mode !== "active") return;
    this.joystick.setPointerCapture(event.pointerId);
    this.updateJoystickVector(event);
    event.preventDefault();
  }

  /**
   * Updates joystick movement while its pointer is dragged.
   * @param {PointerEvent} event - Pointer movement event on the joystick.
   */
  handleJoystickMove(event) {
    if (this.mode !== "active" || !this.joystick.hasPointerCapture(event.pointerId)) return;
    this.updateJoystickVector(event);
    event.preventDefault();
  }

  /**
   * Converts joystick pointer position into a normalized two-axis movement vector.
   * @param {PointerEvent} event - Pointer event used to calculate joystick displacement.
   */
  updateJoystickVector(event) {
    const rect = this.joystick.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const radius = rect.width * 0.34;
    const vector = new THREE.Vector2(dx / radius, dy / radius);
    if (vector.length() > 1) vector.normalize();
    this.joystickVector.copy(vector);
    this.joystickKnob.style.left = `${50 + vector.x * 34}%`;
    this.joystickKnob.style.top = `${50 + vector.y * 34}%`;
  }

  /**
   * Resets joystick input and returns its knob to the centre when the gesture ends.
   * @param {PointerEvent} event - Pointer-up or pointer-cancel event.
   */
  handleJoystickEnd(event) {
    if (this.joystick.hasPointerCapture(event.pointerId)) this.joystick.releasePointerCapture(event.pointerId);
    this.joystickVector.set(0, 0);
    this.joystickKnob.style.left = "50%";
    this.joystickKnob.style.top = "50%";
  }

  /**
   * Moves the player for one frame using keyboard/joystick input and conservative collision checks.
   * @param {number} deltaSeconds - Time elapsed since the previous animation frame.
   */
  update(deltaSeconds) {
    if (this.mode !== "active") return;
    const forwardInput = (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0)
      - (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) - this.joystickVector.y;
    const sideInput = (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0)
      - (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0) + this.joystickVector.x;
    if (Math.abs(forwardInput) < 0.001 && Math.abs(sideInput) < 0.001) return;

    const speed = this.keys.has("shift") ? this.fastSpeed : this.walkSpeed;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = forward.multiplyScalar(forwardInput).add(right.multiplyScalar(sideInput));
    if (move.lengthSq() > 1) move.normalize();
    move.multiplyScalar(speed * Math.min(deltaSeconds, 0.05));

    const current = this.playerFeet.clone();
    const nextX = current.clone();
    nextX.x += move.x;
    if (this.canMoveTo(nextX)) this.playerFeet.x = nextX.x;
    const nextZ = this.playerFeet.clone();
    nextZ.z += move.z;
    if (this.canMoveTo(nextZ)) this.playerFeet.z = nextZ.z;

    this.camera.position.set(this.playerFeet.x, this.playerFeet.y + this.eyeHeight, this.playerFeet.z);
  }

  /**
   * Checks horizontal clearance and nearby floor support before accepting a candidate player position.
   * @param {THREE.Vector3} candidate - Candidate feet position in world coordinates.
   * @returns {boolean} True when the candidate is conservatively considered traversable.
   */
  canMoveTo(candidate) {
    const model = this.getModel();
    if (!model) return false;
    const bounds = this.getBounds();
    if (!bounds || !bounds.containsPoint(new THREE.Vector3(candidate.x, this.playerFeet.y, candidate.z))) return false;

    const bodyOrigin = new THREE.Vector3(candidate.x, candidate.y + 0.85, candidate.z);
    const directions = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0.707, 0, 0.707), new THREE.Vector3(-0.707, 0, 0.707),
      new THREE.Vector3(0.707, 0, -0.707), new THREE.Vector3(-0.707, 0, -0.707)
    ];
    for (const direction of directions) {
      this.raycaster.set(bodyOrigin, direction);
      this.raycaster.far = this.playerRadius + 0.12;
      const obstacle = this.raycaster.intersectObject(model, true).find((hit) => hit.distance > 0.025);
      if (obstacle) return false;
    }

    const floorOrigin = new THREE.Vector3(candidate.x, candidate.y + this.stepHeight + 0.12, candidate.z);
    this.raycaster.set(floorOrigin, new THREE.Vector3(0, -1, 0));
    this.raycaster.far = this.stepHeight + this.maxDrop + 0.12;
    const floorHit = this.raycaster.intersectObject(model, true).find((hit) => {
      if (!hit.face) return false;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
      return hit.face.normal.clone().applyMatrix3(normalMatrix).normalize().y > 0.55;
    });
    if (!floorHit) return false;
    const elevationDelta = floorHit.point.y - this.playerFeet.y;
    if (elevationDelta > this.stepHeight || elevationDelta < -this.maxDrop) return false;
    this.playerFeet.y = floorHit.point.y;
    return true;
  }

  /**
   * Attempts a safe, short traversal through a clicked surface to a validated point on its opposite side.
   * @param {number} clientX - Pointer X coordinate in viewport pixels.
   * @param {number} clientY - Pointer Y coordinate in viewport pixels.
   */
  trySurfaceTraversal(clientX, clientY) {
    const model = this.getModel();
    if (!model) return;
    this.setPointerFromClient(clientX, clientY);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.raycaster.far = 5;
    const hit = this.raycaster.intersectObject(model, true).find((item) => item.object.isMesh && item.face);
    if (!hit) return;

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    const normal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
    if (Math.abs(normal.y) > 0.72) {
      this.setStatus("Surface traversal is only available through vertical surfaces, not floors or ceilings.");
      return;
    }

    const directionToSurface = hit.point.clone().sub(this.camera.position).setY(0).normalize();
    if (directionToSurface.lengthSq() < 0.001) return;
    const side = Math.sign(this.playerFeet.clone().sub(hit.point).dot(normal)) || -1;
    const destination = hit.point.clone().addScaledVector(normal, -side * (this.playerRadius + 0.35));
    destination.y = this.playerFeet.y;

    if (!this.canMoveTo(destination)) {
      this.setStatus("Traversal blocked: the other side does not appear to have a clear, supported landing point.");
      return;
    }

    const start = this.playerFeet.clone();
    const end = destination.clone();
    end.y = this.playerFeet.y;
    this.playerFeet.copy(start);
    this.animateTraversal(start, end);
  }

  /**
   * Animates a short smooth transition between two already validated player positions.
   * @param {THREE.Vector3} start - Starting feet position.
   * @param {THREE.Vector3} end - Validated destination feet position.
   */
  animateTraversal(start, end) {
    const duration = 260;
    const startedAt = performance.now();
    const step = () => {
      if (this.mode !== "active") return;
      const t = Math.min((performance.now() - startedAt) / duration, 1);
      const eased = t * t * (3 - 2 * t);
      const candidate = start.clone().lerp(end, eased);
      this.playerFeet.copy(candidate);
      this.camera.position.set(candidate.x, candidate.y + this.eyeHeight, candidate.z);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /**
   * Cancels starting-point selection and restores the previous Orbit View state.
   */
  cancelStartSelection() {
    this.mode = "orbit";
    this.controls.enabled = true;
    this.controls.update();
    this.toggleButton.setAttribute("aria-pressed", "false");
    this.toggleButton.textContent = "Walk Mode";
    this.viewerElement.classList.remove("walk-selecting");
    this.setStatus("");
    this.statusElement.classList.add("hidden");
    if (this.onExit) this.onExit();
  }

  /**
   * Temporarily suspends active walking while a panorama is open, preserving the first-person camera and section state.
   */
  suspendForPanorama() {
    if (this.mode !== "active") return false;
    this.modeBeforePanorama = this.mode;
    this.mode = "panorama";
    this.keys.clear();
    this.joystickVector.set(0, 0);
    this.controlsElement.classList.add("hidden");
    if (document.pointerLockElement) document.exitPointerLock();
    this.setStatus("");
    this.statusElement.classList.add("hidden");
    return true;
  }

  /**
   * Resumes the preserved Walk Mode after the panorama closes without moving the camera or restoring orbit controls.
   */
  resumeAfterPanorama() {
    if (this.mode !== "panorama") return;
    this.mode = "active";
    this.controls.enabled = false;
    this.controlsElement.classList.remove("hidden");
    this.setStatus("Back in Walk Mode · WASD or the joystick to move · click the model to resume mouse-look.");
    this.requestPointerLockIfDesktop();
  }

  /**
   * Exits Walk Mode, releases pointer lock, restores the saved camera, and restores section state.
   */
  exitWalkMode() {
    if (this.mode === "orbit") return;
    const wasActive = this.mode === "active";
    this.mode = "orbit";
    this.keys.clear();
    this.joystickVector.set(0, 0);
    this.controlsElement.classList.add("hidden");
    this.viewerElement.classList.remove("walk-selecting");
    if (document.pointerLockElement) document.exitPointerLock();
    this.camera.position.copy(this.savedCameraPosition);
    this.camera.quaternion.copy(this.savedCameraQuaternion);
    this.controls.target.copy(this.savedTarget);
    this.controls.enabled = true;
    this.controls.update();
    this.toggleButton.setAttribute("aria-pressed", "false");
    this.toggleButton.textContent = "Walk Mode";
    this.setStatus("");
    this.statusElement.classList.add("hidden");
    if (this.onExit) this.onExit();
  }

  /**
   * Updates the transient Walk Mode status message without changing the model.
   * @param {string} message - Status text to display; empty text hides the message.
   */
  setStatus(message) {
    this.statusElement.textContent = message;
    this.statusElement.classList.toggle("hidden", !message);
  }
}
