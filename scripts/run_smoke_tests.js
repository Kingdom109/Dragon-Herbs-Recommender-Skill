#!/usr/bin/env node
"use strict";

const { execFileSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MATCH = path.join(ROOT, "scripts", "match_issue.js");

const CASES = [
  {
    name: "wired tired sleep digestion",
    issue: "wired but exhausted, poor sleep, stress, anxious, weak digestion",
    expectedAny: ["OptDigest", "Codonopsis & Zizyphus Combination", "Zizyphus Dreams", "Spring Dragon Longevity Drops"],
    expectedLensAny: ["Heart/Shen", "Qi deficiency", "Jing depletion", "Liver / Qi stagnation"],
  },
  {
    name: "cold libido yang jing",
    issue: "cold hands, low drive, low libido, tired, poor motivation",
    expectedAny: ["Dragon Jing", "Super Yang Jing", "Shanghai Lady", "Ant Power"],
    expectedLensAny: ["Yang deficiency", "Kidney/Jing", "Jing depletion"],
  },
  {
    name: "pms stagnation digestion mood",
    issue: "frustrated, pms mood swings, bloating, rib tension, worse with stress",
    expectedAny: ["Natural Woman", "Codonopsis & Zizyphus Combination", "Spring Dragon Longevity Drops"],
    expectedLensAny: ["Liver / Qi stagnation", "Heart/Shen", "Spleen/Stomach"],
  },
  {
    name: "dry heat restless sleep",
    issue: "dry eyes, dry throat, restless sleep, warm at night, low recovery",
    expectedAny: ["Dew Drops", "Primal Yin Replenisher", "Magnolia Sinus", "Diamond Mind", "Yin Qiao"],
    expectedLensAny: ["Yin deficiency", "Dryness/body-fluid", "Heart/Shen", "Lung"],
  },
];

function runCase(testCase) {
  const raw = execFileSync(process.execPath, [MATCH, testCase.issue, "--limit", "10", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const result = JSON.parse(raw);
  const productNames = result.productResults.map((entry) => entry.name);
  const lensLabels = result.inferredPatterns.map((entry) => entry.label);
  const productOk = testCase.expectedAny.some((expected) => productNames.includes(expected));
  const lensOk = testCase.expectedLensAny.some((expected) => lensLabels.some((label) => label.includes(expected)));
  return {
    name: testCase.name,
    productOk,
    lensOk,
    productNames: productNames.slice(0, 8),
    lensLabels,
  };
}

function main() {
  let failures = 0;
  for (const testCase of CASES) {
    const result = runCase(testCase);
    console.log(`\n${result.name}`);
    console.log(`  lenses: ${result.lensLabels.join(" | ")}`);
    console.log(`  products: ${result.productNames.join(" | ")}`);
    if (!result.lensOk) {
      failures += 1;
      console.log("  FAIL: no expected TCM/catalog lens found");
    }
    if (!result.productOk) {
      failures += 1;
      console.log("  FAIL: no expected product lead found");
    }
    if (result.lensOk && result.productOk) console.log("  ok");
  }
  if (failures) {
    console.error(`\n${failures} smoke test check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll smoke tests passed");
}

main();
