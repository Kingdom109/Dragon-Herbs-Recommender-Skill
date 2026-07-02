#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REFERENCES = path.join(ROOT, "references");

const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "am",
  "an",
  "and",
  "are",
  "as",
  "at",
  "but",
  "for",
  "from",
  "have",
  "i",
  "in",
  "is",
  "it",
  "low",
  "me",
  "my",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "worse",
]);

function usage() {
  console.log(`Usage: node scripts/match_issue.js <issue description> [--limit N] [--json]

Examples:
  node scripts/match_issue.js "wired but exhausted, poor sleep, stress, weak digestion" --limit 8
  node scripts/match_issue.js "cold hands, low libido, low drive, fatigue" --json

Ranks Dragon Herbs catalog product profiles against a nuanced issue description.
Use results as research leads to verify against full catalog pages and a qualified TCM practitioner.`);
}

function loadJson(name) {
  const filePath = path.join(REFERENCES, name);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}. Run node scripts/build_catalog_reference.js first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return { help: true };
  }
  let limit = 8;
  let json = false;
  const parts = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--limit") {
      limit = Number(args[++i] || limit);
    } else if (args[i] === "--json") {
      json = true;
    } else {
      parts.push(args[i]);
    }
  }
  return { issue: parts.join(" "), limit, json };
}

function normalize(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalize(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

function phraseHits(text, phrase) {
  const lower = text.toLowerCase();
  const needle = phrase.toLowerCase();
  let count = 0;
  let index = lower.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = lower.indexOf(needle, index + needle.length);
  }
  return count;
}

function expandTerms(issue, expansionMap, healthTopics) {
  const baseTerms = tokenize(issue);
  const terms = new Map();
  for (const term of baseTerms) terms.set(term, Math.max(terms.get(term) || 0, 3));

  for (const [trigger, expansions] of Object.entries(expansionMap)) {
    const triggerTerms = tokenize(trigger);
    const direct = issue.toLowerCase().includes(trigger.toLowerCase());
    const tokenMatch = triggerTerms.some((term) => baseTerms.includes(term));
    if (!direct && !tokenMatch) continue;
    terms.set(trigger.toLowerCase(), Math.max(terms.get(trigger.toLowerCase()) || 0, 4));
    for (const expansion of expansions) {
      terms.set(expansion.toLowerCase(), Math.max(terms.get(expansion.toLowerCase()) || 0, 2));
    }
  }

  for (const topic of healthTopics) {
    const topicLower = topic.toLowerCase();
    if (issue.toLowerCase().includes(topicLower)) {
      terms.set(topicLower, Math.max(terms.get(topicLower) || 0, 4));
      continue;
    }
    const topicTokens = tokenize(topicLower);
    const overlap = topicTokens.filter((term) => baseTerms.includes(term)).length;
    if (overlap && topicTokens.length <= 3) {
      terms.set(topicLower, Math.max(terms.get(topicLower) || 0, 2));
    }
  }

  return Array.from(terms.entries())
    .map(([term, weight]) => ({ term, weight }))
    .sort((a, b) => b.weight - a.weight || a.term.localeCompare(b.term));
}

function flattenPatterns(patternMap) {
  return Object.values(patternMap || {}).flatMap((group) => (Array.isArray(group) ? group : []));
}

function inferPatterns(issue, patternMap) {
  const issueLower = issue.toLowerCase();
  const issueTerms = tokenize(issue);
  const patterns = [];

  for (const pattern of flattenPatterns(patternMap)) {
    let score = 0;
    const matchedTriggers = [];
    for (const trigger of pattern.triggers || []) {
      const triggerLower = trigger.toLowerCase();
      const triggerTerms = tokenize(trigger);
      const exact = issueLower.includes(triggerLower);
      const overlap = triggerTerms.filter((term) => issueTerms.includes(term)).length;
      const tokenMatch = triggerTerms.length <= 1 ? overlap > 0 : overlap === triggerTerms.length;
      if (!exact && !tokenMatch) continue;
      matchedTriggers.push(trigger);
      score += exact ? 6 : overlap * 2;
      if (triggerTerms.length > 1 && tokenMatch) score += 3;
    }
    if (score <= 0) continue;
    patterns.push({
      id: pattern.id,
      label: pattern.label,
      score,
      matchedTriggers,
      addTerms: pattern.addTerms || [],
      catalogPages: pattern.catalogPages || [],
      differentiators: pattern.differentiators || [],
    });
  }

  return patterns.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, 6);
}

