# COSMOS v128 — iPhone field observation

Date: 2026-10-20. Source: user-provided screenshots and direct user feedback.

## Confirmed observations

- v127: Jupiter's generated cloud bands and Great Red Spot finally became visible after guarding the third satellite sprite against the base engine resetting its image source.
- v128: a screenshot shows the Jupiter bands and a more complex red spot in cinema mode.
- User reported that trying to move Jupiter appeared to move the whole solar system.
- User then reported the issue resolved **without doing anything**. Therefore the earlier suggestion that exiting cinema mode fixed it was incorrect; root cause is **unknown**.

## Engineering response

- Keep v117 as the verified smooth visual baseline and v127 as the proven Jupiter texture visibility milestone; preserve v128 as the current visual experiment.
- Do not claim a fix for the transient camera/control behavior.
- If reproduced, instrument camera state, cinema transitions, pointer target, drag handler, and animation/tour state before changing movement logic.
- Avoid adding per-frame diagnostic work to the stable version.

Status: observation documented; intermittent behavior not reproduced or fixed.
