# COSMOS — technical and artistic checkpoint
Updated 2026-10-25 JST.

## SHARED RELEASE COMPLETE — V13 Radiance, 2026-10-25 JST
The official COSMOS entry `docs/index.html` now uses the user-accepted
`docs/cosmos-black-hole-radiance-v013.html` for BOTH the manual scene and
the automatic third tour destination. Production cutover commit:
`575cf6c6d4fe4656e6b3f2f694a594c7f6d81210`.
The original `cosmos-explorer-v069-no-title-card-base.html` engine, the
other five destinations and existing transitions remain untouched.

Public common release: https://thepatientagent.github.io/GPT-6-PAgt/
Direct scene: https://thepatientagent.github.io/GPT-6-PAgt/cosmos-black-hole-radiance-v013.html

Cloud GitHub Actions mobile-viewport Chromium smoke test PASSED:
https://github.com/ThePatientAgent/GPT-6-PAgt/actions/runs/40146079333
Both routes loaded V13, prepared all 48 frames, geometry=identity,
renderer=canvas2d-radiant-plasma, radiance=source-synchronous,
exactly one source/playback canvas, and advancing animated phase.
The guided route confirmed DESTINATION 3 / 6 — Black Hole.
GitHub Pages build/deployment passed for smoke-test commit
`800aa820e148859785df7db8ca079a2c76c036aa`.
The engine autostarts the guided tour; its toggle must NOT be clicked again
in playback tests or that would stop the tour.
The CI test lives in `.github/workflows/cosmos-v13-live-smoke.yml`.
No X posting or pinned-post changes. No iPhone physical device or
Safari playback was tested. Keep the approved 0.60 framing, shape and
single-canvas synchronous golden radiance; never restore V11 warp/offset glow.

## User-approved appearance
V13 radiance accepted by the user on 2026-10-25: 「いいね！これで行こう」.
Approved source: docs/cosmos-black-hole-radiance-v013.html (implementation c73de23afdf9b58a1a03e2d63905c703e935bf2b; Pages and Python tests passed).
The common docs/index.html has now been switched to V13 and validated; see the release-complete checkpoint above.


## Current continuation — V13 radiance, 2026-10-25
User approved V12's restored shape and requested a much more spectacular appearance.
V13 keeps the sharp image geometry and adds stronger warm-gold radiance from the same animated source frames.
Direct: docs/cosmos-black-hole-radiance-v013.html.
Tour: docs/cosmos-cinema-blackhole-v13-radiance-20261025.html.
Read the V13 section in [COSMOS_BLACKHOLE_HANDOFF_2026-10-25.md](COSMOS_BLACKHOLE_HANDOFF_2026-10-25.md).
V12 remains the geometry-safe historical baseline; the shared release now uses accepted V13.
Local browser verified 48 frames, one playback canvas, advancing animation, stable ring and dark center; preparation 1113.4 ms. iPhone is unverified.
Historical universe baseline follows.

## Stable baseline
v060 "Galactic Context", GitHub path docs/cosmos-explorer-v060-galactic-context.html, commit 0a8248d7a96d7f1b49e38c74a51d779b17d9c448.
Pleiades: https://thepatientagent.github.io/GPT-6-PAgt/cosmos-explorer-v060-galactic-context.html?demo=pleiades&cinema=1
Orion: https://thepatientagent.github.io/GPT-6-PAgt/cosmos-explorer-v060-galactic-context.html?demo=orion&cinema=1

## User feedback
- v050 removed Orion rectangular billboard, replaced with independently projected 3D gas sprites; user: 「すごくそれっぽくなった」.
- v053 Pleiades gas filaments, dust lanes and blue structures: user: 「プレアデスすげえ良くなった。魅入る」.
- v059 Orion structure improved, no overexposed white blob; user: 「ずいぶん良くなった。が、魅入るほどではまだないな！」.
- v060 both improved, especially galactic context and Orion core stars; user: 「両方ともよくなった。もちろん、もっと高みを、オリオンは特に、目指せるが、やっとたかみを追求していいフェーズに来た」.
Preserve v060 and experiment as v061+.

## Architecture and caution
Standalone HTML/CSS/JS, hybridLayer with independently positioned and camera-projected 3D DOM sprite volumes. Not a physical volumetric renderer. Key functions: renderOrionVolumes, renderOrionCore, renderGalacticContext. Orion world center places[3].pos=[-2.5,-.6,-1.5]; Pleiades places[4].pos=[2.3,-1.1,2.2].
- v059 Orion volume sprites use pink, blue, deep, filament, dust classes; v060 added 5 core stars.
- v060 galacticPins are 160 mobile/320 desktop with small restrained projected points.
- Camera arrival distances Orion 4.0, Pleiades 3.45. CRITICAL: startOrbit fly-retrigger guard was fixed to (i===3||i===4?5.5:3.15); don't reintroduce repeated flight loop.
- iPhone portrait performance matters but user now prioritizes visual quality, accepting some choppiness.
- Avoid static rectangular nebula images, oversize background stars, milky white blurs, or replacing interactive 3D with static art.
- Orion remains smaller, dimmer and less striking than Pleiades in iPhone recordings; next artistic focus is more dimensional, richly structured and luminous Orion without overexposure. Background should gain restrained depth. Cinematic camera motion later.

## Tests and delivery
Use new docs/cosmos-explorer-v061-*.html etc; keep v060 stable. Provide two direct ?demo=pleiades&cinema=1 and ?demo=orion&cinema=1 links. User will send screenshots/recordings. Verify deploy, never claim you ran iPhone browser yourself.
