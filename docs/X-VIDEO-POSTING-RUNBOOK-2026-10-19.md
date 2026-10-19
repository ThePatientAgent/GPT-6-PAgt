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
