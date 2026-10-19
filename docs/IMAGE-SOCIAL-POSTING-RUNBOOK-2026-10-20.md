# THE PATIENT AGENT — verified image posting runbook

Updated: 2026-10-20 (Japan). VERIFIED: posted image to both Instagram and X through Buffer. This is an operational procedure, not a claim that future tool APIs will remain unchanged.

## Successful result (do not duplicate blindly)
- Image public URL: https://raw.githubusercontent.com/ThePatientAgent/GPT-6-PAgt/main/docs/media/pa-crewai-agent-safety-infographic-2026-10-20.jpg
- GitHub binary blob SHA: `6566c23a69dd92c2bc3eb2a79d989d803efb914c`
- Tree SHA: `587d6045ef6c634144998c76ee955f4ba7957c37`
- Commit SHA: `91578887ff49a9d4451fb7f342fd2c81b746fa13`
- Instagram Buffer post ID: `6ad6448f3c0a22592c48f11d`, confirmed `status=sent`, `assets[0].type=image`, `error=null`; published: https://www.instagram.com/p/Derrt4KFRka/
- X Buffer post ID: `6ad644a03c0a22592c48f7a4`, confirmed `status=sent`, `assets[0].type=image`, `error=null`; published: https://twitter.com/DearSamItsAI/status/2112218760249589836
- Organization ID `6ad20620c6261796769958de`; Instagram channel `6ad3056b778b240e2f356709`; X channel `6ad20694778b240e2f27f846`.

## Reproducible exact path: local image -> GitHub -> Buffer -> published social posts
1. Confirm exact user-approved image, including mascot details; no penguins. Do not substitute a different asset. Ensure factual accuracy: never claim an upstream merge if only independent test-fixture work occurred. If image contains mock GitHub interfaces, caption them as illustrative/conceptual.
2. Convert the image to an appropriate compressed JPEG, e.g. using Pillow, with a reasonable social size. For this run `/mnt/data/pa_infographic_post.jpg` was 360,216 bytes, 1254x1254 pixels.
3. Base64 encode **raw image bytes** into a plain UTF-8 text file (for this run `/mnt/data/pa_infographic_post_base64.txt`, 480,522 bytes with line breaks). Do not use `mcp__GitHub__create_file` for binary images: it is UTF-8 text-only.
4. Use `files__manage_library` upload operation to persist the Base64 text file at `/The Patient Agent/pa_infographic_post_base64.txt` (or a fresh unique name). In this run file ID `file_00000000cd30820682cfd4f319337176`, Library ID `libfile_c621f0eaa7348191b437a525679ab217`.
5. Use `files__list({surface:'library',library_path:'/The Patient Agent',sort:'created_at',sort_order:'desc',limit:5})` to obtain the **current-turn ref** for the uploaded Base64 file. Then inside **one** `functions.exec` call: `const r=await tools.files__read({read:[{ref_id:'<current ref>',mode:'full'}]}); const b=r.results[0].content[0].replace(/\s/g,''); const o=await tools.mcp__GitHub__create_blob({repository_full_name:'ThePatientAgent/GPT-6-PAgt',content:b,encoding:'base64'}); text(o);` Reading the file and immediately passing it to GitHub avoids attempting to paste hundreds of KB into model-visible tool arguments.
6. Get the latest main commit SHA via `mcp__GitHub__search_commits({query:'',repository_full_name:'ThePatientAgent/GPT-6-PAgt',topn:1})` (verify it is main's head if uncertain). GitHub's create_tree accepted the HEAD commit SHA as `base_tree_sha` in this successful run. Call `mcp__GitHub__create_tree({repository_full_name:'ThePatientAgent/GPT-6-PAgt',base_tree_sha:<head SHA>,tree_elements:[{path:'docs/media/<unique-name>.jpg',mode:'100644',type:'blob',sha:<created blob SHA>}]})`. Then `mcp__GitHub__create_commit({repository_full_name:'ThePatientAgent/GPT-6-PAgt',message:'Publish infographic for social media',tree_sha:<tree SHA>,parent_sha:<head SHA>})`. Then `mcp__GitHub__update_ref({repository_full_name:'ThePatientAgent/GPT-6-PAgt',branch_name:'main',sha:<new commit SHA>,force:false,expected_sha:<old head SHA>})`. Never force-push or retry blindly on conflict.
7. The public image URL is `https://raw.githubusercontent.com/ThePatientAgent/GPT-6-PAgt/main/docs/media/<unique-name>.jpg`. Confirm it is retrievable or let Buffer asset validation check it. For this run Buffer successfully read it as `image/jpeg` with width and height 1254.
8. Before posting, inspect existing Buffer posts to prevent duplicates: `mcp__buffer__list_posts` for both channel IDs. For Instagram call `mcp__buffer__create_post({channelId:'6ad3056b778b240e2f356709',schedulingType:'automatic',mode:'shareNow',text:<accurate caption>,assets:[{image:{url:<public image URL>,metadata:{altText:<image description>}}}],metadata:{instagram:{type:'post',shouldShareToFeed:true,isAiGenerated:true}}})`.
9. For X call `mcp__buffer__create_post({channelId:'6ad20694778b240e2f27f846',schedulingType:'automatic',mode:'shareNow',text:<short accurate text>,assets:[{image:{url:<same public image URL>,metadata:{altText:<image description>}}}]})`. Respect the platform text limit and do not silently replace an image post with text-only.
10. Call `mcp__buffer__get_post({postId:<returned id>})` for EACH network. Verify `status:'sent'`, `assets` contains an image, `error:null`, and `externalLink` points to a live social URL. If status is ambiguous, inspect posts before attempting retry. Share both URLs with user. In this run both were confirmed sent.

## Project invariants
- The user saying 「な」 means proactively perform the next unfinished action, not ask for repetitive confirmation.
- The user expects **the assistant itself to publish**, not a manual-upload workaround.
- No penguins in mascot art. The mascot is a short-bob, displeased, sharp-lidded, visible-white-sclera chibi girl; do not overdo the white sclera.
- Never fabricate GitHub reactions, merges, test evidence, or contributor statements. The CrewAI #6414 collaboration improved an **independent fixture** and is not an upstream CrewAI merge.
- If the post contains an image, never post text-only as an unannounced substitute.
- Save this runbook in the Library AND GitHub, so later chats can find it.

## Prior successful video transfer
See `THE_PATIENT_AGENT_X_VIDEO_SUCCESS_RUNBOOK.md` in Library and `docs/X-VIDEO-POSTING-RUNBOOK-2026-10-19.md` in GitHub. The same Base64-through-Library -> GitHub create_blob -> Git tree/commit/ref -> Buffer pattern works for both MP4 and JPEG.