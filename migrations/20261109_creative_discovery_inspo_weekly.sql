-- Creative Discovery batch 4 (9 Nov 2026, weekly Inspo release, run from the Control Bot chat): the 89 ads the 4:13pm Inspo pull added
-- (all brands). Same method as migrations/20261109_creative_discovery_batch2.sql. Additive only:
-- no rows deleted, no UI change (the page already loads batch is not null). Applied through the Supabase connector.
-- 0. tagging (done before this file, through the Supabase connector): lang / is_english read by hand for all 89
--    (75 English, 14 not: tr, fr x5, de x3, ko, pt, es x2, zh), lang_conf 1.0; market and focus from the brand's
--    existing rows; concept_key = brand_id + first 60 chars of the normalised text. R2 media: cd-media-copy run 42757085008.
--    Aspect: not re-measured this time (10 English rows 3:4, 2 rows 2:3, 1 null); cd_aspect_bucket maps them.
-- 1. variant_group for batch-null rows (computed over the whole table, written only to batch null rows). Result: 0 changed
--    (grouping is computed over the whole table).
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


-- 4. formats = [{ad_id, aspect, video, image}] on every member of every group holding a batch-null row, R2 URLs first.
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
update public.in_ads set batch = 4 where batch is null;

-- 6. brand profiles
select public.cd_refresh_brand_profiles();
analyze public.in_ads;

-- 7. sync the page cache (required, or the new cards stay hidden until a visitor triggers cd_ensure)
select public.cd_sync(false, null, 3000);
-- Result 9 Nov: 89 released (75 English), cd_members +75, cd_cards 8,014 -> 8,065, cd_dirty 0 pending.
