# Hook format re-read brief (task cd-build-fix, 9 Nov 2026)

You label the on-screen HOOK TEXT of ads (text visible in the first 3 seconds, or the main text of an image ad).
Each hook gets exactly one hook_format and, when it has a reusable structure, one hook_template.

## Formats (pick ONE; check them in this order, first that clearly fits wins)
1. Teaser / Knock knock: withholds the payoff to make you keep watching ("KNOCK KNOCK...", "wait for it", "guess what", "you won't believe", "coming soon").
2. Offer / Price first: a price, discount, sale, promo, free shipping, Black Friday, "from $X", "% off".
3. Countdown / Urgency: time or stock pressure ("last chance", "ends tonight", "selling fast", "limited", "only 3 days").
4. Question: the hook is a question to the viewer ("Which one are you choosing?", "What's your way?").
5. List / How to: numbered list, tips, how-to, ways to, guide, steps, "3 outfits", gift guide with a list structure.
6. Style tip / Outfit: styling advice or outfit building ("how I style", "style it with", "outfit for fall", "proof monochrome never fails", "X >>>" outfit preference, "starter pack", "get the look", "fit check" of an outfit).
7. POV / Relatable: POV, "me when", "when you...", relatable everyday moment or inner monologue ("I have nothing to wear...", "algorithm knows I'm looking for...").
8. Skit / Scenario: an acted scene, dialogue, phone call, story setup, or narrative beat ("Incoming call, K.J. Jackson.", "OVER HERE NO NOT THAT WAY", "On Monday she called her mum.", "Cooper Flagg's been living in our stockroom").
9. Creator / Talking head: a creator or person speaking in first person to camera, day-in-the-life, unboxing/haul, "this is a little morning with me", "shoot day with...", "My name is Emile, I'm a DJ", behind the scenes told by a person.
10. Social proof / Trend: reviews, stars, "viral", "sold out", "best seller", "everyone is wearing", award, testimonials quoted.
11. Callout: speaks directly to a type of viewer or tells them something ("You need...", "If you...", "Calling all runners", "This is your sign", "Men deserve to be spoiled too").
12. Drop / New in alert: genuinely announces something NEW or newly available ("New in", "Just dropped", "Out now", "Now available", "Introducing", "back in stock", "new graphics"). Not just any mention of a product or "exclusive". "Life is too short, elevate your outfits with JD exclusives" is NOT a drop.
13. Store / Location: a specific store, mall, city store, address, store opening/reopening, event at a store, "come down to JD Trafford Centre", "find them at JD Perth Hay St", "visit us in-store", "only at JD" when the point is where to buy.
14. Seasonal / Occasion: season, weather or occasion is the hook ("KEEP THINGS COSY", "Fall wedding ready", "Warm weather refresh", "Gifts for kids", "back to school", "festival", "holiday", "cold weather dressing", "stepping into fall").
15. Collection / Campaign line: a collection name, campaign slogan or brand tagline used as the hook ("CREATE THE NEW", "SOFT SCULPT", "CLEAN 90. 10 YEARS.", "It Starts Outside.", "WELL WORN", "Never Stop Exploring", "COZIEST IN CASHMERE" if it is the campaign line).
16. Brand or collab callout: the hook is just a brand, retailer or collab name, or names a collaboration ("Little Burgundy", "Dr. Martens", "NETFLIX DEMON HUNTERS", "ADIDAS X ...", "Clarks").
17. Product name reveal: the hook mainly names the product/model ("ENDORPHIN SPEED", "WOOL BLEND BEANIE", "Naples Wrapped Cognac", "Nike Air Max 95", "The North Face Universal Day pack").
18. Statement / Claim: a REAL claim about the product or brand: a benefit, feature, performance or superlative ("ULTRA LIGHT CONSTRUCTION ROBUST PROTECTION", "VIRTUALLY SWEAT-PROOF", "These clogs feel like walking pillows", "May lead to personal bests", "ALL-DAY COMFORT", "GORE-TEX" as a feature, "Denim Made Iconic"). Use this ONLY for real claims, not as a catch-all.
19. Other / Unreadable: machine-read garbage or fragments you cannot interpret ("BETA A I BETAAR", "A IS TIA A", "ater", "VIG VNCE"), or non-English text, or coordinates only.

If a hook mixes two, pick what the viewer reads FIRST and what the hook is FOR. OCR (machine read) text is noisy: read through obvious typos ("D.Marlens" = Dr. Martens -> Brand or collab callout). Use the brand column for context.

## hook_template (or null)
A reusable pattern another brand could copy. UPPER CASE, no emoji, keep the original wording except swap specifics for these placeholders ONLY:
[PRODUCT] (product or model name), [BRAND] (brand or collab name), [SEASON] (season, weather, holiday, occasion), [STORE] (a specific store, mall, city or address), [COLLECTION] (collection or campaign name), [PRICE] (price or discount amount), [N] (another number), [DATE] (date or time).
- Write "JD" for JD Sports. Keep it short (cut filler, max about 60 chars). Trim OCR noise.
- Make templates as GENERAL as possible so the same pattern written by another brand gets the SAME string: e.g. "KNOCK KNOCK... [PRODUCT] AT JD", "[PRODUCT] ONLY AT JD", "FIND [PRODUCT] AT [STORE]", "NEW IN: [PRODUCT]", "[N]% OFF [PRODUCT]", "[SEASON] FITS YOU'LL WEAR EVERYWHERE", "HOW I STYLE [PRODUCT]", "THIS OR THAT: WHICH ONE ARE YOU CHOOSING?" is NOT a template (no placeholder) -> unless you write "[PRODUCT] OR [PRODUCT]: WHICH ONE?".
- The template MUST contain at least one placeholder. If you cannot generalise it with a placeholder (it is just the hook in capitals, a pure slogan, garbage), template = null.
- Prefer these canonical shapes when they fit (exact spelling): "NEW IN: [PRODUCT]", "[PRODUCT] ONLY AT JD", "[PRODUCT] AT JD", "SHOP [PRODUCT] AT [STORE]", "FIND YOUR FIT AT [STORE]", "[N]% OFF [PRODUCT]", "UP TO [N]% OFF", "[PRICE] [PRODUCT]", "HOW I STYLE [PRODUCT]", "[N] WAYS TO STYLE [PRODUCT]", "[SEASON] ESSENTIALS", "[SEASON] EDIT", "GIFTS FOR [N]", "[BRAND] X [BRAND]", "[COLLECTION] COLLECTION", "THE [PRODUCT]", "[PRODUCT] >>>", "POV: [SCENARIO]" is not allowed (use only the listed placeholders), "WHICH [PRODUCT] ARE YOU CHOOSING?".

## Output
Write rows into Supabase (project cymkcvdsxoneojfisjgk) with the execute_sql tool, 40 to 60 rows per statement:
insert into public.cd_hook_labels (hook_key, hook_format, hook_template) values ('<hook_key>','<format exactly as named above>', '<TEMPLATE>' or null), ... on conflict (hook_key) do update set hook_format=excluded.hook_format, hook_template=excluded.hook_template, labelled_at=now();
Escape single quotes by doubling them. Format names must match the list above exactly (19 names).
