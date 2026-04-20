/**
 * Bar chart visualization
 */

export function buildBars(id, data, maxVal) {
  const el = d3.select(`#${id}`);
  if (el.empty()) return;
  const max = maxVal || d3.max(data, (d) => d.val);
  el.selectAll('*').remove();

  data.forEach((d) => {
    const pct = ((d.val / max) * 100).toFixed(1);
    const col = d.color || '#2d6a4f';
    const barRow = el.append('div').attr('class', 'bar-row');
    barRow.append('div').attr('class', 'bar-name').attr('title', d.name).text(d.name);
    const barTrack = barRow.append('div').attr('class', 'bar-track');
    barTrack
      .append('div')
      .attr('class', 'bar-fill')
      .style('width', `${pct}%`)
      .style('background', `${col}18`)
      .style('border-left', `3px solid ${col}`)
      .append('span')
      .style('color', col)
      .text(d.label !== undefined ? d.label : d.val);
  });
}

export function buildTeamSizeBars(id, data) {
  const el = d3.select(`#${id}`);
  if (el.empty()) return;
  el.selectAll('*').remove();

  const PALETTE = ['#2d6a4f', '#2563a8', '#6d3fa0', '#b5830a', '#0f7b72', '#c0392b'];
  const col = (i) => PALETTE[i % PALETTE.length];
  const max = d3.max(data, (d) => d.avg);

  // tooltip div — one shared instance
  let ttEl = document.getElementById('ts-tooltip');
  if (!ttEl) {
    ttEl = document.createElement('div');
    ttEl.id = 'ts-tooltip';
    ttEl.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #e8e4de;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      font-family: Inter, sans-serif;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 1000;
      min-width: 180px;
    `;
    document.body.appendChild(ttEl);
  }

  data.forEach((d, i) => {
    const pct = ((d.avg / max) * 100).toFixed(1);
    const color = col(i);
    const label = `${d.max_players} player${d.max_players > 1 ? 's' : ''} (${d.count.toLocaleString()})`;

    const row = el.append('div').attr('class', 'bar-row').style('position', 'relative');
    row.append('div').attr('class', 'bar-name').attr('title', label).text(label);
    const track = row.append('div').attr('class', 'bar-track').style('cursor', 'pointer');
    const fill = track
      .append('div')
      .attr('class', 'bar-fill')
      .style('width', `${pct}%`)
      .style('background', `${color}18`)
      .style('border-left', `3px solid ${color}`);

    fill.append('span').style('color', color).text(d.avg.toFixed(2));

    // build tooltip HTML from top3
    const top3html = d.top3
      .map(
        (g, ri) => `
  <div style="display:flex; justify-content:space-between; gap:16px; padding:3px 0;
              ${ri < d.top3.length - 1 ? 'border-bottom:1px solid #f0ede8;' : ''}">
    <span style="color:#555;">${g.name}</span>
    <span style="color:${color}; font-weight:600; white-space:nowrap;">★ ${g.rating}</span>
  </div>`,
      )
      .join('');

    const ttContent = `
      <div style="font-weight:600; color:#333; margin-bottom:8px; padding-bottom:6px;
                  border-bottom:2px solid ${color}40;">
        Top games -- ${d.max_players === 1 ? 'Solo' : d.max_players + ' players'}
      </div>
      ${top3html}`;

    // hover events on the whole row
    track.node().addEventListener('mouseenter', (e) => {
      ttEl.innerHTML = ttContent;
      ttEl.style.opacity = '1';
      ttEl.style.left = `${Math.min(e.clientX + 16, window.innerWidth - 220)}px`;
      ttEl.style.top = `${e.clientY - 10}px`;
    });

    track.node().addEventListener('mousemove', (e) => {
      ttEl.style.left = `${Math.min(e.clientX + 16, window.innerWidth - 220)}px`;
      ttEl.style.top = `${e.clientY - 10}px`;
    });

    track.node().addEventListener('mouseleave', () => {
      ttEl.style.opacity = '0';
    });
  });
}
export function buildPlaytimeBars(id, data) {
  const el = d3.select(`#${id}`);
  if (el.empty()) return;
  el.selectAll('*').remove();

  const PALETTE = ['#2d6a4f', '#2563a8', '#6d3fa0', '#b5830a', '#0f7b72', '#c0392b'];
  const col = (i) => PALETTE[i % PALETTE.length];
  const max = d3.max(data, (d) => d.avg);

  // shared tooltip
  let ttEl = document.getElementById('pt-tooltip');
  if (!ttEl) {
    ttEl = document.createElement('div');
    ttEl.id = 'pt-tooltip';
    ttEl.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #e8e4de;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      font-family: Inter, sans-serif;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 1000;
      min-width: 240px;
      max-width: 320px;
    `;
    document.body.appendChild(ttEl);
  }

  data.forEach((d, i) => {
    const pct = ((d.avg / max) * 100).toFixed(1);
    const color = col(i);

    const row = el.append('div').attr('class', 'bar-row');
    row.append('div').attr('class', 'bar-name').text(`${d.label} (${d.count.toLocaleString()} games)`);

    const track = row.append('div').attr('class', 'bar-track').style('cursor', 'pointer');
    const fill = track
      .append('div')
      .attr('class', 'bar-fill')
      .style('width', `${pct}%`)
      .style('background', `${color}18`)
      .style('border-left', `3px solid ${color}`);

    fill.append('span').style('color', color).text(d.avg.toFixed(2));

    const top3html = d.top3
      .map(
        (g, ri) => `
      <div style="display:flex; justify-content:space-between; gap:16px; padding:3px 0;
                  ${ri < d.top3.length - 1 ? 'border-bottom:1px solid #f0ede8;' : ''}">
        <span style="color:#555;">${g.name}</span>
        <span style="color:${color}; font-weight:600; white-space:nowrap;">★ ${g.rating}</span>
      </div>`,
      )
      .join('');

    const ttContent = `
      <div style="font-weight:600; color:#333; margin-bottom:8px; padding-bottom:6px;
                  border-bottom:2px solid ${color}40;">
        Top games — ${d.label}
      </div>
      ${top3html}`;

    track.node().addEventListener('mouseenter', (e) => {
      ttEl.innerHTML = ttContent;
      ttEl.style.opacity = '1';
      ttEl.style.left = `${Math.min(e.clientX + 16, window.innerWidth - 340)}px`;
      ttEl.style.top = `${e.clientY - 10}px`;
    });
    track.node().addEventListener('mousemove', (e) => {
      ttEl.style.left = `${Math.min(e.clientX + 16, window.innerWidth - 340)}px`;
      ttEl.style.top = `${e.clientY - 10}px`;
    });
    track.node().addEventListener('mouseleave', () => {
      ttEl.style.opacity = '0';
    });
  });
}
