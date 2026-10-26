# Label occlusion 2.2.38 — preserve this working optimization

**Observed in Chrome with 13 skull labels:** Original mode 50.8 FPS, p95 frame interval 44.2 ms, 1,729 occlusion raycasts totaling ~5,298 ms. With occlusion disabled, 60 FPS and 16.8 ms p95; positioning without occlusion was ~0.16 ms mean. A bounding-volume acceleration strategy (BVH/bounds culling then exact triangle checks for plausible blockers with early exit) in `label-occlusion-bvh.js` and `app.js` visibly resolved the lag.

Earlier 2.2.12 label-update throttling to ~30 FPS, deferred occlusion during rotation, and post-rotation batch checks were reverted in 2.2.16e after regressions. **Do not reintroduce these without controlled testing.** Retain accurate label alignment and occlusion during movement.

## 2.2.40 interaction addition

`teacher-tools-2240.js` implements a teacher-only drag selection overlay. Its pointer handling does not run when Orbit/Paint/Labels is active and does no work inside the animation frame. The `app.js` custom event handler projects mesh bounds and a bounded number of vertices **only on pointer release**, then uses existing temporary multi-selection highlighting. It does not change the BVH occlusion code, mesh ordering, label positions, or lesson serialization.

A selection rectangle is based on projected mesh geometry and does not perform per-pixel visibility testing, so complex overlapping meshes may sometimes be included even if partly behind another object. If needed, investigate an accelerated visible-surface-only pick path separately, with timing benchmarks against 13 labeled skull structures.
