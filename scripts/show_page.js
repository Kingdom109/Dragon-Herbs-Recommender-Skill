#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const pagesPath = path.join(__dirname, "..", "references", "catalog-pages.json");

function usage() {
  console.log(`Usage: node scripts/show_page.js <page> [<page>...]

Prints full normalized text for one or more Dragon Herbs catalog pages.`);
}

if (process.argv.includes("--help") || process.argv.includes("-h") || process.argv.length < 3) {
  usage();
  process.exit(0);
}

if (!fs.existsSync(pagesPath)) {
  console.error("Missing references/catalog-pages.json. Run node scripts/build_catalog_reference.js first.");
  process.exit(1);
}

const pages = JSON.parse(fs.readFileSync(pagesPath, "utf8"));
for (const arg of process.argv.slice(2)) {
  const pageNumber = Number(arg);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pages.length) {
    console.error(`Invalid page: ${arg}`);
    process.exitCode = 1;
    continue;
  }
  const page = pages[pageNumber - 1];
  console.log(`\n# Catalog p. ${page.page} | ${page.section}\n`);
  console.log(page.text);
}
