# unaware-calc v2 — Changes

## New feature: Extraction Masteries toggle
- All three calculators now have a **Masteries** button next to the Oghmir one.
- When selected, extraction from ore yields **+6%** (any tool except the
  Refining Oven). Stacks multiplicatively with Oghmir: 1.03 x 1.06 = +9.2%.
- To make it additive instead, change one line in `src/lib/model.ts`
  (`yieldMultiplier`).

## Renamed calculators (routes unchanged, no links break)
- Gatherer Calculator  -> **Shopping List** — "I want to make X, what do I gather?"
- Refiner Calculator   -> **What Can I Make?** — "I have X, what does it turn into?"
- Optimized Calculator -> **Smart Planner** — "I want X and already have some parts."
- Home page cards now carry a one-line tagline plus a plain-English description;
  each calculator page got a matching subtitle under its title.

## Refactor
- New `src/lib/model.ts` is the single source of truth for: the resource graph
  (previously parsed twice, in calculations.ts AND tree_traversal.ts), the
  base-ore list (previously hardcoded in 3 places), the bonus math (previously
  copy-pasted 6 times), and the ceil/floor rounding rules.
- `calculations.ts` rewritten on top of it; anonymous positional tuples like
  `[string, number, string, [string, number][], string, number]` replaced with
  a typed `ChainStep` interface.
- Bonus flags are now one `BonusOptions` object (`{ isOghmir, hasMasteries }`)
  instead of a growing list of boolean parameters.

## Bug fixes
- **Catalyst consumption no longer inflated by yield bonuses.** The old code
  multiplied catalyst amounts by the Oghmir factor, so being Oghmir made you
  spend MORE Bor/Coke. Catalyst use now scales with input amount only.
  (Shopping lists for Oghmir characters will be very slightly cheaper.)
- **Vendor cost aggregation.** When several purchases of the same catalyst were
  combined into one "Buy from Vendor" line, the old code showed the price of
  the largest single purchase instead of the total. Prices now sum.
- Data typos fixed in `norsca.json`: "Suburra Powder" -> "Saburra Powder"
  (Cerulite crusher output), "Greater Natorous" -> "Greater Natorus" (6 rows;
  the typo made those rows a *different tool* from correctly-spelled entries).

## Not changed
- Routes/URLs, page styling, the overall UI structure, refining.json,
  vendor.json, and the notebook are untouched.
