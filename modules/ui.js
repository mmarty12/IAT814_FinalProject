/**
 * UI and view switching
 */
import { TOP_GAMES, DATA, COLORS } from './dataLoader.js';
import { buildBars } from './barChart.js';
import { buildHeatmap } from './heatmap.js';
import { drawYearLine } from './yearLine.js';

export const TITLES = {
  bubbles: 'Game Popularity — Bubble Map',
  byname: 'Rating of Games by Name',
  bycategory: 'Rating of Games by Category',
  bymechanic: 'Rating of Games by Mechanic',
  expansions: 'Games with Expansions vs Ratings',
  teamsize: 'Rating by Average Team Size',
  playtime: 'Rating by Average Playtime',
  byyear: 'Rating by Year of Release',
  distribution: 'Distribution — Category Map',
  correlation: 'Mechanics × Categories × Ratings',
};

export function populate() {
  const fmt = (v) => (+v).toFixed(2);
  const PALETTE = ['#2d6a4f', '#2563a8', '#6d3fa0', '#b5830a', '#0f7b72', '#c0392b'];
  const col = (i) => PALETTE[i % PALETTE.length];

  //chart 1: Top games by rating
  buildBars(
    'bars-byname',
    TOP_GAMES.slice(0, 25).map((g) => ({
      name: g.name.length > 32 ? g.name.slice(0, 30) + '…' : g.name,
      val: g.rating,
      label: fmt(g.rating),
      color: COLORS[g.primaryGenre] || '#888',
    })),
    9.2,
  );

  //chart 2: Rating by category
  buildBars(
    'bars-bycategory',
    DATA.byCategory.slice(0, 25).map((d, i) => ({
      name: d.category,
      val: d.avg,
      label: fmt(d.avg),
      color: COLORS[d.category] || col(i),
    })),
    8.0,
  );

  //chart 3: Rating by mechanic
  buildBars(
    'bars-bymechanic',
    DATA.byMechanic.slice(0, 15).map((d, i) => ({
      name: d.mechanic,
      val: d.avg,
      label: fmt(d.avg),
      color: col(i),
    })),
    8.0,
  );

  //chart 4: Expansions
  buildBars(
    'bars-expansions',
    DATA.expansions.map((d, i) => ({
      name: d.label,
      val: d.avg,
      label: fmt(d.avg),
      color: i === 0 ? '#2d6a4f' : '#aaa',
    })),
    8.0,
  );

  //chart 5: Rating by team size
  const playerLabels = ['Solo', '2p', '3p', '4p', '5p', '6p', '7p', '8p'];
  buildBars(
    'bars-teamsize',
    DATA.byTeamSize.map((d, i) => ({
      name: `${playerLabels[i] || d.max_players + 'p'} – ${d.max_players} player${d.max_players > 1 ? 's' : ''} (${d.count.toLocaleString()})`,
      val: d.avg,
      label: fmt(d.avg),
      color: col(i),
    })),
    8.0,
  );

  //chart 6: Rating by playtime
  buildBars(
    'bars-playtime',
    DATA.byPlaytime.map((d, i) => ({
      name: `${d.label} (${d.count.toLocaleString()} games)`,
      val: d.avg,
      label: fmt(d.avg),
      color: col(i),
    })),
    8.0,
  );

  //chart 8: Distribution — genre
  const { categoryDist, playtimeDist } = DATA.distribution;
  const catTotal = categoryDist.reduce((s, d) => s + d.count, 0);
  buildBars(
    'bars-distgenre',
    categoryDist.slice(0, 10).map((d, i) => ({
      name: d.category,
      val: d.count,
      label: `${d.count.toLocaleString()} · ${Math.round((d.count / catTotal) * 100)}%`,
      color: COLORS[d.category] || col(i),
    })),
  );

  const ptTotal = playtimeDist.reduce((s, d) => s + d.count, 0);
  buildBars(
    'bars-distplaytime',
    playtimeDist.map((d, i) => ({
      name: d.label,
      val: d.count,
      label: `${d.count.toLocaleString()} · ${Math.round((d.count / ptTotal) * 100)}%`,
      color: col(i),
    })),
  );

  const tc = d3.select('#tag-cloud');
  tc.selectAll('*').remove();
  categoryDist.slice(0, 28).forEach((d, i) => {
    const c = COLORS[d.category] || col(i);
    tc.append('span')
      .attr('class', 'tag')
      .style('border-color', `${c}28`)
      .style('background', `${c}0a`)
      .style('color', `${c}bb`)
      .text(d.category);
  });

  //chart 9: Mechanic × Category correlation
  const { mechs, cats, matrix } = DATA.heatmap;
  const combos = [];
  matrix.forEach((row, ri) => {
    row.forEach((v, ci) => {
      if (v !== null) combos.push({ name: `${mechs[ri]} + ${cats[ci]}`, val: v, label: fmt(v) });
    });
  });
  combos.sort((a, b) => b.val - a.val);

  buildBars(
    'bars-correlation',
    combos.slice(0, 8).map((d, i) => ({ ...d, color: col(i) })),
    8.0,
  );

  buildHeatmap();
}

export function switchView(id, btn) {
  d3.selectAll('.nav-item').classed('active', false);
  d3.select(btn).classed('active', true);
  Object.keys(TITLES).forEach((v) => {
    const el = d3.select(`#view-${v}`);
    if (!el.empty()) el.style('display', 'none').classed('active', false);
  });
  const t = d3.select(`#view-${id}`);
  if (!t.empty()) {
    t.style('display', 'block');
    if (id !== 'bubbles') t.classed('active', true);
  }
  d3.select('#genre-filters').style('display', id === 'bubbles' ? 'flex' : 'none');
  d3.select('#topbar-title').text(TITLES[id] || '');
  if (id === 'byyear') setTimeout(drawYearLine, 30);
}
