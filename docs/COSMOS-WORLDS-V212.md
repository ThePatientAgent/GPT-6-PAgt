# COSMOS v212 — coherent orbits, Orion and galactic center

The previous orbit graphics were screen-aligned CSS ellipses while planets
followed separately projected XYZ positions. Their tilts and perspective did
not agree. The new Solar System uses one orbital model for the paths and
planet centers, together with richer animated Orion and galactic-core scenes.

## Solar System

- Earth, Saturn and Neptune use nested, slightly eccentric Kepler ellipses.
  The Sun is the common focus; the near-coplanar basis is orthonormal. Outer
  bodies progress more slowly, with relative periods proportional to a^1.5.
  Distances remain compressed artistic world units, rather than AU or an
  accurate Solar System scale.
- The same world-space point function drives bodies and 128-segment SVG
  paths through the existing camera projection. Camera elevation, rotation
  and perspective now affect both identically. Legacy CSS orbit halves are
  disabled for the Solar System, including the obsolete fourth orbit.
- Back/front path segments have different brightness. A Sun-sized SVG mask
  suppresses diagram lines through the photosphere. Planet, Moon and Saturn
  ring layering follows depth relative to the Sun.
- Fixed orbital phases and spacing were composed for the short native tour.
  All three planets appear during the phone-view Solar stop. The approved
  close-up Sun and native camera movement remain; outer tracks can extend
  beyond the portrait viewport during this close flyby.

## Orion and galactic center

- `cosmos-worlds-v212.js` provides one additional WebGL 1 canvas shared by
  these two scenes, using the existing native animation loop.
- Orion: five perspective samples of an evolving 3D density field, warped
  fractal noise, ionization color, crimson/purple outer gas, a cyan-white
  center, fine rims and absorbing dust. Existing primary-star XYZ positions
  remain; faint stars add depth. Redundant native gas layers are suppressed
  only while this renderer is available.
- Galactic center: time-varying, differentially rotating spiral structure,
  blue/gold stellar emission, dust lanes, a thin-disk column approximation
  and a smoothly integrated luminous 3D bulge. Native background stars retain
  their existing world positions. This is an artistic emission model.
- GPU loss restores the original Orion clouds or galactic-core illustration.
  Restoring the context rebuilds both programs. Reduced-motion preference
  freezes procedural evolution. Hidden subjects stop drawing.
- The approved Sun, Pleiades renderer and V13 black-hole files are all
  byte-identical to v211. Native camera, fly/orbit control and tour sequencing
  functions also match the prior release.

## Verification

- Chromium at 390x844 @2x and 1440x900 @1x, plus WebKit 18.4 at 390x844 @2x:
  all five tour stops, both new scene programs, all three Solar planets,
  black-hole-to-Solar transition and manual V13 entry passed. No JavaScript
  exceptions or WebGL errors were observed.
- Actual DOM planet centers were compared with rendered SVG path samples
  in all three profiles. All errors were below one CSS pixel; mask bounds
  matched the viewport and its solar exclusion covered the photosphere.
- `tools/cosmos-orbits-v212-test.cjs` verifies orthonormal planes, nested
  tracks, common focus, closed periods, equal swept areas and slower outer
  orbits. This test also runs in the deployed-browser workflow.
- Both new modes changed pixels with a fixed camera, passed deliberate GPU
  loss/restoration with visible native fallbacks, and froze procedural time
  under reduced-motion preference.
- The six-second H.264 clip contains 60 distinct native Orion frames, 60
  Solar frames and 60 galactic-core frames, at 780x1688 encoded at 30fps.
  Controlled capture clocks do not measure physical-device frame rate.

Physical iPhone GPU frame times, iOS Safari performance, thermals and battery
use have not been measured. Desktop WebKit verifies the browser engine and
phone viewport, rather than an actual iPhone GPU.

Evidence: `cosmos-worlds-v212-validation.json`,
`media/cosmos-worlds-v212-comparison.jpg`, and
`media/cosmos-worlds-v212.mp4`. Comparison captures use the same phone viewport
and native tour; their precise capture instants differ slightly.

Approved prior release: `becb3510c15e63e580ca8fc46d6f8e6f389aa8f5`.
To return to v211, restore its entry, universe engine, smoke tool and workflow
in a subsequent commit. The approved Sun, Pleiades and V13 files require no
restoration.
