import assert from "node:assert";
import { mergeQuotes, makeId } from "../merge.js";

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
console.log("✅ merge-Tests ok");
