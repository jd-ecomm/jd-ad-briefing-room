-- Creative Discovery card fix (10 Nov 2026, Ryan: "folding quite a lot of ads into cards. Not all of which match exactly as variants ...
-- implement this fix for JD as well"). Before: variant_group = brand + normalised copy + landing URL, chained by start dates,
-- so a brand testing many creatives behind one caption became one card (8,065 cards; 1,569 of 2,217 multi-ad cards held
-- several ads of the same size; biggest 66). Now: a card is ONE creative; only the same creative in another size is a variant.
-- Within each copy group, members (by start date) go into the first card with the same display format, no ad of the same
-- aspect bucket yet, and a start date within 3 days; otherwise a new card. After: 12,184 cards, 1,502 multi-size, 0 with a
-- repeated size, biggest 3. Additive: variant_group_v1 keeps the old value (restore: update in_ads set variant_group =
-- variant_group_v1), copy_group keeps the copy-based group for "Same copy, N creatives".
alter table public.in_ads add column if not exists variant_group_v1 text, add column if not exists copy_group text;
update public.in_ads set variant_group_v1 = variant_group where variant_group_v1 is null and variant_group is not null;
update public.in_ads set copy_group = variant_group_v1 where copy_group is null and variant_group_v1 is not null;
-- function public.cd_regroup_variants() (see Supabase; greedy placement described above), then:
select public.cd_regroup_variants();
-- formats rebuilt for every group (same expression as migrations/20261109_creative_discovery_batch3.sql step 4, over all groups),
-- then select public.cd_refresh(); to rebuild the page cache.
