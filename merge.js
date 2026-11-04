import { createHash } from "node:crypto";
import { normalize } from "./parse.js";

export const makeId = (quote) =>
  createHash("sha1").update(normalize(quote)).digest("hex").slice(0, 12);

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
    added.push({ id: makeId(quote), quote, author, source: source ?? null, added: date });
  }
  return { list: sortQuotes([...existing, ...added]), added };
}
