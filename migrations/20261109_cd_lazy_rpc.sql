-- Creative Discovery lazy loading (9 Nov 2026): RPCs used by preview/cd.js. All security definer, all call cd_ensure() first.
-- Filters JSON (p->'f'): {brand:[bid], mkt:[], kind:[], asp:[], tag:[], hf:[], st:['live'|'ended'], sig:['proven'|'rising'|'saved'|'multi'], lp:[], cta:[],
--   days:[min,max]|null, launch:['YYYY-MM-DD'|'', 'YYYY-MM-DD'|'']|null, ai:true|false}; p->>'q' = search text; p->>'ctx' = discover | jd | brand;
--   p->>'gmk' = JD market chip; p->>'brand' = brand name (brand page); p->>'skip' = a filter group to ignore (brand page ignores brand).
-- Same rules as the old in-browser fMatch / qMatch / sorted / mixBrands in cd.js.

create or replace function public.cd_arr(j jsonb) returns text language sql immutable as $$
  select quote_literal(coalesce(array(select jsonb_array_elements_text(case when jsonb_typeof(j)='array' then j else '[]'::jsonb end)), '{}')::text) || '::text[]'
$$;
create or replace function public.cd_has(j jsonb) returns boolean language sql immutable as $$
  select jsonb_typeof(j) = 'array' and jsonb_array_length(j) > 0
$$;

