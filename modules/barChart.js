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
