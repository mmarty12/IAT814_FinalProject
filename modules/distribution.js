/**
 * Distribution visualization
 */
import { DATA, COLORS } from './dataLoader.js';
import { buildBars } from './barChart.js';

const PT_COLORS = {
  'Under 30 min': '#c0392b',
  '30-60 min': '#b5830a',
  '1-2 hours': '#2563a8',
  '2-4 hours': '#2d6a4f',
  '4+ hours': '#6d3fa0',
};

let selectedCat = null;
let selectedPt = null;

export function buildDistributionBars() {
  renderGenreBars(DATA.distribution.categoryDist);
  renderPlaytimeBars(DATA.distribution.playtimeDist);
}

function renderGenreBars(data, highlight = null) {
  const total = d3.sum(data, (d) => d.count);
  const max = d3.max(data, (d) => d.count);

  buildBars(
    'bars-distgenre',
    data.slice(0, 15).map((d) => ({
      name: d.category,
      val: d.count,
      label: `${d.count.toLocaleString()} · ${Math.round((d.count / total) * 100)}%`,
      color: !highlight || d.category === highlight ? COLORS[d.category] || '#2d6a4f' : '#ccc',
    })),
    max,
  );

  // attach click handlers after buildBars renders the rows
  d3.selectAll('#bars-distgenre .bar-row').each(function (_, i) {
    const cat = data.slice(0, 15)[i]?.category;
    if (!cat) return;
    d3.select(this)
      .style('cursor', 'pointer')
      .on('click', () => onGenreClick(cat));
  });
}

function renderPlaytimeBars(data, highlight = null) {
  const total = d3.sum(data, (d) => d.count);
  const max = d3.max(data, (d) => d.count);

  buildBars(
    'bars-distplaytime',
    data.map((d) => ({
      name: d.label,
      val: d.count,
      label: `${d.count.toLocaleString()} · ${Math.round((d.count / total) * 100)}%`,
      color: !highlight || d.label === highlight ? PT_COLORS[d.label] || '#2563a8' : '#ccc',
    })),
    max,
  );

  d3.selectAll('#bars-distplaytime .bar-row').each(function (_, i) {
    const label = data[i]?.label;
    if (!label) return;
    d3.select(this)
      .style('cursor', 'pointer')
      .on('click', () => onPlaytimeClick(label));
  });
}

function onGenreClick(cat) {
  // clicking the active selection deselects
  if (selectedCat === cat) {
    selectedCat = null;
    renderGenreBars(DATA.distribution.categoryDist);
    renderPlaytimeBars(DATA.distribution.playtimeDist);
    setResetVisible(false);
    updateBreadcrumb(null, null);
    return;
  }

  selectedCat = cat;
  selectedPt = null;

  // filter playtime counts for this category via cross table
  const crossRows = DATA.distribution.cross.filter((r) => r.category === cat);
  const filteredPt = DATA.distribution.playtimeDist.map((pt) => ({
    label: pt.label,
    count: crossRows.find((r) => r.playtime_bucket === pt.label)?.count ?? 0,
  }));

  renderGenreBars(DATA.distribution.categoryDist, cat);
  renderPlaytimeBars(filteredPt);
  setResetVisible(true);
  updateBreadcrumb(cat, null);
}

function onPlaytimeClick(ptLabel) {
  // clicking the active selection deselects
  if (selectedPt === ptLabel) {
    selectedPt = null;
    if (selectedCat) {
      onGenreClick(selectedCat);
    } else {
      renderPlaytimeBars(DATA.distribution.playtimeDist);
    }
    return;
  }

  selectedPt = ptLabel;

  // filter genre counts for this playtime bucket via cross table
  const crossRows = DATA.distribution.cross.filter((r) => r.playtime_bucket === ptLabel);
  const filteredCat = DATA.distribution.categoryDist
    .map((cat) => ({
      category: cat.category,
      count: crossRows.find((r) => r.category === cat.category)?.count ?? 0,
    }))
    .filter((d) => d.count > 0);

  renderPlaytimeBars(DATA.distribution.playtimeDist, ptLabel);
  renderGenreBars(filteredCat);
  setResetVisible(true);
  updateBreadcrumb(selectedCat, ptLabel);
}

export function resetDistribution() {
  selectedCat = null;
  selectedPt = null;
  renderGenreBars(DATA.distribution.categoryDist);
  renderPlaytimeBars(DATA.distribution.playtimeDist);
  setResetVisible(false);
  updateBreadcrumb(null, null);
}

function setResetVisible(visible) {
  const btn = document.getElementById('dist-reset');
  if (btn) btn.style.display = visible ? 'inline-flex' : 'none';
}

function updateBreadcrumb(cat, pt) {
  const el = document.getElementById('dist-breadcrumb');
  if (!el) return;
  el.textContent = [cat, pt].filter(Boolean).join(' → ');
}
