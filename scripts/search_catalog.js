#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REFERENCES = path.join(ROOT, "references");
const PAGES_PATH = path.join(REFERENCES, "catalog-pages.json");
const CANDIDATES_PATH = path.join(REFERENCES, "product-candidates.json");
const PROFILES_PATH = path.join(REFERENCES, "product-profiles.json");

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "for",
  "from",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

function usage() {
  console.log(`Usage: node scripts/search_catalog.js <query> [--limit N] [--json]

Examples:
  node scripts/search_catalog.js "stress sleep shen calm" --limit 8
  node scripts/search_catalog.js "digestion spleen qi" --json

Searches generated Dragon Herbs catalog references. Run:
  node scripts/build_catalog_reference.js
first if references are missing.`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    return { help: true };
  }
  let limit = 10;
  let json = false;
  const queryParts = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--limit") {
      limit = Number(args[++i] || limit);
    } else if (arg === "--json") {
      json = true;
    } else {
      queryParts.push(arg);
    }
  }
  return { query: queryParts.join(" "), limit, json };
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${filePath}. Run node scripts/build_catalog_reference.js first.`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function termsFor(query) {
  return String(query || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

function countOccurrences(text, term) {
  let count = 0;
  let index = text.indexOf(term);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(term, index + term.length);
  }
  return count;
}

function scoreText(text, terms) {
  const lower = text.toLowerCase();
  let score = 0;
  const hits = [];
  for (const term of terms) {
    const count = countOccurrences(lower, term);
    if (count > 0) {
      hits.push(term);
      score += count;
    }
  }
  score += hits.length * 3;
  return { score, hits };
}

function snippet(text, terms) {
  const lower = text.toLowerCase();
  let first = -1;
  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index !== -1 && (first === -1 || index < first)) first = index;
  }
  if (first === -1) first = 0;
  const start = Math.max(0, first - 160);
  const end = Math.min(text.length, first + 420);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    return;
  }
  const terms = termsFor(options.query);
  if (terms.length === 0) {
    throw new Error("Query did not contain searchable terms.");
  }

  const pages = loadJson(PAGES_PATH);
  const candidates = loadJson(CANDIDATES_PATH);
  const profiles = fs.existsSync(PROFILES_PATH) ? loadJson(PROFILES_PATH) : [];

  const pageResults = pages
    .map((page) => {
      const scored = scoreText(page.text, terms);
      return {
        type: "page",
        page: page.page,
        section: page.section,
        score: scored.score,
        hits: scored.hits,
        snippet: snippet(page.text, terms),
      };
    })
    .filter((result) => result.score > 0);

  const candidateResults = candidates
    .map((candidate) => {
      const text = `${candidate.name} ${candidate.section} ${candidate.context}`;
      const scored = scoreText(text, terms);
      return {
        type: "candidate",
        name: candidate.name,
        page: candidate.page,
        section: candidate.section,
        score: scored.score + (scored.hits.length ? 2 : 0),
        hits: scored.hits,
        snippet: candidate.context,
      };
    })
    .filter((result) => result.score > 0);

  const profileResults = profiles
    .map((profile) => {
      const text = [
        profile.name,
        profile.sections.join(" "),
        profile.bullets.join(" "),
        profile.traditionalFunctions.join(" "),
        profile.ingredients.join(" "),
        profile.contexts.join(" "),
      ].join(" ");
      const scored = scoreText(text, terms);
      return {
        type: "profile",
        name: profile.name,
        page: profile.pages[0],
        pages: profile.pages,
        section: profile.sections.join(", "),
        score: scored.score + (scored.hits.length ? 5 : 0),
        hits: scored.hits,
        snippet: snippet(text, terms),
      };
    })
    .filter((result) => result.score > 0);

  const results = candidateResults
    .concat(profileResults)
    .concat(pageResults)
    .sort((a, b) => b.score - a.score || a.page - b.page)
    .slice(0, options.limit || 10);

  if (options.json) {
    console.log(JSON.stringify({ query: options.query, terms, results }, null, 2));
    return;
  }

  console.log(`Query: ${options.query}`);
  console.log(`Terms: ${terms.join(", ")}`);
  console.log("");
  for (const result of results) {
    const label = result.type === "candidate" ? result.name : `Page ${result.page}`;
    const displayLabel = result.type === "profile" ? result.name : label;
    const pageLabel = result.pages ? result.pages.join(", ") : result.page;
    console.log(`${displayLabel} | Catalog p. ${pageLabel} | ${result.section} | score ${result.score}`);
    console.log(`Hits: ${result.hits.join(", ")}`);
    console.log(`${result.snippet.slice(0, 700)}${result.snippet.length > 700 ? "..." : ""}`);
    console.log("");
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
