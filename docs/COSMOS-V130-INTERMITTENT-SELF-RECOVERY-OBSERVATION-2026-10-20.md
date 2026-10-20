# COSMOS v130 — intermittent camera motion and spontaneous recovery

**Observation:** User reports that on repeated launches of the same COSMOS version, dragging Jupiter sometimes appears to move the entire solar system, and sometimes moves Jupiter as expected. In the most recent v130 session, the view returned to expected behavior **without any user action or reload**. A screenshot shows the cinematic solar system view, but a still image cannot prove the input path.

**Confirmed scope:** v130 diagnostic wrapper does not modify the camera or touch control logic. The base v075 engine contains a native iOS TouchEvent path which calls `turnCamera(dx*sx,-dy*sy)` on single-finger movement. This is a plausible camera-motion path, **not yet a proven cause** of the intermittent change.

**Important distinction:** The spontaneous change within a session weakens a simple hypothesis that only initial page load or deliberate cinema toggling explains the symptom. Time-dependent camera movement, automatic modes, gesture state, or competing handlers remain open possibilities.

**Next diagnostic:** Capture the v130 event log from the *same page instance* immediately before and after the apparent transition. Log whether `touchstart` targets the Jupiter image/label or `#sky`, and whether the camera HUD changes. Compare without editing the preserved v117 baseline, v128, or v129.

No fix or confirmed root cause claimed.
