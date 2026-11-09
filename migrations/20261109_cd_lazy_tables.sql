-- Creative Discovery lazy loading (9 Nov 2026): tables, indexes, helper functions and change-tracking triggers.
-- Applied with the Supabase connector (execute_sql) in this order: this file, 20261109_cd_lazy_sync.sql, 20261109_cd_lazy_rpc.sql, then select cd_refresh() once.
-- Additive only: nothing in in_ads changes; the triggers only record which released-ad ids changed (cd_dirty) and flag new team saves.
create extension if not exists pg_trgm with schema extensions;

-- same normalisation as cd.js nz(): NFD, strip combining marks, lower case, anything but a-z 0-9 % $ becomes one space, trimmed
create or replace function public.cd_nz(s text) returns text language sql immutable parallel safe as $$
  select btrim(regexp_replace(lower(regexp_replace(normalize(coalesce(s,''), NFD), '[̀-ͯ]', '', 'g')), '[^a-z0-9%$]+', ' ', 'g'))
$$;
-- same as cd.js bucket(): nearest of 9:16, 4:5, 1:1, 16:9 on a log scale
create or replace function public.cd_bucket(a text) returns text language sql immutable parallel safe as $$
  with m as (select regexp_match(coalesce(a,''), '^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$') r),
  v as (select case when r is null or (r[2])::numeric = 0 or (r[1])::numeric = 0 then null else ln((r[1])::numeric/(r[2])::numeric) end x from m)
  select case when x is null then null else (select k from (values ('9:16',9.0/16,1),('4:5',0.8,2),('1:1',1.0,3),('16:9',16.0/9,4)) t(k,val,o) order by abs(x-ln(val)), o limit 1) end from v
$$;
-- same as cd.js lpType() (landing page type): see the function body for the rules, copied one for one
-- (full text as applied: select pg_get_functiondef('public.cd_lp(text)'::regprocedure))

create table if not exists public.cd_meta (k text primary key, as_of date, dirty boolean not null default true, gen int not null default 0, refreshed_at timestamptz, ms int, members int, cards int,
  favs_dirty boolean not null default true);
insert into public.cd_meta (k) values ('cd') on conflict do nothing;
-- one row per released English ad: heavy fields computed once per change (landing type, search text, card JSON)
create table if not exists public.cd_members (id text primary key, gen int not null, live boolean not null default true, vg text not null, ck text not null, bid text, b text, g text, market text, mk text,
  st text, sd date, ed date, dl int, d int, age int, var int, par int, ps int, proven boolean, asp text, kind text, vfs text, vf text[], hf text, hk text, hkind text, ht text, hsrc text,
  ost_or_hk boolean, lp text, cta text, focus boolean, motion int, logo text, sv int not null default 0, hk_hay text, mhay text, j jsonb);
-- narrow per-ad numbers that move with the date or the concept group (days live, variants, parallel launches, Proven score, team saves)
create table if not exists public.cd_mt (id text primary key, vg text not null, ck text, live boolean not null default true, sd date, ed date, dl int, motion int,
  d int, ps int, proven boolean, var int, par int, sv int);
-- one row per card (variant group): stable fields and member JSON
create table if not exists public.cd_cards (vg text primary key, gen int not null, live boolean not null default true, id text not null, min_id text not null, b text, bid text, g text, market text, mk text,
  kind text, ck text, st text, d int, age int, sd_max date, ps int, var int, par int, proven boolean, sv int, motion int, nf int, fl text[], kinds text[], vf text[], vfm text[], hfs text[],
  lp text, cta text, sd date, focus boolean, logo text, nmem int, s_rising int, s_newest int, s_saved numeric, s_longest int, hay text, m jsonb);
-- narrow per-card numbers and sort keys (Proven, Newest, Most saved, Longest running), each with its own index
create table if not exists public.cd_ct (vg text primary key, live boolean not null default true, rep text, min_id text, d int, ps int, proven boolean, sv int, sd_max date,
  s_newest int, s_saved numeric, s_longest int);
