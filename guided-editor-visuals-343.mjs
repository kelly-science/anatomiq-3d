/* ANATOMIQ_GUIDED_EDITOR_VISUALS_343 — local-only, activity-scoped 3D previews.
 * The shared viewer is reused. No original geometry, material, scene visibility,
 * student progress, or saved lesson data is mutated by the Identify overlay.
 */
export function createGuidedEditorVisuals343(THREE, api) {
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0x36e3c5,
    transparent: true,
    opacity: 0.44,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const overlays = [];
  let active = false, chapter = -1, selectedActivity = null;
  const currentSteps = () => api.getGuided()?.config?.chapters?.[api.getChapter()] || [];
  const currentPaint = () => active && chapter === api.getChapter() && selectedActivity?.type === 'label'
    ? selectedActivity : null;
  function clearIdentify() {
    for (const entry of overlays) entry.parent?.remove(entry.overlay);
    overlays.length = 0;
    api.invalidate?.();
  }
  function showIdentify(indices) {
    clearIdentify();
    const seen = new Set();
    for (const index of indices) {
      if (!Number.isInteger(index) || index < 0 || seen.has(index)) continue;
      seen.add(index);
      const target = api.getMesh(index);
      if (!target) continue;
      // A structure may be a mesh or a group of meshes. If the structure is
      // itself a mesh, do not color unrelated helper children attached to it.
      const geometryMeshes = [];
      if (target.isMesh && target.geometry) geometryMeshes.push(target);
      else target.traverse(node => {
        if (node.isMesh && node.geometry && !node.userData?.anatGuidedEditorOverlay343)
          geometryMeshes.push(node);
      });
      for (const parent of geometryMeshes) {
        const overlay = new THREE.Mesh(parent.geometry, highlightMaterial);
        overlay.name = 'Guided editor Identify preview (temporary)';
        overlay.userData.anatGuidedEditorOverlay343 = true;
        overlay.raycast = () => {}; // Never intercept anatomical picking.
        overlay.frustumCulled = parent.frustumCulled;
        overlay.renderOrder = (parent.renderOrder || 0) + 1;
        // Child coordinates are the geometry's local coordinates, matching the
        // parent mesh precisely even when its parent hierarchy is transformed.
        parent.add(overlay);
        overlays.push({parent, overlay});
      }
    }
    api.invalidate?.();
  }
  function clearPaint() { api.clearPaint?.(); }
  function stopBrush() {
    const guided = api.getGuided();
    if (guided?.isTeacherPainting?.()) guided.stopTeacherPainting?.();
  }
  function select(index) {
    const nextChapter = api.getChapter();
    const steps = currentSteps();
    const activity = Number.isInteger(index) ? steps[index] || null : null;
    const prior = selectedActivity;
    // Update scope BEFORE stopping paint: stopTeacherPainting renders the Guided
    // editor synchronously, and its render must not restore the old preview.
    active = true;
    chapter = nextChapter;
    selectedActivity = activity;
    if (api.getGuided()?.isTeacherPainting?.() &&
        (activity?.id !== prior?.id || activity?.type !== 'label')) stopBrush();
    if (activity?.type === 'label') {
      clearIdentify();
      api.showPaint?.(activity.paintRegions || []);
    } else if (activity?.type === 'identify') {
      clearPaint();
      const targets = Array.isArray(activity.targetStructures)
        ? activity.targetStructures : [activity.targetStructure];
      showIdentify(targets);
    } else {
      clearPaint();
      clearIdentify();
    }
  }
  function clear() {
    active = false;
    chapter = -1;
    selectedActivity = null;
    stopBrush();
    clearPaint();
    clearIdentify();
  }
  return Object.freeze({
    select, clear, currentPaint,
    get active() { return active; },
    get currentType() { return active ? selectedActivity?.type || null : null; },
    get overlayCount() { return overlays.length; }
  });
}
