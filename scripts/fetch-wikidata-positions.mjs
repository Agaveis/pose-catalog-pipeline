#!/usr/bin/env node
// Fetch CC0 sex-position items from Wikidata (SPARQL) as a naming/QID anchor
// for scaling the Erotic Pose Catalog beyond the hand-authored seed batch.
// Wikidata structured data is CC0 — QIDs, labels, and aliases are reusable with
// no attribution constraint (consistent with EE's CC0-preferred sourcing).
//
// Writes pose-vocabularies/wikidata-positions.json: [{ qid, label, aliases[] }].
// This is a REFERENCE list to seed new slugs from — descriptions/keypoints are
// still authored in poses.seed.json; we do not copy prose from any source.
//
// Usage (from Sites/EE/nextjs-app/):
//   node scripts/fetch-wikidata-positions.mjs

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'pose-vocabularies', 'wikidata-positions.json');

const ENDPOINT = 'https://query.wikidata.org/sparql';
// Items that are an instance/subclass/part of "sex position" (Q8394), with English
// aliases (skos:altLabel). Q8394 structured data is CC0.
const QUERY = `
SELECT DISTINCT ?item ?itemLabel (GROUP_CONCAT(DISTINCT ?alt; separator="|") AS ?aliases) WHERE {
  { ?item wdt:P31 wd:Q8394 } UNION { ?item wdt:P279 wd:Q8394 } UNION { ?item wdt:P361 wd:Q8394 }
  OPTIONAL { ?item skos:altLabel ?alt . FILTER(LANG(?alt) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?item ?itemLabel
ORDER BY ?itemLabel`;

async function main() {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(QUERY)}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      // Wikidata asks for a descriptive UA with contact.
      'User-Agent': 'EthnicErotic-pose-catalog/1.0 (https://ethnicerotic.com; jacoby@agaveis.com)',
    },
  });
  if (!res.ok) throw new Error(`Wikidata SPARQL ${res.status} ${res.statusText}`);
  const json = await res.json();
  const rows = json.results.bindings.map((b) => ({
    qid: b.item.value.split('/').pop(),
    label: b.itemLabel?.value || '',
    aliases: b.aliases?.value ? b.aliases.value.split('|').filter(Boolean) : [],
  }));
  writeFileSync(OUT, JSON.stringify({ source: 'wikidata:Q8394', license: 'CC0', fetched_count: rows.length, items: rows }, null, 2) + '\n', 'utf8');
  console.log(`✓ Wrote ${rows.length} CC0 position items → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