function mergePatternTerms(expandedTerms, inferredPatterns) {
  const byTerm = new Map(expandedTerms.map((entry) => [entry.term.toLowerCase(), { ...entry }]));
  for (const pattern of inferredPatterns) {
    const patternWeight = 1;
    for (const term of pattern.addTerms) {
      const key = term.toLowerCase();
      const existing = byTerm.get(key);
      if (existing) {
        existing.weight = Math.max(existing.weight, patternWeight);
      } else {
        byTerm.set(key, { term: key, weight: patternWeight, source: pattern.id });
      }
    }
  }
  return Array.from(byTerm.values()).sort((a, b) => b.weight - a.weight || a.term.localeCompare(b.term));
}

function scoreProfile(profile, expandedTerms) {
  const evidenceText = [
    profile.name,
    profile.sections.join(" "),
    profile.bullets.join(" "),
    profile.traditionalFunctions.join(" "),
    profile.ingredients.join(" "),
    profile.contexts.join(" "),
  ].join(" ");

  let score = 0;
  const hits = [];
  const reasons = [];

  for (const { term, weight, source } of expandedTerms) {
    const rawCount = phraseHits(evidenceText, term);
    const count = source ? Math.min(rawCount, 1) : rawCount;
    if (!count) continue;
    const termScore = source ? weight : count * weight + Math.min(count, 3);
    score += termScore;
    if (!source || weight >= 2) hits.push(term);
    if (source) continue;
    if (profile.name.toLowerCase().includes(term)) {
      score += 8;
      reasons.push(`name matches "${term}"`);
    } else if (profile.bullets.some((bullet) => bullet.toLowerCase().includes(term))) {
      score += 4;
      reasons.push(`bullet/support claim mentions "${term}"`);
    } else if (profile.traditionalFunctions.some((fn) => fn.toLowerCase().includes(term))) {
      score += 5;
      reasons.push(`traditional function mentions "${term}"`);
    }
  }

  const productSection = profile.sections.some((section) =>
    /Capsules|Tinctures|Herbal teas|Superfoods|Herb Cabinet|Nutraceuticals|Shop by Herb/.test(section)
  );
  if (productSection && hits.length) score += 5;

  const uniqueHits = Array.from(new Set(hits));
  score += uniqueHits.length * 2;

  return {
    score,
    hits: uniqueHits,
    reasons: Array.from(new Set(reasons)).slice(0, 5),
  };
}

function scorePage(page, expandedTerms) {
  let score = 0;
  const hits = [];
  for (const { term, weight, source } of expandedTerms) {
    const rawCount = phraseHits(page.text, term);
    const count = source ? Math.min(rawCount, 1) : rawCount;
    if (!count) continue;
    score += source ? weight : count * weight;
    if (!source || weight >= 2) hits.push(term);
  }
  if (/Introduction to tonic herbalism|Health topics/.test(page.section)) score *= 0.55;
  return { score, hits: Array.from(new Set(hits)) };
}

function bestSnippet(text, hits) {
  const lower = text.toLowerCase();
  let first = -1;
  for (const hit of hits) {
    const index = lower.indexOf(hit.toLowerCase());
    if (index !== -1 && (first === -1 || index < first)) first = index;
  }
  if (first === -1) first = 0;
  return normalize(text.slice(Math.max(0, first - 180), Math.min(text.length, first + 520)));
}

