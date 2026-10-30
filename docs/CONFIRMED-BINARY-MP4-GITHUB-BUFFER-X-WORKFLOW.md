# CONFIRMED WORKING — binary MP4 in ChatGPT -> GitHub -> Buffer -> X

**Last verified:** 2026-10-19 23:18 JST (14:18 UTC). **Status:** succeeded.  
**Use this as the canonical cross-tool file transfer procedure in future chats.**  
**NEVER repost the completed 2026-10-19 mascot video.** Publishing X posts requires the user's authorization for the particular content.

## Why this exists

The connected GitHub tool can create a Git blob from Base64 bytes, but cannot read the container filesystem. The container holds the MP4 but cannot necessarily connect to external hosts through outbound DNS. `functions.exec` is a restricted JS tool orchestration environment without filesystem access. The previously missing bridge is:

> **container-created Base64 text -> temporary ChatGPT Files Library artifact -> `files__read` within `functions.exec` -> GitHub `create_blob(encoding:"base64")`, with the large string never displayed to the model.**

The original MP4 **is not** replaced with a compressed sample, a different video, a still image, or text-only post.

## Step-by-step: exact working method

### 0. Preflight, identity, and duplicate protection

- Read `docs/X-VIDEO-POSTING-RUNBOOK-2026-10-19.md` and check Buffer sent history for the particular approved post.
- If the same video/post already has `status:"sent"`, **do not publish again**.
- Identify the exact approved video in Files Library via `files__list({surface:"library",recursive:true,...})` and use its real `file_id` (never invent one). Materialize from Library with `files__materialize({items:[{file_ref:{file_id:FILE_ID}}]})`.
- Verify the returned container path. The exact 2026-10-19 approved sample is `the_patient_agent_cosmos_wide_original_titles_iphone.mp4` (589,881 bytes, 10 s, H.264 1280x720). Future approved videos may differ.
- For this exact sample, the verified SHA-256 is `ad87884964116675bfba33ce6cf362ba46b5e3a03386b2158d2c7091f920aff2`; verified Git blob SHA `528544eb484e410947383eac000bf290afb0d489`. Record a SHA-256 and Git blob SHA for any other input.

### 1. Convert the original MP4 bytes into a temporary Base64 text file

Run in the **container**, replacing SOURCE with the actual path returned by materialize:

```python
from pathlib import Path
import base64, hashlib

source = Path("/mnt/data/files/the_patient_agent_cosmos_wide_original_titles_iphone.mp4")
output = Path("/mnt/data/cosmos_video_transfer_payload.txt")
raw = source.read_bytes()
encoded = base64.b64encode(raw).decode("ascii")
output.write_text(
    "\n".join(encoded[i:i+2048] for i in range(0, len(encoded), 2048)) + "\n",
    encoding="ascii"
)
print("bytes:", len(raw))
print("sha256:", hashlib.sha256(raw).hexdigest())
print("git blob SHA:", hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest())
print("Base64 characters:", len(encoded))
```

Observed with approved sample: 589881 original bytes, 786508 Base64 characters, 385 lines, 786893 bytes of text including newlines. The line breaks are transport formatting only; remove whitespace before handing to GitHub.

### 2. Bridge the container to Files Library

Use `tools.files__manage_library`:

```js
await tools.files__manage_library({
  operations:[{
    operation:"upload",
    container_path:"/mnt/data/cosmos_video_transfer_payload.txt",
    destination_path:"/The Patient Agent/cosmos_video_transfer_payload.txt"
  }]
});
```

Then `tools.files__list({surface:"library",library_path:"/The Patient Agent",sort:"created_at",sort_order:"desc",limit:25})` to obtain a **visible** `citation_marker` for the text file, e.g. `turn11file0` in the actual successful run. **This marker is turn-specific, not a permanent identifier.** Reading only by the upload response's `file_id` initially produced an "unavailable/not visible" warning; using the `files__list`-returned reference worked.

