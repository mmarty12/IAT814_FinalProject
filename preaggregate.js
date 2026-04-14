import { createReadStream, mkdirSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CSV_PATH = join(__dirname, 'board_games.csv'); // adjust if needed
const OUT_DIR = join(__dirname, 'data');
const MIN_VOTES = 100; // ignore games with fewer ratings (noise filter)
const TOP_N = 200; // rows to keep in top_games.json
const MIN_CAT_N = 30; // min games for a category to appear in aggregations
const MIN_MECH_N = 20; // min games for a mechanic to appear

// playtime bucket definitions (minutes)
const PT_BUCKETS = [
  { label: 'Under 30 min', min: 0, max: 29 },
  { label: '30–60 min', min: 30, max: 59 },
  { label: '1–2 hours', min: 60, max: 119 },
  { label: '2–4 hours', min: 120, max: 239 },
  { label: '4+ hours', min: 240, max: Infinity },
];

// top mechanics and categories for the heatmap (chart 9)
// these are pre-selected based on dataset analysis — adjust as needed
const HM_MECHS = [
  'Deck / Pool Building',
  'Chit-Pull System',
  'Variable Phase Order',
  'Worker Placement',
  'Campaign / Battle Card Driven',
  'Simulation',
  'Route/Network Building',
  'Area-Impulse',
];
const HM_CATS = ['Card Game', 'Wargame', 'Fantasy', 'Abstract Strategy', 'Economic', 'Dice'];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function ptBucket(mins) {
  const m = Number(mins);
  if (!m || m <= 0) return null;
  return PT_BUCKETS.find((b) => m >= b.min && m <= b.max)?.label ?? null;
}

/** Split a comma-separated field into trimmed, non-empty strings */
function splitField(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Accumulator for computing mean incrementally.
 * Avoids storing all values in memory.
 */
class MeanAcc {
  constructor() {
    this.sum = 0;
    this.n = 0;
  }
  add(v) {
    const n = Number(v);
    if (!isNaN(n)) {
      this.sum += n;
      this.n++;
    }
  }
  mean() {
    return this.n ? this.sum / this.n : null;
  }
  toJSON() {
    return { avg: +(this.mean()?.toFixed(4) ?? 0), count: this.n };
  }
}

function getOrCreate(map, key, factory) {
  if (!map.has(key)) map.set(key, factory());
  return map.get(key);
}

// ─── PARSE ───────────────────────────────────────────────────────────────────

async function loadRows() {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(CSV_PATH)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on('data', (row) => {
        const rating = Number(row.average_rating);
        const votes = Number(row.users_rated);
        // quality filter — skip unrated / low-vote games
        if (!rating || rating <= 0 || votes < MIN_VOTES) return;
        rows.push(row);
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// ─── AGGREGATORS ─────────────────────────────────────────────────────────────

/** Chart 1 – top N games sorted by rating, keeping only columns the UI needs */
function buildTopGames(rows) {
  return rows
    .slice() // don't mutate original
    .sort((a, b) => Number(b.average_rating) - Number(a.average_rating))
    .slice(0, TOP_N)
    .map((r) => ({
      name: r.name,
      rating: +Number(r.average_rating).toFixed(4),
      votes: Number(r.users_rated),
      year: Number(r.year_published),
      primaryGenre: splitField(r.category)[0] ?? 'Unknown',
      genres: splitField(r.category),
      playing_time: Number(r.playing_time),
      max_players: Number(r.max_players),
    }));
}

/** Chart 2 – avg rating per category (exploded) */
function buildByCategory(rows) {
  const acc = new Map();
  for (const r of rows) {
    for (const cat of splitField(r.category)) {
      getOrCreate(acc, cat, () => new MeanAcc()).add(r.average_rating);
    }
  }
  return Array.from(acc, ([category, a]) => ({ category, ...a.toJSON() }))
    .filter((d) => d.count >= MIN_CAT_N)
    .sort((a, b) => b.avg - a.avg);
}

/** Chart 3 – avg rating per mechanic (exploded) */
function buildByMechanic(rows) {
  const acc = new Map();
  for (const r of rows) {
    for (const mech of splitField(r.mechanic)) {
      getOrCreate(acc, mech, () => new MeanAcc()).add(r.average_rating);
    }
  }
  return Array.from(acc, ([mechanic, a]) => ({ mechanic, ...a.toJSON() }))
    .filter((d) => d.count >= MIN_MECH_N)
    .sort((a, b) => b.avg - a.avg);
}

/** Chart 4 – games with expansions vs without */
function buildExpansions(rows) {
  const withExp = new MeanAcc();
  const withoutExp = new MeanAcc();
  for (const r of rows) {
    const hasExp = r.expansion && r.expansion.trim() && r.expansion !== 'nan';
    (hasExp ? withExp : withoutExp).add(r.average_rating);
  }
  return [
    { label: 'With Expansions', ...withExp.toJSON() },
    { label: 'Without Expansions', ...withoutExp.toJSON() },
  ];
}

/** Chart 5 – avg rating by max_players (1–8) */
function buildByTeamSize(rows) {
  const acc = new Map();
  for (const r of rows) {
    const n = Number(r.max_players);
    if (n >= 1 && n <= 8) {
      getOrCreate(acc, n, () => new MeanAcc()).add(r.average_rating);
    }
  }
  return Array.from(acc, ([max_players, a]) => ({ max_players, ...a.toJSON() })).sort(
    (a, b) => a.max_players - b.max_players,
  );
}

/** Chart 6 – avg rating by playtime bucket */
function buildByPlaytime(rows) {
  const acc = new Map();
  for (const r of rows) {
    const bucket = ptBucket(r.playing_time);
    if (bucket) getOrCreate(acc, bucket, () => new MeanAcc()).add(r.average_rating);
  }
  // return in defined order
  return PT_BUCKETS.map(({ label }) => {
    const a = acc.get(label);
    return a ? { label, ...a.toJSON() } : null;
  }).filter(Boolean);
}

/** Chart 7 – avg rating per year (1970–2016) */
function buildByYear(rows) {
  const acc = new Map();
  for (const r of rows) {
    const yr = Number(r.year_published);
    if (yr >= 1970 && yr <= 2016) {
      getOrCreate(acc, yr, () => new MeanAcc()).add(r.average_rating);
    }
  }
  return Array.from(acc, ([year, a]) => ({ year, ...a.toJSON() })).sort((a, b) => a.year - b.year);
}

/**
 * Chart 8 – distribution for linked map
 * Returns two arrays: categoryDist and playtimeDist, plus a cross table
 * so the front-end can filter one when the user clicks the other.
 *
 * cross: array of { category, playtime_bucket, count } — lets D3 do
 * the filtering without reloading data.
 */
function buildDistribution(rows) {
  const catCount = new Map();
  const ptCount = new Map();
  const cross = new Map(); // "cat||bucket" → count

  for (const r of rows) {
    const cats = splitField(r.category);
    const bucket = ptBucket(r.playing_time);
    const primaryCat = cats[0];

    if (primaryCat) {
      catCount.set(primaryCat, (catCount.get(primaryCat) ?? 0) + 1);
    }
    if (bucket) {
      ptCount.set(bucket, (ptCount.get(bucket) ?? 0) + 1);
    }
    if (primaryCat && bucket) {
      const key = `${primaryCat}||${bucket}`;
      cross.set(key, (cross.get(key) ?? 0) + 1);
    }
  }

  const categoryDist = Array.from(catCount, ([category, count]) => ({ category, count }))
    .filter((d) => d.count >= MIN_CAT_N)
    .sort((a, b) => b.count - a.count);

  const playtimeDist = PT_BUCKETS.map(({ label }) => ({
    label,
    count: ptCount.get(label) ?? 0,
  }));

  // flatten cross map, keeping only known categories
  const knownCats = new Set(categoryDist.map((d) => d.category));
  const crossArr = Array.from(cross, ([key, count]) => {
    const [category, playtime_bucket] = key.split('||');
    return { category, playtime_bucket, count };
  }).filter((d) => knownCats.has(d.category));

  return { categoryDist, playtimeDist, cross: crossArr };
}

/**
 * Chart 9 – heatmap: mechanic × category avg rating
 * Returns { mechs, cats, matrix } where matrix[i][j] is the avg rating
 * for HM_MECHS[i] × HM_CATS[j], or null if fewer than 5 games.
 */
function buildHeatmap(rows) {
  // acc[mech][cat] = MeanAcc
  const acc = {};
  HM_MECHS.forEach((m) => {
    acc[m] = {};
    HM_CATS.forEach((c) => {
      acc[m][c] = new MeanAcc();
    });
  });

  for (const r of rows) {
    const mechs = splitField(r.mechanic);
    const cats = splitField(r.category);
    for (const m of mechs) {
      if (!acc[m]) continue;
      for (const c of cats) {
        if (!acc[m][c]) continue;
        acc[m][c].add(r.average_rating);
      }
    }
  }

  const matrix = HM_MECHS.map((m) =>
    HM_CATS.map((c) => {
      const a = acc[m][c];
      return a.n >= 5 ? +a.mean().toFixed(2) : null;
    }),
  );

  return { mechs: HM_MECHS, cats: HM_CATS, matrix };
}

// BUILD STATS
function buildStats(rows, rawTotal) {
  const top = rows.reduce((a, b) => (+b.average_rating > +a.average_rating ? b : a));
  const avg = rows.reduce((s, r) => s + +r.average_rating, 0) / rows.length;
  return {
    highestRated: { value: +Number(top.average_rating).toFixed(2), name: top.name },
    totalGames: rawTotal, // full unfiltered dataset size
    overallAvg: +avg.toFixed(2),
  };
}

// ─── WRITE ────────────────────────────────────────────────────────────────────

function write(filename, data) {
  const path = join(OUT_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  const kb = (JSON.stringify(data).length / 1024).toFixed(1);
  console.log(`  ✓  ${filename.padEnd(22)} ${kb.padStart(6)} KB`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nReading ${CSV_PATH} …`);
  const rows = await loadRows();
  console.log(`  ${rows.length.toLocaleString()} rows after quality filter (min ${MIN_VOTES} votes)\n`);

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Writing to ${OUT_DIR}/`);

  write('top_games.json', buildTopGames(rows));
  write('by_category.json', buildByCategory(rows));
  write('by_mechanic.json', buildByMechanic(rows));
  write('expansions.json', buildExpansions(rows));
  write('by_team_size.json', buildByTeamSize(rows));
  write('by_playtime.json', buildByPlaytime(rows));
  write('by_year.json', buildByYear(rows));
  write('distribution.json', buildDistribution(rows));
  write('heatmap.json', buildHeatmap(rows));

  write('stats.json', buildStats(rows, rows.length));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
