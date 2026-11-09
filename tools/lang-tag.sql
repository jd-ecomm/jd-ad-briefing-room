-- Write tools/lang-tag.py output back to in_ads in one statement.
-- Replace :N, :MD5, :LANGS (text[] literal) and :CODES with the values the script printed.
-- The guard (row count + md5 of the ordered ids) makes the update a no-op if rows changed since the export.
-- Export used:  select json_agg(json_build_object('id',id,'copy',left(copy,500),'headline',left(headline,200),'market',market) order by id)
--               from in_ads where lang is null;
-- (9 Nov 2026 run: the same codes were run-length encoded with a symbol book to keep the statement small,
--  confidence floored to 0.05 steps, which keeps the 0.8 threshold exact; result verified by md5 of id||lang||conf.)
with s as (select id, row_number() over (order by id) rn from in_ads where lang is null),
chk as (select count(*) n, md5(string_agg(id, ',' order by id)) h from s),
b as (select '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'::text b62, :LANGS::text[] langs, :CODES::text codes),
v as (select s.id,
        b.langs[strpos(b.b62, substr(b.codes, 2*s.rn::int-1, 1))] lang,
        round(((strpos(b.b62, substr(b.codes, 2*s.rn::int, 1))-1)/61.0)::numeric, 3)::real conf
      from s, b)
update in_ads t set lang = v.lang, lang_conf = v.conf
from v, chk
where t.id = v.id and chk.n = :N and chk.h = :MD5;

-- is_english (re-run any time):
update in_ads set is_english = coalesce(
  (lang = 'en' and lang_conf >= 0.8)
  or (coalesce(cardinality(regexp_split_to_array(nullif(trim(coalesce(nullif(copy,''), headline, '')), ''), '\s+')), 0) < 4
      and market in ('UK','US','AU','CA','NZ','IE','ZA','IN','SG','Global')), false)
where lang is not null;
