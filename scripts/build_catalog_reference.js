#!/usr/bin/env node
"use strict";

const fs = require("fs");
const https = require("https");
const path = require("path");
const vm = require("vm");

const CATALOG_TEXT_URL =
  "https://www.dragonherbs.com//media/catalog/product/dh-custom/catalog5/mobile/javascript/search_config.js";
const CATALOG_VIEWER_URL =
  "https://www.dragonherbs.com//media/catalog/product/dh-custom/catalog5/mobile/index.html#p=1";

const ROOT = path.resolve(__dirname, "..");
const REFERENCES = path.join(ROOT, "references");

const SECTION_RANGES = [
  ["Front matter and contents", 1, 2],
  ["Introduction to Dragon Herbs", 3, 9],
  ["Shop by Herb", 10, 31],
  ["Capsules A-Z", 32, 49],
  ["Tinctures A-Z", 50, 58],
  ["Herbal Science", 59, 59],
  ["Nutraceuticals", 60, 61],
  ["Herb Cabinet Staples", 62, 63],
  ["Superfoods", 64, 71],
  ["eeTee cold brew instant granules", 72, 74],
  ["Elixir pouches", 75, 75],
  ["Herbal teas", 76, 89],
  ["Teaware and accessories", 90, 97],
  ["Books", 98, 98],
  ["Introduction to tonic herbalism", 99, 113],
  ["Getting started and customization", 114, 114],
  ["Health topics and solutions A-Z", 115, 117],
];

const BAD_CANDIDATE_NAMES = new Set([
  "and",
  "for",
  "of",
  "of the",
  "the",
  "with",
  "promotes",
  "helps",
  "functions",
  "peaceful",
  "powerful a",
  "drops",
  "tee",
  "treasure",
  "beauty",
  "secret",
  "mane",
  "sin",
  "cidum",
  "bolism",
  "cap sules",
  "cap sules dragon drops",
  "signature series classic tonics",
  "special series classic special",
  "over a long period of time",
]);

