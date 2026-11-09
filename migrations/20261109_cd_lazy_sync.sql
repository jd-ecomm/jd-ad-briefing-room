-- Creative Discovery lazy loading (9 Nov 2026): server-side copies of what preview/cd.js used to compute in the browser over every ad.
-- Kept current on demand: triggers on in_ads record the ids whose Creative Discovery columns changed (cd_dirty) and in_favs flags team saves;
-- every Creative Discovery RPC calls cd_ensure(), which runs cd_sync() when something changed or the Toronto date moved on. No schedule.
-- Tables: cd_members (one per released English ad, heavy fields), cd_mt (narrow per-ad numbers that move with the date or concept group),
-- cd_cards (one per variant group = one card, stable fields + member JSON), cd_ct (narrow per-card numbers + sort keys), cd_card_hay (search text,
-- trigram index), cd_brands (one per Meta page id). Rows are never removed: ads that leave the released set are marked live = false.

-- step 1: heavy per-ad fields for the given ids (landing type, search text, card JSON)
create or replace function public.cd_sync_heavy(ids text[], v_gen int) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare n int := 0;
begin
  update cd_members set live = false where id = any(ids) and live
    and not exists (select 1 from in_ads a where a.id = cd_members.id and a.batch is not null and a.is_english);
  update cd_mt set live = false where id = any(ids) and live
    and not exists (select 1 from in_ads a where a.id = cd_mt.id and a.batch is not null and a.is_english);
  insert into cd_members as t (id,gen,live,vg,ck,bid,b,g,market,mk,st,sd,ed,dl,asp,kind,vfs,vf,hf,hk,hkind,ht,hsrc,ost_or_hk,lp,cta,focus,motion,logo,sv,hk_hay,mhay,j)
  select k.id, v_gen, true, k.variant_group, k.concept_key, k.brand_id, coalesce(nullif(k.brand,''),'Unknown brand'), coalesce(nullif(k.brand_group,''),'Other'), nullif(k.market,''),
    case k.brand_id when '66cf75a0e42d53dcea7879b5' then 'JD UK' when '67aa28cb0a70ccc0c54281c6' then 'JD US' when '686f2d9374342e14cdc10979' then 'JD Australia'
      when '69925634d7b54bd21a2fcadb' then 'JD New Zealand' when '670ff958a61172249cb1b88d' then 'Finish Line' when '674e4a2a411da97a4980d2db' then 'JD France' end,
    k.status, k.start_date, case when k.status='active' then null else k.end_date end, k.days_live,
    cd_bucket(k.aspect),
    case when (k.format='video' or nullif(k.video,'') is not null or nullif(k.video_s,'') is not null or nullif(k.video_r2,'') is not null)
           and coalesce(nullif(k.video_r2,''), nullif(k.video_s,''), nullif(k.video,'')) is not null then 'video'
         when k.format='carousel' or (case when jsonb_typeof(k.images_r2)='array' and jsonb_array_length(k.images_r2)>0 then jsonb_array_length(k.images_r2)
           when coalesce(cardinality(k.images_s),0)>0 then cardinality(k.images_s) else coalesce(cardinality(k.images),0) end)>1 then 'carousel' else 'image' end,
    k.vf_source, coalesce(k.visual_formats,'{}'), nullif(k.hook_format,''), nullif(k.hook_text,''), nullif(k.hook_kind,''), nullif(k.hook_template,''), k.hook_source,
    (nullif(k.onscreen_text,'') is not null or nullif(k.hook_text,'') is not null),
    cd_lp(k.landing), coalesce(nullif(k.cta,''),'Learn more'), coalesce(k.focus,false), coalesce(k.saves,0),
    coalesce(nullif(k.logo_r2,''), nullif(k.logo_s,''), nullif(k.logo,''), ''), 0,
    cd_nz(concat_ws(' ', k.hook_text, k.onscreen_text, k.hook_format, k.hook_template, coalesce(nullif(k.brand,''),'Unknown brand'))),
    nullif(cd_nz(concat_ws(' ', k.headline, k.copy, k.hook_text, k.onscreen_text, k.landing)),''),
    jsonb_strip_nulls(jsonb_build_object('id',k.id,'brand',k.brand,'brand_id',k.brand_id,'brand_group',k.brand_group,
      'logo_r2',coalesce(nullif(k.logo_r2,''), nullif(k.logo_s,''), nullif(k.logo,'')),
      'status',k.status,'start_date',k.start_date,'end_date',k.end_date,'days_live',k.days_live,'format',k.format,'visual_formats',k.visual_formats,
      'aspect',k.aspect,'platforms',k.platforms,'cards',k.cards,'headline',k.headline,'copy',left(k.copy,300),'xt',case when length(k.copy)>300 then 1 end,'cta',k.cta,'landing',k.landing,
      'video',k.video,'video_s',k.video_s,'video_r2',k.video_r2,'poster',k.poster,'poster_frame',k.poster_frame,
      'images', case when (jsonb_typeof(k.images_r2)='array' and jsonb_array_length(k.images_r2)>0) or coalesce(cardinality(k.images_s),0)>0 then k.images[1:1] else k.images end,
      'images_s', case when jsonb_typeof(k.images_r2)='array' and jsonb_array_length(k.images_r2)>0 then k.images_s[1:1] else k.images_s end,
      'images_r2',k.images_r2,'thumb_s',k.thumb_s,'thumb_r2',k.thumb_r2,'saves',k.saves,'market',k.market,'concept_key',k.concept_key,'variant_group',k.variant_group,
      'first_seen',k.first_seen,'hook_text',k.hook_text,'hook_kind',k.hook_kind,'vf_source',k.vf_source,'focus',k.focus,'hook_format',k.hook_format,
      'hook_template',k.hook_template,'hook_source',k.hook_source,'ad_library',k.ad_library))
  from in_ads k where k.id = any(ids) and k.batch is not null and k.is_english
  on conflict (id) do update set gen=excluded.gen,live=true,vg=excluded.vg,ck=excluded.ck,bid=excluded.bid,b=excluded.b,g=excluded.g,market=excluded.market,mk=excluded.mk,st=excluded.st,
    sd=excluded.sd,ed=excluded.ed,dl=excluded.dl,asp=excluded.asp,kind=excluded.kind,vfs=excluded.vfs,vf=excluded.vf,hf=excluded.hf,hk=excluded.hk,hkind=excluded.hkind,ht=excluded.ht,
    hsrc=excluded.hsrc,ost_or_hk=excluded.ost_or_hk,lp=excluded.lp,cta=excluded.cta,focus=excluded.focus,motion=excluded.motion,logo=excluded.logo,hk_hay=excluded.hk_hay,mhay=excluded.mhay,j=excluded.j;
  get diagnostics n = row_count;
  insert into cd_mt as t (id, vg, ck, live, sd, ed, dl, motion)
  select id, vg, ck, true, sd, ed, dl, motion from cd_members where id = any(ids) and live
  on conflict (id) do update set vg=excluded.vg, ck=excluded.ck, live=true, sd=excluded.sd, ed=excluded.ed, dl=excluded.dl, motion=excluded.motion, d=null;
  return n;
