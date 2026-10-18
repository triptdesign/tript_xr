/**
 * Black section-cap rendering for TRIPT XR.
 *
 * Uses the stencil-buffer technique: two invisible passes count the cut
 * contours, then a black plane fills the enclosed region. The source GLB
 * geometry and materials are not modified by this helper.
 */
export function createSectionCapSystem(THREE, scene, model, clippingPlane, bounds) {
  if (!THREE || !scene || !model || !clippingPlane || !bounds) return null;

  const size = Math.max(
    bounds.getSize(new THREE.Vector3()).length() * 2.5,
    10
  );
  const root = new THREE.Group();
  root.name = "TRIPT XR section cap render passes";
  root.visible = false;
  root.renderOrder = 1;
  scene.add(root);

  const stencilBase = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    depthTest: false,
    stencilWrite: true,
    stencilFunc: THREE.AlwaysStencilFunc,
    clippingPlanes: [clippingPlane]
  });

  const stencilBackFaces = stencilBase.clone();
  stencilBackFaces.side = THREE.BackSide;
  stencilBackFaces.stencilFail = THREE.IncrementWrapStencilOp;
  stencilBackFaces.stencilZFail = THREE.IncrementWrapStencilOp;
  stencilBackFaces.stencilZPass = THREE.IncrementWrapStencilOp;

  const stencilFrontFaces = stencilBase.clone();
  stencilFrontFaces.side = THREE.FrontSide;
  stencilFrontFaces.stencilFail = THREE.DecrementWrapStencilOp;
  stencilFrontFaces.stencilZFail = THREE.DecrementWrapStencilOp;
  stencilFrontFaces.stencilZPass = THREE.DecrementWrapStencilOp;

  // The stencil passes use world transforms so nested GLB meshes remain aligned.
  model.updateMatrixWorld(true);
  let stencilMeshCount = 0;
  model.traverse((object) => {
    if (!object.isMesh || !object.geometry || object.isInstancedMesh) return;

    for (const material of [stencilBackFaces, stencilFrontFaces]) {
      const stencilMesh = new THREE.Mesh(object.geometry, material);
      stencilMesh.name = `TRIPT section stencil ${stencilMeshCount}`;
      stencilMesh.matrixAutoUpdate = false;
      stencilMesh.matrix.copy(object.matrixWorld);
      stencilMesh.frustumCulled = false;
      stencilMesh.renderOrder = 1;
      root.add(stencilMesh);
      stencilMeshCount += 1;
    }
  });

  const capMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true,
    stencilWrite: true,
    stencilRef: 0,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.ReplaceStencilOp,
    stencilZFail: THREE.ReplaceStencilOp,
    stencilZPass: THREE.ReplaceStencilOp,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    toneMapped: false
  });

  const capMesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), capMaterial);
  capMesh.name = "TRIPT XR black section cap";
  capMesh.frustumCulled = false;
  capMesh.renderOrder = 2;
  scene.add(capMesh);

  const zAxis = new THREE.Vector3(0, 0, 1);
  const planePosition = new THREE.Vector3();

  function update(enabled = true) {
    root.visible = Boolean(enabled && stencilMeshCount > 0);
    capMesh.visible = Boolean(enabled && stencilMeshCount > 0);
    if (!enabled) return;

    // For a normalized plane, n·x + constant = 0; this point lies on the plane.
    planePosition.copy(clippingPlane.normal).multiplyScalar(-clippingPlane.constant);
    capMesh.position.copy(planePosition);
    capMesh.quaternion.setFromUnitVectors(zAxis, clippingPlane.normal.clone().normalize());
    capMesh.updateMatrixWorld(true);
  }

  function dispose() {
    scene.remove(root);
    scene.remove(capMesh);
    root.traverse((object) => {
      // Stencil meshes share the source model geometry; never dispose that geometry.
      if (object.isMesh) object.geometry = null;
    });
    capMesh.geometry.dispose();
    stencilBase.dispose();
    stencilBackFaces.dispose();
    stencilFrontFaces.dispose();
    capMaterial.dispose();
  }

  return { update, dispose, get stencilMeshCount() { return stencilMeshCount; } };
}
