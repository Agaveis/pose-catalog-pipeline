// Shared mapping from a poses.seed.json entry to a flat `pose` DB row.
// Imported by seed-poses.mjs (dev/direct seeder) and build-pose-seed-module.mjs
// (boot-module generator) so the row shape has a single source of truth.

export const SITE_URL = 'https://ethnicerotic.com';

export const pipe = (arr) => (Array.isArray(arr) ? arr.filter(Boolean).join('|') : (arr || ''));

export function toPoseRow(p) {
  return {
    slug: p.slug,
    name: p.name,
    aliases: pipe(p.aliases),
    wikidata_qid: p.wikidata_qid || null,
    kama_sutra_name: p.kama_sutra_name || null,
    position_family: p.position_family || null,
    primary_act: p.primary_act || null,
    arrangement: p.arrangement || null,
    penetration_type: p.penetration_type || null,
    facing: p.facing || null,
    dynamics: p.dynamics || null,
    support_surface: p.support_surface || null,
    participant_count: p.participant_count || null,
    composition_code: p.composition_code || null,
    source_medium: p.source_medium || null,
    camera_framing: pipe(p.camera_framing),
    difficulty: p.difficulty || null,
    prevalence: p.prevalence || null,
    intensity_tier: p.intensity_tier || null,
    // Historical provenance (Kama Sutra, Perfumed Garden, Su Nü Jing, …) —
    // JSON array of {source, name, note?}; source ids resolve against
    // pose-vocabularies/historical-sources.json.
    historical_sources: Array.isArray(p.historical_sources) && p.historical_sources.length
      ? JSON.stringify(p.historical_sources)
      : null,
    description: p.description || null,
    wiki_url: p.wikidata_qid ? `https://www.wikidata.org/wiki/${p.wikidata_qid}` : null,
    canonical_url: `${SITE_URL}/poses/${p.slug}`,
  };
}
