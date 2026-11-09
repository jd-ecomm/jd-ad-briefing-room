# Hook reading brief (JD Creative Discovery)

Goal: read the text that is WRITTEN ON each ad creative (captions, supers, titles, stickers, end-card copy) from contact sheets, and store it in Supabase.

Input: a batch file (JSON list). Each item = {"sheet": absolute path to a JPEG, "ads": [{"rep", "ids", "kind", "frames"}]}.
- kind "video": one ad per sheet; frames captioned "<id>  0.0s", 0.5s, 1.0s, 1.5s, 2.0s, 3.0s (hook window) then 25/50/75% of duration.
- kind "poster": video failed, single poster frame only.
- kind "image": static image / carousel cards ("image", "card 1..3"); up to 2 ads per sheet, each ad is its own row, captioned with its id.
- "ids" = every ad sharing that identical media file; write the same values to all of them.

For each ad open the sheet with the Read tool and decide:
- hook_text: on-screen text visible in the frames from 0.0s to 3.0s inclusive, verbatim as displayed (keep wording, order, ellipses, caps/lowercase as shown). Join lines/frames with a single space, no duplicates when the same text persists across frames. Keep emoji only if part of the text line (e.g. "👀"). If no text 0 to 3s: hook_text null, hook_kind 'visual'.
- onscreen_text: all DISTINCT on-screen text across all frames in order, separated by " | ". Null if none.
- hook_kind: 'text' (video with on-screen text in 0 to 3s), 'visual' (video or poster with no text in 0 to 3s), 'image_text' (image/carousel with text on it; hook_text = the main/first text block, onscreen_text = all text across cards), 'none' (image/carousel with no text).
- Count as on-screen text: overlay text added in the edit (captions/subtitles, titles, supers, prices, offers, CTAs like "SHOP NOW", end-card copy, text in graphic image ads). Do NOT count incidental scene text: store signage, posters in the background, logos/wordmarks alone (a JD or Nike logo with no words is not text), product branding printed on clothes/shoes/boxes, licence plates.
- Never guess or invent. If text is too small/blurry, write what you can read and append " [partly unreadable]".
- You have no headline/copy and must not look them up.

Write after EVERY sheet with the Supabase connector (load with ToolSearch "select:mcp__Supabase__execute_sql"), project_id cymkcvdsxoneojfisjgk. Use dollar quoting for text:
update public.in_ads set hook_text=$q$...$q$ (or null), onscreen_text=$q$...$q$ (or null), hook_kind='text', hook_read_at=now() where id in ('id1','id2');
You may put the statements for one sheet (both ads) in one execute_sql call. Do not modify any other column or table. Do not write files anywhere except your scratch.

Return a SHORT report (under 150 words): sheets done, ads updated, counts by hook_kind, any sheets that could not be read, and 3 example (id, hook_text) pairs.
