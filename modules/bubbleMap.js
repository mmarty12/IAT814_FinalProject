/**
 * Bubble map visualization
 */
import { TOP_GAMES, COLORS, DATA } from './dataLoader.js';
import { hexToRgba, fontSizes, wrapText } from './utils.js';
import { GENRE_BINS } from './colors.js';

const bubbleSvg = d3.select('#bubbleSvg');
const tooltip = d3.select('#tooltip');
let bubbles = [];
let activeFilter = 'all';

// Radius bounds — computed from container size, shared between layout & draw
let minR = 0,
  maxR = 0;

export function resizeBubbles() {
  const container = bubbleSvg.node().parentElement;
  const W = container.clientWidth;
  const H = container.clientHeight;
  const sc = Math.min(W, H) / 760;

  minR = 32 * sc;
  maxR = 85 * sc;

  bubbleSvg.attr('viewBox', `0 0 ${W} ${H}`);
  layoutBubbles(W, H, sc);
  drawBubbles(W, H);
}

function layoutBubbles(W, H, sc) {
  const minRat = d3.min(TOP_GAMES, (g) => g.rating);
  const maxRat = d3.max(TOP_GAMES, (g) => g.rating);

  const clusterPos = {
    'Card Game': { ax: 0.22, ay: 0.35 },
    'Wargame': { ax: 0.72, ay: 0.28 },
    'Fantasy': { ax: 0.55, ay: 0.65 },
    'Economic': { ax: 0.35, ay: 0.68 },
    'Abstract Strategy': { ax: 0.78, ay: 0.62 },
    'Other': { ax: 0.5, ay: 0.35 },
  };

  const pad = 10 * sc;
  const placed = [];

  bubbles = TOP_GAMES.map((g) => ({
    ...g,
    r: minR + ((g.rating - minRat) / (maxRat - minRat)) * (maxR - minR),
  }));

  bubbles.forEach((b) => {
    const cp = clusterPos[b.primaryGenre] || { ax: 0.5, ay: 0.5 };
    let bx = cp.ax * W;
    let by = cp.ay * H;

    for (let attempt = 0; attempt < 400; attempt++) {
      const spread = attempt * 2.2 * sc;
      const angle = attempt * 2.399;
      bx = cp.ax * W + Math.cos(angle) * spread;
      by = cp.ay * H + Math.sin(angle) * spread * 0.8;
      bx = Math.max(b.r + 8, Math.min(W - b.r - 8, bx));
      by = Math.max(b.r + 48, Math.min(H - b.r - 14, by));

      const overlaps = placed.some((p) => Math.hypot(bx - p.x, by - p.y) < b.r + p.r + pad);
      if (!overlaps) break;
    }

    b.x = bx;
    b.y = by;
    placed.push(b);
  });
}

function drawBubbles(W, H) {
  bubbleSvg.selectAll('*').remove();

  //dot grid background
  const dots = [];
  for (let x = 28; x < W; x += 28) for (let y = 28; y < H; y += 28) dots.push({ x, y });

  bubbleSvg
    .selectAll('.dot')
    .data(dots)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', 1)
    .attr('fill', 'rgba(0,0,0,0.045)');

  //bubble groups
  const els = bubbleSvg
    .append('g')
    .selectAll('.bubble')
    .data(bubbles)
    .enter()
    .append('g')
    .attr('class', 'bubble')
    .style('opacity', (d) => (genreMatchesFilter(d) ? 1 : 0.1));

  //circle
  els
    .append('circle')
    .attr('class', 'bubble-main')
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', (d) => d.r)
    .attr('fill', (d) => hexToRgba(COLORS[d.primaryGenre] || '#888', 0.1))
    .attr('stroke', (d) => hexToRgba(COLORS[d.primaryGenre] || '#888', 0.45))
    .attr('stroke-width', (d) => (genreMatchesFilter(d) ? 1.8 : 1));

  //labels
  els
    .filter((d) => genreMatchesFilter(d))
    .each(function (d) {
      const color = COLORS[d.primaryGenre] || '#888';
      const { name: nameFSize, rating: ratingFSize } = fontSizes(d.r);

      const usableWidth = d.r * 1.4;
      const charWidth = nameFSize * 0.52;
      let lines = wrapText(d.name, usableWidth, charWidth);

      const ratingRowH = ratingFSize * 1.6;
      const availableH = d.r * 1.5 - ratingRowH;
      const maxLines = Math.max(1, Math.floor(availableH / (nameFSize * 1.25)));

      // If too many lines, reduce font and re-wrap, or truncate last line
      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        const last = lines[maxLines - 1];
        if (last.length > 3) lines[maxLines - 1] = last.slice(0, -2).trimEnd() + '…';
      }

      const lineH = nameFSize * 1.25;
      const nameH = lines.length * lineH;
      const gap = ratingFSize * 0.5;
      const totalH = nameH + gap + ratingFSize;

      const blockTop = d.y - Math.min(totalH, d.r * 1.6) / 2;

      lines.forEach((line, i) => {
        d3.select(this)
          .append('text')
          .attr('class', 'bubble-text')
          .attr('x', d.x)
          .attr('y', blockTop + i * lineH + lineH / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-family', 'Inter, sans-serif')
          .attr('font-weight', '600')
          .attr('fill', color)
          .style('font-size', `${nameFSize}px`)
          .text(line);
      });

      d3.select(this)
        .append('text')
        .attr('class', 'bubble-rating')
        .attr('x', d.x)
        .attr('y', blockTop + nameH + gap + ratingFSize / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', 'Inter, sans-serif')
        .attr('font-weight', '400')
        .attr('fill', hexToRgba(color, 0.65))
        .style('font-size', `${ratingFSize}px`)
        .text(`★ ${d.rating.toFixed(2)}`);
    });
}

//TOOLTIP

export function setupBubbleInteractions() {
  bubbleSvg.on('mousemove', function (event) {
    const [mx, my] = d3.pointer(event);
    const hit = bubbles.find((b) => genreMatchesFilter(b) && Math.hypot(b.x - mx, b.y - my) < b.r);

    if (hit) {
      tooltip.select('#tt-name').text(hit.name);
      tooltip.select('#tt-rating').text(`${hit.rating.toFixed(2)} / 10`);
      tooltip.select('#tt-genre').text(hit.genres.join(', '));
      tooltip.select('#tt-votes').text(`${hit.votes.toLocaleString()} ratings`);
      tooltip
        .style('left', `${Math.min(event.pageX + 14, window.innerWidth - 210)}px`)
        .style('top', `${Math.min(event.pageY - 10, window.innerHeight - 130)}px`)
        .classed('visible', true);
      bubbleSvg.style('cursor', 'pointer');
    } else {
      tooltip.classed('visible', false);
      bubbleSvg.style('cursor', 'default');
    }
  });

  bubbleSvg.on('mouseleave', () => {
    tooltip.classed('visible', false);
    bubbleSvg.style('cursor', 'default');
  });
}

export function filterGenre(btn, genre) {
  d3.selectAll('.topbar-pill').classed('active', false);
  d3.select(btn).classed('active', true);
  activeFilter = genre;
  const container = bubbleSvg.node().parentElement;
  drawBubbles(container.clientWidth, container.clientHeight);
}

function genreMatchesFilter(game) {
  if (activeFilter === 'all') return true;
  const bin = GENRE_BINS[activeFilter];
  const genres = game.genres || [game.primaryGenre];
  return bin && genres.some((g) => bin.includes(g));
}
