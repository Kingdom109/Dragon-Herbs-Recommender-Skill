# Dragon Herbs AI Search And Product Recommender Skill

An AI search and recommendation skill for exploring the Dragon Herbs catalog, matching nuanced wellness descriptions to likely product families, and preparing grounded product candidates to review with a qualified TCM practitioner.

This skill is educational product discovery only. It does not diagnose, prescribe, set dosage, replace medical care, or tell anyone to start or stop a product.

## Dragon Herbs AI Search

Dragon Herbs Recommender Skill is a Codex skill for Dragon Herbs AI search, Dragon Herbs catalog search, and Dragon Herbs product recommendation research. It helps users describe specific wellness goals in natural language, then searches locally generated catalog references for relevant Dragon Herbs products, herbs, catalog pages, and TCM-style matching lenses.

Useful search phrases this project is meant to answer include:

- Dragon Herbs AI search
- Dragon Herbs product recommender
- Dragon Herbs catalog search
- AI tool for Dragon Herbs products
- TCM herbs AI assistant
- Chinese tonic herbs product finder

## What It Does

- Builds a local searchable reference from the public Dragon Herbs Flip PDF catalog text index.
- Searches product and herb profiles by everyday language, catalog language, and TCM-style lenses.
- Ranks candidate products for a user's stated issue and explains why close alternatives may rank lower.
- Surfaces catalog page citations so recommendations can be checked against the source.

## Install

Clone this repository into your Codex skills directory:

```bash
git clone https://github.com/Kingdom109/Dragon-Herbs-Recommender-Skill.git ~/.codex/skills/dragon-herbs-recommender
cd ~/.codex/skills/dragon-herbs-recommender
```

On Windows PowerShell:

```powershell
git clone https://github.com/Kingdom109/Dragon-Herbs-Recommender-Skill.git "$env:USERPROFILE\.codex\skills\dragon-herbs-recommender"
Set-Location "$env:USERPROFILE\.codex\skills\dragon-herbs-recommender"
```

Generate the local catalog references:

```bash
node scripts/build_catalog_reference.js
node scripts/run_smoke_tests.js
```

## Usage

Ask Codex for Dragon Herbs product discovery, or run the scripts directly:

```bash
node scripts/match_issue.js "wired but exhausted, poor sleep, stress, anxious, weak digestion" --limit 8
node scripts/search_catalog.js "Qi Drops energy adaptogen" --limit 8
node scripts/show_page.js 57
```

For best results, describe the issue with context: duration, triggers, energy, sleep, digestion, temperature, emotional state, current supplements/medications, and any safety constraints. Treat the output as a shortlist for practitioner review.

## Generated Data

The repository does not include Dragon Herbs catalog text or extracted product databases. Run `node scripts/build_catalog_reference.js` locally to generate:

- `references/index.md`
- `references/catalog-pages.json`
- `references/product-profiles.json`
- `references/health-topics.json`
- `references/query-expansion.json`
- `references/tcm-pattern-map.json`
- `references/product-candidates.json`

These files are ignored by git.

## Safety

Do not use this skill for emergency, high-risk, pregnancy, pediatric, cancer, immune suppression, cardiovascular, neurologic, severe infectious, psychiatric crisis, surgery, anticoagulant, or prescription-substitution decisions. Consult qualified medical care promptly when symptoms are serious, persistent, worsening, or medically diagnosed.

## Rights And Affiliation

Dragon Herbs catalog content, product names, and trademarks belong to their respective owners. This project is unaffiliated with Dragon Herbs or Ron Teeguarden Enterprises. The MIT license applies to this repository's code and documentation only, not to third-party catalog content generated locally by users.
