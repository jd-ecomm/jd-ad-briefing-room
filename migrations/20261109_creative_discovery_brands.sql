-- Creative Discovery: Brands section (9 Nov 2026, task cd-build-next, Part 2)
-- Applied with the Supabase connector (execute_sql) on project cymkcvdsxoneojfisjgk. Additive only.
-- Stats are computed over EVERY English in_ads row of a brand (released or not), so batch 3 brands are ready.
-- Refresh all:   select public.cd_refresh_brand_profiles();
-- Refresh some:  select public.cd_refresh_brand_profiles(array['Gymshark','The North Face']);
-- category / subcategory / country are set once by hand (see the update at the end) and kept on refresh.

create table if not exists public.cd_brand_profiles (
  brand text primary key, brand_id text, category text, subcategory text, country text,
  is_focus boolean default false, stats jsonb, summary text, summary_basis text, updated_at timestamptz default now());
alter table public.cd_brand_profiles enable row level security;
create policy cd_bp_read on public.cd_brand_profiles for select to anon, authenticated using (true);
grant select on public.cd_brand_profiles to anon, authenticated;
revoke insert, update, delete, truncate on public.cd_brand_profiles from anon, authenticated;

-- Part 3 columns (added here so the stats can read them)
alter table public.in_ads add column if not exists hook_format text, add column if not exists hook_template text;

-- percentages with one decimal that always sum to 100 (largest remainder)
create or replace function public.cd_pct_lr(counts jsonb) returns jsonb language sql immutable set search_path to '' as $$
 with c as (select key k, value::numeric n from jsonb_each_text(counts)),
 t as (select coalesce(sum(n),0) tot from c),
 f as (select k, n, case when t.tot>0 then floor(n*1000/t.tot) else 0 end fl, case when t.tot>0 then n*1000/t.tot - floor(n*1000/t.tot) else 0 end rem from c, t),
 g as (select f.*, row_number() over (order by rem desc, n desc, k) rn, (select case when t.tot>0 then 1000 - (select sum(fl) from f) else 0 end from t) need from f)
 select coalesce(jsonb_object_agg(k, round((fl + case when rn<=need then 1 else 0 end)/10.0,1)), '{}'::jsonb) from g
$$;

-- stats jsonb: totals, mix (%), mix_n, aspect (%), tag_coverage, tagged, top_tags, ugc_share, studio_share (of tagged ads),
-- weeks (8 x {start, video, image, carousel}), l30 {last, prior, pct, by_format, tags}, median_days, live30_share,
-- hooks {read, videos, top[{format,n}], example{id,text,format,source}, machine}, top_ads (6 ids), start, end, as_of
create or replace function public.cd_brand_stats(p_brand text) returns jsonb language sql stable set search_path to '' as $$
with r as (
  select id, format k, status, start_date sd, concept_key ck, variant_group vg, coalesce(visual_formats,'{}'::text[]) vf,
    public.cd_aspect_bucket(aspect) asp, hook_format hf, hook_text ht, hook_kind hk, hook_source hs, batch,
    greatest(0, (case when status='active' or end_date is null then current_date else end_date end) - start_date) d
  from public.in_ads where is_english and brand=p_brand),
r2 as (select r.*, least(coalesce(d,0),90) + count(*) over (partition by coalesce(ck,id)) ps from r),
tot as (select count(*) ads, count(*) filter (where status='active') active, count(distinct coalesce(ck,id)) concepts, count(distinct coalesce(vg,id)) cards,
  count(*) filter (where cardinality(vf)>0) tagged, count(*) filter (where k='video') nvideo from r),
