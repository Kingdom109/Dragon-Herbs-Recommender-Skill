# Dragon Herbs AI Search And Product Recommender

Dragon Herbs Recommender Skill is a public Codex skill for Dragon Herbs AI search, Dragon Herbs catalog search, and Dragon Herbs product recommendation research.

The skill helps users describe nuanced wellness goals in natural language, then searches locally generated Dragon Herbs catalog references for relevant product candidates, herbs, catalog pages, and TCM-style matching lenses to review with a qualified practitioner.

## What It Helps With

- Searching the Dragon Herbs catalog with natural language
- Matching wellness descriptions to likely Dragon Herbs product families
- Comparing close product candidates with catalog page citations
- Translating everyday issue descriptions into Dragon Herbs and TCM-style search angles
- Preparing product shortlists for practitioner review

## Install

```bash
git clone https://github.com/Kingdom109/Dragon-Herbs-Recommender-Skill.git ~/.codex/skills/dragon-herbs-recommender
cd ~/.codex/skills/dragon-herbs-recommender
node scripts/build_catalog_reference.js
node scripts/run_smoke_tests.js
```

## Example Searches

```bash
node scripts/match_issue.js "wired but exhausted, poor sleep, stress, anxious, weak digestion" --limit 8
node scripts/search_catalog.js "Qi Drops energy adaptogen" --limit 8
node scripts/show_page.js 57
```

## Important Safety Note

This project is educational product discovery only. It does not diagnose, prescribe, set dosage, replace medical care, or tell anyone to start or stop a product. Use it to prepare questions and candidates for a qualified TCM practitioner or clinician.

## Repository

[View the GitHub repository](https://github.com/Kingdom109/Dragon-Herbs-Recommender-Skill)
