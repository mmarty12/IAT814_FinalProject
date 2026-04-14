/**
 * Year line chart visualization
 */
import { DATA } from './dataLoader.js';

export function drawYearLine() {
  const yd = DATA.byYear; // [{ year, avg, count }, ...]
  const svg = d3.select('#yearLineSvg');
  if (svg.empty() || !yd) return;

  const container = svg.node().parentElement;
  const W = container.clientWidth - 36,
    H = 200;
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const pad = { l: 34, r: 16, t: 14, b: 28 };
  const plotW = W - pad.l - pad.r,
    plotH = H - pad.t - pad.b;

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

  svg.selectAll('*').remove();

  yScale.ticks(5).forEach((v) => {
    svg
      .append('line')
      .attr('x1', pad.l)
      .attr('y1', yScale(v))
      .attr('x2', pad.l + plotW)
      .attr('y2', yScale(v))
      .attr('stroke', 'rgba(0,0,0,0.06)')
      .attr('stroke-width', 1);
    svg
      .append('text')
      .attr('x', pad.l - 5)
      .attr('y', yScale(v) + 3)
      .attr('text-anchor', 'end')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', '9px')
      .attr('fill', '#bbb')
      .text(v.toFixed(1));
  });

  const step = Math.ceil(yd.length / 10);
  yd.forEach((d, i) => {
    if (i % step === 0) {
      svg
        .append('text')
        .attr('x', xScale(i))
        .attr('y', pad.t + plotH + 16)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Inter, sans-serif')
        .attr('font-size', '9px')
        .attr('fill', '#bbb')
        .text(d.year);
    }
  });

  const area = d3
    .area()
    .x((_, i) => xScale(i))
    .y0(yScale(minY))
    .y1((d) => yScale(d.avg));
  svg.append('path').datum(yd).attr('fill', 'rgba(45,106,79,0.07)').attr('d', area);

  const line = d3
    .line()
    .x((_, i) => xScale(i))
    .y((d) => yScale(d.avg))
    .curve(d3.curveMonotoneX);
  svg
    .append('path')
    .datum(yd)
    .attr('fill', 'none')
    .attr('stroke', '#2d6a4f')
    .attr('stroke-width', 2)
    .attr('stroke-linejoin', 'round')
    .attr('d', line);

  [0, yd.length - 1].forEach((i) => {
    svg.append('circle').attr('cx', xScale(i)).attr('cy', yScale(yd[i].avg)).attr('r', 3.5).attr('fill', '#2d6a4f');
  });
}
