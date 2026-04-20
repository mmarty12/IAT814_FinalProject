/**
 * Year line chart visualization
 */
import { DATA } from './dataLoader.js';

export function drawYearLine() {
  const yd = DATA.byYear;
  const svg = d3.select('#yearLineSvg');
  if (svg.empty() || !yd?.length) return;

  // ── dimensions ─────────────────────────────────────────────────────────────
  const container = svg.node().parentElement;
  const W = container.clientWidth;
  const H = 220;
  const pad = { l: 34, r: 16, t: 14, b: 28 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', H).attr('preserveAspectRatio', 'none');

  svg.selectAll('*').remove();

  // ── scales ─────────────────────────────────────────────────────────────────
  const minY = d3.min(yd, (d) => d.avg);
  const maxY = d3.max(yd, (d) => d.avg);
  const xScale = d3
    .scaleLinear()
    .domain([0, yd.length - 1])
    .range([pad.l, pad.l + plotW]);
  const yScale = d3
    .scaleLinear()
    .domain([minY, maxY])
    .nice()
    .range([pad.t + plotH, pad.t]);

  // ── grid + axes ────────────────────────────────────────────────────────────
  yScale.ticks(5).forEach((v) => {
    svg
      .append('line')
      .attr('x1', pad.l)
      .attr('x2', pad.l + plotW)
      .attr('y1', yScale(v))
      .attr('y2', yScale(v))
      .attr('stroke', 'rgba(0,0,0,0.06)')
      .attr('stroke-width', 1);

    svg
      .append('text')
      .attr('x', pad.l - 5)
      .attr('y', yScale(v) + 3)
      .attr('text-anchor', 'end')
      .attr('font-size', '9px')
      .attr('fill', '#bbb')
      .text(v.toFixed(1));
  });

  const step = Math.ceil(yd.length / 10);
  yd.forEach((d, i) => {
    if (i % step !== 0) return;
    svg
      .append('text')
      .attr('x', xScale(i))
      .attr('y', pad.t + plotH + 16)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#bbb')
      .text(d.year);
  });

  // ── area + line ────────────────────────────────────────────────────────────
  svg
    .append('path')
    .datum(yd)
    .attr('fill', 'rgba(45,106,79,0.07)')
    .attr(
      'd',
      d3
        .area()
        .x((_, i) => xScale(i))
        .y0(yScale(minY))
        .y1((d) => yScale(d.avg)),
    );

  svg
    .append('path')
    .datum(yd)
    .attr('fill', 'none')
    .attr('stroke', '#2d6a4f')
    .attr('stroke-width', 2)
    .attr('stroke-linejoin', 'round')
    .attr(
      'd',
      d3
        .line()
        .x((_, i) => xScale(i))
        .y((d) => yScale(d.avg))
        .curve(d3.curveMonotoneX),
    );

  // start + end anchor dots
  [0, yd.length - 1].forEach((i) => {
    svg.append('circle').attr('cx', xScale(i)).attr('cy', yScale(yd[i].avg)).attr('r', 3.5).attr('fill', '#2d6a4f');
  });

  // ── crosshair elements (hidden until hover) ────────────────────────────────
  const crosshair = svg
    .append('line')
    .attr('y1', pad.t)
    .attr('y2', pad.t + plotH)
    .attr('stroke', '#2d6a4f')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,3')
    .style('opacity', 0);

  const dot = svg
    .append('circle')
    .attr('r', 4)
    .attr('fill', '#2d6a4f')
    .attr('stroke', 'white')
    .attr('stroke-width', 2)
    .style('opacity', 0);

  // ── tooltip ────────────────────────────────────────────────────────────────
  const ttEl = getOrCreateTooltip('year-tooltip');

  // ── mouse overlay ──────────────────────────────────────────────────────────
  svg
    .append('rect')
    .attr('x', pad.l)
    .attr('y', pad.t)
    .attr('width', plotW)
    .attr('height', plotH)
    .attr('fill', 'transparent')
    .on('mousemove', function (event) {
      const [mx] = d3.pointer(event);
      const i = Math.max(0, Math.min(yd.length - 1, Math.round(xScale.invert(mx))));
      const d = yd[i];
      const cx = xScale(i);
      const cy = yScale(d.avg);

      crosshair.attr('x1', cx).attr('x2', cx).style('opacity', 1);
      dot.attr('cx', cx).attr('cy', cy).style('opacity', 1);

      ttEl.innerHTML = buildYearTooltip(d);

      const { left: svgLeft, top: svgTop } = svg.node().getBoundingClientRect();
      ttEl.style.opacity = '1';
      ttEl.style.left = `${Math.min(svgLeft + cx + 16, window.innerWidth - 300)}px`;
      ttEl.style.top = `${svgTop + cy - 20}px`;
    })
    .on('mouseleave', () => {
      crosshair.style('opacity', 0);
      dot.style('opacity', 0);
      ttEl.style.opacity = '0';
    });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Get existing tooltip element or create and append to body */
function getOrCreateTooltip(id) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.style.cssText = `
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
      min-width: 200px;
      max-width: 280px;
    `;
    document.body.appendChild(el);
  }
  return el;
}

/** Build tooltip inner HTML for a given year data point */
function buildYearTooltip(d) {
  const top2rows = (d.top2 || [])
    .map(
      (g) => `
    <div style="display:flex; justify-content:space-between; gap:12px; padding:2px 0; color:#555;">
      <span>${g.name}</span>
      <span style="color:#2d6a4f; font-weight:600; white-space:nowrap;">★ ${g.rating}</span>
    </div>`,
    )
    .join('');

  const top2section = d.top2?.length
    ? `
    <div style="font-size:11px; color:#aaa; margin-bottom:4px;
                text-transform:uppercase; letter-spacing:0.05em;">Top rated</div>
    ${top2rows}`
    : '';

  return `
    <div style="font-weight:700; font-size:14px; color:#2d6a4f;
                margin-bottom:6px; padding-bottom:6px; border-bottom:2px solid #2d6a4f40;">
      ${d.year}
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
      <span style="color:#888;">Avg rating</span>
      <span style="font-weight:600; color:#333;">★ ${d.avg.toFixed(2)}</span>
    </div>
    <div style="display:flex; justify-content:space-between;
                margin-bottom:${d.top2?.length ? '8px' : '0'};">
      <span style="color:#888;">Games released</span>
      <span style="font-weight:600; color:#333;">${d.count.toLocaleString()}</span>
    </div>
    ${top2section}`;
}
