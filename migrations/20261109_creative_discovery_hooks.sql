-- Creative Discovery: hook formats and templates (9 Nov 2026, task cd-build-next, Part 3)
-- Applied with the Supabase connector (execute_sql) on project cymkcvdsxoneojfisjgk. Additive only, text only (no media read).
alter table public.in_ads add column if not exists hook_format text, add column if not exists hook_template text;

-- public.cd_hook_format(hook_text, hook_kind) -> one of:
--   Teaser / Knock knock, Offer / Price first, Countdown / Urgency, List / How to, Question, POV / Relatable,
--   Social proof / Trend, Drop / New in alert, Callout, Creator / Talking head, Product name reveal,
--   Statement / Claim, Visual only (hook_kind visual or none), Other (OCR fragments)
--   Rules are checked in that order (first match wins); regex lists were refined once after reading 200 real hooks.
-- public.cd_hook_template(hook_text, hook_kind) -> reusable pattern: upper case, emoji dropped, JD SPORTS -> JD,
--   prices -> [PRICE], percentages -> [X]%, dates -> [DATE], brand names -> [BRAND], brand + model or known models -> [PRODUCT],
--   other numbers -> [N], cut at 64 characters. e.g. "KNOCK KNOCK...NEW BALANCE 204L AT JD 😍" -> "KNOCK KNOCK...[PRODUCT] AT JD"
-- Live definitions: select pg_get_functiondef('public.cd_hook_format(text,text)'::regprocedure);
--                   select pg_get_functiondef('public.cd_hook_template(text,text)'::regprocedure);

-- Classify (in batches by source); rerun after any new hook reading:
update public.in_ads set hook_format = public.cd_hook_format(hook_text, hook_kind), hook_template = public.cd_hook_template(hook_text, hook_kind)
 where hook_read_at is not null and hook_source = 'claude';
update public.in_ads set hook_format = public.cd_hook_format(hook_text, hook_kind), hook_template = public.cd_hook_template(hook_text, hook_kind)
 where hook_read_at is not null and hook_source <> 'claude';
-- then refresh the brand profiles' hook fields:
select public.cd_refresh_brand_profiles();

-- Result 9 Nov 2026 (6,097 ads with hook_read_at): Statement / Claim 2,175; Visual only 1,947; Drop / New in alert 486;
-- Product name reveal 403; Offer / Price first 314; Question 273; Creator / Talking head 196; List / How to 87;
-- POV / Relatable 83; Callout 60; Social proof / Trend 27; Other 23; Teaser / Knock knock 13; Countdown / Urgency 10.

-- ===== Fix run 9 Nov 2026 (task cd-build-fix) =====
-- Statement / Claim was a catch-all (2,175 of 6,097). Every distinct text hook (2,590) was re-read by Claude
-- (8 parallel readers, brief tools/cd-hooks/FORMAT_BRIEF.md) and labelled into public.cd_hook_labels
-- (hook_key = md5(lower(btrim(hook_text))), hook_format, hook_template). Templates must contain a placeholder
-- ([PRODUCT] [BRAND] [SEASON] [STORE] [COLLECTION] [PRICE] [N] [DATE]) or are null. Same template -> majority format.
-- New format list (20): Teaser / Knock knock, Offer / Price first, Countdown / Urgency, Question, List / How to,
--   Style tip / Outfit, POV / Relatable, Skit / Scenario, Creator / Talking head, Social proof / Trend, Callout,
--   Drop / New in alert, Store / Location, Seasonal / Occasion, Collection / Campaign line, Brand or collab callout,
--   Product name reveal, Statement / Claim (real claims only), Visual only, Other / Unreadable.
-- cd_hook_format2 / cd_hook_template2: label first, old rules as fallback for hooks read later (fallback templates
--   without a placeholder are null). cd_hook_labels has RLS on and no anon access.
-- Re-apply after new labels or new hook reading:
update public.in_ads set hook_format = public.cd_hook_format2(hook_text, hook_kind), hook_template = public.cd_hook_template2(hook_text, hook_kind)
 where hook_read_at is not null;
select public.cd_refresh_brand_profiles();
-- Note: 3 stray label rows with mistyped keys (637012b0dd21..., a557d9c5f3d5...x, c2860b9066de...) match no hook and are ignored.
