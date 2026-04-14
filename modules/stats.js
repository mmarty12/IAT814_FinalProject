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
