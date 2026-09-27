// Regenerates future_ai_import_template.json from the canonical default dataset embedded in
// index.html (<script id="fai-default-data">), so the two can never drift.
// Mirrors templateData() in the page: defaults + each history series' `example` as `historical`.
// Usage: node tools/sync_template.mjs
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const match = html.match(/<script type="application\/json" id="fai-default-data">([\s\S]*?)<\/script>/);
if (!match) throw new Error("fai-default-data block not found in index.html");

const data = JSON.parse(match[1]);
data.historical = Object.fromEntries(Object.entries(data.history_series).map(([k, d]) => [k, d.example || {}]));
writeFileSync(new URL("future_ai_import_template.json", root), JSON.stringify(data, null, 2) + "\n");
console.log("future_ai_import_template.json updated");
