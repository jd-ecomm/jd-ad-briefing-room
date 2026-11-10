-- "New" tag (Ryan, 10 Nov 2026: "Tag new ads with new").
-- released_at = when an ad was released to Creative Discovery by a weekly or light pull (not the 6 to 9 Nov backfill batches 1 to 3).
-- The page shows a NEW badge on ads released in the last 7 days.
alter table public.in_ads add column if not exists released_at timestamptz;
update public.in_ads set released_at = '2026-11-10 04:45:00+00' where batch = 4 and released_at is null;

-- carry released_at into the lead-ad JSON (cd_members.j) that the cards read
do $$
declare d text;
begin
  d := pg_get_functiondef('public.cd_sync_heavy(text[],integer)'::regprocedure);
  if position('''released_at''' in d) = 0 then
    d := replace(d, '''hook_template'',k.hook_template,''hook_source'',k.hook_source,''ad_library'',k.ad_library))',
                    '''hook_template'',k.hook_template,''hook_source'',k.hook_source,''ad_library'',k.ad_library,''released_at'',k.released_at))');
    if position('''released_at''' in d) = 0 then raise exception 'cd_sync_heavy anchor not found'; end if;
    execute d;
  end if;
end $$;

-- backfill the JSON of ads already synced (no re-sync needed)
update public.cd_members m set j = m.j || jsonb_build_object('released_at', a.released_at)
from public.in_ads a where a.id = m.id and a.released_at is not null and not (m.j ? 'released_at');