-- one SQL boolean per filter group, over c (cd_cards), t (cd_ct); search over h (cd_card_hay)
create or replace function public.cd_conds(p jsonb, today date) returns jsonb language plpgsql immutable as $$
declare f jsonb := coalesce(p->'f','{}'::jsonb); o jsonb := '{}'::jsonb; s text; v text; terms text[]; x text;
begin
  if cd_has(f->'brand') then o := o || jsonb_build_object('brand', 'c.bid = any(' || cd_arr(f->'brand') || ')'); end if;
  if cd_has(f->'mkt') then o := o || jsonb_build_object('mkt', 'coalesce(c.market,''n/a'') = any(' || cd_arr(f->'mkt') || ')'); end if;
  if cd_has(f->'kind') then o := o || jsonb_build_object('kind', 'c.kinds && ' || cd_arr(f->'kind')); end if;
  if cd_has(f->'asp') then o := o || jsonb_build_object('asp', 'c.fl && ' || cd_arr(f->'asp')); end if;
  if cd_has(f->'tag') then o := o || jsonb_build_object('tag', (case when coalesce((f->>'ai')::boolean, true) then 'c.vf' else 'c.vfm' end) || ' && ' || cd_arr(f->'tag')); end if;
  if cd_has(f->'hf') then o := o || jsonb_build_object('hf', 'c.hfs && ' || cd_arr(f->'hf')); end if;
  if cd_has(f->'st') then o := o || jsonb_build_object('st', '(case when c.st = ''active'' then ''live'' else ''ended'' end) = any(' || cd_arr(f->'st') || ')'); end if;
  if cd_has(f->'sig') then
    s := 'true';
    for v in select jsonb_array_elements_text(f->'sig') loop
      s := s || case v when 'proven' then ' and t.proven' when 'rising' then format(' and c.st = ''active'' and t.sd_max >= %L::date', today - 30)
        when 'saved' then ' and t.sv > 0' when 'multi' then ' and c.nf >= 2' else '' end;
    end loop;
    o := o || jsonb_build_object('sig', s);
  end if;
  if cd_has(f->'lp') then o := o || jsonb_build_object('lp', 'c.lp = any(' || cd_arr(f->'lp') || ')'); end if;
  if cd_has(f->'cta') then o := o || jsonb_build_object('cta', 'c.cta = any(' || cd_arr(f->'cta') || ')'); end if;
  if jsonb_typeof(f->'days') = 'array' then o := o || jsonb_build_object('days', format('t.d between %s and %s', (f->'days'->>0)::int, (f->'days'->>1)::int)); end if;
  if jsonb_typeof(f->'launch') = 'array' then
    o := o || jsonb_build_object('launch', 'c.sd is not null' || case when coalesce(f->'launch'->>0,'') <> '' then format(' and c.sd >= %L::date', f->'launch'->>0) else '' end
      || case when coalesce(f->'launch'->>1,'') <> '' then format(' and c.sd <= %L::date', f->'launch'->>1) else '' end);
  end if;
  terms := array_remove(string_to_array(cd_nz(p->>'q'), ' '), '');
  if cardinality(terms) > 0 then
    s := 'true';
    foreach x in array terms loop s := s || ' and h.hay like ' || quote_literal('%' || replace(replace(x, '\', '\\'), '%', '\%') || '%'); end loop;
    o := o || jsonb_build_object('q', s);
  end if;
  return o;
end $$;

create or replace function public.cd_base(p jsonb) returns text language sql immutable as $$
  select case coalesce(p->>'ctx','discover')
    when 'jd' then 'c.mk is not null' || case when coalesce(p->>'gmk','all') <> 'all' then ' and c.mk = ' || quote_literal(p->>'gmk') else '' end
    when 'brand' then 'c.b = ' || quote_literal(coalesce(p->>'brand',''))
    else 'true' end
$$;

create or replace function public.cd_and(o jsonb, skip text) returns text language sql immutable as $$
  select coalesce(string_agg('(' || value || ')', ' and '), 'true') from jsonb_each_text(o) where key is distinct from skip
$$;

-- one page of cards (keyset), the total, and on request the summary, JD stats and search suggestions
create or replace function public.cd_page(p jsonb) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare today date := (now() at time zone 'America/Toronto')::date; o jsonb; w text; base text; ord text; sortk text := coalesce(p->>'sort','proven');
  lim int := least(greatest(coalesce((p->>'limit')::int, 60), 1), 200); cur jsonb := p->'cursor'; res jsonb; tot int; mix boolean; q text; ex jsonb := '{}'::jsonb; needh boolean;
begin
  perform cd_ensure();
  o := cd_conds(p, today); base := cd_base(p);
  w := base || ' and ' || cd_and(o, p->>'skip');
  needh := o ? 'q';
  mix := coalesce(p->>'ctx','discover') = 'discover' and sortk = 'proven' and not (o ? 'brand');
  ord := case sortk when 'newest' then 't.s_newest' when 'saved' then 't.s_saved' when 'longest' then 't.s_longest'
    when 'rising' then format('(c.var*4 + c.par*3 + greatest(0, 30 - (%L::date - t.sd_max))*2 + (case when c.st = ''active'' then 5 else 0 end))', today)
    else 't.ps' end;
  q := 'from cd_cards c join cd_ct t on t.vg = c.vg and t.live' || case when needh then ' join cd_card_hay h on h.vg = c.vg' else '' end || ' where c.live and ' || w;
  if mix then
    execute format('with f as (select c.vg, t.ps, t.min_id, c.bid, row_number() over (partition by c.bid order by t.ps desc, t.min_id) rn %s),
      b as (select bid, ps bps, min_id bmid from f where rn = 1),
      k as (select f.vg, f.rn::numeric o1, (-b.bps)::numeric o2, b.bmid o3 from f join b using (bid))
      select jsonb_build_object(''rows'', coalesce((select jsonb_agg(jsonb_build_object(''vg'', x.vg, ''o'', jsonb_build_array(x.o1, x.o2, x.o3), ''m'', cd_slim(x.vg)) order by x.o1, x.o2, x.o3)
         from (select * from k where %s order by o1, o2, o3 limit %s) x), ''[]''::jsonb), ''total'', (select count(*) from f))', q,
      case when jsonb_typeof(cur) = 'array' then format('(o1, o2, o3) > (%s::numeric, %s::numeric, %L)', cur->>0, cur->>1, cur->>2) else 'true' end, lim) into res;
  else
    execute format('with k as (select c.vg, (-(%s))::numeric o1, 0::numeric o2, t.min_id o3 %s)
      select jsonb_build_object(''rows'', coalesce((select jsonb_agg(jsonb_build_object(''vg'', x.vg, ''o'', jsonb_build_array(x.o1, x.o2, x.o3), ''m'', cd_slim(x.vg)) order by x.o1, x.o3)
         from (select * from k where %s order by o1, o3 limit %s) x), ''[]''::jsonb), ''total'', (select count(*) from k))', ord, q,
      case when jsonb_typeof(cur) = 'array' then format('(o1, o3) > (%s::numeric, %L)', cur->>0, cur->>2) else 'true' end, lim) into res;
  end if;
  tot := (res->>'total')::int;
  if jsonb_array_length(res->'rows') = lim then res := res || jsonb_build_object('next', res->'rows'->(lim-1)->'o'); end if;

  if coalesce((p->>'summary')::boolean, false) then res := res || jsonb_build_object('summary', cd_summary_j()); end if;

  if coalesce(p->>'ctx','') = 'jd' and coalesce((p->>'stats')::boolean, false) then
    execute format('with a as (select c.vg, t.min_id, c.mk, c.st, c.nf, c.vf, t.proven from cd_cards c join cd_ct t on t.vg = c.vg and t.live %s where c.live and c.mk is not null and %s)
      select jsonb_build_object(''all'', (select count(*) from a), ''live'', (select count(*) from a where st = ''active''), ''proven'', (select count(*) from a where proven),
        ''multi'', (select count(*) from a where nf >= 2),
        ''fmt'', coalesce((select jsonb_agg(jsonb_build_array(v, n) order by n desc, fm) from (select v, count(*) n, min(min_id) fm from a, unnest(vf) v group by v order by count(*) desc, min(min_id) limit 6) z), ''[]''::jsonb),
        ''mk'', coalesce((select jsonb_object_agg(mk, n) from (select mk, count(*) n from a group by mk) z), ''{}''::jsonb))',
      case when needh then 'join cd_card_hay h on h.vg = c.vg' else '' end, cd_and(o, null)) into ex;
    res := res || jsonb_build_object('jd', ex);
  end if;

  -- zero results with 2+ words: how many ads match each word on its own (base only, no filters)
  if tot = 0 and coalesce((p->>'sugg')::boolean, true) and cardinality(array_remove(string_to_array(cd_nz(p->>'q'), ' '), '')) > 1 then
    execute format('select coalesce(jsonb_object_agg(term, n), ''{}''::jsonb) from (select term, (select count(*) from cd_cards c join cd_card_hay h on h.vg = c.vg where c.live and h.live and %s and h.hay like ''%%'' || replace(term, ''%%'', ''\%%'') || ''%%'') n
       from unnest(array_remove(string_to_array(cd_nz(%L), '' ''), '''')) term) z', base, p->>'q') into ex;
    res := res || jsonb_build_object('terms', ex);
  end if;
  return res;
end $$;

-- live counts for the Filters drawer: each group counted over every other active filter (same as the old fGroups)
create or replace function public.cd_facets(p jsonb) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare today date := (now() at time zone 'America/Toronto')::date; o jsonb; base text; res jsonb; cols text := ''; g text; needh boolean;
  grps text[] := array['brand','mkt','kind','asp','tag','hf','st','sig','lp','cta','days','launch','q'];
  pool text; ai boolean := coalesce((p->'f'->>'ai')::boolean, true);
begin
  perform cd_ensure();
  o := cd_conds(p, today); base := cd_base(p); needh := o ? 'q';
  foreach g in array grps loop cols := cols || format(', (%s) as f_%s', coalesce(o->>g, 'true'), g); end loop;
  -- pool for group g: every flag except f_g (q is never skipped)
  execute format($q$
    with x as (select c.vg, c.min_id, c.bid, coalesce(c.market,'n/a') mkt, c.kinds, c.fl, %s tg, c.hfs, (case when c.st='active' then 'live' else 'ended' end) st,
        t.proven, (c.st = 'active' and t.sd_max >= %L::date) rising, t.sv > 0 saved, c.nf >= 2 multi, c.lp, c.cta, t.d %s
      from cd_cards c join cd_ct t on t.vg = c.vg and t.live %s where c.live and %s),
    y as (select *, f_brand and f_mkt and f_kind and f_asp and f_tag and f_hf and f_st and f_sig and f_lp and f_cta and f_days and f_launch and f_q as f_all from x)
    select jsonb_build_object(
      'n', (select count(*) from y where f_q and f_mkt and f_kind and f_asp and f_tag and f_hf and f_st and f_sig and f_lp and f_cta and f_days and f_launch and (f_brand or %L)),
      'brand', coalesce((select jsonb_object_agg(bid, n) from (select bid, count(*) n from y where f_q and f_mkt and f_kind and f_asp and f_tag and f_hf and f_st and f_sig and f_lp and f_cta and f_days and f_launch group by bid) z), '{}'::jsonb),
      'mkt', coalesce((select jsonb_agg(jsonb_build_array(mkt, n, fm) order by n desc, fm) from (select mkt, count(*) n, min(min_id) fm from y where f_q and f_brand and f_kind and f_asp and f_tag and f_hf and f_st and f_sig and f_lp and f_cta and f_days and f_launch group by mkt) z), '[]'::jsonb),
      'kind', coalesce((select jsonb_object_agg(v, n) from (select v, count(*) n from y, unnest(kinds) v where f_q and f_brand and f_mkt and f_asp and f_tag and f_hf and f_st and f_sig and f_lp and f_cta and f_days and f_launch group by v) z), '{}'::jsonb),
      'asp', coalesce((select jsonb_object_agg(v, n) from (select v, count(*) n from y, unnest(fl) v where f_q and f_brand and f_mkt and f_kind and f_tag and f_hf and f_st and f_sig and f_lp and f_cta and f_days and f_launch group by v) z), '{}'::jsonb),
      'tag', coalesce((select jsonb_agg(jsonb_build_array(v, n, fm) order by n desc, fm, v) from (select v, count(*) n, min(min_id) fm from y, unnest(tg) v where f_q and f_brand and f_mkt and f_kind and f_asp and f_hf and f_st and f_sig and f_lp and f_cta and f_days and f_launch group by v) z), '[]'::jsonb),
      'hf', coalesce((select jsonb_object_agg(v, n) from (select v, count(*) n from y, unnest(hfs) v where f_q and f_brand and f_mkt and f_kind and f_asp and f_tag and f_st and f_sig and f_lp and f_cta and f_days and f_launch group by v) z), '{}'::jsonb),
      'st', coalesce((select jsonb_object_agg(st, n) from (select st, count(*) n from y where f_q and f_brand and f_mkt and f_kind and f_asp and f_tag and f_hf and f_sig and f_lp and f_cta and f_days and f_launch group by st) z), '{}'::jsonb),
      'sig', (select jsonb_build_object('proven', count(*) filter (where proven), 'rising', count(*) filter (where rising), 'saved', count(*) filter (where saved), 'multi', count(*) filter (where multi))
              from y where f_q and f_brand and f_mkt and f_kind and f_asp and f_tag and f_hf and f_st and f_lp and f_cta and f_days and f_launch),
      'lp', coalesce((select jsonb_agg(jsonb_build_array(lp, n, fm) order by n desc, fm) from (select lp, count(*) n, min(min_id) fm from y where f_q and f_brand and f_mkt and f_kind and f_asp and f_tag and f_hf and f_st and f_sig and f_cta and f_days and f_launch group by lp) z), '[]'::jsonb),
      'cta', coalesce((select jsonb_agg(jsonb_build_array(cta, n, fm) order by n desc, fm) from (select cta, count(*) n, min(min_id) fm from y where f_q and f_brand and f_mkt and f_kind and f_asp and f_tag and f_hf and f_st and f_sig and f_lp and f_days and f_launch group by cta order by count(*) desc, min(min_id) limit 20) z), '[]'::jsonb))
    $q$, case when ai then 'c.vf' else 'c.vfm' end, today - 30, cols, case when needh then 'join cd_card_hay h on h.vg = c.vg' else '' end, base, coalesce((p->>'skip') = 'brand', false)) into res;
  return res;
end $$;

create or replace function public.cd_summary_j() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'cards', (select count(*) from cd_ct where live),
    'jd', (select count(*) from cd_cards where live and mk is not null),
    'brands', (select count(*) from cd_brands where live),
    'maxd', (select coalesce(max(d), 1) from cd_ct where live),
    'blist', (select coalesce(jsonb_agg(jsonb_build_array(bid, b, g, market, mk, focus, n) order by n desc, first_mid), '[]'::jsonb) from cd_brands where live),
    'tags', (select coalesce(jsonb_agg(v order by v), '[]'::jsonb) from (select distinct v from cd_cards, unnest(vf) v where live) z),
    'profiled', (select count(distinct c.b) from cd_cards c where c.live and exists (select 1 from cd_brand_profiles p where p.brand = c.b and p.stats is not null)),
    'as_of', (select as_of from cd_meta where k = 'cd'), 'synced', (select refreshed_at from cd_meta where k = 'cd'))
$$;
create or replace function public.cd_summary() returns jsonb language plpgsql security definer set search_path = public as $$
begin perform cd_ensure(); return cd_summary_j(); end $$;

-- cards that contain any of these ad ids (boards, brand top ads, share links)
create or replace function public.cd_cards_by_ids(ids text[]) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform cd_ensure();
  return coalesce((select jsonb_agg(jsonb_build_object('vg', c.vg, 'm', cd_slim(c.vg))) from cd_cards c
    where c.live and c.vg in (select m.vg from cd_members m where m.id = any(ids) and m.live)), '[]'::jsonb);
end $$;

-- one ad for the viewer: its card with full copy and on-screen text, concept variants, more from the brand, more like this
create or replace function public.cd_viewer(p_id text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v text; c cd_cards; ct cd_ct; fullm jsonb; res jsonb;
begin
  perform cd_ensure();
  select vg into v from cd_members where id = p_id and live;
  if v is null then return null; end if;
  select * into c from cd_cards where vg = v; select * into ct from cd_ct where vg = v;
  select jsonb_agg(e || jsonb_build_object('copy', a.copy, 'onscreen_text', a.onscreen_text, 'xt', null) order by e->>'id') into fullm
    from jsonb_array_elements(c.m) e left join in_ads a on a.id = e->>'id';
  res := jsonb_build_object('card', jsonb_build_object('vg', v, 'm', jsonb_strip_nulls(fullm)),
    'concept', coalesce((select jsonb_agg(jsonb_build_object('vg', x.vg, 'm', cd_slim(x.vg)) order by t.ps desc, t.min_id) from (select x.* from cd_cards x join cd_ct t on t.vg = x.vg and t.live where x.live and x.ck = c.ck and x.vg <> v order by t.ps desc, t.min_id limit 12) x join cd_ct t on t.vg = x.vg), '[]'::jsonb),
    'same', coalesce((select jsonb_agg(jsonb_build_object('vg', x.vg, 'm', cd_slim(x.vg)) order by t.ps desc, t.min_id) from (select x.* from cd_cards x join cd_ct t on t.vg = x.vg and t.live where x.live and x.bid = c.bid and x.vg <> v and x.ck <> c.ck order by t.ps desc, t.min_id limit 10) x join cd_ct t on t.vg = x.vg), '[]'::jsonb),
    'like', coalesce((select jsonb_agg(jsonb_build_object('vg', z.vg, 'm', cd_slim(z.vg)) order by z.s desc, z.min_id) from (
        select x.vg, x.m, t.min_id, cardinality(array(select unnest(x.vf) intersect select unnest(c.vf)))*3 + (case when x.kind = c.kind then 2 else 0 end) + (case when x.g = c.g then 1 else 0 end)
          + (case when x.lp = c.lp then 1 else 0 end) + (case when x.market is not distinct from c.market then 1 else 0 end) + t.ps/400.0 s
        from cd_cards x join cd_ct t on t.vg = x.vg and t.live where x.live and x.bid is distinct from c.bid order by 4 desc, t.min_id limit 10) z), '[]'::jsonb));
  return res;
end $$;

-- brand names (a brand can have several Meta pages) for the Brands tab
create or replace function public.cd_brand_names() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform cd_ensure();
  return (select coalesce(jsonb_agg(jsonb_build_object('b', b, 'bids', obids, 'logo', logo, 'n', n) order by fm), '[]'::jsonb) from (
    select c.b, (array_agg(c.logo order by c.min_id) filter (where c.logo <> ''))[1] logo, count(*) n, min(c.min_id) fm,
      (select array_agg(bid order by f) from (select c2.bid, min(c2.min_id) f from cd_cards c2 where c2.live and c2.b = c.b group by c2.bid) q) obids
    from cd_cards c where c.live group by c.b) z);
end $$;

-- JD Hooks: everything the Hooks view shows above the library, computed over the hook rows (one per ad, JD markets, hook read)
create or replace function public.cd_hooks(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare scope text := coalesce(p->>'scope','jd'); res jsonb;
begin
  perform cd_ensure();
  with r as (select m.id, m.vg, m.mk, m.hf, m.ht, m.hk, m.hsrc, m.sd, m.ost_or_hk, t.d, t.ps from cd_members m join cd_mt t on t.id = m.id
             where m.live and t.live and m.hkind is not null and (scope = 'all' or m.mk is not null)),
  mo as (select distinct to_char(sd, 'YYYY-MM') mo from r where sd is not null order by 1 desc limit 12),
  tp as (select ht, count(*) n, min(id) fid from r where ht is not null group by ht),
  tps as (select tp.*, (select hf from r where r.ht = tp.ht order by id limit 1) f,
            (select array_agg(mk order by fm) from (select mk, min(id) fm from r where r.ht = tp.ht group by mk) q) mks
          from tp where n >= 2 order by n desc, (select count(distinct mk) from r where r.ht = tp.ht) desc, fid limit 12)
  select jsonb_build_object(
    'n', (select count(*) from r), 'text', (select count(*) from r where ost_or_hk), 'ocr', exists (select 1 from r where hsrc = 'ocr'),
    'mk', coalesce((select jsonb_agg(mk order by mk) from (select distinct mk from r where mk is not null) z), '[]'::jsonb),
    'fm', coalesce((select jsonb_object_agg(f, n) from (select coalesce(hf, 'Not classified') f, count(*) n from r group by 1) z), '{}'::jsonb),
    'mkn', coalesce((select jsonb_object_agg(mk, n) from (select mk, count(*) n from r where mk is not null group by mk) z), '{}'::jsonb),
    'mkf', coalesce((select jsonb_object_agg(mk || '|' || hf, n) from (select mk, hf, count(*) n from r where mk is not null and hf is not null group by mk, hf) z), '{}'::jsonb),
    'sig', coalesce((select jsonb_object_agg(hf, jsonb_build_array(n, md, ap)) from (select hf, count(*) n, percentile_cont(0.5) within group (order by d) md, avg(ps) ap from r where hf is not null group by hf) z), '{}'::jsonb),
    'months', coalesce((select jsonb_agg(mo order by mo) from mo), '[]'::jsonb),
    'mof', coalesce((select jsonb_object_agg(hf || '|' || m, n) from (select hf, to_char(sd, 'YYYY-MM') m, count(*) n from r where hf is not null and sd is not null and to_char(sd, 'YYYY-MM') in (select mo from mo) group by 1, 2) z), '{}'::jsonb),
    'dates', jsonb_build_array((select min(sd) from r), (select max(sd) from r)),
    'tps', coalesce((select jsonb_agg(jsonb_build_object('t', ht, 'n', n, 'f', f, 'mk', mks,
        'ex', (select jsonb_agg(jsonb_build_object('id', id, 'hk', hk, 'mk', mk) order by id) from (select id, hk, mk from (select r.*, row_number() over (partition by hk order by id) k from r where r.ht = tps.ht) q where k = 1 order by id limit 3) e))
      order by n desc, (select count(distinct mk) from r where r.ht = tps.ht) desc, fid) from tps), '[]'::jsonb)) into res;
  return res;
end $$;

-- JD Hooks library rows (keyset), filters: fmt, mkt, kind, min (days), q (one phrase), sort; full = every CSV column
create or replace function public.cd_hook_rows(p jsonb) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare today date := (now() at time zone 'America/Toronto')::date; scope text := coalesce(p->>'scope','jd'); v_fmt text := coalesce(p->>'fmt','');
  v_mkt text := coalesce(p->>'mkt',''); v_kind text := coalesce(p->>'kind',''); mind int := coalesce((p->>'min')::int, 0); v_q text := cd_nz(p->>'q');
  sortk text := coalesce(p->>'sort','proven'); lim int := least(greatest(coalesce((p->>'limit')::int, 60), 1), 1000); cur jsonb := p->'cursor'; wantfull boolean := coalesce((p->>'full')::boolean, false);
  res jsonb;
begin
  perform cd_ensure();
  with r as (select m.id, m.vg, m.j, m.mk, m.market, m.sd, m.hk, m.hf, m.ht, m.kind, m.asp, t.d, t.ps, t.var, t.par,
      (case sortk when 'newest' then -(case when m.sd is not null then today - m.sd else 999 end)*1000 + t.ps when 'longest' then t.d*1000 + t.ps
        else t.ps*10000 - (case when m.sd is not null then today - m.sd else 999 end) end)::numeric sk
    from cd_members m join cd_mt t on t.id = m.id
    where m.live and t.live and m.hkind is not null and (scope = 'all' or m.mk is not null)
      and (v_fmt = '' or m.hf = v_fmt) and (v_mkt = '' or m.mk = v_mkt) and (v_kind = '' or m.hkind = v_kind) and t.d >= mind
      and (v_q = '' or m.hk_hay like '%' || replace(replace(v_q, '\', '\\'), '%', '\%') || '%')),
  pg as (select * from r where jsonb_typeof(cur) is distinct from 'array' or (-sk, id) > (-(cur->>0)::numeric, cur->>1) order by -sk, id limit lim)
  select jsonb_build_object('total', (select count(*) from r),
    'rows', coalesce((select jsonb_agg(case when wantfull then jsonb_build_object('id', pg.id, 'b', a.brand, 'mk', pg.mk, 'market', pg.market, 'sd', pg.sd, 'd', pg.d, 'format', pg.kind,
          'aspect', coalesce(nullif(a.aspect,''), pg.asp), 'hk', pg.hk, 'hf', pg.hf, 'ht', pg.ht, 'ost', a.onscreen_text, 'h', a.headline, 'x', a.copy, 'l', a.landing, 'ps', pg.ps, 'lib', a.ad_library)
        else jsonb_build_object('vg', pg.vg, 'j', pg.j || jsonb_build_object('var', pg.var, 'par', pg.par)) end order by -pg.sk, pg.id)
      from pg left join in_ads a on wantfull and a.id = pg.id), '[]'::jsonb),
    'next', (select case when count(*) = lim then (select jsonb_build_array(x.sk, x.id) from pg x order by -x.sk desc, x.id desc limit 1) end from pg),
    'cards', case when wantfull then '{}'::jsonb else coalesce((select jsonb_object_agg(c.vg, cd_slim(c.vg)) from cd_cards c where c.vg in (select vg from pg)), '{}'::jsonb) end) into res;
  return res;
end $$;

grant execute on function public.cd_page(jsonb), public.cd_facets(jsonb), public.cd_summary(), public.cd_cards_by_ids(text[]), public.cd_viewer(text),
  public.cd_brand_names(), public.cd_hooks(jsonb), public.cd_hook_rows(jsonb) to anon, authenticated;