tags as (select t, count(*) n from r, unnest(vf) t group by t),
w8b as (select (7 - ((current_date - 1 - sd) / 7))::int w, k, count(*) n from r where sd >= current_date - 56 and sd < current_date group by 1,2),
l30 as (select k, count(*) filter (where sd >= current_date-30) a, count(*) filter (where sd < current_date-30 and sd >= current_date-60) b from r group by k),
t30 as (select t, count(*) filter (where sd >= current_date-30) a, count(*) filter (where sd < current_date-30 and sd >= current_date-60) b from r, unnest(vf) t where sd >= current_date-60 group by t),
hfs as (select hf, count(*) n from r where hf is not null group by hf),
hex as (select distinct on (hf) hf, ht, hs, id from r2 where ht is not null and hf is not null order by hf, (hs='claude') desc, ps desc),
top6 as (select id from (select distinct on (coalesce(vg,id)) id, ps, batch from r2 order by coalesce(vg,id), ps desc) x order by (batch is not null) desc, ps desc, id limit 6)
select jsonb_build_object(
 'totals', (select jsonb_build_object('ads',ads,'active',active,'concepts',concepts,'cards',cards) from tot),
 'mix', public.cd_pct_lr(jsonb_build_object('video',(select count(*) from r where k='video'),'image',(select count(*) from r where k='image'),'carousel',(select count(*) from r where k='carousel'))),
 'mix_n', jsonb_build_object('video',(select count(*) from r where k='video'),'image',(select count(*) from r where k='image'),'carousel',(select count(*) from r where k='carousel')),
 'aspect', public.cd_pct_lr((select coalesce(jsonb_object_agg(a, n),'{}') from (select coalesce(asp,'unknown') a, count(*) n from r group by 1) x)),
 'tag_coverage', (select case when ads>0 then round(100.0*tagged/ads,1) else 0 end from tot),
 'tagged', (select tagged from tot),
 'top_tags', (select coalesce(jsonb_agg(jsonb_build_object('tag',t,'n',n,'pct',round(100.0*n/nullif((select tagged from tot),0),1)) order by n desc, t),'[]') from (select * from tags order by n desc, t limit 10) x),
 'ugc_share', (select round(100.0*count(*) filter (where vf && array['UGC Selfie','UGC Overlay','Yapper','Testimonial','Review','Influencer Endorsement','Street Interview','POV'])/nullif(count(*) filter (where cardinality(vf)>0),0),1) from r),
 'studio_share', (select round(100.0*count(*) filter (where vf && array['Product Image','Studio Shot','Lifestyle Image','Cinematic B-Roll','Model Shot','Flatlay'])/nullif(count(*) filter (where cardinality(vf)>0),0),1) from r),
 'weeks', (select jsonb_agg(jsonb_build_object('w',gs,'start',(current_date - 56 + gs*7),'video',coalesce((select n from w8b where w=gs and k='video'),0),'image',coalesce((select n from w8b where w=gs and k='image'),0),'carousel',coalesce((select n from w8b where w=gs and k='carousel'),0)) order by gs) from generate_series(0,7) gs),
 'l30', jsonb_build_object('last',(select coalesce(sum(a),0) from l30),'prior',(select coalesce(sum(b),0) from l30),
    'pct',(select case when sum(b)>0 then round(100.0*(sum(a)-sum(b))/sum(b),0) else null end from l30),
    'by_format',(select coalesce(jsonb_object_agg(k, jsonb_build_object('last',a,'prior',b,'pct',case when b>0 then round(100.0*(a-b)/b,0) end)),'{}') from l30),
    'tags',(select coalesce(jsonb_agg(jsonb_build_object('tag',t,'last',a,'prior',b,'pct',case when b>0 then round(100.0*(a-b)/b,0) end) order by a desc, t),'[]') from (select * from t30 order by a desc, t limit 6) x)),
 'median_days', (select percentile_cont(0.5) within group (order by d) from r where d is not null),
 'live30_share', (select round(100.0*count(*) filter (where d>=30)/nullif(count(*) filter (where d is not null),0),1) from r),
 'hooks', jsonb_build_object('read',(select count(*) from r where hk is not null),'videos',(select nvideo from tot),
    'top',(select coalesce(jsonb_agg(jsonb_build_object('format',hf,'n',n) order by n desc, hf),'[]') from (select * from hfs order by n desc, hf limit 5) x),
    'example',(select jsonb_build_object('id',id,'text',ht,'format',hf,'source',hs) from hex where hf=(select hf from hfs where hf not in ('Visual only','Other') order by n desc, hf limit 1)),
    'machine',(select count(*) filter (where hs='ocr')>count(*) filter (where hs='claude') from r where hk is not null)),
 'top_ads', (select coalesce(jsonb_agg(id),'[]') from top6),
 'start', (select min(sd) from r), 'end', (select max(sd) from r),
 'as_of', current_date)
$$;

-- cd_brand_summary(stats) -> (summary, basis): 1 to 2 sentences built only from the stats (see the live definition:
--   select pg_get_functiondef('public.cd_brand_summary(jsonb)'::regprocedure);)
-- Rules: lead format and its % (+ top 2 tags when tag coverage >= 40%, else aspect and "based on limited tags");
-- 30-day launch change when there are 10+ launches to compare; rising tag; median days live and share live 30+ days;
-- most used hook format when 10+ hooks are classified. Brands with < 10 English ads say "too few for a pattern".

-- cd_refresh_brand_profiles(text[] default null): upserts stats, summary, summary_basis, brand_id (most used page), is_focus;
-- keeps category, subcategory and country. Execute revoked from anon/authenticated.
