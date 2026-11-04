import * as cheerio from "cheerio";

const QUOTE_START = /^["“”'‘*_\s]*["“]/;
const DASH = /^[—–-]\s*/;
const own = "Farnam Street";

const clean = (s) =>
  s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const stripQuotes = (s) =>
  clean(s).replace(/^[*_\s]*["“”]+/, "").replace(/["“”]+[*_\s]*$/, "").trim();

// Archive page -> list of issue URLs, newest first
export function parseArchive(html) {
  const $ = cheerio.load(html);
  const urls = [];
  $("a[href*='/brain-food/']").each((_, a) => {
    let href = $(a).attr("href").replace(/^http:/, "https:");
    if (!/\/brain-food\/[a-z]+-?\d{1,2}-\d{4}\/?$/i.test(href)) return;
    href = href.toLowerCase().replace(/\/?$/, "/");
    if (!urls.includes(href)) urls.push(href);
  });
  return urls;
}

// Issue page -> [{ quote, author }]
export function parseIssue(html) {
  const $ = cheerio.load(html);
  const root = $(".entry-content").first().length ? $(".entry-content").first() : $("article").first();

  // Group content into sections (h2) and blocks (separated by <hr>)
  const sections = [];
  let sec = null;
  let block = [];
  const flush = () => { if (sec && block.length) sec.blocks.push(block); block = []; };

  // fs.blog now wraps each section in nested <div>s -> flatten to leaf blocks
  const leaves = [];
  const walk = (nodes) => nodes.each((_, el) => {
    if (el.tagName?.toLowerCase() === "div") walk($(el).children());
    else leaves.push(el);
  });
  walk(root.children());

  leaves.forEach((el) => {
    const tag = el.tagName?.toLowerCase();
    const text = clean($(el).text());
    if (/^h[1-4]$/.test(tag)) {
      flush();
      sec = { name: text.toLowerCase(), blocks: [] };
      sections.push(sec);
    } else if (tag === "hr") {
      flush();
    } else if (sec && text && (tag === "p" || tag === "blockquote")) {
      block.push(text);
    }
  });
  flush();

  const out = [];
  for (const s of sections) {
    if (s.name.includes("tiny thought")) {
      for (const b of s.blocks) {
        const q = clean(b.join(" "));
        if (q.length >= 10 && q.length <= 400) out.push({ quote: q, author: own });
      }
    } else if (s.name === "fs" || s.name.includes("insight")) {
      for (const b of s.blocks) {
        const qi = b.findIndex((t) => QUOTE_START.test(t));
        if (qi === -1) continue;
        const quote = stripQuotes(b[qi]);
        let author = null;
        const dashLine = b.slice(qi + 1).find((t) => DASH.test(t));
        if (s.name === "fs") author = own;
        else if (dashLine) author = clean(dashLine.replace(DASH, ""));
        else if (qi > 0) {
          const intro = b[qi - 1];
          const m = intro.match(/^(.+?)\s+(on|about|in|writes|says|explains)\b/i);
          author = clean((m ? m[1] : intro).replace(/[:*]+$/, ""));
        }
        if (quote.length >= 10) out.push({ quote, author: author || "Unknown" });
      }
    }
  }
  return out;
}

export const normalize = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "");
