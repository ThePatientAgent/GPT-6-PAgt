# COSMOS v213 — Black Hole handoff

The Orion → Black Hole handoff previously stopped the background before the iframe had a usable first frame. The iframe also prepared 48 full radiance frames on the device and uploaded the entire 3720×3360 atlas to the GPU. This could look frozen while preparing and increase iPhone memory pressure.

v213 uses the exact prepared V13 radiance pixels in a lossless WebP atlas, streams only the current/next 620×420 frames into two GPU textures, and waits for a drawn first frame before revealing the iframe. The two frame textures use 2,083,200 bytes, versus 49,996,800 bytes for the previous atlas texture (24× smaller). Output resolution follows the actual display size.

Orion continues rendering during loading and the fade. Background WebGL work pauses once the Black Hole is opaque. A real Solar System frame is drawn before uncovering it. A 12-second preparation timeout advances the tour if the asset cannot load. The approved V13 geometry, gold color, framing, animation field, Sun shader and tour camera path are preserved.

Validation: five-stop Chromium mobile tour and manual Black Hole route; normal real-time Chromium and WPE WebKit Black Hole → Solar transitions; intentionally held atlas keeps Orion moving and unrevealed until ready; exact lossless atlas pixel comparison; Kepler orbit tests. Reports are in `cosmos-black-hole-v213-validation.json`. WebKit heartbeat samples were unavailable; its advancing accretion phases and completed transition were verified. Physical iPhone performance is not measured.

The existing v212 commit `8ead5c7e060b6241a965834e02f1ddff6b550b1d` preserves the previous implementation for recovery. The v210 Sun remains unchanged.
