---
name: dragon-herbs-recommender
description: Use this skill when the user wants help exploring Dragon Herbs catalog products, comparing tonic herbs or formulas, matching everyday wellness goals to catalog options, or preparing product candidates to review with a TCM doctor. This skill is for educational product discovery only, not diagnosis, prescription, dosage, or individualized medical treatment.
---

# Dragon Herbs Recommender

## Scope

Use this skill to help the user explore a locally generated Dragon Herbs Catalog 5.1 reference and identify the best-matching catalog products that may be worth discussing with a qualified TCM practitioner. Ground answers in the local catalog references and cite catalog pages.

This skill is educational product discovery. Do not diagnose, prescribe, choose a final medicine for the user, set dosage, tell the user to start/stop a product, or replace professional care.

## Workflow

1. Clarify the user's goal in plain language:
   - Main issue or desired support.
   - Duration, severity, and whether symptoms are new, worsening, or medically diagnosed.
   - Safety context: pregnancy/breastfeeding, child/older adult, prescription medicines, chronic disease, surgery, immune suppression, cancer, cardiovascular/neurologic/infectious disease, allergies, and current herbs/supplements.
2. Open `references/index.md` first to understand source version, page ranges, and generated files. If it is missing, run `node scripts/build_catalog_reference.js` from this skill directory before matching.
3. Build a matching profile before searching:
   - Primary complaint or desired support.
   - Secondary symptoms, triggers, timing, constitution clues, emotional state, digestion, sleep, temperature, energy, pain, cycle/sexual/reproductive context if relevant, and what has already helped or worsened things.
   - Safety exclusions and practitioner-review questions.
4. Search the catalog thoroughly:
   - Prefer `node scripts/match_issue.js "<full issue description>" --limit 8` for nuanced matching and ranked product leads.
   - Use `node scripts/search_catalog.js "<query>" --limit 8` for narrower follow-up searches, exact product names, ingredient checks, or second-pass verification.
   - Open `references/matching-guide.md` and expand the user's wording into multiple catalog search angles.
   - Search both everyday terms and Dragon Herbs/TCM categories, such as Jing, Qi, Shen, Blood, Yin, Yang, Spleen, Liver, Kidney, Lung, Heart, dampness, heat, cold, dryness, stagnation, adaptogen, tonic, calming, circulation, and digestion when relevant.
   - Treat `match_issue.js` "Possible TCM/catalog lenses" as hypotheses for search and practitioner discussion, not diagnosis.
   - Search Health Topics A-Z terms from catalog page 115, then follow likely product/herb pages.
   - Use `references/catalog-pages.json` for page-level evidence and exact page citations.
   - Use `references/product-profiles.json` for extracted product/herb profiles, but treat it as a heuristic index; verify against page text before recommending.
   - Use `references/product-candidates.json` only for debugging or tracing raw extraction.
   - Use `node scripts/show_page.js <page>` to inspect the full text around promising page hits.
5. For nuanced issues, run at least three search passes:
   - User's exact words.
   - Functional/biomedical synonyms.
   - TCM/Dragon Herbs categories and likely organ/treasure language.
   Then compare pages that recur across passes.
6. Answer with:
   - A short safety framing if the user describes real symptoms.
   - 2-5 candidate products or catalog areas, ranked by best fit.
   - Why each candidate matched, using catalog language and page citations.
   - Why close alternatives ranked lower.
   - Differentiating questions the user should bring to a TCM doctor.
   - Clear cautions and gaps where the catalog does not provide enough basis.
7. If the user has selected products already, compare them side by side using catalog claims, ingredients, traditional functions, and page citations.
8. If the concern is high-stakes, urgent, or outside ordinary wellness exploration, prioritize clinical care and keep any product discussion secondary and non-directive.

## Matching Standard

Aim for the exact best catalog match, but do not invent certainty. A strong match should satisfy most of these:

- The product page directly names the issue, function, or traditional pattern.
- The product's traditional functions fit the user's profile better than nearby alternatives.
- Ingredients or herb pages support the same direction.
- The catalog section or Health Topics A-Z entry points toward the same product family.
- Catalog-grounded TCM lenses point toward the same family and cite relevant teaching pages.
- The match does not raise obvious safety conflicts from the user's context.

If no strong match appears, say that the catalog does not provide a clean match and give the closest research leads instead of forcing a recommendation.

## Safety Rules

- Never present catalog claims as proven treatment for disease. Attribute claims to the catalog.
- Do not provide individualized diagnosis, prescription, dosage, timing, cycling, combining, stopping, or substitution instructions.
- Do not advise delaying, avoiding, or replacing medical care, testing, vaccines, surgery, chemotherapy, antibiotics, psychiatric care, prescription medication, or emergency care.
- For pregnancy, breastfeeding, children, older adults, cancer, autoimmune disease, transplant/immune suppression, cardiovascular disease, neurologic symptoms, infection, psychiatric crisis, bleeding disorders, anticoagulants, surgery, severe pain, chest pain, breathing difficulty, fainting, seizure, stroke-like symptoms, poisoning, allergic reaction, severe dehydration, persistent high fever, severe abdominal pain, unexplained bleeding, or rapidly worsening symptoms, tell the user to consult qualified medical care promptly or emergency care when appropriate.
- When the catalog itself mentions physician consultation, obesity, disease, or other warnings, surface that caution.
- If product names, OCR text, or extracted headings look uncertain, say so and cite the page instead of overstating.

## Reference Files

- `references/index.md`: generated source summary and page-range map.
- `references/matching-guide.md`: query-expansion and ranking protocol for nuanced issues.
- `references/catalog-pages.json`: full catalog page text with page numbers and sections.
- `references/product-profiles.json`: merged product/herb profiles with bullets, traditional functions, ingredients, warnings, contexts, and pages.
- `references/health-topics.json`: topic terms extracted from the catalog Health Topics A-Z page.
- `references/query-expansion.json`: local synonym and Dragon Herbs/TCM pattern expansion map used by `match_issue.js`.
- `references/tcm-pattern-map.json`: catalog-grounded Yin/Yang, Three Treasures, Organ-system, emotion, and environmental lenses used by `match_issue.js`.
- `references/product-candidates.json`: lower-level raw candidates extracted from `†` markers, mainly for debugging extraction.

## Maintenance

Run `node scripts/build_catalog_reference.js` from this skill directory to generate or refresh local references from the live Dragon Herbs Flip PDF text index. Generated catalog data is intentionally not included in the public repository.

Run `node scripts/match_issue.js --help`, `node scripts/search_catalog.js --help`, and `node scripts/show_page.js --help` for usage.

Smoke-test with nuanced concerns such as:

- `wired but exhausted, poor sleep, stress, anxious, weak digestion`
- `bloating after meals, weak appetite, gas, low energy`
- `cold hands, low drive, low libido, tired, poor motivation`

Run `node scripts/run_smoke_tests.js` after changing extraction, query expansion, or TCM pattern logic.

`agents/openai.yaml` is intentionally omitted; the default Codex model is sufficient because the skill relies on local references and scripts.