### 3. Bridge Files text directly into GitHub `create_blob`

Invoke the two tools **inside one `functions.exec` call**, never echoing the large Base64 content. Use the actual `citation_marker` ID from step 2:

```js
const read = await tools.files__read({
  read:[{ref_id:"VISIBLE_REF_FROM_FILES_LIST",
         mode:"full",start_line:1,max_lines:500,include_images:false}]
});
const item = read.results?.[0];
if (!item || item.warnings?.length || item.has_more) {
  throw Error("Transfer payload read incomplete");
}
const payload = item.content.filter(v => typeof v === "string")
                           .join("").replace(/\s/g, "");
// Use the computed actual expected length; the number below is for 2026-10-19's sample.
if (payload.length !== 786508) throw Error("Payload size mismatch");
const uploaded = await tools.mcp__GitHub__create_blob({
  repository_full_name:"ThePatientAgent/GPT-6-PAgt",
  content:payload,
  encoding:"base64"
});
// Check uploaded.result.sha equals the locally computed Git blob SHA.
// Do not text(payload), JSON.stringify(payload), or put it into model context!
text({remote_git_blob_sha:uploaded.result?.sha});
```

**Observed**: `create_blob` returned `528544eb484e410947383eac000bf290afb0d489`, matching locally computed Git blob SHA exactly. Note: an unreferenced blob is **not** yet a committed, publicly accessible repository file.

### 4. Commit the blob to the public repository

- Read current main ref via `mcp__GitHub__fetch({url:"https://api.github.com/repos/ThePatientAgent/GPT-6-PAgt/git/ref/heads/main"})`; parse commit SHA.
- Read that commit via `mcp__GitHub__fetch({url:"https://api.github.com/repos/ThePatientAgent/GPT-6-PAgt/git/commits/HEAD_SHA"})`; parse `tree.sha`.
- Call `mcp__GitHub__create_tree({repository_full_name:repo,base_tree_sha:TREE_SHA,tree_elements:[{path:"docs/media/APPROVED_UNIQUE_NAME.mp4",mode:"100644",type:"blob",sha:BLOB_SHA}]})`.
- Call `mcp__GitHub__create_commit({repository_full_name:repo,message:"Add approved X video",tree_sha:NEW_TREE_SHA,parent_sha:HEAD_SHA})`.
- Call `mcp__GitHub__update_ref({repository_full_name:repo,branch_name:"main",sha:NEW_COMMIT_SHA,force:false})`. On a concurrent ref update, fetch main again and rebuild; **do not force-overwrite**.
- Confirm `mcp__GitHub__fetch_file({repository_full_name:repo,path:"docs/media/APPROVED_UNIQUE_NAME.mp4",encoding:"base64"})` matches the Base64 content and Git blob SHA of the source.

**Actual commit of 2026-10-19 approved video:** https://github.com/ThePatientAgent/GPT-6-PAgt/commit/c5a9b7c0f13503dc567c08c2bfdda86c2e5b7eb4  
**Direct MP4 URL:** https://raw.githubusercontent.com/ThePatientAgent/GPT-6-PAgt/main/docs/media/cosmos-mascot-wide-original-titles-2026-10-19.mp4  
**Exact data equality check:** GitHub `fetch_file` Base64 (786508 characters) === original materialized MP4 Base64. No video content modification.

### 5. Send to X through Buffer

Use Buffer channel `6ad20694778b240e2f27f846` (@DearSamItsAI), organization `6ad20620c6261796769958de`. Never guess channel IDs in another workspace; validate with `list_channels` if connections change.

```js
await tools.mcp__buffer__create_post({
  channelId:"6ad20694778b240e2f27f846",
  schedulingType:"automatic",
  mode:"shareNow",
  text:APPROVED_X_TEXT,
  assets:[{video:{url:PUBLIC_DIRECT_MP4_URL}}]
});
```

