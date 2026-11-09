-- Creative Discovery batch 2 (9 Nov 2026): the focus brands (batch is null and focus = true).
-- Additive only: no rows deleted, batch 1 variant groups untouched. Same method as batch 1
-- (migrations/20261109_creative_discovery_batch1.sql). Applied through the Supabase connector.

-- keep Motion's original aspect before any measured value replaces it (scripts/cd_aspect.py, .github/workflows/cd-aspect.yml)
alter table public.in_ads add column if not exists aspect_motion text;
alter table public.in_ads add column if not exists aspect_measured_at timestamptz;

-- 1. variant_group for batch 2 rows: brand_id + normalised headline and copy + landing URL without query,
--    chained by start dates within 7 days; under 4 characters of text stays alone.
--    Computed over the whole table (so a batch 2 ad can join a batch 1 group), written only to batch 2 rows.
with base as (
  select id, batch, focus, start_date,
    brand_id || '|' || trim(regexp_replace(regexp_replace(lower(coalesce(headline,'') || ' ' || coalesce(copy,'')), 'https?://\S+', ' ', 'g'), '[^[:alnum:]]+', ' ', 'g'))
      || '|' || regexp_replace(regexp_replace(lower(split_part(split_part(coalesce(landing,''),'?',1),'#',1)), '^https?://(www\.)?', ''), '/+$', '') as k,
    length(trim(regexp_replace(lower(coalesce(headline,'') || ' ' || coalesce(copy,'')), '[^[:alnum:]]+', '', 'g'))) as tl
  from public.in_ads
), st as (
  select *, case when start_date is not null and start_date - lag(start_date) over (partition by k order by start_date nulls last, id) <= 7 then 0 else 1 end nb
  from base
), g as (
  select id, batch, focus, case when tl < 4 then 'vg_' || id else 'vg_' || left(md5(k),16) || '_' || sum(nb) over (partition by k order by start_date nulls last, id) end grp from st
)
update public.in_ads a set variant_group = g.grp from g
where g.id = a.id and (a.batch = 2 or (a.batch is null and a.focus)) and a.variant_group is distinct from g.grp;

-- 2. formats = [{ad_id, aspect, video, image}] on every member of every group that holds a batch 2 row,
--    R2 URLs first. Re-run after the measured aspects land (step 2 of the run) and for groups whose aspect changed.
with tg as (
  select distinct variant_group from public.in_ads where (batch = 2 or (batch is null and focus)) and variant_group is not null
), m as (
  select a.variant_group, jsonb_agg(jsonb_build_object(
     'ad_id', a.id,
     'aspect', coalesce(public.cd_aspect_bucket(a.aspect), case when a.format='carousel' then '1:1' else '4:5' end),
     'video', case when a.video is not null or a.video_s is not null or a.video_r2 is not null then coalesce(a.video_r2, a.video_s, a.video) end,
     'image', coalesce(a.thumb_r2, a.thumb_s, a.poster, a.images_s[1], a.images[1]))
   order by a.start_date nulls last, a.id) f
  from public.in_ads a join tg using (variant_group) group by a.variant_group
)
update public.in_ads a set formats = m.f from m where m.variant_group = a.variant_group and a.formats is distinct from m.f;

-- 3. measured aspects (run step 2) are written per row from cd-aspect-results/results.json:
--    update in_ads set aspect_motion = coalesce(aspect_motion, aspect), aspect = <measured>, aspect_measured_at = now() where id = ...
--    then the formats refresh above is repeated for the groups of the changed rows (batch 1 included).

-- 4. release
update public.in_ads set batch = 2 where batch is null and focus = true;
