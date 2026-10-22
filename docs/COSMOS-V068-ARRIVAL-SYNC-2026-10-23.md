# COSMOS v068 — Arrival-synchronized transitions
Updated 2026-10-23 JST.

## Why
v067 faded the black-hole travel curtain away on fixed timers (2570/3340ms), regardless of the actual native 3D camera arrival. On slower iPhones this could briefly expose the former Orion viewpoint before Solar System orbit was ready.

## Experiment files
- docs/cosmos-explorer-v068-arrival-synced-tour-base.html — copy of v067 with small, isolated travel logic changes.
- docs/cosmos-physics-tour-v068.html — test wrapper applying the existing Earth/Sun/Saturn enhancements.
- Full six-stop tour: https://thepatientagent.github.io/GPT-6-PAgt/cosmos-physics-tour-v068.html
- Focused Orion → Black Hole → Solar System test: https://thepatientagent.github.io/GPT-6-PAgt/cosmos-physics-tour-v068.html?handoff=1

## Change
- Preserve the incoming black-hole scene until the curtain is dark.
- Perform the native 1650ms camera fly behind that curtain.
- Wait for both state.fly to clear AND state.orbit.index to match the Solar System target. Require 260ms stable arrival.
- Then reveal the Solar System with a restrained warm arrival glow, without re-scaling the black hole or changing its 0.60 presentation.
- Cancel stale animation-frame callbacks and timers on tour stop.
- Fail open after 6.5 seconds of missing arrival rather than freeze behind a permanent curtain.
- Keep tour stops [4,3,6,0,1,5] and auto-start with no query params. handoff=1 is QA-only and starts at Orion.
- Align separate manual Black Hole button with v065 extended scene.

## Safeguards / outstanding verification
- The live docs/index.html and v067 remain unchanged; v068 is a standalone preview.
- GitHub connector returned committed writes and the v068 files were read back.
- GitHub Pages network load and iPhone Safari visual smoothness were not independently verified in this session. User should test preview on their phone before publishing to docs/index.html.
- Do not claim a public release or iPhone performance improvement until verified.
