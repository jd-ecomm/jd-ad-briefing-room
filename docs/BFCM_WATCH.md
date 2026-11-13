# BFCM project watch: automatic Briefing Room refresh (added 13 Nov 2026)

Ryan, 13 Nov 2026: "make sure the ad briefing room pulls updates from clickup and added assets and automatically
refreshes please. Then notify through slack when the updates happen." Slack goes to Ryan's DM only (U0ADD8B569Z).

Run by the scheduled task "Ad Briefing Room BFCM watch". It checks for changes every hour and exits quietly when
nothing changed, so it costs little. Only a real change triggers a refresh, a publish and one Slack DM.

## What is watched
- **ClickUp**: the BFCM parent task 868mk03av, its subtasks, and every task in `data.json` `project.sources` and
  `delivered[].source_url`. A change = `date_updated` after the last check, a new comment, a new attachment,
  a status change, or a new subtask.
- **Drive delivery folders**: every Google Drive folder URL in `delivered[].url`, plus any new Drive folder or file
  link that appears in a changed ClickUp task or comment. A change = a file id not in `data/bfcm_watch.json`.
  The cloud Drive connector cannot see these folders (JD Drive), so they are listed in Claude in Chrome on the
  work PC: open https://drive.google.com/drive/folders/<id> in a tab and read the file list from the page
  (`window['_DRIVE_ivd']` holds id, name, mime type). If the work PC is offline, check ClickUp only and say
  "Drive not checked (work PC offline)" in the run log; the next run with the PC on catches up.

## State: data/bfcm_watch.json
`{"checked": "<ISO UTC of the last check>", "tasks": {"<task id>": "<date_updated ms>"},
  "comments": {"<task id>": "<latest comment id>"}, "folders": {"<folder id>": ["<file id>", ...]}}`
Written at the end of every run that checked something, even when nothing changed.

## When something changed
1. **Project page** (`data.json` `project`): update status, milestones, workstreams, paid batches, open questions
   and team from ClickUp, the same way as the 12 and 13 Nov refreshes (commits 009a110, c53c846). Set
   `project.refreshed` to today. Keep the existing wording style: plain Canadian English, no em dashes, no
   "heavy hitters".
2. **Assets Delivered** (`data.json` `delivered`): one entry per delivered pack, same fields as the existing entries
   (channel, delivered, by, status, live, source, source_url, source_title, project, campaign, name, formats,
   languages, url, notes, previews). New or revised files get previews in `delivered/` as JPEGs about 900px wide:
   in Chrome open `https://lh3.googleusercontent.com/d/<file id>=w900` (images) and save it through the page, or
   take a screenshot of the Drive preview for videos. Revised files replace the old preview file with the same
   name. Set `delivered_refreshed` to today.
3. Check the site headless (Playwright): index.html loads with no page errors, the BFCM project page and the
   Assets Delivered tab render, every new preview image loads.
4. Commit "Briefing Room watch <date> <HH:MM> PT: <short list of changes>" and push to main; confirm with
   git ls-remote. Pages deploys in about a minute.
5. Slack DM to Ryan (U0ADD8B569Z), one message, only when something changed, e.g.:
   "Ad Briefing Room updated 2:05pm: 3 new assets in Assets Delivered (Paid batch 2: C03, C04, V02), ClickUp:
   Early Access email moved to Approved, 1 new open question. https://jd-ecomm.github.io/jd-ad-briefing-room/"

## First run
`data/bfcm_watch.json` was seeded on 13 Nov 2026 with `"seeded": false` and empty task dates and folder lists. The
first run records the current state (task dates, latest comment ids, folder file ids), sets `"seeded": true`, and
reports nothing unless a Drive folder holds files that are not yet in `delivered[].previews` (those count as new).

Site: https://jd-ecomm.github.io/jd-ad-briefing-room/
