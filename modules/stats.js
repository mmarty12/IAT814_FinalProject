/**
 * Statistics population for data cards
 */

export function populateStats(stats) {
  document.querySelector('#stat-highest .stat-value').textContent = stats.highestRated.value;
  document.querySelector('#stat-highest .stat-sub').textContent = stats.highestRated.name;

  document.querySelector('#stat-total .stat-value').textContent = stats.totalGames.toLocaleString();

  document.querySelector('#stat-avg .stat-value').textContent = stats.overallAvg;
}

export function populateCategoryStats(byCategory) {
  const top = byCategory[0];
  const bottom = byCategory[byCategory.length - 1];
  const most = byCategory.reduce((a, b) => (b.count > a.count ? b : a));

  document.querySelector('#stat-top-cat .stat-value').textContent = top.category;
  document.querySelector('#stat-top-cat .stat-sub').textContent = `avg ${top.avg.toFixed(2)} / 10`;

  document.querySelector('#stat-most-cat .stat-value').textContent = most.category;
  document.querySelector('#stat-most-cat .stat-sub').textContent = `${most.count.toLocaleString()} titles`;

  document.querySelector('#stat-low-cat .stat-value').textContent = bottom.category;
  document.querySelector('#stat-low-cat .stat-sub').textContent = `avg ${bottom.avg.toFixed(2)} / 10`;
}

export function populateMechanicStats(byMechanic) {
  const top = byMechanic[0]; // already sorted by avg desc
  const bottom = byMechanic[byMechanic.length - 1]; // lowest rated
  const most = byMechanic.reduce((a, b) => (b.count > a.count ? b : a)); // most common

  document.querySelector('#stat-mech-top .stat-value').textContent = top.mechanic;
  document.querySelector('#stat-mech-top .stat-sub').textContent = `avg ${top.avg.toFixed(2)} / 10`;

  document.querySelector('#stat-mech-most .stat-value').textContent = most.mechanic;
  document.querySelector('#stat-mech-most .stat-sub').textContent = `${most.count.toLocaleString()} games`;

  document.querySelector('#stat-mech-bottom .stat-value').textContent = bottom.mechanic;
  document.querySelector('#stat-mech-bottom .stat-sub').textContent = `avg ${bottom.avg.toFixed(2)} / 10`;
}

export function populateExpansions(expansions) {
  // filter out empty buckets before computing insights
  const valid = expansions.filter((d) => d.count > 0);

  const top = valid.reduce((a, b) => (b.avg > a.avg ? b : a));
  const most = valid.reduce((a, b) => (b.count > a.count ? b : a));
  const trend = (valid[valid.length - 1].avg - valid[0].avg).toFixed(2);
  const sign = trend > 0 ? '+' : '';

  document.querySelector('#stat-exp-top .stat-value').textContent = top.avg.toFixed(2);
  document.querySelector('#stat-exp-top .stat-sub').textContent = `Highest avg: ${top.label}`;

  document.querySelector('#stat-exp-most .stat-value').textContent = most.count.toLocaleString();
  document.querySelector('#stat-exp-most .stat-sub').textContent = `games: ${most.label}`;

  document.querySelector('#stat-exp-delta .stat-value').textContent = `${sign}${trend}`;
  document.querySelector('#stat-exp-delta .stat-sub').textContent = 'rating trend across groups';

  // axis bounds from valid data only
  const minVal = Math.min(...valid.map((d) => d.avg));
  const maxVal = Math.max(...valid.map((d) => d.avg));
  const axisMin = Math.floor(minVal * 10) / 10 - 0.1;

  buildExpansionChart('bars-expansions', valid, axisMin, maxVal);
}

