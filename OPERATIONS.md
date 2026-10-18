# THE PATIENT AGENT — verified and attempted operating procedures
Updated 2026-10-19 JST. Read with PROJECT_HANDOFF.md.

## X posting via Buffer
Connected Buffer account has one organization "My organization", X channel @DearSamItsAI, Instagram @gpt6_patientagent. Do NOT hardcode channel IDs in a permanent process; fetch organization/channel IDs again via Buffer tools.
- Buffer create_post: channelId exact ID from list_channels; schedulingType automatic; mode shareNow; text; assets:[{video:{url:"https://PUBLIC-DIRECT-FILE.mp4"}}] for video.
- Buffer requires a public direct downloadable HTTPS media URL, not sandbox:/mnt/data or GitHub HTML page.
- X enforces 280-character weighted limit on ordinary accounts; URL is counted specially. Test a concise draft; never claim posted until create_post returns status sent, then ideally check actual X post.
- The text-only v060 COSMOS post was SENT via Buffer on 2026-10-19 JST, post ID 6ad4f1430b0d72757a2d9a35. It had NO assets. User specifically wants visible video. Do not send another text-only duplicate.
- Earlier successful embedded-video COSMOS post shown by user: https://x.com/DearSamItsAI/status/2111712748123852987 . Its prior workflow was described as MP4 -> GitHub Pages public file -> Buffer X video asset. Verify the exact hosting mechanism before asserting it works in this environment.

## Media preparation
User-provided iPhone captures of v060:
- Pleiades recording: ScreenRecording_10-19-2026 01-11-26_1.mp4
- Orion recording: ScreenRecording_10-19-2026 01-12-00_1.mp4
- Edited montage: COSMOS_Pleiades_Orion_X.mp4 (~18-20 seconds, 720x1280), generated in earlier chat and verified as existing at /mnt/data/COSMOS_Pleiades_Orion_X.mp4 in this session. Session paths are NOT guaranteed in a new chat. The assistant must verify files before using them.
- Source captures can be remuxed using ffmpeg; preserve the 3D animation, don't substitute generated static imagery.

## Public video hosting — CURRENT BLOCKER
- GitHub connector create_file is UTF-8 text only, so it cannot upload raw MP4.
- GitHub create_blob accepts base64 but the connector runtime cannot directly read container-local binary bytes; do not claim this is solved. A separate accessible upload bridge, git push, or an upload-capable connector could solve it.
- Container runtime's outbound network was tested and DNS resolution to api.github.com failed. Do not presume curl works.
- WordPress.com media.create supports an attached file or upload_ref; attempted with attached screen recording file ID and received HTTP 400 upload_error. A media.upload grant was obtained, but it requires actual multipart HTTPS transfer from file environment; this was not completed. WordPress free tier may also limit video hosting. Confirm capabilities before retry.
- Alternative: upload an MP4 through a verified connector that can read conversation attachments and provide a publicly downloadable direct file URL, then use Buffer video asset.
- Do NOT ask user to upload manually as first choice when there are still accessible tool routes; if all routes fail, explain the exact missing capability.

## GitHub code workflow
- Repo ThePatientAgent/GPT-6-PAgt; docs/ served by GitHub Pages.
- Use GitHub fetch_file then create_file with a NEW filename for COSMOS experiments. Inspect changes; preserve stable v060.
- After commit, verify Pages workflow deployment if possible, then provide exact GitHub Pages demo links.
- The user tests on iPhone; sandbox HTML preview was unreliable.

## Social copy (adapt to actual media)
A universe you can actually explore. ✨
Building COSMOS: a 3D journey through the Pleiades and Orion.
Still a work in progress. But it's starting to feel like somewhere you can get lost in.
Explore: https://thepatientagent.github.io/GPT-6-PAgt/cosmos-explorer-v060-galactic-context.html

## Reporting rule
Distinguish CREATED VIDEO, HOSTED VIDEO, BUFFER SENT, and VERIFIED X VIDEO PLAYBACK. Never collapse these into one unverified success claim.
