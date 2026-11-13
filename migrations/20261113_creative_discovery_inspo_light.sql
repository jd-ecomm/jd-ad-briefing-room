-- Creative Discovery batch 6 (13 Nov 2026, light Inspo pull, scheduled task trig_01CVU9EbABALuVj2ZWwWz8e5, unattended).
-- Light mode: only ads active under 7 days, newest first, ids not already in in_ads. 969 checked in Motion, 589 new (73 brands,
-- 20 category finds). Same method as migrations/20261110_creative_discovery_inspo_light.sql. Additive only: no rows deleted,
-- no UI change. Applied through the Supabase connector.
-- 0. tagging (before this file, through the Supabase connector):
--    lang / is_english: this run could not run langdetect (no route from the cloud container to Supabase, and loading it in the
--    browser was not allowed), so the 472 distinct texts (headline + copy, URLs and handles stripped) were read by hand:
--    55 texts marked non-English by language code, the rest English; bilingual EN/FR Canadian ads (English first) kept English;
--    lang_conf left null for this batch. Result: 519 English, 70 not (fr 18, es 14, de 10, sv 5, it 5, nl 4, ko 4, zh-tw 3, other 7).
--    market and focus from the brand's existing rows (29 category finds have no market); concept_key as below.
update public.in_ads set concept_key = brand_id || '|' || left(regexp_replace(regexp_replace(lower(trim(coalesce(headline,'') || ' ' || coalesce(copy,''))), 'https?://\S+', ' ', 'g'), '[^a-z0-9 ]', ' ', 'g'), 60)
where batch is null and concept_key is null;
--    R2 media: cd-media-copy run 43526352233 (519 of 519 English rows have r2_at).

-- 1. copy_group for batch-null rows (the batch 4 variant_group expression, written into copy_group). 589 rows, 499 groups,
--    194 rows join an existing copy group. Rows with no other member keep variant_group = copy_group.
with base as (
  select id, batch, start_date,
    brand_id || '|' || trim(regexp_replace(regexp_replace(lower(coalesce(headline,'') || ' ' || coalesce(copy,'')), 'https?://\S+', ' ', 'g'), '[^[:alnum:]]+', ' ', 'g'))
      || '|' || regexp_replace(regexp_replace(lower(split_part(split_part(coalesce(landing,''),'?',1),'#',1)), '^https?://(www\.)?', ''), '/+$', '') as k,
    length(trim(regexp_replace(lower(coalesce(headline,'') || ' ' || coalesce(copy,'')), '[^[:alnum:]]+', '', 'g'))) as tl
  from public.in_ads
), st as (
  select *, case when start_date is not null and start_date - lag(start_date) over (partition by k order by start_date nulls last, id) <= 7 then 0 else 1 end nb
  from base
), g as (
  select id, batch, case when tl < 4 then 'vg_' || id else 'vg_' || left(md5(k),16) || '_' || sum(nb) over (partition by k order by start_date nulls last, id) end grp from st
)
update public.in_ads a set copy_group = g.grp from g
where g.id = a.id and a.batch is null and a.copy_group is distinct from g.grp;
update public.in_ads set variant_group = copy_group where batch is null and variant_group is null;

-- 2. one creative per card (result: 3,010 groups, 396 rows changed)
select public.cd_regroup_variants();

-- 3. formats over all groups, R2 URLs first (result: 618 rows, 589 new + 29 earlier members of shared groups)
with m as (
  select a.variant_group, jsonb_agg(jsonb_build_object(
     'ad_id', a.id,
     'aspect', coalesce(public.cd_aspect_bucket(a.aspect), case when a.format='carousel' then '1:1' else '4:5' end),
     'video', case when a.video is not null or a.video_s is not null or a.video_r2 is not null then coalesce(a.video_r2, a.video_s, a.video) end,
     'image', coalesce(a.thumb_r2, a.thumb_s, a.poster, a.images_s[1], a.images[1]))
   order by a.start_date nulls last, a.id) f
  from public.in_ads a where a.variant_group is not null group by a.variant_group
)
update public.in_ads a set formats = m.f from m where m.variant_group = a.variant_group and a.formats is distinct from m.f;

-- 4. release with the NEW badge (batch 6)
update public.in_ads set batch = (select max(batch) + 1 from public.in_ads), released_at = now() where batch is null;

-- 5. brand profiles
select public.cd_refresh_brand_profiles();
analyze public.in_ads;

-- 6. sync the page cache
select public.cd_sync(false, null, 3000);
-- Result 13 Nov: 589 released (519 English) as batch 6; all 519 in cd_members with released_at; cd_dirty 0 pending;
-- live cd_cards 12,586 -> 13,062; 0 live cards with two ads of the same aspect bucket. Brand profiles refreshed: 136.
