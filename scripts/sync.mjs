// Syncs src/cities.json with the city sheet.
//   node scripts/sync.mjs                 -> reads the CSV at $SHEET_CSV_URL
//   node scripts/sync.mjs --csv <file|url>
//   node scripts/sync.mjs --refresh       -> no sheet; re-reads code/lang/country/coords for every city
// Cities in the sheet but not in cities.json are added with data read from feverup.com/m/{id}.
// Cities no longer in the sheet are removed. Hand-edited fields (name, local, tz, region) are kept.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "src/cities.json");
const args = process.argv.slice(2);
const arg = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

// Region for cities added automatically, by country
const REGION_BY_COUNTRY = {
  ES: "Spain", GB: "UK & Ireland", IE: "UK & Ireland", FR: "France", DE: "Germany & Austria", AT: "Germany & Austria",
  US: "United States", CA: "Canada",
  MX: "Latin America", CO: "Latin America", CL: "Latin America", BR: "Latin America", AR: "Latin America", PE: "Latin America",
  AU: "Asia-Pacific & Middle East", AE: "Asia-Pacific & Middle East", SG: "Asia-Pacific & Middle East",
  JP: "Asia-Pacific & Middle East", KR: "Asia-Pacific & Middle East", NZ: "Asia-Pacific & Middle East", QA: "Asia-Pacific & Middle East"
};
const regionFor = country => REGION_BY_COUNTRY[country] || "Rest of Europe";

async function planInfo(id) {
  const res = await fetch(`https://feverup.com/m/${id}`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const pick = re => (html.match(re) || [])[1];
  const geo = html.match(/"latitude":(-?[\d.]+),"longitude":(-?[\d.]+),"timezone":"([^"]+)"/);
  const info = {
    code: pick(/"cityCode":"([A-Z0-9]{3})"/),
    lang: pick(/<html[^>]*\blang="([a-z]{2})/),
    // Plan pages use "UK" instead of the ISO code
    country: { UK: "GB" }[pick(/"cityCountryIsoCode":"([A-Z]{2})"/)] || pick(/"cityCountryIsoCode":"([A-Z]{2})"/),
    lat: geo && Math.round(+geo[1] * 1e4) / 1e4,
    lon: geo && Math.round(+geo[2] * 1e4) / 1e4,
    timezone: geo && geo[3].replace(/\\u002F/g, "/")
  };
  const missing = Object.keys(info).filter(k => info[k] == null);
  if (missing.length) throw new Error(`missing ${missing.join(", ")} on the plan page`);
  return info;
}

// Minimal CSV parser (quoted fields, escaped quotes, CRLF)
function parseCsv(text) {
  const rows = [[]];
  let field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { rows.at(-1).push(field); field = ""; }
    else if (ch === "\n") { rows.at(-1).push(field.replace(/\r$/, "")); field = ""; rows.push([]); }
    else field += ch;
  }
  rows.at(-1).push(field);
  return rows;
}

// Rows of the sheet as [{ name, id }], using the "CITY" and "PLAN ID" header wherever it is
function sheetCities(text) {
  const rows = parseCsv(text);
  const h = rows.findIndex(r => r.some(c => c.trim().toUpperCase() === "PLAN ID"));
  if (h < 0) throw new Error('No "PLAN ID" header found in the sheet');
  const cityCol = rows[h].findIndex(c => c.trim().toUpperCase() === "CITY");
  const idCol = rows[h].findIndex(c => c.trim().toUpperCase() === "PLAN ID");
  return rows.slice(h + 1)
    .map(r => ({ name: (r[cityCol] || "").trim(), id: Number((r[idCol] || "").trim()) }))
    .filter(c => c.name && Number.isInteger(c.id) && c.id > 0);
}

const data = JSON.parse(readFileSync(file, "utf8"));
const exclude = new Set(data.exclude || []);
const current = data.regions.flatMap(r => r.cities.map(c => ({ ...c, region: r.name })));
const byId = new Map(current.map(c => [c.id, c]));
const log = [];
let next;

if (args.includes("--refresh")) {
  next = current;
} else {
  const src = arg("--csv") || process.env.SHEET_CSV_URL;
  if (!src) throw new Error("Pass --csv <file|url> or set SHEET_CSV_URL");
  const text = /^https?:/.test(src) ? await (await fetch(src)).text() : readFileSync(src, "utf8");
  const rows = sheetCities(text).filter(c => !exclude.has(c.id));
  // Guard against a broken or half-loaded sheet wiping the landing
  if (rows.length < current.length * 0.5) throw new Error(`Sheet has ${rows.length} cities vs ${current.length} live; refusing to sync`);
  const seen = new Set();
  next = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    if (byId.has(row.id)) { next.push(byId.get(row.id)); continue; }
    try {
      const info = await planInfo(row.id);
      next.push({ name: row.name, id: row.id, ...info, region: regionFor(info.country) });
      log.push(`+ added ${row.name} (${row.id})`);
    } catch (e) {
      // A row can exist before its plan is live: skip it and try again next run
      log.push(`! skipped ${row.name} (${row.id}): ${e.message}`);
    }
  }
  for (const c of current) if (!seen.has(c.id)) log.push(`- removed ${c.name} (${c.id})`);
}

// Fill (or with --refresh, re-read) data that comes from the plan page.
// code/lang/country already set are kept (code comes from the DWH); differences are only reported.
for (const c of next) {
  if (!args.includes("--refresh") && c.lat != null && c.timezone) continue;
  try {
    const info = await planInfo(c.id);
    for (const k of ["code", "lang", "country"]) {
      if (!c[k]) c[k] = info[k];
      else if (c[k] !== info[k]) log.push(`! ${c.name}: ${k} is ${c[k]}, plan page says ${info[k]} (kept ${c[k]})`);
    }
    Object.assign(c, { lat: info.lat, lon: info.lon, timezone: info.timezone });
  } catch (e) {
    log.push(`! ${c.name} (${c.id}): ${e.message}`);
  }
}

const order = data.regions.map(r => r.name);
for (const c of next) if (!order.includes(c.region)) order.push(c.region);
const FIELDS = ["name", "local", "id", "code", "lang", "country", "lat", "lon", "timezone", "tz"];
data.regions = order
  .map(name => ({
    name,
    cities: next.filter(c => c.region === name).sort((a, b) => a.name.localeCompare(b.name))
      .map(c => Object.fromEntries(FIELDS.filter(k => c[k] != null).map(k => [k, c[k]])))
  }))
  .filter(r => r.cities.length);

// One city per line keeps diffs readable
const json = JSON.stringify(data, null, 2).replace(/\{\n\s+("name"[^{}]*?)\n\s+\}/g,
  (m, body) => `{ ${body.replace(/\n\s+/g, " ")} }`);
const before = readFileSync(file, "utf8");
if (json + "\n" !== before) writeFileSync(file, json + "\n");
console.log(log.length ? log.join("\n") : "No changes in the city list");
console.log(`${next.length} cities${json + "\n" !== before ? " (cities.json updated)" : ""}`);