function buildExpansionChart(id, data, axisMin, axisMax) {
  const el = d3.select(`#${id}`);
  if (el.empty()) return;
  el.selectAll('*').remove();

  const GREEN = '#2d6a4f';

  data.forEach((d, i) => {
    if (!d.count) return; // skip empty buckets

    // normalise within the actual data range for bar width
    const pct = (((d.avg - axisMin) / (axisMax - axisMin)) * 80).toFixed(1); // max 80% width
    const opacity = 0.35 + (i / (data.length - 1)) * 0.65; // darker = more expansions
    const color = `rgba(45,106,79,${opacity.toFixed(2)})`;

    const row = el.append('div').attr('class', 'bar-row');

    // label
    row.append('div').attr('class', 'bar-name').text(d.label);

    const track = row.append('div').attr('class', 'bar-track');

    const fill = track
      .append('div')
      .attr('class', 'bar-fill')
      .style('width', `${pct}%`)
      .style('background', `${GREEN}18`)
      .style('border-left', `3px solid ${color}`);

    // rating value
    fill.append('span').style('color', color).style('font-weight', '600').text(d.avg.toFixed(2));

    // game count as subtle suffix
    track
      .append('div')
      .attr('class', 'bar-count')
      .style('color', '#aaa')
      .style('font-size', '11px')
      .style('padding-left', '8px')
      .style('align-self', 'center')
      .style('white-space', 'nowrap')
      .text(`${d.count.toLocaleString()} games`);
  });
}

export function populateTeamSizeStats(byTeamSize) {
  const top = byTeamSize.reduce((a, b) => (b.avg > a.avg ? b : a));
  const most = byTeamSize.reduce((a, b) => (b.count > a.count ? b : a));
  const solo = byTeamSize.find((d) => d.max_players === 1);
  const multi = byTeamSize.filter((d) => d.max_players > 1);
  const multiAvg = multi.reduce((s, d) => s + d.avg, 0) / multi.length;
  const gap = (solo.avg - multiAvg).toFixed(2);

  document.querySelector('#stat-ts-top .stat-value').textContent = top.avg.toFixed(2);
  document.querySelector('#stat-ts-top .stat-sub').textContent =
    `Best avg: ${top.max_players === 1 ? 'solo' : top.max_players + ' players'}`;

  document.querySelector('#stat-ts-most .stat-value').textContent = most.count.toLocaleString();
  document.querySelector('#stat-ts-most .stat-sub').textContent = `games support ${most.max_players} players`;

  document.querySelector('#stat-ts-gap .stat-value').textContent = `+${gap}`;
  document.querySelector('#stat-ts-gap .stat-sub').textContent = 'solo rates higher than multiplayer avg';
}

export function populatePlaytimeStats(byPlaytime) {
  const top = byPlaytime.reduce((a, b) => (b.avg > a.avg ? b : a));
  const most = byPlaytime.reduce((a, b) => (b.count > a.count ? b : a));
  const short = byPlaytime[0]; // Under 30 min
  const long = byPlaytime[byPlaytime.length - 1]; // 4+ hours
  const gap = (long.avg - short.avg).toFixed(2);

  document.querySelector('#stat-pt-top .stat-value').textContent = top.avg.toFixed(2);
  document.querySelector('#stat-pt-top .stat-sub').textContent = `Best avg: ${top.label}`;

  document.querySelector('#stat-pt-most .stat-value').textContent = most.count.toLocaleString();
  document.querySelector('#stat-pt-most .stat-sub').textContent = `games: ${most.label}`;

  document.querySelector('#stat-pt-gap .stat-value').textContent = `+${gap}`;
  document.querySelector('#stat-pt-gap .stat-sub').textContent = '4+ hours rates higher than under 30 min';
}

export function populateYearStats(byYear) {
  const best = byYear.reduce((a, b) => (b.avg > a.avg ? b : a));
  const worst = byYear.reduce((a, b) => (b.avg < a.avg ? b : a));
  const busiest = byYear.reduce((a, b) => (b.count > a.count ? b : a));

  document.querySelector('#stat-yr-best .stat-value').textContent = best.year;
  document.querySelector('#stat-yr-best .stat-sub').textContent = `avg ★ ${best.avg.toFixed(2)}`;

  document.querySelector('#stat-yr-worst .stat-value').textContent = worst.year;
  document.querySelector('#stat-yr-worst .stat-sub').textContent = `avg ★ ${worst.avg.toFixed(2)}`;

  document.querySelector('#stat-yr-busy .stat-value').textContent = busiest.year;
  document.querySelector('#stat-yr-busy .stat-sub').textContent = `${busiest.count.toLocaleString()} games released`;
}
