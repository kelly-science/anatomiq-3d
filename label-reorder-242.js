/* AnatomIQ 2.2.42. Pure label order transformation; no geometry or label anchors change. */
export function reorderLabels(items, movedId, targetId, after = false) {
  if (!Array.isArray(items) || movedId == null || targetId == null || movedId === targetId)
    return { items, changed: false };
  const from = items.findIndex(label => label.id === movedId);
  const to = items.findIndex(label => label.id === targetId);
  if (from < 0 || to < 0) return { items, changed: false };
  const reordered = items.slice();
  const [moving] = reordered.splice(from, 1);
  const target = reordered.findIndex(label => label.id === targetId);
  reordered.splice(target + (after ? 1 : 0), 0, moving);
  const changed = reordered.some((label, i) => label !== items[i]);
  return { items: changed ? reordered : items, changed };
}
