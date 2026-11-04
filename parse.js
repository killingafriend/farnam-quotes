import * as cheerio from "cheerio";

const QUOTE_START = /^["“”'‘*_\s]*["“]/;
const DASH = /^[—–-]\s*/;
const own = "Farnam Street";
const MAX_LEN = 4000; // sanity cap against a runaway block, not a style limit
const JUNK = /thanks for reading|p\.s\.|\bshare this\b|click here|subscribe|newsletter|podcast|webinar|register|sign up|read more|learn more/i;

const clean = (s) =>
  s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const stripQuotes = (s) =>
  clean(s).replace(/^[*_\s]*["“”]+/, "").replace(/["“”]+[*_\s]*$/, "").trim();

// Final cleanup of a quote: boilerplate, markdown stars, wrapping/dangling quote marks
const tidy = (s) => {
  let q = clean(s)
    .replace(/\(?\s*(click (here )?to |share this |tweet this )(share|tweet|on twitter)?[^)]*\)/gi, "")
    .replace(/\*+/g, "")
    .trim();
  if (/^["“”]/.test(q)) {
    q = q.replace(/^["“”]+\s*/, "");
    q = q.replace(/\s*["“”]+$/, "");
  } else if (!/[“"]/.test(q)) {
    q = q.replace(/\s*”+$/, ""); // dangling closing mark
  }
  return clean(q);
};

const TITLE_WORDS = "former|late|legendary|famous|american|british|roman|greek|olympic|olympian|nba|nfl|best-selling|bestselling|investor|billionaire|entrepreneur|founder|co-founder|cofounder|ceo|author|writer|novelist|poet|philosopher|stoic|historian|scientist|physicist|psychologist|economist|neuroscientist|coach|performance|actress|actor|comedian|musician|singer|rapper|athlete|boxer|runner|swimmer|basketball|football|baseball|soccer|tennis|player|designer|artist|painter|filmmaker|producer|advertising|exec|executive|emperor|president|statesman|businessman|businesswoman|journalist|editor|professor|poker|chess|mathematician|engineer|inventor|astronaut|activist|wrestler|golfer|cyclist|professional|hall of fame|star|winner|nobel prize winner|nobel prize-winning|nobel laureate|software engineer|authors|pulitzer prize-winning|oscar-winning|commentator|psychiatrist|youtuber|therapist|physician|lawyer|investigator|columnist|author and|speaker|podcaster|trainer|strategist|technologist";
const TITLE_RE = new RegExp(`^(?:the |a |an )?(?:${TITLE_WORDS})\\s+`, "i");
const PARTICLES = new Set(["and", "&", "de", "van", "von", "der", "den", "la", "le", "di", "da", "del", "bin", "ibn", "al", "el", "of", "du", "dos", "das"]);

// "Actress Lucille Ball, who …" / "Some deep wisdom from Henry Miller" / "Richard Feynman on …" -> the person's name
const cleanAuthor = (a) => {
  a = clean(a).replace(/\([^)]*\)/g, "").replace(/\bSource\b.*$/i, "").trim();
  a = a.replace(/^(often )?(attributed to|via|by)\s+/i, "").split(",")[0];
  a = clean(a).replace(/[:*]+$/, "").replace(/[’']s$/, "");
  if (!a) return "";
  let tokens = a.split(" ");
  while (tokens.length > 2 && /^[A-Z]{3,}$/.test(tokens[0])) tokens.shift(); // "LVMH CEO Bernard Arnault"
  let t = tokens.join(" ");
  for (let m; (m = t.match(TITLE_RE)) && /[A-Z]/.test(t.slice(m[0].length)); ) t = t.slice(m[0].length);
  tokens = t.split(" ");
  const segs = [];
  let cur = [];
  for (const tok of tokens) {
    if (/^[A-Z]/.test(tok) || (cur.length && PARTICLES.has(tok.toLowerCase()))) cur.push(tok);
    else { if (cur.length) segs.push(cur); cur = []; }
  }
  if (cur.length) segs.push(cur);
  for (const sg of segs) while (sg.length && PARTICLES.has(sg.at(-1).toLowerCase())) sg.pop();
  const pick = segs.find((sg) => sg.length >= 2) || (segs.length === 1 && tokens[0] === segs[0][0] ? segs[0] : null);
  return pick && !/^(From|The|Why|How|What|When)$/.test(pick[0]) ? pick.join(" ") : "";
};

const NAME_VERBS = "on|about|in|writes|wrote|says|said|explains|tells|reflects|describes|observes|notes|argues|reminds|shares|offers|warns|advises|asks|puts|reveals|recalls|reminisces|cautions|suggests|believes|thinks|remarked|reports|summarizes|illustrates|captures|defines|challenges|teaches|encourages|urges|stresses|emphasizes|admits|confesses|discusses|talks|opens|closes|ends|starts|begins|laments|calls|gets|makes|shows|finds|sees|knows|understands|learned|realized|discovered|insists|counsels|remembers|recounts|counters|responds|replies|clarifies|questions|wonders|poses|mused|muses|riffs";

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

  const NUM_ONLY = /^\(?\d{1,2}[.):]?\)?$/;
  leaves.forEach((el) => {
    const tag = el.tagName?.toLowerCase();
    if (/^h[1-4]$/.test(tag)) {
      flush();
      sec = { name: clean($(el).text()).toLowerCase(), blocks: [] };
      sections.push(sec);
    } else if (tag === "hr") {
      flush();
    } else if (tag === "figure" || tag === "blockquote") {
      // pullquotes: <blockquote><p>quote</p><cite>— Author</cite></blockquote>
      const cite = $(el).find("cite").first();
      const citeText = clean(cite.text());
      cite.remove();
      $(el).find("figcaption").remove();
      const body = clean($(el).text());
      if (sec && body) {
        block.push(body);
        if (citeText) block.push(DASH.test(citeText) ? citeText : `— ${citeText}`);
      }
    } else if (sec && tag === "p") {
      const text = clean($(el).text());
      if (!text) return;
      if (NUM_ONLY.test(text)) flush(); // "1." / "2." markers separate items
      else block.push(text);
    }
  });
  flush();

  const out = [];
  for (const s of sections) {
    if (s.name.includes("tiny thought")) {
      for (const b of s.blocks) {
        // multi-paragraph items stay complete (tagged "long" later); only footer/promo paragraphs are dropped
        let q = tidy(b.filter((t) => !JUNK.test(t)).join(" "));
        let author = own;
        const g = q.match(/^(.{20,}?)([”"])?\s*[—–]\s*([^—–]{3,40})$/);
        if (g) { const n = cleanAuthor(g[3]); if (n && (n.includes(" ") || g[2])) { q = tidy(g[1]); author = n; } }
        if (q.length >= 10 && q.length <= MAX_LEN && !/[,:]$/.test(q)) out.push({ quote: q, author });
      }
    } else if (s.name === "fs" || s.name.includes("insight")) {
      for (const b of s.blocks) {
        const qi = b.findIndex((t) => QUOTE_START.test(t));
        if (qi === -1) continue;
        let raw = b[qi];
        let author = null;
        // quote and author in one paragraph: “…”— Author
        const glued = raw.match(/^(.{20,}?[”"])\s*[—–]\s*([^—–]{2,80})$/);
        if (glued) { raw = glued[1]; author = cleanAuthor(glued[2]); }
        const quote = tidy(stripQuotes(raw));
        const dashLine = b.slice(qi + 1).find((t) => DASH.test(t));
        if (s.name === "fs") author = own;
        else if (!author && dashLine) author = cleanAuthor(dashLine.replace(DASH, ""));
        else if (!author && qi > 0) {
          const intro = b[qi - 1];
          const m = intro.match(new RegExp(`^(.+?)\\s+(?:${NAME_VERBS})\\b`, "i"));
          author = cleanAuthor(m ? m[1] : intro);
        }
        if (quote.length >= 10 && !JUNK.test(quote) && !/[,:]$/.test(quote)) out.push({ quote, author: author || "Unknown" });
      }
    }
  }
  return out;
}

export const normalize = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "");
