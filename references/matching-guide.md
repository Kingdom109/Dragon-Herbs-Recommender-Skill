# Nuanced Matching Guide

Use this guide when the user describes a specific or nuanced issue and wants the best Dragon Herbs catalog match.

## Intake Dimensions

Capture only what is relevant, but consider these dimensions before ranking products:

- Main issue: what the user wants support for, in their own words.
- Pattern clues: energy, sleep, mood, stress response, digestion, appetite, bowel habits, temperature, dryness, sweating, circulation, pain/tension, libido, urinary, menstrual/reproductive, skin, respiratory, immune, and recovery.
- Timing: acute/chronic, morning/evening, seasonal, after meals, before period, after exertion, after stress, travel, work, or caregiving.
- Direction: deficient/depleted, stuck/stagnant, overheated, cold, dry, damp/heavy, scattered/anxious, wired-tired, weak digestion, poor recovery, or overtaxed.
- Safety context: pregnancy/breastfeeding, age, medications, diagnoses, surgery, allergies, severe or worsening symptoms, and current supplements.

## Search Expansion

Run `node scripts/match_issue.js "<full issue description>" --limit 8` first. Treat its "Possible TCM/catalog lenses" as search hypotheses only. Then run several short follow-up searches rather than relying on one long search. Combine everyday terms with catalog language.

- Stress, worry, anxiety, grief, heartbreak, emotional overwhelm: `shen calm mood anxiety grief worry stress`, `spirit stabilizing shen`, `Liver Qi`, `Heart Shen`.
- Sleep or insomnia: `sleep insomnia shen calm`, `peaceful sleep`, `Heart Spleen`, `Yin Jing Shen`.
- Fatigue or low energy: `energy fatigue qi adaptogen`, `Qi tonic vitality`, `Spleen Lung Kidney`, `Jing depletion`.
- Burnout, overwork, caregiving, wired-tired: `stress protection adrenal adaptogen`, `caregivers exhaustion Jing Qi Shen`, `replenish Jing`.
- Digestion, bloating, appetite: `digestion spleen stomach bloating`, `Qi flow digestive`, `Spleen Pancreas`, `stagnated food`.
- Immune or getting sick often: `immune wei qi protection`, `adaptogenic immune regulating`, `Lung Spleen Kidney`.
- Libido, fertility, reproductive vitality: `libido Jing Kidney Yang`, `sexuality reproductive Jing`, `male female sexuality`.
- Circulation, blood, cold hands/feet: `blood circulation microcirculation`, `Blood tonic`, `vitalizes blood`, `cold dampness`.
- Skin, detox, lymph, heat/damp: `skin detox lymphatic heat dampness`, `cleanse detox`, `Cellular Detox`.
- Focus, memory, mental performance: `mental focus concentration memory`, `brain Shen Qi`, `Lion's Mane`, `student`.
- Respiratory, throat, voice: `lung respiratory throat voice`, `Protective Qi`, `Golden Voice`.

## Ranking Heuristic

Prefer products that match the user's core issue and pattern, not merely one keyword.

Strong evidence:

- Product page directly names the issue or a very close synonym.
- Traditional Functions align with the user's pattern clues.
- Ingredients or herb pages reinforce the same direction.
- Health Topics A-Z includes a matching topic that points toward the same product family.
- `match_issue.js` ranks the product highly and full-page inspection confirms the evidence belongs to that product, not a neighboring two-column entry.
- The inferred TCM/catalog lens is supported by catalog teaching pages and the product's own page uses aligned language.

Moderate evidence:

- Page text describes a related function but not the user's exact issue.
- A single herb page fits well, but the product formulation needs more verification.
- The match fits one symptom while ignoring major secondary clues.

Weak evidence:

- Only a general tonic concept matches.
- The hit comes from introductory theory pages rather than product pages.
- The extracted candidate name looks noisy or uncertain.
- The product profile appears to contain text from an adjacent product due to two-column catalog extraction.

## Verification Loop

For the final short list:

1. Run `node scripts/match_issue.js "<issue>" --limit 8`.
2. Note inferred lenses and their catalog teaching pages.
3. Open each candidate's full page with `node scripts/show_page.js <page>`.
4. Confirm the relevant claim is actually near the product name.
5. If a page has two-column interleaving, downgrade the match unless the same product is supported elsewhere.
6. Run one or two targeted `search_catalog.js` follow-ups for decisive terms or ingredients.

## Adding More Resources

If the user provides additional TCM resources, keep them separate from Dragon Herbs catalog evidence:

- Add a new reference file such as `references/external-tcm-notes.md` or a structured JSON map.
- Mark each entry with source, scope, and confidence.
- Use external material to expand search hypotheses, not to override catalog page citations.
- In user-facing answers, distinguish "catalog says" from "external TCM note suggests."

## Response Shape

For nuanced requests, use this compact structure:

1. Safety/context note: one or two sentences.
2. Best matches: ranked table with product, catalog page, why it fits, and caveats.
3. Close alternatives: why they may fit but are less exact.
4. Questions for the TCM doctor: differentiators that would change the pick.
5. Evidence gaps: what the catalog does not establish.

Do not create a final protocol, dosage, stack, or purchase instruction.
