import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArchive, parseIssue } from "./parse.js";
import { mergeQuotes } from "./merge.js";

const FILE = fileURLToPath(new URL("./quotes.json", import.meta.url));
const ISSUES = Math.max(1, parseInt(process.env.ISSUES, 10) || 3);
const DRY = !!process.env.DRY_RUN;
const ARCHIVE = "https://fs.blog/brain-food/";
const UA = { "User-Agent": "Mozilla/5.0 (farnam-quotes sync)" };
const today = new Date().toISOString().slice(0, 10);

async function get(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

const issues = parseArchive(await get(ARCHIVE)).slice(0, ISSUES);
if (!issues.length) throw new Error("Keine Ausgaben im Archiv gefunden – Layout geändert?");

let list = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : [];
console.log(`${list.length} Quotes in quotes.json, prüfe ${issues.length} Ausgabe(n)`);

let added = 0, emptyIssues = 0;
for (const url of issues) {
  const parsed = parseIssue(await get(url));
  if (!parsed.length) { emptyIssues++; console.warn(`⚠️  0 Quotes: ${url}`); continue; }
  const r = mergeQuotes(list, parsed, { source: url, date: today });
  list = r.list;
  for (const q of r.added) console.log(`+ "${q.quote}" — ${q.author}`);
  added += r.added.length;
}

if (added && !DRY) writeFileSync(FILE, JSON.stringify(list, null, 2) + "\n");
console.log(`Fertig: ${added} neue Quote(s)${DRY ? " (Dry Run)" : ""}, gesamt ${list.length}`);

// Fail loudly if the parser stopped finding anything (layout change)
if (emptyIssues === issues.length) {
  console.error("In keiner Ausgabe wurden Quotes gefunden – Layout geändert?");
  process.exit(1);
}
