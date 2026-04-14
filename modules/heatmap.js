/**
 * Heatmap visualization
 */
import { DATA } from './dataLoader.js';

export function buildHeatmap() {
  const { mechs, cats, matrix } = DATA.heatmap;
  const allV = matrix.flat().filter((v) => v !== null);
  const minV = d3.min(allV),
    maxV = d3.max(allV);
  const tbl = d3.select('#heatmap-table');
  if (tbl.empty()) return;

  tbl.selectAll('*').remove();

  const thead = tbl.append('thead').append('tr');
  thead.append('th');
  cats.forEach((c) => thead.append('th').attr('class', 'hm-col-label').text(c));

  const tbody = tbl.append('tbody');
  matrix.forEach((row, ri) => {
    const tr = tbody.append('tr');
    tr.append('td').attr('class', 'hm-row-label').text(mechs[ri]);
    row.forEach((v) => {
      const td = tr.append('td').attr('class', 'hm-cell');
      if (v === null) {
        td.style('background', '#f5f3f0').style('color', '#ccc').text('—');
      } else {
        const t = (v - minV) / (maxV - minV);
        const r = Math.round(232 - t * 200);
        const g = Math.round(242 - t * 160);
        const bv = Math.round(224 - t * 180);
        td.style('background', `rgb(${r},${g},${bv})`)
          .style('color', t > 0.5 ? '#2d4a3e' : '#555')
          .text(v.toFixed(2));
      }
    });
  });
}
