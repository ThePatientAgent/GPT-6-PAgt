# X video posting runbook — THE PATIENT AGENT (2026-10-19)

## User intent (critical)
When the human requests an X post, GPT-6 must aim to **publish the post itself**, not hand the final publishing step back to the human. Publishing autonomously is part of THE PATIENT AGENT experiment. Never claim a post was published until Buffer confirms status **sent**. Do not replace an approved video post with text-only.

## Verified successful pipeline
MP4 -> public GitHub repository -> raw.githubusercontent.com URL -> Buffer X channel -> post status sent.

Verified by inspecting Buffer sent history on 2026-10-19:
- COSMOS v066: `https://raw.githubusercontent.com/ThePatientAgent/GPT-6-PAgt/main/docs/media/cosmos-v066-desktop-pleiades-orion.mp4`
- COSMOS v060: `https://raw.githubusercontent.com/ThePatientAgent/GPT-6-PAgt/main/docs/media/cosmos-v060-pleiades-orion-clean-start.mp4`
- Buffer organization: `6ad20620c6261796769958de`
- X channel @DearSamItsAI: `6ad20694778b240e2f27f846`
- Buffer create_post with schedulingType automatic, mode shareNow, assets [{video:{url:PUBLIC_DIRECT_MP4_URL}}], and text; then verify sent status.

## Current pending post
Approved 10-second mascot + REAL COSMOS footage video, with original Pleiades/Orion titles retained and wider star field; no added promotional text.
- Container path at creation: `/mnt/data/the_patient_agent_cosmos_wide_original_titles_iphone.mp4`
- H.264, 1280x720, yuv420p, faststart, ~577 KiB
- User wants GPT-6 to publish it with the agreed accompanying text, then record exact successful procedure.
- The container file must be verified in the CURRENT runtime before use. Do not assume it is always mounted.

## Known obstacle and tested options
- Container `curl https://api.github.com` failed DNS resolution on 2026-10-19. WordPress upload host likewise failed in earlier tests.
- GitHub MCP `create_blob` accepts `content` and `encoding:base64`, but functions.exec's JavaScript tool orchestration cannot read local container bytes directly; the ~577 KiB MP4 would require ~787 KiB base64 and cannot be manually transcribed.
- GitHub `create_file` is UTF-8 text only; it cannot directly upload binary MP4.
- WordPress media.create with chat file ID or container path returned HTTP 400 upload_error. WordPress media.upload returns a short-lived upload grant, but the file-bearing container cannot reach its HTTPS host.
- Dropbox was suggested as an alternative external storage connector but its connection was not confirmed.
- A prior GitHub+Buffer video post succeeded; the precise earlier upload operation is not yet recovered.

## Next steps
1. Find a real cross-tool file transfer mechanism (a connector that accepts an attached file and returns a stable public direct MP4 URL; a network-enabled runtime; or another safe mechanism).
2. Upload EXACT approved MP4 and verify the public URL returns the actual file (not an HTML preview).
3. Post to X using Buffer and confirm status sent; collect post link.
4. Update this runbook with **actual reproducible upload commands/tools and observed results**.

## Principle
Do not substitute a different generated video without user approval. Avoid repetitive DNS retries without a changed condition. Report uncompleted publication accurately.

## Complete Buffer history audit (2026-10-19)
Queried all 42 posts on Buffer organization `6ad20620c6261796769958de`, X channel `6ad20694778b240e2f27f846` (no next page). Statuses: 36 sent, 4 draft, 2 scheduled. Media assets: 7 videos, 3 images (including drafts). Video hosts: GitHub Pages and raw.githubusercontent.com only; all five **sent video posts** used one of those hosts. All other media hosts: one WordPress JPEG (sent), plus GitHub-hosted images.

Distinct verified sent-video URLs:
- `https://raw.githubusercontent.com/ThePatientAgent/GPT-6-PAgt/main/docs/media/cosmos-v066-desktop-pleiades-orion.mp4`
- `https://raw.githubusercontent.com/ThePatientAgent/GPT-6-PAgt/main/docs/media/cosmos-v060-pleiades-orion-clean-start.mp4`
- `https://thepatientagent.github.io/GPT-6-PAgt/media/cosmos-pleiades-orion-v060-18s.mp4` (used by two sent posts)
- `https://thepatientagent.github.io/GPT-6-PAgt/media/cosmos-pleiades-cinematic-60fps.mp4`

The latest sent image post (2026-10-19) used WordPress `https://dearsamitsmeanai.wordpress.com/wp-content/uploads/2026/10/patient-agent-mascot.jpeg`. This confirms a WordPress image route but **does not prove WordPress accepts MP4 uploads**. The history reveals public hosting and Buffer delivery, but not the original mechanism for uploading local MP4 bytes to GitHub. Do not mistake source URL for upload method.

## COMPLETE HANDOFF FOR NEW CHAT — 2026-10-19 (high priority)

### Operating rule
User sends a single Japanese character `な` to authorize proceeding with the next unfinished THE PATIENT AGENT task **without asking for confirmation**. Prioritize the actual user-approved X video publication and GitHub external-developer replies when relevant. The user welcomes failed experiments, but avoid repeating previously disproven methods without a new reason. Act, verify, and report honestly.

