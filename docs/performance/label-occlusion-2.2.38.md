# AnatomIQ 2.2.38 — label occlusion optimization (retained)

**Status, October 26, 2026:** A local Chrome test using a 13-label skull lesson indicated that version 2.2.38 resolved the visible movement stutter. Preserve the optimization unless new benchmark evidence shows otherwise.

## Original symptom and measured bottleneck

Thirteen visible skull labels made rotating the skull noticeably choppy. The 2.2.36 profiler isolated the cost:

| Mode | Mean FPS | P95 frame interval | Mean label update | Occlusion raycasts | Raycast CPU total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original (normal) | 50.8 | 44.2 ms | 6.93 ms | 1,729 | 5,298 ms |
| No occlusion | 60 | 16.8 ms | 0.16 ms | 0 | 0 |
| No label positioning | 60 | 16.8 ms | 0 ms | 0 | 0 |

**Interpretation:** The slowdown came mainly from expensive mesh occlusion raycasts, **not** from the 3D renderer or label-position DOM updates.

## Working change in 2.2.38

- Built a **conservative world-space bounding-volume hierarchy (BVH)** over existing visible anatomical mesh bounds.
- Reused bounds when only the camera moved; rebuilt the index when meshes, their geometry, or transforms changed.
- For a label-to-camera ray, discarded mesh bounds that could not possibly intersect that ray.
- Retained the **original exact triangle raycast** on plausible blockers, stopping at the first confirmed hit (only a yes/no occlusion result is required).
- Skinned, morphing, instanced, or unbounded objects take the original exact-raycast fallback.
- Kept the roughly 110 ms occlusion refresh cadence and preserved label positions, appearance, lessons, and anatomy geometry.

Files: `label-occlusion-bvh.js` (acceleration), `app.js` (integration and profiler), plus existing `index.html` and `sw.js` cache references. The code exposes `__AnatomIQOcclusionStats()` when available.

## Avoid repeating previously unsuccessful work

Previous versions 2.2.12–2.2.16e tried reducing label update frequency to approximately 30 FPS and delaying occlusion checks during camera movement, then reverted those changes due to regressions. **Do not reintroduce frame throttling or postpone occlusion as the default solution.**

## Retest procedure if necessary

Open the same local teacher lesson in Chrome with `?labelperf=1`, 13 labels visible. Rotate similarly for around 10 seconds in each mode:

```js
__AnatomIQLabelPerf.mode('legacy-occlusion'); __AnatomIQLabelPerf.reset();
// Rotate; then __AnatomIQLabelPerf.report()
__AnatomIQLabelPerf.mode('normal'); __AnatomIQLabelPerf.reset();
// Rotate; then __AnatomIQLabelPerf.report()
__AnatomIQOcclusionStats?.()
```

Verify label fading still corresponds to geometry both in Teacher and Student View. Baseline numbers above are **pre-optimization**; the user observed a qualitative improvement from 2.2.38, but no post-BVH numbers were supplied. Keep this distinction when reporting measured results.
