// Builds the static (prerendered) landing from src/ into the repo root.
//   node scripts/build.mjs          -> writes index.html and sitemap.xml
//   node scripts/build.mjs --check  -> also fetches every WL and checks status + language
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ===== CONFIG ===== */
const SITE = "https://feverseasonals.com";
const TITLE = "Black Friday 2026 | Choose your city | Fever";
const DESCRIPTION = "Black Friday 2026 on Fever: choose your city and join the waitlist for early access to the best deals on experiences, concerts and shows.";

// Every WL link gets these UTMs. utm_campaign follows Fever's {plan_id}_{city_code} convention;
// utm_content identifies this landing as the traffic source.
const UTM = {
  utm_source: "linktree",
  utm_medium: "social",
  utm_content: "bf26_city_selector"
};

// Fever BF26 "Immersive Listing Landing" creatives (Cloudinary: 0_Others/Fever_Fever/Seasonals/Black Friday/2026/Black Friday/Marketplace)
const CDN = "https://media.feverup.com/video/upload";
const DESKTOP = "v1793118856/BlackFriday-InmersiveListing-Landing-Desktop_o4wrvy";
const MOBILE = "v1793118856/BlackFriday-InmersiveListing-Landing-Mobile_ybghgv";
const MEDIA = {
  VIDEO_DESKTOP: `${CDN}/q_auto,vc_h264,w_1280/${DESKTOP}.mp4`,
  VIDEO_MOBILE: `${CDN}/q_auto,vc_h264,w_720/${MOBILE}.mp4`,
  POSTER_DESKTOP: `${CDN}/so_2,f_auto,q_auto,w_1280/${DESKTOP}.jpg`,
  POSTER_MOBILE: `${CDN}/so_2,f_auto,q_auto,w_720/${MOBILE}.jpg`
};
/* ================== */

const ACCENTS = ["var(--lilac)", "var(--green)", "var(--blue)", "var(--yellow)", "var(--red)"];
const ARROW = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const wlUrl = c => `https://feverup.com/m/${c.id}`;
const trackedUrl = c => `${wlUrl(c)}?${new URLSearchParams({
  utm_source: UTM.utm_source,
  utm_medium: UTM.utm_medium,
  utm_campaign: `${c.id}_${c.code.toLowerCase()}`,
  utm_content: UTM.utm_content
})}`;

const { regions } = JSON.parse(readFileSync(join(root, "src/cities.json"), "utf8"));
regions.forEach(r => r.cities.sort((a, b) => a.name.localeCompare(b.name)));
const all = regions.flatMap(r => r.cities);

const ids = new Set();
for (const c of all) {
  for (const k of ["name", "id", "code", "lang", "country"]) if (!c[k]) throw new Error(`${c.name || "?"}: missing ${k}`);
  if (ids.has(c.id)) throw new Error(`Duplicate plan id ${c.id}`);
  ids.add(c.id);
}

const chips = ["All", ...regions.map(r => r.name)].map(name =>
  `      <button class="chip" type="button" data-region="${esc(name)}" aria-pressed="${name === "All"}">${esc(name)}</button>`
).join("\n");

const cityHtml = regions.map((r, i) => `  <section data-region="${esc(r.name)}" style="--accent:${ACCENTS[i % ACCENTS.length]}">
    <h2>${esc(r.name)}</h2>
    <ul class="grid">
${r.cities.map(c => {
  const locale = `${c.lang}-${c.country}`;
  const local = c.local ? `<span class="local" lang="${locale}">${esc(c.local)}</span>` : "";
  const tz = c.tz ? ` data-tz="${esc(c.tz.join(" "))}"` : "";
  return `      <li><a class="city" href="${esc(trackedUrl(c))}" hreflang="${locale}"${tz}><span class="txt"><span class="name">${esc(c.name)}</span>${local}</span><span class="go">${ARROW}</span></a></li>`;
}).join("\n")}
    </ul>
  </section>`).join("\n");

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": "https://feverup.com/#organization", name: "Fever", url: "https://feverup.com/" },
    {
      "@type": "WebPage", "@id": `${SITE}/#webpage`, url: `${SITE}/`, name: TITLE, description: DESCRIPTION,
      inLanguage: "en", publisher: { "@id": "https://feverup.com/#organization" },
      primaryImageOfPage: { "@type": "ImageObject", url: `${SITE}/og-image.jpg`, width: 1200, height: 630 },
      mainEntity: { "@id": `${SITE}/#cities` }
    },
    {
      "@type": "ItemList", "@id": `${SITE}/#cities`, name: "Black Friday 2026 waitlists by city",
      numberOfItems: all.length,
      itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: `Black Friday 2026 – ${c.name}`, url: wlUrl(c) }))
    }
  ]
};

const vars = {
  SITE, TITLE: esc(TITLE), DESCRIPTION: esc(DESCRIPTION), COUNT: all.length, CHIPS: chips, CITIES: cityHtml,
  JSONLD: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
  ...Object.fromEntries(Object.entries(MEDIA).map(([k, v]) => [k, esc(v)]))
};
const html = readFileSync(join(root, "src/index.html"), "utf8").replace(/\{\{(\w+)\}\}/g, (m, k) => {
  if (!(k in vars)) throw new Error(`Unknown placeholder ${m}`);
  return vars[k];
});
writeFileSync(join(root, "index.html"), html);

const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod></url>
</urlset>
`);
console.log(`Built index.html (${all.length} cities) and sitemap.xml`);

if (process.argv.includes("--check")) {
  let bad = 0;
  const check = async c => {
    const res = await fetch(trackedUrl(c), { headers: { "User-Agent": "Mozilla/5.0" } });
    const body = await res.text();
    const lang = (body.match(/<html[^>]*\blang="([^"]+)"/) || [])[1];
    const ok = res.ok && lang === c.lang;
    if (!ok) bad++;
    console.log(`${ok ? "OK  " : "FAIL"} ${c.name.padEnd(16)} ${c.id}  ${res.status}  lang=${lang} (expected ${c.lang})`);
  };
  for (let i = 0; i < all.length; i += 10) await Promise.all(all.slice(i, i + 10).map(check));
  console.log(bad ? `${bad} destination(s) failed` : `All ${all.length} destinations OK`);
  process.exitCode = bad ? 1 : 0;
}