function compactProfile(profile, scored) {
  const evidence = [
    ...profile.bullets,
    ...profile.traditionalFunctions,
    ...profile.warnings.map((warning) => `Warning/context: ${warning}`),
  ].filter(Boolean);

  return {
    name: profile.name,
    pages: profile.pages,
    sections: profile.sections,
    score: Math.round(scored.score * 10) / 10,
    hits: scored.hits,
    reasons: scored.reasons,
    evidence: evidence.slice(0, 5),
    warnings: profile.warnings,
    snippet: bestSnippet(profile.contexts.join(" "), scored.hits),
  };
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }

  const profiles = loadJson("product-profiles.json");
  const pages = loadJson("catalog-pages.json");
  const expansionMap = loadJson("query-expansion.json");
  const healthTopics = loadJson("health-topics.json");
  const patternMap = fs.existsSync(path.join(REFERENCES, "tcm-pattern-map.json"))
    ? loadJson("tcm-pattern-map.json")
    : {};
  const inferredPatterns = inferPatterns(options.issue, patternMap);
  const expandedTerms = mergePatternTerms(expandTerms(options.issue, expansionMap, healthTopics), inferredPatterns);

  const productResults = profiles
    .map((profile) => ({ profile, scored: scoreProfile(profile, expandedTerms) }))
    .filter(({ scored }) => scored.score > 0)
    .sort((a, b) => b.scored.score - a.scored.score || a.profile.pages[0] - b.profile.pages[0])
    .slice(0, options.limit || 8)
    .map(({ profile, scored }) => compactProfile(profile, scored));

  const pageResults = pages
    .map((page) => ({ page, scored: scorePage(page, expandedTerms) }))
    .filter(({ scored }) => scored.score > 0)
    .sort((a, b) => b.scored.score - a.scored.score || a.page.page - b.page.page)
    .slice(0, 6)
    .map(({ page, scored }) => ({
      page: page.page,
      section: page.section,
      score: Math.round(scored.score * 10) / 10,
      hits: scored.hits,
      snippet: bestSnippet(page.text, scored.hits),
    }));

  const output = {
    issue: options.issue,
    inferredPatterns,
    expandedTerms,
    productResults,
    supportingPages: pageResults,
  };

  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`Issue: ${options.issue}`);
  if (inferredPatterns.length) {
    console.log("Possible TCM/catalog lenses:");
    for (const pattern of inferredPatterns.slice(0, 4)) {
      console.log(
        `- ${pattern.label} (catalog p. ${pattern.catalogPages.join(", ")}; triggers: ${pattern.matchedTriggers.join(", ")})`
      );
    }
  }
  const directTerms = expandedTerms.filter((entry) => !entry.source).map((entry) => entry.term);
  const patternTerms = expandedTerms.filter((entry) => entry.source).map((entry) => entry.term);
  console.log(`Direct terms: ${directTerms.slice(0, 24).join(", ")}`);
  if (patternTerms.length) console.log(`TCM lens terms: ${patternTerms.slice(0, 24).join(", ")}`);
  console.log("");
  console.log("Best product/profile leads");
  for (const result of productResults) {
    console.log(`\n${result.name} | Catalog p. ${result.pages.join(", ")} | score ${result.score}`);
    console.log(`Hits: ${result.hits.join(", ")}`);
    if (result.reasons.length) console.log(`Why: ${result.reasons.join("; ")}`);
    for (const line of result.evidence.slice(0, 3)) {
      console.log(`- ${line}`);
    }
    if (result.warnings.length) console.log(`Caution: ${result.warnings[0]}`);
  }

  console.log("\nSupporting pages to inspect");
  for (const result of pageResults) {
    console.log(`- Catalog p. ${result.page} (${result.section}), score ${result.score}: ${result.hits.join(", ")}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