end $$;

create or replace function public.cd_sync(p_full boolean default false, p_today date default null, p_max int default 3000) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare t0 timestamptz := clock_timestamp(); today date := coalesce(p_today, (now() at time zone 'America/Toronto')::date);
  n_heavy int := 0; n_time int := 0; n_cards int := 0; n_ct int := 0; ids text[]; v_gen int; gone text[];
begin
  select gen + 1 into v_gen from cd_meta where k = 'cd' for update;
  create temp table if not exists _aff (cid int, vg text, primary key (cid, vg)) on commit drop;
  create temp table if not exists _content (cid int, vg text, primary key (cid, vg)) on commit drop;

  /* 1. ads that changed */
  if p_full then select array_agg(id) into ids from in_ads;
  else select array_agg(id) into ids from (select id from cd_dirty where not done order by at limit p_max) x; end if;
  if ids is not null then
    insert into _content select distinct v_gen, vg from cd_mt where id = any(ids) on conflict do nothing;
    n_heavy := cd_sync_heavy(ids, v_gen);
    insert into _content select distinct v_gen, vg from cd_mt where id = any(ids) on conflict do nothing;
    if p_full then update cd_dirty set done = true where not done; else update cd_dirty set done = true where id = any(ids) and not done; end if;
  end if;
  insert into _aff select v_gen, vg from _content where cid = v_gen on conflict do nothing;

  /* 2. numbers that move with the date or the concept group: days live, variants, parallel launches, Proven score, team saves */
  with f as (select ad_id, count(*)::int n from in_favs group by ad_id),
  w as (select m.id, m.vg,
      (case when m.sd is not null then greatest(0, coalesce(m.ed, today) - m.sd) else coalesce(m.dl,0) end)::int d,
      (count(*) over (partition by m.ck))::int var,
      (case when m.sd is null then 0 else (count(m.sd) over (partition by m.ck order by m.sd range between interval '3 days' preceding and interval '3 days' following)) - 1 end)::int par,
      coalesce(f.n,0) sv
    from cd_mt m left join f on f.ad_id = m.id where m.live),
  u as (update cd_mt t set d = w.d, ps = least(w.d,90)+w.var+w.par, proven = w.d >= 60, var = w.var, par = w.par, sv = w.sv
        from w where t.id = w.id and (t.d,t.var,t.par,t.sv) is distinct from (w.d,w.var,w.par,w.sv)
        returning t.vg)
  insert into _aff select distinct v_gen, vg from u on conflict do nothing;
  get diagnostics n_time = row_count;

  /* 3. per-card numbers for touched groups; a card whose lead ad changed is rebuilt in full */
  create temp table if not exists _nt (cid int, vg text, min_id text, rep text, d int, ps int, proven boolean, sv int, sd_max date, motion int, primary key (cid, vg)) on commit drop;
  insert into _nt
  with o as (select m.*, row_number() over (partition by m.vg order by m.ps desc, m.sd asc nulls first, m.id asc) rn
             from cd_mt m where m.live and m.vg in (select vg from _aff where cid = v_gen))
  select v_gen, vg, min(id), max(id) filter (where rn = 1), max(d), max(ps), bool_or(proven), sum(sv)::int, max(sd), max(motion) from o group by vg;
  /* the previous lead ad is in cd_ct.rep: a new group, a group back from not live, or a new lead ad means a full card rebuild */
  insert into _content select v_gen, n.vg from _nt n left join cd_ct c on c.vg = n.vg where n.cid = v_gen and (c.vg is null or c.rep is distinct from n.rep or not c.live) on conflict do nothing;
  gone := array(select a.vg from _aff a where a.cid = v_gen and not exists (select 1 from _nt n where n.cid = v_gen and n.vg = a.vg));
  if cardinality(gone) > 0 then
    update cd_cards set live = false where vg = any(gone) and live;
    update cd_card_hay set live = false where vg = any(gone) and live;
    update cd_ct set live = false where vg = any(gone) and live;
  end if;

  insert into cd_ct as t (vg, live, rep, min_id, d, ps, proven, sv, sd_max, s_newest, s_saved, s_longest)
  select n.vg, true, n.rep, n.min_id, n.d, n.ps, n.proven, n.sv, n.sd_max, coalesce(n.sd_max - date '2000-01-01', -999999)*1000 + n.ps,
    n.sv*1000 + coalesce(n.motion,0) + n.ps/1000.0, n.d*1000 + n.ps
  from _nt n where n.cid = v_gen
  on conflict (vg) do update set live=true, rep=excluded.rep, min_id=excluded.min_id, d=excluded.d, ps=excluded.ps, proven=excluded.proven, sv=excluded.sv, sd_max=excluded.sd_max,
    s_newest=excluded.s_newest, s_saved=excluded.s_saved, s_longest=excluded.s_longest
  where (t.live,t.rep,t.min_id,t.d,t.ps,t.proven,t.sv,t.sd_max,t.s_saved) is distinct from (true,excluded.rep,excluded.min_id,excluded.d,excluded.ps,excluded.proven,excluded.sv,excluded.sd_max,excluded.s_saved);
  get diagnostics n_ct = row_count;

  /* 4. full card rows (stable fields, member JSON) for groups whose content or lead ad changed */
  if exists (select 1 from _content where cid = v_gen) then
  with o as (select m.*, t.ps tps, t.var tvar, t.par tpar, row_number() over (partition by m.vg order by t.ps desc, m.sd asc nulls first, m.id asc) rn
             from cd_members m join cd_mt t on t.id = m.id where m.live and m.vg in (select vg from _content where cid = v_gen)),
  agg as (select vg, min(id) min_id, max(sd) sd_max, bool_or(st='active') anyact, bool_or(focus) focus, count(*)::int nmem, array_agg(asp) asps, array_agg(distinct kind) kinds,
      array_agg(distinct coalesce(hf,'__none')) hfs, jsonb_agg(j || jsonb_build_object('var',tvar,'par',tpar) order by id) m
    from o group by vg),
  tags as (select vg, array_agg(distinct v) vf, array_agg(distinct v) filter (where vfs='motion') vfm from o, unnest(vf) v group by vg)
  insert into cd_cards as t (vg,gen,live,id,min_id,b,bid,g,market,mk,kind,ck,st,sd_max,var,par,nf,fl,kinds,vf,vfm,hfs,lp,cta,sd,focus,logo,nmem,m)
  select a.vg, v_gen, true, r.id, a.min_id, r.b, r.bid, r.g, r.market, r.mk, r.kind, r.ck, case when a.anyact then 'active' else r.st end, a.sd_max, r.tvar, r.tpar,
    cardinality(array(select x from unnest(array['9:16','4:5','1:1','16:9']) x where x = any(a.asps))),
    array(select x from unnest(array['9:16','4:5','1:1','16:9']) x where x = any(a.asps)), a.kinds, coalesce(t2.vf,'{}'), coalesce(t2.vfm,'{}'), a.hfs, r.lp, r.cta, r.sd, a.focus, r.logo, a.nmem, a.m
  from agg a join o r on r.vg = a.vg and r.rn = 1 left join tags t2 on t2.vg = a.vg
  on conflict (vg) do update set gen=excluded.gen,live=true,id=excluded.id,min_id=excluded.min_id,b=excluded.b,bid=excluded.bid,g=excluded.g,market=excluded.market,mk=excluded.mk,
    kind=excluded.kind,ck=excluded.ck,st=excluded.st,sd_max=excluded.sd_max,var=excluded.var,par=excluded.par,nf=excluded.nf,fl=excluded.fl,kinds=excluded.kinds,vf=excluded.vf,vfm=excluded.vfm,
    hfs=excluded.hfs,lp=excluded.lp,cta=excluded.cta,sd=excluded.sd,focus=excluded.focus,logo=excluded.logo,nmem=excluded.nmem,m=excluded.m;
  get diagnostics n_cards = row_count;
  end if;

  /* 5. search text per card (trigram index) */
  if exists (select 1 from _content where cid = v_gen) then
  insert into cd_card_hay as t (vg, live, hay)
  select c.vg, true, ' ' || concat_ws(' ', nullif(cd_nz(c.b),''), (select string_agg(m.mhay, ' ' order by m.id) from cd_members m where m.vg = c.vg and m.live),
      nullif(cd_nz(array_to_string(c.vf,' ')),''), nullif(cd_nz(array_to_string(c.kinds,' ')),''), nullif(cd_nz(c.lp),''), nullif(cd_nz(c.cta),''), nullif(cd_nz(c.g),''), nullif(cd_nz(c.mk),''), nullif(cd_nz(c.market),''),
      nullif(cd_nz(case c.market when 'CA' then 'Canada' when 'US' then 'USA' when 'UK' then 'UK' when 'AU' then 'Australia' when 'NZ' then 'New Zealand' when 'EU' then 'Europe'
        when 'MX' then 'Mexico' when 'CL' then 'Chile' when 'FR' then 'France' when 'Global' then 'Global' when 'n/a' then 'Not set' end),'')) || ' '
  from cd_cards c where c.live and c.vg in (select vg from _content where cid = v_gen)
  on conflict (vg) do update set live = true, hay = excluded.hay where t.hay is distinct from excluded.hay or not t.live;
  end if;

  /* 6. one row per Meta page id (the old BRANDS list) */
  if n_cards > 0 or cardinality(gone) > 0 then
    insert into cd_brands as t (bid,gen,live,b,g,market,mk,focus,n,first_mid)
    select bid, v_gen, true, (array_agg(b order by min_id))[1], (array_agg(g order by min_id))[1], (array_agg(market order by min_id))[1], (array_agg(mk order by min_id))[1], bool_or(focus), count(*), min(min_id)
    from cd_cards where live group by bid
    on conflict (bid) do update set gen=excluded.gen,live=true,b=excluded.b,g=excluded.g,market=excluded.market,mk=excluded.mk,focus=excluded.focus,n=excluded.n,first_mid=excluded.first_mid
    where (t.live,t.b,t.g,t.market,t.mk,t.focus,t.n,t.first_mid) is distinct from (true,excluded.b,excluded.g,excluded.market,excluded.mk,excluded.focus,excluded.n,excluded.first_mid);
    update cd_brands set live = false where live and not exists (select 1 from cd_cards c where c.bid = cd_brands.bid and c.live);
  end if;

  update cd_meta set gen = v_gen, as_of = today, dirty = exists(select 1 from cd_dirty where not done), favs_dirty = false, refreshed_at = now(),
    ms = (extract(epoch from clock_timestamp()-t0)*1000)::int, members = (select count(*) from cd_mt where live), cards = (select count(*) from cd_ct where live) where k='cd';
  return jsonb_build_object('heavy', n_heavy, 'time', n_time, 'ct', n_ct, 'cards', n_cards, 'ms', (extract(epoch from clock_timestamp()-t0)*1000)::int);
end $$;

create or replace function public.cd_refresh() returns void language sql security definer set search_path = public as $$ select public.cd_sync(true, null, 1000000); $$;

-- called by every Creative Discovery RPC: sync when ads, saves or the date changed; concurrent callers wait for the one sync, then read it
create or replace function public.cd_ensure() returns void language plpgsql security definer set search_path = public as $$
declare st record; today date := (now() at time zone 'America/Toronto')::date;
begin
  select dirty, favs_dirty, as_of into st from cd_meta where k='cd';
  if not st.dirty and not st.favs_dirty and st.as_of = today and not exists (select 1 from cd_dirty where not done limit 1) then return; end if;
  perform pg_advisory_xact_lock(hashtext('cd_sync'));
  select dirty, favs_dirty, as_of into st from cd_meta where k='cd';
  if st.dirty or st.favs_dirty or st.as_of is distinct from today or exists (select 1 from cd_dirty where not done limit 1) then perform cd_sync(false, null, 1500); end if;
end $$;
