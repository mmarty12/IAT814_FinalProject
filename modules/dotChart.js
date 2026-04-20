/**
 * Dot plot — drop-in replacement for buildBars()
 *
 * Renders a horizontal dot plot with a tight axis around the actual
 * data range, making small differences between values clearly visible.
 *
 * @param {string} id       - container element id
 * @param {Array}  data     - [{ name, val, label?, color? }]
 * @param {number} axisMin  - optional left axis bound (auto if omitted)
 * @param {number} axisMax  - optional right axis bound (auto if omitted)
 */

export function buildDotPlot(id, data, axisMin, axisMax) {
  const el = d3.select(`#${id}`);
  if (el.empty() || !data.length) return;
  el.selectAll('*').remove();

  const minVal = axisMin ?? d3.min(data, (d) => d.val);
  const maxVal = axisMax ?? d3.max(data, (d) => d.val);
  const lo = minVal - (maxVal - minVal) * 0.08;
  const hi = maxVal + (maxVal - minVal) * 0.08;

  const LABEL_W = 210;
  const VALUE_W = 44;
  const ROW_H = 32;
  const DOT_R = 5;

  const totalW = el.node().clientWidth || 600;
  const plotW = totalW - LABEL_W - VALUE_W;
  const totalH = data.length * ROW_H;
  const svgH = totalH + 20; // +20 for tick labels at bottom

  // ── size the container to exactly fit the chart ───────────────────────────
  el.style('height', `${svgH}px`);

  const xScale = d3.scaleLinear().domain([lo, hi]).range([0, plotW]);

  const svg = el.append('svg').attr('width', '100%').attr('height', svgH).attr('viewBox', `0 0 ${totalW} ${svgH}`);

  const g = svg.append('g').attr('transform', `translate(${LABEL_W}, 0)`);

  // ── x-axis ticks ──────────────────────────────────────────────────────────
  xScale.ticks(5).forEach((tick) => {
    g.append('line')
      .attr('x1', xScale(tick))
      .attr('x2', xScale(tick))
      .attr('y1', 0)
      .attr('y2', totalH)
      .attr('stroke', 'rgba(0,0,0,0.06)')
      .attr('stroke-width', 1);

    g.append('text')
      .attr('x', xScale(tick))
      .attr('y', totalH + 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#bbb')
      .attr('font-family', 'Inter, sans-serif')
      .text(tick.toFixed(2));
  });

  // ── rows ──────────────────────────────────────────────────────────────────
  data.forEach((d, i) => {
    const cy = i * ROW_H + ROW_H / 2;
    const cx = xScale(d.val);
    const color = d.color || '#2d6a4f';

    const row = g.append('g').attr('class', 'dot-row');

    // ── label: left-aligned, fixed width, positioned left of plot ────────────
    svg
      .append('text')
      .attr('x', 0) // ← start from left edge
      .attr('y', cy + 1)
      .attr('text-anchor', 'start') // ← left-aligned
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#555')
      .attr('font-family', 'Inter, sans-serif')
      .text(d.name.length > 30 ? d.name.slice(0, 28) + '…' : d.name);

    // baseline track
    row
      .append('line')
      .attr('x1', 0)
      .attr('x2', plotW)
      .attr('y1', cy)
      .attr('y2', cy)
      .attr('stroke', 'rgba(0,0,0,0.06)')
      .attr('stroke-width', 1);

    // connector line from axis start to dot
    row
      .append('line')
      .attr('x1', xScale(lo))
      .attr('x2', cx)
      .attr('y1', cy)
      .attr('y2', cy)
      .attr('stroke', `${color}50`)
      .attr('stroke-width', 1.5);

    // dot
    row
      .append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', DOT_R)
      .attr('fill', color)
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

    // value label right of plot
    g.append('text')
      .attr('x', plotW + 8)
      .attr('y', cy + 1)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', color)
      .attr('font-family', 'Inter, sans-serif')
      .text(d.label !== undefined ? d.label : d.val);
  });
}
