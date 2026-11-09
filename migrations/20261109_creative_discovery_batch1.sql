-- Creative Discovery batch 1 (9 Nov 2026). Additive only: new nullable columns on in_ads, a helper function, and back-fills.
-- Applied to Supabase project cymkcvdsxoneojfisjgk through the Supabase connector (migrations cd_batch1_columns, cd_aspect_bucket_search_path).

alter table public.in_ads add column if not exists batch int;
alter table public.in_ads add column if not exists aspect text;          -- already existed (Motion sources aspectRatio); kept as is
alter table public.in_ads add column if not exists variant_group text;
alter table public.in_ads add column if not exists formats jsonb;
create index if not exists in_ads_batch_idx on public.in_ads (batch) where batch is not null;
create index if not exists in_ads_variant_group_idx on public.in_ads (variant_group);

-- nearest of 9:16, 4:5, 1:1, 16:9 (log-ratio distance)
create or replace function public.cd_aspect_bucket(a text) returns text language sql immutable set search_path = '' as $$
  select case when a is null or a !~ '^\d+(\.\d+)?:\d+(\.\d+)?$' then null else (
    select b from (values ('9:16',9.0/16),('4:5',0.8),('1:1',1.0),('16:9',16.0/9)) v(b,r)
    order by abs(ln((split_part(a,':',1)::numeric/nullif(split_part(a,':',2)::numeric,0))::float8) - ln(r::float8)) limit 1) end
$$;

-- batch 1: every row that existed before 9 Nov 2026 04:00 UTC, plus JD UK/US/AU/NZ, Finish Line and the Canadian retailers
update public.in_ads set batch = 1 where batch is null and (first_seen < '2026-11-09T04:00:00Z' or brand_id in (
  '66cf75a0e42d53dcea7879b5', -- JD Sports (UK)
  '67aa28cb0a70ccc0c54281c6', -- JD Sports US
  '686f2d9374342e14cdc10979', -- JD Sports Australia
  '69925634d7b54bd21a2fcadb', -- JD Sports New Zealand
  '670ff958a61172249cb1b88d', -- Finish Line
  '67a284970a70ccc0c58afd6d', -- Browns Shoes
  '66f6cbcaaa0d5e9098d87b5b', -- Little Burgundy Shoes
  '66f18dfdaa0d5e9098aec096', -- Foot Locker Canada
  '66f1682aaa0d5e90980cc8b9', -- Champs Sports
  '66bf2132b822dc10897c6b1d', -- Sporting Life
  '6785368511c51429e76eee22', -- SOFTMOC
  '6686cae74eca12a94c097e31', -- Sport Chek
  '668ee82372604270fc37d401', -- Aritzia
  '679a4ef09cca50e75f0fdd5d'  -- HAVEN
));

-- variant_group: brand_id + normalised full ad text (headline + copy) + landing URL without query string,
-- chained by start dates within 7 days. Ads with under 4 characters of text stay in their own group.
with base as (
  select id, start_date,
    brand_id || '|' || trim(regexp_replace(regexp_replace(lower(coalesce(headline,'') || ' ' || coalesce(copy,'')), 'https?://\S+', ' ', 'g'), '[^[:alnum:]]+', ' ', 'g'))
      || '|' || regexp_replace(regexp_replace(lower(split_part(split_part(coalesce(landing,''),'?',1),'#',1)), '^https?://(www\.)?', ''), '/+$', '') as k,
    length(trim(regexp_replace(lower(coalesce(headline,'') || ' ' || coalesce(copy,'')), '[^[:alnum:]]+', '', 'g'))) as tl
  from public.in_ads
), st as (
  select id, k, tl, start_date,
    case when start_date is not null and start_date - lag(start_date) over (partition by k order by start_date nulls last, id) <= 7 then 0 else 1 end nb
  from base
), g as (
  select id, case when tl < 4 then 'vg_' || id else 'vg_' || left(md5(k),16) || '_' || sum(nb) over (partition by k order by start_date nulls last, id) end grp from st
)
update public.in_ads a set variant_group = g.grp from g where g.id = a.id and a.variant_group is distinct from g.grp;

-- formats: every member of the group, on every member. aspect falls back to 1:1 (carousel) or 4:5 when Motion gave no aspectRatio.
with m as (
  select variant_group, jsonb_agg(jsonb_build_object(
     'ad_id', id,
     'aspect', coalesce(public.cd_aspect_bucket(aspect), case when format='carousel' then '1:1' else '4:5' end),
     'video', case when video is not null or video_s is not null or video_r2 is not null then coalesce(video_r2, video_s, video) end,
     'image', coalesce(thumb_r2, thumb_s, poster, images_s[1], images[1]))
   order by start_date nulls last, id) f
  from public.in_ads where variant_group is not null group by variant_group
)
update public.in_ads a set formats = m.f from m where m.variant_group = a.variant_group and a.formats is distinct from m.f;