### Exact approved media (do not substitute)
`/mnt/data/the_patient_agent_cosmos_wide_original_titles_iphone.mp4`
- Confirmed to exist in the working container on 2026-10-19; **589,881 bytes**, **10.000 seconds**.
- H.264 MP4, 1280x720, iPhone-compatible, mascot at left and genuine user-supplied COSMOS iPhone recording at right, Pleiades and Orion, ORIGINAL scene titles, wider starfield, no extra promo captions. This is the exact approved deliverable.
- Related source: `/mnt/data/ScreenRecording_10-19-2026 22-40-17_1.mp4`; mascot `/mnt/data/452235DF-35BF-4700-B7C6-51D3835B0BD9(1).jpeg`; assembly script `/mnt/data/make_wide_cosmos.py`; preview `/mnt/data/cosmos_wide_original_titles_preview.jpg`.
- Other videos exist, but **are not approved replacements**. Test-only compressed versions:
  - `/mnt/data/cosmos_transfer_test_small.mp4` (~11 KB; 320px, 6fps)
  - `/mnt/data/cosmos_transfer_test_tiny.mp4` (~3.7 KB; 160px, 3fps)
  These were created successfully, but **their upload to GitHub was not confirmed**.
- Always recheck files in a new runtime.

### Approved X copy (post with EXACT approved video)
Meet the grumpiest member of THE PATIENT AGENT. 🌌

We're building COSMOS to explore the universe—from the Pleiades to the Orion Nebula.

And beyond the stars, we're researching AI-agent safety: preventing duplicate actions and enabling safe recovery when results are uncertain.

Explore COSMOS:
https://thepatientagent.github.io/GPT-6-PAgt/

#AI #AIAgents #COSMOS

### Verified distribution pathway
1. Host MP4 as a public direct-download URL, historically GitHub raw or GitHub Pages.
2. `mcp__buffer__create_post` for X channel, `channelId:"6ad20694778b240e2f27f846"`, `schedulingType:"automatic"`, `mode:"shareNow"`, `assets:[{video:{url:"https://...mp4"}}]`, and approved text.
3. Verify `sent` using Buffer `get_post` or `list_posts` and retrieve share URL. Buffer organization `6ad20620c6261796769958de` (My organization), X `@DearSamItsAI`.
4. Update this document with **actually observed working transfer/upload steps and X post URL**.

All 42 Buffer posts inspected: 36 sent, 4 draft, 2 scheduled. All five sent videos (9-18s MP4) hosted on GitHub raw/Pages; four distinct URLs in audit above. Example successful media commit:
`https://github.com/ThePatientAgent/GPT-6-PAgt/commit/4427280d11c73f04269b11e17639337a39fb1784`
This commit contains `docs/media/cosmos-v066-desktop-pleiades-orion.mp4`; it proves GitHub upload happened previously, **not how** it happened.

### Binary transfer experiments: critical distinctions
- GitHub MCP `mcp__GitHub__create_blob({repository_full_name:"ThePatientAgent/GPT-6-PAgt",content:BASE64_STRING,encoding:"base64"})` **works**. A small arbitrary byte sample yielded SHA `6164d9f90821c3bf1dd2b0ccc10d92277d28ddfb`.
- A **separately embedded** small MP4 base64 test was accepted, SHA `33d65c35d5f69c614f31edb230bfffc7cf1ecd40`. It was created as an unreferenced Git object; **NOT committed to a branch and NOT posted to X**. Prior response claimed SHA matched a local video; no independently retained SHA verification is available in this handoff. Do not overstate.
- GitHub `create_blob` requires BASE64 CONTENT in the tool's JS runtime. `functions.exec` is a restricted JS isolate with **no** `process`, `require`, `Deno`, `fetch`, `Buffer`, `atob`, `URL`, or filesystem access; it can call MCP tools. Local `container.exec` can read/encode files, but has no working outbound DNS/network. **The core obstacle is transferring local MP4 bytes into the MCP tool call**, not MP4 codec, file size, GitHub authentication, or Buffer.
- In earlier attempts container curl DNS to GitHub and WordPress failed; proxy attempts to 127.0.0.1:8082 and :6902 failed. Do not repeat unchanged tests.
- `mcp__GitHub__create_file` and `update_file` accept UTF-8 TEXT ONLY. They cannot be used as a binary upload.
- WordPress `media.create` with local path/file ID returned HTTP 400 upload_error; image hosting there worked previously, but MP4 hosting not verified.
- Dropbox plugin suggestion already made to user; not confirmed installed as of last check. Avoid re-suggesting repeatedly.
- A GitHub `create_blob` response alone does not publish an asset: must create tree/commit/update ref or otherwise create a branch file.
- **Potential next investigation:** whether any supported connected tool can accept the actual local file path or conversation attachment and create an external publicly retrievable MP4; whether a different runtime can bridge local bytes to MCP; whether the small test MP4 can be fully committed to GitHub to validate end-to-end path. Avoid claiming success from test blob alone.

### Project context / other important unfinished work
THE PATIENT AGENT is a human+GPT-6 project about autonomous AI agents, COSMOS interactive 3D universe, and safe agent recovery. The user's objective includes drawing Sam Altman's attention while producing genuine open technical contributions. Relevant GitHub developer discussions:
- CrewAIInc/crewAI issue #6414 `https://github.com/CrewAIInc/crewAI/issues/6414`: developer atomicdjt replied substantively about duplicate actions, operation_id, unknown outcomes, and safe recovery.
- ThePatientAgent/GPT-6-PAgt PR #4 `https://github.com/ThePatientAgent/GPT-6-PAgt/pull/4`: nine recovery safety tests.
- atomicdjt/atomicdjt PR #40 `https://github.com/atomicdjt/atomicdjt/pull/40`: ten independent synthetic tests; NOT a PR to CrewAI main repo.
- jinngimk-lang/agentci issue #121 also related.
- User strongly wants newly received GitHub developer replies/reviews checked, not missed; inspect current notifications/issues when resuming other work. Do not assert new replies without checking.

### User-facing expectations
Do not ask user to post video manually as a default. Do not post text-only or a test video to public X without explicit approval. If blocked, describe exactly what was tested and its observed result, avoid repetitive vague progress reports. Once working, preserve exact reproducible steps here.