function usage() {
  console.log(`Usage: node scripts/build_catalog_reference.js

Downloads Dragon Herbs Catalog 5.1 search text and writes:
  references/index.md
  references/catalog-pages.json
  references/product-candidates.json
  references/product-profiles.json
  references/health-topics.json
  references/query-expansion.json
  references/tcm-pattern-map.json

No external npm dependencies are required.`);
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function parseTextForPages(jsSource) {
  const sandbox = {};
  vm.runInNewContext(jsSource.replace(/^\uFEFF/, ""), sandbox, { timeout: 5000 });
  if (!Array.isArray(sandbox.textForPages)) {
    throw new Error("Catalog source did not define textForPages array");
  }
  return sandbox.textForPages;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\n]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function sectionForPage(page) {
  const found = SECTION_RANGES.find(([, start, end]) => page >= start && page <= end);
  return found ? found[0] : "Unmapped";
}

function stripCatalogNoise(text) {
  return normalizeText(text)
    .replace(/[\uF000-\uF8FF]/g, " | ")
    .replace(/\b(?:Most of our capsule products are vegan|Dragon Herbs Capsules A - Z|Tinctures A - Z|Teas - [A-Za-z ]+)\b/g, " | ")
    .replace(/\b(?:Please visit our website|Free Consultations|Licensed Herbalists|Vegan Capsules made from pullulan).*$/i, " ")
    .replace(/\$\d+(?:\.\d+)?\s+#\d+[A-Za-z0-9.,/\s-]{0,45}/g, " | ")
    .replace(/#\d+[A-Za-z0-9.,/\s-]{0,35}/g, " | ")
    .replace(/\b(?:NV|Vegan|Non Vegan)\b/g, " ")
    .replace(/\b[A-Z]\b(?=\s+[A-Z][A-Za-z])/g, " ");
}

function titleCaseTail(text) {
  const titleWord = "(?:[A-Z][A-Za-z0-9'&™®№.-]+|[A-Z]+|and|or|of|the|The|in|a|A|to|for|with|&)";
  const matches = Array.from(text.matchAll(new RegExp(`${titleWord}(?:\\s+${titleWord}){0,8}`, "g")))
    .map((match) => normalizeText(match[0]))
    .filter((match) => /[A-Za-z]{3}/.test(match));
  return matches.length ? matches[matches.length - 1] : "";
}

function cleanCandidateName(raw) {
  let text = stripCatalogNoise(raw)
    .replace(/\b(Traditional Functions|Classic Name|Ingredients|Directions|Supports|Flavor|Latin|Pin Yin)\b/gi, " | ")
    .replace(/^(See Shop By Herb under|Shop By Herb|Alphabetical order based on key words)\b.*$/i, "")
    .trim();

  const parts = text
    .split(/[.!?•|]|\s-\s|\s\*\s/)
    .map((part) => normalizeText(part))
    .filter(Boolean);
  text = parts.length ? parts[parts.length - 1] : text;
  text = text.split("†").pop().trim();
  text = text.replace(/^(and|or|the|a|an)\s+/i, "");
  text = text.replace(/\b(?:for details|under [A-Z]\s*-\s*)\b.*$/i, "").trim();

  if (text.split(/\s+/).length > 8 || /[a-z]\s+[a-z]/.test(text)) {
    const tail = titleCaseTail(text);
    if (tail) text = tail;
  }

  text = text.replace(/^[*•\s]+/, "").replace(/[,:;]+$/, "").replace(/\s+/g, " ").trim();

  if (/^ongan Combination$/i.test(text) && /Codonopsis/i.test(raw)) return "Codonopsis & Longan Combination";
  if (/^in a Cellular Detox Support$/i.test(text)) return "Cellular Detox Support";
  if (/^of Dragon Jing$/i.test(text)) return "Dragon Jing";
  if (/^in Imperial Garden$/i.test(text)) return "Imperial Garden";
  if (/^Super Yang Jing$/i.test(text)) return "Super Yang Jing";
  if (/^Codonopsis & Zizyphus Combination$/i.test(text)) return "Codonopsis & Zizyphus Combination";

  return text;
}

function titleLooksUseful(name) {
  if (!name || name.length < 3 || name.length > 80) return false;
  if (!/[A-Za-z]/.test(name)) return false;
  if (/[.!?]/.test(name)) return false;
  if (/^[a-z]/.test(name)) return false;
  if (/^[*•]/.test(name)) return false;
  if (BAD_CANDIDATE_NAMES.has(name.toLowerCase())) return false;
  if (/^(is|are|was|were|has|have|may|can|this|that|these|those)\b/i.test(name)) return false;
  if (/^(Supports|Promotes|Improves|Benefits|Contains|Made|Used|Known|Helps)\b$/i.test(name)) return false;
  if (name.split(/\s+/).length === 1 && !/^(Qi|Jing|Shen|Goji|Reishi|Gynostemma|Cordyceps|Eleuthero|Astragalus|Schizandra|Salvia|Shilajit|Pearl|Longan|Zizyphus|Tribulus|Coriolus|Chaga|Cistanche|Bupleurum|Agaricus|Caralluma|Codonopsis|OptDigest)$/i.test(name)) {
    return false;
  }
  if (/^\d/.test(name)) return false;
  if (/^(Traditional Functions|Ingredients|Directions|Supports|Vegan|Non Vegan|Free Consultations)$/i.test(name)) {
    return false;
  }
  const lower = name.toLowerCase();
  const noisy = [
    "dragon herbs capsules a - z",
    "capsules a - z",
    "shop by herb",
    "dragon drops",
    "free consultations",
    "identifies products",
    "refers to any",
  ];
  return !noisy.includes(lower);
}

function extractCandidates(pages) {
  const candidates = [];
  const seen = new Set();

  for (const page of pages) {
    const text = page.text;
    const dagger = /†/g;
    let match;
    while ((match = dagger.exec(text))) {
      const before = text.slice(Math.max(0, match.index - 220), match.index);
      const name = cleanCandidateName(before);
      if (!titleLooksUseful(name)) continue;
      const key = `${name.toLowerCase()}|${page.page}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const nextMarker = text.indexOf("†", match.index + 1);
      const end = nextMarker === -1 ? Math.min(text.length, match.index + 1200) : Math.min(nextMarker, match.index + 1200);
      candidates.push({
        name,
        page: page.page,
        section: page.section,
        marker: "dagger",
        context: normalizeText(`${name} † ${text.slice(match.index + 1, end)}`),
      });
    }
  }

  candidates.sort((a, b) => a.page - b.page || a.name.localeCompare(b.name));
  return candidates;
}

function extractBullets(text) {
  return text
    .split("•")
    .slice(1)
    .map((part) => normalizeText(part.split(/(?:Traditional Functions|Ingredients|Classic Name|Free Consultations|\$\d+)/i)[0]))
    .filter((part) => part.length >= 8 && part.length <= 180)
    .slice(0, 12);
}

function extractAfterLabel(text, label) {
  const pattern = new RegExp(
    `${label}\\s*[—-]?\\s*([^$]+?)(?=(?:\\s+Ingredients\\s*[—-]|\\s+Traditional Functions\\s*[—-]|\\s+Classic Name\\s*:|\\s+\\$\\d|\\s+Free Consultations|$))`,
    "i"
  );
  const match = text.match(pattern);
  return match ? normalizeText(match[1]).slice(0, 900) : "";
}

function extractWarnings(text) {
  const warnings = [];
  const lower = text.toLowerCase();
  const phrases = [
    "consult",
    "physician",
    "medication",
    "not intended",
    "not for you",
    "medical condition",
    "obesity",
    "heart disorder",
  ];
  for (const phrase of phrases) {
    const index = lower.indexOf(phrase);
    if (index === -1) continue;
    warnings.push(normalizeText(text.slice(Math.max(0, index - 90), Math.min(text.length, index + 280))));
  }
  return Array.from(new Set(warnings)).slice(0, 4);
}

function extractProductProfiles(candidates) {
  const byName = new Map();
  for (const candidate of candidates) {
    const key = candidate.name.toLowerCase();
    const profile = byName.get(key) || {
      name: candidate.name,
      pages: [],
      sections: [],
      bullets: [],
      traditionalFunctions: [],
      ingredients: [],
      warnings: [],
      contexts: [],
      confidence: "heuristic",
    };
    if (!profile.pages.includes(candidate.page)) profile.pages.push(candidate.page);
    if (!profile.sections.includes(candidate.section)) profile.sections.push(candidate.section);
    profile.bullets.push(...extractBullets(candidate.context));
    const functions = extractAfterLabel(candidate.context, "Traditional Functions");
    if (functions) profile.traditionalFunctions.push(functions);
    const ingredients = extractAfterLabel(candidate.context, "Ingredients");
    if (ingredients) profile.ingredients.push(ingredients);
    profile.warnings.push(...extractWarnings(candidate.context));
    profile.contexts.push(candidate.context);
    byName.set(key, profile);
  }

  return Array.from(byName.values())
    .map((profile) => ({
      ...profile,
      pages: profile.pages.sort((a, b) => a - b),
      sections: Array.from(new Set(profile.sections)),
      bullets: Array.from(new Set(profile.bullets)).slice(0, 12),
      traditionalFunctions: Array.from(new Set(profile.traditionalFunctions)).slice(0, 4),
      ingredients: Array.from(new Set(profile.ingredients)).slice(0, 4),
      warnings: Array.from(new Set(profile.warnings)).slice(0, 4),
      contexts: profile.contexts.slice(0, 4),
    }))
    .sort((a, b) => a.pages[0] - b.pages[0] || a.name.localeCompare(b.name));
}

function extractHealthTopics(pages) {
  const page = pages.find((entry) => entry.page === 115);
  if (!page) return [];
  const start = page.text.indexOf("3 (Three) Treasures");
  const end = page.text.indexOf("And Many More");
  const body = page.text.slice(start >= 0 ? start : 0, end >= 0 ? end : page.text.length);
  const topicPattern =
    /(?:3 \(Three\) Treasures|[A-Z][A-Za-z]+(?:[ &,'-]+[A-Z]?[A-Za-z]+){0,4}(?:\s*\([^)]+\))?)/g;
  const topics = Array.from(body.matchAll(topicPattern))
    .map((match) => normalizeText(match[0]))
    .filter((topic) => topic.length >= 3 && topic.length <= 60)
    .filter((topic) => !/^(Herbalist|Curated|Search|Results|Type|Page|And Many More|This A-Z)$/i.test(topic));
  return Array.from(new Set(topics)).sort((a, b) => a.localeCompare(b));
}

function queryExpansionMap() {
  return {
    stress: ["shen", "calm", "mood", "adaptogen", "stress response", "Liver", "Heart"],
    anxiety: ["shen", "calm", "nervous", "worry", "fear", "grief", "stabilizing"],
    sleep: ["insomnia", "peaceful sleep", "shen", "Heart", "Spleen", "Zizyphus", "calm"],
    fatigue: ["energy", "Qi", "adaptogen", "exhaustion", "Jing", "vitality", "Spleen"],
    burnout: ["exhaustion", "stress protection", "Jing", "Qi", "adaptogen", "caregivers"],
    digestion: ["Spleen", "Stomach", "bloating", "appetite", "Qi flow", "digestive"],
    bloating: ["digestion", "Spleen", "Stomach", "Qi stagnation", "gas"],
    immune: ["protective Qi", "Wei Qi", "Lung", "adaptogenic", "immune regulating"],
    libido: ["Jing", "Kidney", "Yang", "sexuality", "reproductive", "sexual", "sexual power", "sexual functioning", "inner power"],
    circulation: ["blood", "microcirculation", "vitalizes blood", "Heart", "Liver"],
    skin: ["detox", "lymphatic", "heat", "dampness", "blood", "Liver"],
    focus: ["mental focus", "concentration", "brain", "Shen", "Qi", "Lion's Mane"],
    memory: ["brain", "mental", "Shen", "Lion's Mane", "Jing"],
    respiratory: ["Lung", "breathing", "throat", "voice", "Protective Qi"],
    cold: ["Yang", "warming", "Kidney", "cold dampness", "Qi"],
    dry: ["Yin", "moistens", "dryness", "Lung", "fluid"],
  };
}

function tcmPatternMap() {
  return {
    yin_yang: [
      {
        id: "yang_deficiency_cold",
        label: "Possible Yang deficiency / cold tendency",
        catalogPages: [100, 101, 102, 103, 105],
        triggers: ["cold", "chilled", "cold hands", "cold feet", "low drive", "low libido", "low motivation", "tired", "weak", "slow", "low energy"],
        addTerms: ["Yang", "warming", "Kidney", "Jing", "Qi", "sexual power", "inner power", "Eucommia", "Cistanche", "Deer Antler", "Epimedium", "Morinda", "Cinnamon"],
        differentiators: ["Do you run cold generally, or only in the hands/feet?", "Any heat signs such as thirst, night sweats, irritability, or dry mouth?", "Is low libido paired with fatigue, stress, or emotional shutdown?"],
      },
      {
        id: "yin_deficiency_dry_heat",
        label: "Possible Yin deficiency / dryness or heat tendency",
        catalogPages: [101, 102, 103, 105],
        triggers: ["dry", "dryness", "night sweats", "hot flashes", "heat", "warm at night", "thirst", "restless", "wired", "insomnia"],
        addTerms: ["Yin", "cooling", "moistens", "Kidney", "Lung", "Goji", "He Shou Wu", "Rehmannia", "Dendrobium", "Ophiopogon", "Asparagus", "Zizyphus"],
        differentiators: ["Is the insomnia more wired/restless, or simple inability to fall asleep?", "Any dryness of skin, eyes, mouth, throat, or bowels?", "Do warming herbs or stimulants aggravate you?"],
      },
      {
        id: "qi_deficiency_low_vitality",
        label: "Possible Qi deficiency / low vitality",
        catalogPages: [103, 106, 111],
        triggers: ["fatigue", "exhaustion", "low energy", "weak", "poor stamina", "short breath", "crash", "burnout", "tired"],
        addTerms: ["Qi", "energy", "vitality", "adaptogen", "Spleen", "Lung", "Codonopsis", "Astragalus", "Ginseng", "Eleuthero", "Gynostemma"],
        differentiators: ["Is the fatigue better with rest, food, movement, or sleep?", "Is digestion weak along with the fatigue?", "Is there breathlessness, low immunity, or poor recovery?"],
      },
      {
        id: "jing_depletion_reserve",
        label: "Possible Jing depletion / depleted reserve",
        catalogPages: [104, 105, 111, 113],
        triggers: ["burnout", "depleted", "exhausted", "aging", "recovery", "fertility", "libido", "bones", "hair", "willpower", "fear", "overwork"],
        addTerms: ["Jing", "Kidney", "reserve", "rejuvenation", "Yin Jing", "Yang Jing", "He Shou Wu", "Goji", "Schizandra", "Deer Antler", "Cistanche", "Eucommia"],
        differentiators: ["Does this feel like temporary tiredness or deep depleted reserve?", "Any reproductive, hair, bone, hearing, fear, or willpower clues?", "Is the pattern cold/slow, dry/hot, or mixed?"],
      },
    ],
    organ_systems: [
      {
        id: "spleen_stomach_digestive",
        label: "Spleen/Stomach digestive lens",
        catalogPages: [102, 109, 110, 111],
        triggers: ["bloating", "gas", "appetite", "loose stool", "digestion", "after meals", "nausea", "heavy", "sweet cravings", "worry", "overthinking"],
        addTerms: ["Spleen", "Stomach", "digestion", "appetite", "Qi", "Atractylodes", "Poria", "Codonopsis", "Aged Tangerine", "Ginger"],
        differentiators: ["Is bloating worse after meals or stress?", "Loose stools, constipation, or alternating?", "Is worry/overthinking paired with digestive weakness?"],
      },
      {
        id: "liver_qi_stagnation",
        label: "Liver / Qi stagnation lens",
        catalogPages: [101, 102, 109, 111, 112, 113],
        triggers: ["frustration", "anger", "irritable", "stuck", "tension", "pms", "rib", "sighing", "stress", "planning", "motivation", "qi stagnation"],
        addTerms: ["Liver", "Qi stagnation", "smooth flow of Qi", "Bupleurum", "Cyperus", "White Peony", "Salvia", "flow", "stagnation"],
        differentiators: ["Does stress make symptoms worse?", "Any PMS, rib/chest tightness, sighing, or irritability?", "Is the issue more stuck/tight than depleted?"],
      },
      {
        id: "heart_shen_sleep_mood",
        label: "Heart/Shen sleep and mood lens",
        catalogPages: [104, 105, 111, 113],
        triggers: ["sleep", "insomnia", "anxiety", "worry", "grief", "heartbreak", "mood", "panic", "restless", "spirit", "overwhelmed"],
        addTerms: ["Shen", "Heart", "calm", "peaceful sleep", "Zizyphus", "Polygala", "Albizia", "Reishi", "Longan", "Pearl", "Spirit Poria"],
        differentiators: ["Is the sleep issue trouble falling asleep, waking, or unrestful sleep?", "Is the emotion grief, fear, worry, anger, or agitation?", "Is there heat/restlessness or cold/depletion?"],
      },
      {
        id: "lung_wei_qi_respiratory_skin",
        label: "Lung / Wei Qi / respiratory-skin lens",
        catalogPages: [106, 109, 110, 111],
        triggers: ["colds", "immune", "respiratory", "breathing", "lung", "throat", "voice", "skin", "dry cough", "allergies"],
        addTerms: ["Lung", "Wei Qi", "Protective Qi", "immune", "respiratory", "skin", "voice", "Astragalus", "Schizandra", "Ophiopogon"],
        differentiators: ["Is this more immune frequency, allergies, dryness, voice/throat, or breathing?", "Any skin dryness or sweating pattern?", "Acute infection symptoms need clinician guidance."],
      },
      {
        id: "kidney_jing_will_fear_reproductive",
        label: "Kidney/Jing willpower, fear, reproductive lens",
        catalogPages: [105, 109, 110, 111, 113],
        triggers: ["fear", "willpower", "libido", "fertility", "reproductive", "urinary", "hearing", "bones", "knees", "low back", "hair", "aging"],
        addTerms: ["Kidney", "Jing", "will", "courage", "reproductive", "sexual", "sexual functioning", "bones", "hearing", "Yang", "Yin", "Eucommia", "Cistanche", "Goji"],
        differentiators: ["Are there low-back/knee, urinary, hair, hearing, libido, or fear clues?", "Cold/depleted or dry/hot/restless presentation?", "Any diagnosed reproductive or urinary condition should be clinician-reviewed."],
      },
    ],
    environmental: [
      {
        id: "damp_heavy",
        label: "Dampness/heaviness lens",
        catalogPages: [99, 102, 109],
        triggers: ["damp", "heavy", "sluggish", "phlegm", "mucus", "swollen", "water retention", "brain fog", "greasy"],
        addTerms: ["dampness", "Spleen", "Poria", "Atractylodes", "fluid metabolism", "Qi", "Stomach"],
        differentiators: ["Any heaviness, swelling, mucus, greasy tongue/skin, or sluggish digestion?", "Is there cold dampness or heat dampness?"],
      },
      {
        id: "dryness_fluid",
        label: "Dryness/body-fluid lens",
        catalogPages: [99, 102, 109],
        triggers: ["dry", "dry skin", "dry eyes", "dry mouth", "constipation", "dry cough", "thirst"],
        addTerms: ["dryness", "Yin", "moistens", "Lung", "Kidney", "body fluids", "Goji", "Dendrobium", "Ophiopogon", "Asparagus"],
        differentiators: ["Where is the dryness: skin, mouth, eyes, throat, lungs, bowels?", "Is there heat, night sweating, or thirst?"],
      },
    ],
  };
}

function buildIndexMarkdown(pages, candidates, profiles, healthTopics) {
  const now = new Date().toISOString();
  const sectionLines = SECTION_RANGES.map(
    ([name, start, end]) => `- ${name}: pages ${start}${start === end ? "" : `-${end}`}`
  ).join("\n");

  return `# Dragon Herbs Catalog Reference

Generated: ${now}

Source viewer: ${CATALOG_VIEWER_URL}

Source text index: ${CATALOG_TEXT_URL}

Catalog: Dragon Herbs Catalog 5.1

Pages indexed: ${pages.length}

Product/herb candidates extracted: ${candidates.length}

Product profiles generated: ${profiles.length}

Health topics extracted: ${healthTopics.length}

## Page Ranges

${sectionLines}

## Files

- \`catalog-pages.json\`: complete normalized text for every catalog page.
- \`product-candidates.json\`: raw heuristic names extracted near catalog \`†\` markers.
- \`product-profiles.json\`: merged product/herb profiles with bullets, functions, ingredients, warnings, and source contexts.
- \`health-topics.json\`: topic terms extracted from the catalog Health Topics A-Z page.
- \`query-expansion.json\`: local synonym and pattern expansion terms for nuanced issue matching.
- \`tcm-pattern-map.json\`: catalog-grounded Yin/Yang, Three Treasures, Organ, emotion, and environmental lenses with page citations.

## Use Notes

- Prefer page citations such as "Catalog p. 33" in user-facing answers.
- Treat catalog statements as catalog claims, not independent medical evidence.
- Use product profiles and TCM pattern lenses for ranking, then verify against full page text before giving advice.
- Use this reference for product discovery and preparation for practitioner review, not self-treatment instructions.
`;
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    return;
  }

  fs.mkdirSync(REFERENCES, { recursive: true });
  const source = await fetchText(CATALOG_TEXT_URL);
  const rawPages = parseTextForPages(source);
  const pages = rawPages.map((text, index) => ({
    page: index + 1,
    section: sectionForPage(index + 1),
    text: normalizeText(text),
  }));
  const candidates = extractCandidates(pages);
  const profiles = extractProductProfiles(candidates);
  const healthTopics = extractHealthTopics(pages);
  const expansion = queryExpansionMap();
  const patternMap = tcmPatternMap();

  fs.writeFileSync(path.join(REFERENCES, "catalog-pages.json"), JSON.stringify(pages, null, 2) + "\n");
  fs.writeFileSync(path.join(REFERENCES, "product-candidates.json"), JSON.stringify(candidates, null, 2) + "\n");
  fs.writeFileSync(path.join(REFERENCES, "product-profiles.json"), JSON.stringify(profiles, null, 2) + "\n");
  fs.writeFileSync(path.join(REFERENCES, "health-topics.json"), JSON.stringify(healthTopics, null, 2) + "\n");
  fs.writeFileSync(path.join(REFERENCES, "query-expansion.json"), JSON.stringify(expansion, null, 2) + "\n");
  fs.writeFileSync(path.join(REFERENCES, "tcm-pattern-map.json"), JSON.stringify(patternMap, null, 2) + "\n");
  fs.writeFileSync(path.join(REFERENCES, "index.md"), buildIndexMarkdown(pages, candidates, profiles, healthTopics));

  console.log(
    `Wrote ${pages.length} pages, ${candidates.length} candidates, ${profiles.length} profiles, and ${healthTopics.length} health topics to ${REFERENCES}`
  );
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
