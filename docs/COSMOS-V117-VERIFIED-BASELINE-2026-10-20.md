# COSMOS v117 — user-verified stable baseline

Date: 2026-10-20 (JST)

## Confirmed by user on iPhone
- v111 visual appearance was correct/new.
- v115 and v116 looked old/regressed.
- v117 restored correct appearance.
- User reports no stuttering with v117.

## Protected baseline
- URL: https://thepatientagent.github.io/GPT-6-PAgt/cosmos-explorer-v117-verified-v111-baseline.html
- Source blob SHA: `73bd7ab9123d895df1bc05d9d42ceb0b795e467f`
- v117 is a copy of the user-verified v111 visual baseline with document title changed.
- Do not overwrite v117 or v111. Implement experiments in new versioned files.

## Next actions
1. Keep v117 as a control build for all future device A/B tests.
2. Prioritize improving celestial-body visual realism without touching journey mechanics or performance-critical loops.
3. Add one isolated change per experimental version, compare with v117 on the user's device, and roll back if beauty or smoothness worsens.
4. Avoid claiming FPS measurements or freeze-free guarantees without instrumented tests.
