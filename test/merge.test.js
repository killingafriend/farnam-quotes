import assert from "node:assert";
import { mergeQuotes, makeId, tagsFor } from "../merge.js";

const existing = [
  { id: makeId("Be kind."), quote: "Be kind.", author: "X", source: null, added: "2026-01-01" },
];
const incoming = [
  { quote: "Be  kind!", author: "Dup" },            // normalize-Duplikat
  { quote: "Another thought worth keeping.", author: "Farnam Street" },
  { quote: "Another thought worth keeping.", author: "Farnam Street" }, // doppelt in derselben Ausgabe
  { quote: "A zebra walks into a bar.", author: "Y" },
];
const { list, added } = mergeQuotes(existing, incoming, { source: "https://fs.blog/brain-food/x/", date: "2026-11-04" });

assert.equal(added.length, 2);
assert.equal(list.length, 3);
assert.deepEqual(list.map((q) => q.quote), ["Be kind.", "A zebra walks into a bar.", "Another thought worth keeping."]);
assert.equal(added[0].source, "https://fs.blog/brain-food/x/");
assert.equal(added[0].added, "2026-11-04");
assert.match(added[0].id, /^[0-9a-f]{12}$/);
assert.equal(mergeQuotes(list, incoming, { date: "2026-11-05" }).added.length, 0, "idempotent");
// Tags: "long" ab > 400 Zeichen, wird für alle Einträge (auch alte ohne tags) gesetzt
const longText = "A very long thought. ".repeat(25);
assert.deepEqual(tagsFor("short"), []);
assert.deepEqual(tagsFor(longText), ["long"]);
assert.deepEqual(tagsFor("short", ["long", "x"]), ["x"], "veraltetes long-Tag wird entfernt, eigene Tags bleiben");
const r2 = mergeQuotes([{ id: "1", quote: longText, author: "A", source: null, added: "2026-01-01" }], [{ quote: "Brand new short one here.", author: "B" }], { date: "2026-11-04" });
assert.deepEqual(r2.list.map((q) => q.tags), [["long"], []]);
console.log("✅ merge-Tests ok");
