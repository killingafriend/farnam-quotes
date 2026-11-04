import assert from "node:assert";
import { parseIssue, parseArchive } from "../parse.js";

const issue2026 = `<article><div class="entry-content">
<p><em>No. 705 – November 1, 2026</em></p>
<p><em>Welcome to Brain Food…</em></p>
<h2>Tiny Thoughts</h2>
<p>Action produces the very information inaction waits for.</p>
<hr class="wp-block-separator">
<p>Being smart helps once you start. Before that, it often just makes your excuses more convincing.</p>
<hr>
<p>Spite makes you work harder. Curiosity makes you work longer. Discipline is what you need when you have neither.</p>
<h2>Insights</h2>
<p>Michael Jordan on eliminating fear:*</p>
<p><em>“I never feared my skills because I put in the work. Work ethic eliminates fear.”</em></p>
<hr>
<p>Gerry Spence on an underappreciated aspect of how we win:</p>
<p><em>“Winning is getting what we want, which often includes assisting others in getting what they want.”</em></p>
<h2>The Knowledge Project</h2>
<p>Steven Kotler and I sat down…</p>
<p>— Shane Parrish</p>
</div></article>`;

const issue2024 = `<div class="entry-content">
<p>Brain Food – No. 577 – May 19, 2024</p>
<h2>FS</h2>
<p>“Knowing virtues is like having a map; adopting them is actually taking the journey.”</p>
<p>— <a href="#">The highest form of leverage is reputation.</a></p>
<h2>Insights</h2>
<p>“Without courage we cannot practice any other virtue with consistency.”</p>
<p>— Maya Angelou</p>
<hr>
<p>“People spend too much time on the last 24 hours and not enough time on the last 6,000 years.”</p>
<p>— Will Durant</p>
<h2>Tiny Thoughts</h2>
<p>The highest form of leverage is reputation.</p>
<hr>
<p>Reasoning in public forces discipline of thought.</p>
<p>If your reasoning is correct, you have nothing to fear.</p>
<h2>TKP Podcast</h2>
<p>“<em>Expectations are one of the greatest things</em>”</p>
<p>— Listen to this episode</p>
</div>`;

const a = parseIssue(issue2026);
console.log(a);
assert.equal(a.length, 5);
assert.deepEqual(a[3], { quote: "I never feared my skills because I put in the work. Work ethic eliminates fear.", author: "Michael Jordan" });
assert.equal(a[4].author, "Gerry Spence");

const b = parseIssue(issue2024);
console.log(b);
assert.equal(b.length, 5);
assert.equal(b[0].author, "Farnam Street");
assert.equal(b[1].author, "Maya Angelou");
assert.ok(!b.some((q) => q.quote.includes("Expectations")), "Podcast section skipped");

// Layout seit Nov 2026: Sections in verschachtelten <div class="wp-block-group">
const wrapped = `<div class="entry-content"><p>No. 705</p>
<div class="wp-block-group"><div class="wp-block-group__inner-container"><h2>Tiny Thoughts</h2>
<p>Action produces the very information inaction waits for.</p><hr/><p>Being smart helps once you start. Before that, it often just makes your excuses more convincing.</p></div></div>
<div class="wp-block-group"><div class="wp-block-group__inner-container"><h2>Insights</h2>
<p>Michael Jordan on eliminating fear:*</p><p><em>\u201cI never feared my skills because I put in the work.\u201d</em></p></div></div>
<div class="wp-block-group"><div class="wp-block-group__inner-container"><h2>The Knowledge Project</h2><p>Steven Kotler and I sat down to talk about the science.</p></div></div></div>`;
const c = parseIssue(wrapped);
assert.equal(c.length, 3);
assert.equal(c[2].author, "Michael Jordan");
assert.ok(!c.some((q) => q.quote.includes("Kotler")));

const arch = parseArchive(`<a href="https://fs.blog/brain-food/november-1-2026/">x</a>
<a href="https://fs.blog/brain-food/">archive</a>
<a href="http://fs.blog/brain-food/december-17-2023">y</a>
<a href="https://fs.blog/brain-food/November-3-2024/">z</a>`);
console.log(arch);
assert.equal(arch.length, 3);
console.log("✅ alle Tests ok");