For this 2026-10-19 post, approved text was 364 JS UTF-16 units (too long for a normal single tweet), so **all approved wording** was preserved in a two-item Twitter thread using `metadata:{twitter:{thread:[{text:TWEET1,assets:[{video:{url:PUBLIC_DIRECT_MP4_URL}}]},{text:TWEET2}]}}`; top-level `text` and `assets` matched tweet 1. Do not independently publish a second duplicate standalone tweet.

Then `mcp__buffer__get_post({postId:NEW_BUFFER_ID})` and require `status:"sent"`, a valid `sentAt`, `error:null`, the expected video asset, and an `externalLink`. **Never claim success at merely uploading video or creating a Buffer draft.**

**Actual sent post:** https://x.com/2111046152070291456/status/2112186512385171752  
**Actual Buffer ID:** `6ad626963e5fb9f3ab97ef24`  
**`sentAt`:** `2026-10-19T14:18:02.233Z`; `status`: `sent`; `threadCount`: 2; video duration: 10000 ms.

### 6. Cleanup and future resume

- Delete temporary Base64 text from Library (`files__manage_library` with exact returned `library_file_id`); done for this successful run. The original MP4 remains in Library and the published MP4 remains in GitHub.
- Update the project-specific runbook with the exact post URL and completion state.
- If the user says `な` after this, **advance to the next unfinished task**, not this already-sent video. External developer replies in CrewAIInc/crewAI issue #6414 and related PRs should be checked when resuming broader work.

## Failed approaches worth NOT repeating unchanged

- Container outbound `curl` to GitHub/WordPress DNS hosts failed; local proxy experiments failed.
- GitHub `create_file`/`update_file` support UTF-8 text, **not** binary MP4.
- WordPress `media.create` receiving a container path or Files file ID did not provide a working binary bridge; one later connector attempt failed with `BLOCKED_FILE_REFERENCE`.
- `create_blob` by itself only stores an unreferenced Git blob, and a successful blob SHA does **not** mean the file was published.
- No replacing the approved 10-second MP4 with a test-compressed sample, no text-only substitution, no claim of success until Buffer `sent`.

## Reference

Project-specific full handoff: [X-VIDEO-POSTING-RUNBOOK-2026-10-19.md](X-VIDEO-POSTING-RUNBOOK-2026-10-19.md)


## Verified square COSMOS video post — 2026-10-30 11:38 JST

- Approved source: `COSMOS_PROMO_X_SQUARE_1080.mp4` (1080×1080, 30fps, 10 s). Original 4,393,540 bytes, SHA-256 `857481b51e842ea912aa0429a17b0373498fefebe884224ddb655411030175fd`.
- Re-encoded for transfer/X (`libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart`): 1080×1080, 30fps, 10 s, 2,432,568 bytes, SHA-256 `41ad7430aa7c1094ab61a189411fc73448da4254b4d376177614a90daee4723e`.
- Public GitHub media blob SHA `3a2b17878014f6c11978bb1a54e4150c10e1f731`; committed at `7bbdb11cee15fedca2e0a9a115fe42ac25c54b19`, path `docs/media/cosmos-square-interactive-promo-2026-10-30.mp4`.
- Transfer: uploaded temporary base64 text to ChatGPT Files Library; used `files__read` in four 400-line pieces within a single `functions.exec` call, joined in JS and passed unchanged to GitHub `create_blob(encoding:base64)`. Verified resulting blob SHA against local Git blob hash. The 5.8 MB base64 attempt hit h2 protocol error; 3.24 MB re-encode succeeded.
- Buffer X channel `6ad20694778b240e2f27f846`, post ID `6ae403314b8768bfb2d67c83`; `shareNow`, independently verified `sent`, `sentAt=2026-10-30T02:38:44.401Z`, `error=null`, video 10 s. Public X post: https://x.com/2111046152070291456/status/2115996796199506201
- Temporary base64 Library files deleted after delivery. Do not repost the 2026-10-30 square promotional video unless user asks for another distinct post.