-- search text per card (brand, headline, primary text, hook, on-screen text, landing URL, tags, media type, landing type, CTA, group, market), trigram index
create table if not exists public.cd_card_hay (vg text primary key, live boolean not null default true, hay text);
-- one row per Meta page id (the old BRANDS list)
create table if not exists public.cd_brands (bid text primary key, gen int not null, live boolean not null default true, b text, g text, market text, mk text, focus boolean, n int, first_mid text);
-- released-ad ids whose Creative Discovery columns changed since the last sync
create table if not exists public.cd_dirty (id text primary key, at timestamptz not null default now(), done boolean not null default false);

create index if not exists cd_members_vg on public.cd_members (vg);
create index if not exists cd_members_ck on public.cd_members (ck);
create index if not exists cd_members_live_hooks on public.cd_members (ps desc, id) where live and hkind is not null;
create index if not exists cd_members_hkhay on public.cd_members using gin (hk_hay extensions.gin_trgm_ops) where hkind is not null;
create index if not exists cd_mt_vg on public.cd_mt (vg);
create index if not exists cd_mt_ck on public.cd_mt (ck, sd) where live;
create index if not exists cd_ct_ps on public.cd_ct (ps desc, min_id) where live;
create index if not exists cd_ct_newest on public.cd_ct (s_newest desc, min_id) where live;
create index if not exists cd_ct_saved on public.cd_ct (s_saved desc, min_id) where live;
create index if not exists cd_ct_longest on public.cd_ct (s_longest desc, min_id) where live;
create index if not exists cd_ct_sdmax on public.cd_ct (sd_max) where live;
create index if not exists cd_cards_live_jd on public.cd_cards (ps desc, min_id) where live and mk is not null;
create index if not exists cd_cards_live_brand on public.cd_cards (b, ps desc, min_id) where live;
create index if not exists cd_cards_bid on public.cd_cards (bid, gen);
create index if not exists cd_cards_ck on public.cd_cards (ck, gen);
create index if not exists cd_cards_id on public.cd_cards (id);
create index if not exists cd_cards_brands_cover on public.cd_cards (bid, min_id) include (b, g, market, mk, focus) where live;
create index if not exists cd_card_hay_trgm on public.cd_card_hay using gin (hay extensions.gin_trgm_ops);
create index if not exists cd_dirty_todo on public.cd_dirty (at) where not done;
-- (the first build also created a few indexes on cd_cards / cd_members that the final design no longer reads: cd_cards_ps, cd_cards_newest, cd_cards_rising,
--  cd_cards_saved, cd_cards_longest, cd_cards_brand, cd_cards_mk, cd_cards_live_*, cd_cards_hay, cd_members_hooks. They are harmless; safe to drop later.)

alter table public.cd_meta enable row level security; alter table public.cd_members enable row level security; alter table public.cd_mt enable row level security;
alter table public.cd_cards enable row level security; alter table public.cd_ct enable row level security; alter table public.cd_card_hay enable row level security;
alter table public.cd_brands enable row level security; alter table public.cd_dirty enable row level security;

-- change tracking: one cheap upsert per changed row, only when a column Creative Discovery uses really changed
create or replace function public.cd_track() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE','DELETE') then insert into cd_dirty (id) values (old.id) on conflict (id) do update set at = now(), done = false; end if;
  if tg_op in ('INSERT','UPDATE') then insert into cd_dirty (id) values (new.id) on conflict (id) do update set at = now(), done = false; end if;
  return null;
end $$;
create or replace function public.cd_favs_changed() returns trigger language plpgsql security definer set search_path = public as $$
begin update cd_meta set favs_dirty = true where k = 'cd' and not favs_dirty; return null; end $$;
create or replace trigger cd_track_ins after insert on public.in_ads for each row execute function public.cd_track();
create or replace trigger cd_track_del after delete on public.in_ads for each row execute function public.cd_track();
-- cd_track_upd: after update of every column cd.js uses (id, brand ... is_english) for each row when (old cols) is distinct from (new cols); see pg_get_triggerdef
create or replace trigger cd_favs_changed after insert or update or delete on public.in_favs for each statement execute function public.cd_favs_changed();
