# COSMOS v211 — living Pleiades and V13 accretion

The user approved the white-hot, 4x-speed v210 Sun, then requested a richer,
dynamically moving Pleiades and black hole using the two supplied photographs
as visual references. This release changes those two subjects only.

## Appearance and implementation

- Pleiades: replace the visible cached cloud sprites with four perspective
  samples through a world-space reflection-nebula volume. Seeded 3D noise,
  domain warping, blue scattered light, dark gaps and fine filaments evolve in
  the native animation loop. The existing camera, rigid cluster rotation,
  eleven primary-star coordinates and magnitudes remain unchanged. Blue-white
  emissive stellar cores, diffraction and 140 faint depth-projected stars are
  rendered in one additional batched pass.
- Black hole: retain the V13 source atlas, its 48-frame blend, gold radiance,
  black interior, extended wings, CSS mask, contour and approved framing.
  A WebGL pass changes emission at the original source coordinate, adding
  differentially rotating turbulence around the lensed ring and streaming
  filaments across the foreground disk. No source-coordinate deformation,
  translated copies, extra glow canvas or separate animation clock is used.
  This is an artistic emission model, not a new relativistic ray tracer.
- Shared code: `cosmos-rich-scenes-v211.js`, WebGL 1, locally seeded noise,
  no additional bitmap assets or rendering library. Both renderers use the
  existing requestAnimationFrame loops. Hidden subjects stop drawing.
- WebGL loss: Pleiades restores its native world-projected sprites; the black
  hole restores its original Canvas2D V13 renderer. Restoration switches back
  to the GPU. The black-hole DOM contains one playback canvas at a time.
- The Sun file is byte-identical to approved v210. Its white-hot palette and
  4x surface flow, all planets, camera movement, Orion, galactic center,
  captions, destination order and tour timing are retained.

## Verified

- Chromium, 390x844 at 2x, and 1440x900 at 1x: all five native tour stops,
  animated Pleiades, V13 black hole, black-hole-to-solar transition, Sun,
  tour completion and separate manual black-hole route passed.
- WebKit 18.4, 390x844 at 2x: the same tour and manual-route checks passed.
- All three runs compiled the new GPU renderers with WebGL error 0 and no
  JavaScript exceptions. The Sun retained its previous projected dimensions.
- Fixed camera/projection: Pleiades pixels evolve over time. Fixed V13 atlas
  phase: accretion pixels evolve over time. The shader adds actual animated
  structure independently of camera motion and the inherited source frames.
- Both GPU contexts were deliberately lost and restored. Native fallbacks
  displayed and GPU rendering returned. Reduced-motion procedural time froze.
- The manual-route smoke now explicitly waits for preparation before reading
  renderer state. The Pages workflow waits until public source bytes match
  the commit before testing the live tour, avoiding a previous-release race.
- The four-second video contains 60 distinct native Pleiades frames followed
  by 60 distinct black-hole frames at 780x1688, encoded at 30fps. Browser time
  was controlled during capture; this does not establish physical-device FPS.

Physical iPhone GPU performance, iOS Safari, battery use and thermals remain
unmeasured. Software-rendered Chromium and desktop WebKit are functional and
visual checks, not substitutes for measurements on the user's phone.

## Evidence and recovery

- `media/cosmos-rich-scenes-v211.mp4`: actual animated-renderer excerpt.
- `media/cosmos-rich-scenes-v211-comparison.jpg`: matched v210/v211 captures.
- `cosmos-rich-scenes-v211-validation.json`: recorded checks and limitations.
- `tools/cosmos-sun-v207-smoke.cjs`: reusable native tour/browser verification.
- Approved prior release: `da09f83e783afc8e63b49c39aef09297d3009bf2`.
  Restore the entry, universe engine, V13 HTML, smoke tool and its workflow
  from that commit in a subsequent commit to return to the approved v210
  release. The Sun itself needs no restoration.
