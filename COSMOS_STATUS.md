# COSMOS — technical and artistic checkpoint
Updated 2026-10-25 JST.

## Current continuation — 2026-10-25
Resume black-hole work from the V10 sharpness experiment, not the historical v060 universe baseline below.
Read [COSMOS_BLACKHOLE_HANDOFF_2026-10-25.md](COSMOS_BLACKHOLE_HANDOFF_2026-10-25.md) for the complete current state.
V11 prepares all 48 plasma frames once and plays one synchronized canvas; it replaces the 100 ms brightness overlay used in V10.
New experiment: docs/cosmos-cinema-blackhole-v11-native-20261025.html.
Direct scene: docs/cosmos-black-hole-native-plasma-v011.html.
The shared release docs/index.html and v069 engine remain intact.
Local cloud browser verified 48-frame preparation, advancing animation and the manual route; automatic third-stop source redirection was observed.
iPhone appearance/performance are unverified. The old checkpoint below is historical context.



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
