/**
 * Bubble map visualization
 */
import { TOP_GAMES, COLORS, DATA } from './dataLoader.js';
import { hexToRgba, fontSizes, wrapText } from './utils.js';
import { GENRE_BINS } from './colors.js';

const bubbleSvg = d3.select('#bubbleSvg');
const tooltip = d3.select('#tooltip');
let bubbles = [];
let bubbleGroup = null;
let activeFilter = 'all';
const pinnedGames = [];

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

  bubbleGroup = bubbleSvg.append('g');

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

      const usableWidth = d.r * 1.2;
      const charWidth = nameFSize * 0.58;
      let lines = wrapText(d.name, usableWidth, charWidth);

      const ratingRowH = ratingFSize * 1.8;
      const availableH = d.r * 1.3 - ratingRowH;
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

  attachHoverDimming(els);
}

function attachHoverDimming(els) {
  els
    .on('mouseenter.dim', function (_, d) {
      if (!genreMatchesFilter(d)) return;

      bubbleGroup
        .selectAll('.bubble')
        .transition('dim')
        .duration(150)
        .style('opacity', (b) => {
          if (b === d) return 1;
          return genreMatchesFilter(b) ? 0.2 : 0.05;
        });

      d3.select(this)
        .select('.bubble-main')
        .transition('grow')
        .duration(150)
        .attr('r', d.r * 1.05)
        .attr('stroke-width', 2.5);
    })
    .on('mouseleave.dim', function (_, d) {
      bubbleGroup
        .selectAll('.bubble')
        .transition('dim')
        .duration(220)
        .style('opacity', (b) => (genreMatchesFilter(b) ? 1 : 0.1));

      d3.select(this)
        .select('.bubble-main')
        .transition('grow')
        .duration(220)
        .attr('r', d.r)
        .attr('stroke-width', genreMatchesFilter(d) ? 1.8 : 1);
    });
}

function animateFilter() {
  if (!bubbleGroup) return;

  bubbleGroup
    .selectAll('.bubble')
    .transition('filter')
    .duration(300)
    .ease(d3.easeCubicInOut)
    .style('opacity', (d) => (genreMatchesFilter(d) ? 1 : 0.08));

  bubbleGroup
    .selectAll('.bubble')
    .select('.bubble-main')
    .transition('filter-stroke')
    .duration(300)
    .attr('stroke-width', (d) => (genreMatchesFilter(d) ? 1.8 : 1));
}

//TOOLTIP

export function setupBubbleInteractions() {
  const tt = document.getElementById('bubble-tooltip');
  const ttName = document.getElementById('bt-name');
  const ttGenre = document.getElementById('bt-genre');
  const ttRating = document.getElementById('bt-rating');
  const ttYear = document.getElementById('bt-year');
  const ttVotes = document.getElementById('bt-votes');

  let currentHit = null;

  // ── mouse tracking ──────────────────────────────────────────────────────────
  bubbleSvg.on('mousemove', function (event) {
    const [mx, my] = d3.pointer(event);
    const hit = bubbles.find((b) => genreMatchesFilter(b) && Math.hypot(b.x - mx, b.y - my) < b.r);

    if (hit) {
      currentHit = hit;

      ttName.textContent = hit.name;
      ttGenre.textContent = hit.genres.join(', ');
      ttRating.textContent = `★ ${hit.rating.toFixed(2)}`;
      ttYear.textContent = hit.year;
      ttVotes.textContent = `${hit.votes.toLocaleString()} community ratings`;

      const x = Math.min(event.pageX + 16, window.innerWidth - 260);
      const y = Math.min(event.pageY - 10, window.innerHeight - 200);
      tt.style.left = `${x}px`;
      tt.style.top = `${y}px`;
      tt.classList.add('visible');
      bubbleSvg.style('cursor', 'pointer');
    } else {
      currentHit = null;
      tt.classList.remove('visible');
      bubbleSvg.style('cursor', 'default');
    }
  });

  bubbleSvg.on('mouseleave', () => {
    currentHit = null;
    tt.classList.remove('visible');
    bubbleSvg.style('cursor', 'default');
  });

  // ── click to pin ────────────────────────────────────────────────────────────
  bubbleSvg.on('click', () => {
    if (currentHit) pinGame(currentHit);
  });
}

// ── PIN LOGIC ─────────────────────────────────────────────────────────────────

function pinGame(game) {
  if (pinnedGames.some((p) => p.name === game.name)) return;
  if (pinnedGames.length >= 3) return;
  pinnedGames.push(game);
  renderPinPanel();
}

function unpinGame(name) {
  const idx = pinnedGames.findIndex((p) => p.name === name);
  if (idx !== -1) pinnedGames.splice(idx, 1);
  renderPinPanel();
}

window.clearPins = () => {
  pinnedGames.length = 0;
  renderPinPanel();
};

function renderPinPanel() {
  const panel = document.getElementById('pin-panel');
  const cards = document.getElementById('pin-cards');
  if (!panel || !cards) return;

  cards.innerHTML = '';

  if (!pinnedGames.length) {
    panel.classList.remove('visible');
    return;
  }

  pinnedGames.forEach((g, i) => {
    const card = document.createElement('div');
    card.className = 'pin-card';
    card.innerHTML = `
    <div>
      <div class="pin-card-name">${g.name}</div>
      <div class="pin-card-meta">${g.genres[0]} · ${g.year}</div>
      <div class="pin-card-rating">★ ${g.rating.toFixed(2)}</div>
      <div class="pin-card-meta">${g.votes.toLocaleString()} ratings</div>
    </div>
    <button class="pin-card-remove">✕</button>
  `;

    // attach event properly (no inline onclick)
    card.querySelector('.pin-card-remove').addEventListener('click', () => unpinGame(g.name));

    cards.appendChild(card);

    // add "vs" AFTER every card except the last
    if (i < pinnedGames.length - 1) {
      const div = document.createElement('div');
      div.className = 'pin-divider';
      div.textContent = 'vs';
      cards.appendChild(div);
    }
  });

  panel.classList.add('visible');
}
window.unpinGame = unpinGame;

export function filterGenre(btn, genre) {
  d3.selectAll('.topbar-pill').classed('active', false);
  d3.select(btn).classed('active', true);
  activeFilter = genre;
  const container = bubbleSvg.node().parentElement;
  drawBubbles(container.clientWidth, container.clientHeight);
  animateFilter();
}

function genreMatchesFilter(game) {
  if (activeFilter === 'all') return true;
  const bin = GENRE_BINS[activeFilter];
  const genres = game.genres || [game.primaryGenre];
  return bin && genres.some((g) => bin.includes(g));
}
