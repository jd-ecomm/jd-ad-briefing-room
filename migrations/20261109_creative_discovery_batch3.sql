-- Creative Discovery batch 3 (9 Nov 2026, task cd-build-next, Part 4): everything still with batch null
-- (non-focus brands). Same method as migrations/20261109_creative_discovery_batch2.sql. Additive only:
-- no rows deleted, no UI change (the page already loads batch is not null). Applied through the Supabase connector.

-- 1. variant_group for batch 3 rows (computed over the whole table, written only to batch null rows). Result: 0 changed
--    (the batch 1 run had already grouped the whole table).
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
update public.in_ads a set variant_group = g.grp from g
where g.id = a.id and a.batch is null and a.variant_group is distinct from g.grp;

-- 2. measured aspects: 238 English batch-null rows with a null aspect (81) or an unusual Motion value (157) were probed by
--    .github/workflows/cd-aspect.yml (scripts/cd_aspect/jobs.json, results on branch cd-aspect-results, run 42598977841, 0 errors).
--    Written per row: update in_ads set aspect_motion = coalesce(aspect_motion, aspect), aspect = <measured>, aspect_measured_at = now() where id = ...
--    238 rows written, 145 with a value different from Motion's.
-- 3. posters: 0 to re-make (no batch-null video has poster_frame false; the 2,862 poster_frame false rows are images).

-- 4. formats = [{ad_id, aspect, video, image}] on every member of every group holding a batch-null row, R2 URLs first.
--    4,663 rows refreshed (4,533 batch null, 130 earlier-batch members of shared groups).
with tg as (
  select distinct variant_group from public.in_ads where batch is null and variant_group is not null
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

-- 5. release
update public.in_ads set batch = 3 where batch is null;

-- 6. brand profiles for the batch 3 brands (stats were already computed over all English rows; refreshed after release)
select public.cd_refresh_brand_profiles();

-- 7. load speed: after the release the page's deep OFFSET pages (1,000 rows, ordered by id, anon 3s statement timeout)
--    took about 2.1s at offset 12,000 and one phone check run hit the timeout (57014). A partial index plus analyze
--    brought the same query to about 25ms (no page code change):
create index if not exists in_ads_released_en_id on public.in_ads (id) where batch is not null and is_english;
analyze public.in_ads;
