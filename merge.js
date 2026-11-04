import { createHash } from "node:crypto";
import { normalize } from "./parse.js";

export const makeId = (quote) =>
  createHash("sha1").update(normalize(quote)).digest("hex").slice(0, 12);

// Quotes longer than this get the tag "long" (apps can offer an on/off switch for them)
export const LONG_MIN = 400;

export const tagsFor = (quote, tags = []) => {
  const t = new Set(tags.filter((x) => x !== "long"));
  if (quote.length > LONG_MIN) t.add("long");
  return [...t].sort();
};

// Stable order: oldest first, alphabetical within a day
export const sortQuotes = (list) =>
  [...list].sort((a, b) => a.added.localeCompare(b.added) || a.quote.localeCompare(b.quote));

// Appends quotes not yet present (dedupe via normalize). Returns { list, added }.
export function mergeQuotes(existing, incoming, { source, date }) {
  const seen = new Set(existing.map((q) => normalize(q.quote)));
  const added = [];
  for (const { quote, author } of incoming) {
    const key = normalize(quote);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    added.push({ id: makeId(quote), quote, author, source: source ?? null, added: date, tags: tagsFor(quote) });
  }
  // (re)compute tags on every entry so older data gets them too
  const list = sortQuotes([...existing, ...added]).map((q) => ({ ...q, tags: tagsFor(q.quote, q.tags) }));
  return { list, added };
}
