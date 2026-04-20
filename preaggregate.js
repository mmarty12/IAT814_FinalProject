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
      thumbnail: r.thumbnail || null, // ← add this
      primaryGenre: splitField(r.category)[0] ?? 'Unknown',
      genres: splitField(r.category),
      playing_time: Number(r.playing_time),
      max_players: Number(r.max_players),
    }));
}

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

function buildExpansions(rows) {
  // plain JS rollup — no d3 needed
  const groups = new Map();

  for (const r of rows) {
    const n = Math.min((r.expansion || '').split(',').filter((s) => s.trim()).length, 5);
    if (!groups.has(n)) groups.set(n, { sum: 0, count: 0 });
    const g = groups.get(n);
    g.sum += +r.average_rating;
    g.count++;
  }

  const labels = ['No expansions', '1 expansion', '2 expansions', '3 expansions', '4 expansions', '5+ expansions'];

  return Array.from({ length: 6 }, (_, i) => {
    const g = groups.get(i) || { sum: 0, count: 0 };
    const avg = g.count ? g.sum / g.count : 0;
    return { label: labels[i], expansionCount: i, avg: +avg.toFixed(4), count: g.count };
  });
}

function buildByTeamSize(rows) {
  const acc = new Map();
  const gamesBin = new Map();

  for (const r of rows) {
    const n = Number(r.max_players);
    if (n >= 1 && n <= 8) {
      getOrCreate(acc, n, () => new MeanAcc()).add(r.average_rating);
      if (!gamesBin.has(n)) gamesBin.set(n, []);
      gamesBin.get(n).push({ name: r.name, rating: +Number(r.average_rating).toFixed(2) });
    }
  }

  return Array.from(acc, ([max_players, a]) => ({
    max_players,
    ...a.toJSON(),
    top3: (gamesBin.get(max_players) || []).sort((a, b) => b.rating - a.rating).slice(0, 3),
  })).sort((a, b) => a.max_players - b.max_players);
}

function buildByPlaytime(rows) {
  const acc = new Map();
  const gamesBin = new Map();

  for (const r of rows) {
    const bucket = ptBucket(r.playing_time);
    if (bucket) {
      getOrCreate(acc, bucket, () => new MeanAcc()).add(r.average_rating);
      if (!gamesBin.has(bucket)) gamesBin.set(bucket, []);
      gamesBin.get(bucket).push({ name: r.name, rating: +Number(r.average_rating).toFixed(2) });
    }
  }

  return PT_BUCKETS.map(({ label }) => {
    const a = acc.get(label);
    if (!a) return null;
    return {
      label,
      ...a.toJSON(),
      top3: (gamesBin.get(label) || []).sort((a, b) => b.rating - a.rating).slice(0, 3),
    };
  }).filter(Boolean);
}

function buildByYear(rows) {
  const acc = new Map();
  const gamesBin = new Map();

  for (const r of rows) {
    const yr = Number(r.year_published);
    if (yr >= 1970 && yr <= 2016) {
      getOrCreate(acc, yr, () => new MeanAcc()).add(r.average_rating);
      if (!gamesBin.has(yr)) gamesBin.set(yr, []);
      gamesBin.get(yr).push({ name: r.name, rating: +Number(r.average_rating).toFixed(2) });
    }
  }

  return Array.from(acc, ([year, a]) => ({
    year,
    ...a.toJSON(),
    top2: (gamesBin.get(year) || []).sort((a, b) => b.rating - a.rating).slice(0, 2),
  })).sort((a, b) => a.year - b.year);
}

function buildDistribution(rows) {
  const catCount = new Map();
  const ptCount = new Map();
  const cross = new Map();

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

  const knownCats = new Set(categoryDist.map((d) => d.category));
  const crossArr = Array.from(cross, ([key, count]) => {
    const [category, playtime_bucket] = key.split('||');
    return { category, playtime_bucket, count };
  }).filter((d) => knownCats.has(d.category));

  return { categoryDist, playtimeDist, cross: crossArr };
}

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

function buildStats(rows, rawTotal) {
  const top = rows.reduce((a, b) => (+b.average_rating > +a.average_rating ? b : a));
  const avg = rows.reduce((s, r) => s + +r.average_rating, 0) / rows.length;
  return {
    highestRated: { value: +Number(top.average_rating).toFixed(2), name: top.name },
    totalGames: rawTotal, // full unfiltered dataset size
    overallAvg: +avg.toFixed(2),
  };
}

function write(filename, data) {
  const path = join(OUT_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  const kb = (JSON.stringify(data).length / 1024).toFixed(1);
  console.log(`  ✓  ${filename.padEnd(22)} ${kb.padStart(6)} KB`);
}

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
