let TOP_GAMES = [];

d3.csv('board_games.csv').then((data) => {
  TOP_GAMES = data
    .sort((a, b) => +b.average_rating - +a.average_rating)
    .slice(0, 25)
    .map((d) => ({
      name: d.name,
      rating: +d.average_rating,
      votes: +d.users_rated,
      genres: d.category
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean), // array
      genre: d.category.split(',')[0].trim(),
      year: +d.year_published,
    }));

  resizeBubbles();
  populate();
});

const COLORS = {
  'Adventure': '#e67e22',
  'Age of Reason': '#8e44ad',
  'American Civil War': '#c0392b',
  'Ancient': '#d4a017',
  'Animals': '#27ae60',
  'Card Game': '#2d6a4f',
  'City Building': '#16a085',
  'Civil War': '#922b21',
  'Civilization': '#1a5276',
  'Collectible Components': '#6c3483',
  'Comic Book / Strip': '#f39c12',
  'Dice': '#2980b9',
  'Economic': '#b5830a',
  'Environmental': '#1e8449',
  'Farming': '#7d6608',
  'Fantasy': '#6d3fa0',
  'Fighting': '#cb4335',
  'Horror': '#4a235a',
  'Industry / Manufacturing': '#717d7e',
  'Mature / Adult': '#784212',
  'Medical': '#148f77',
  'Miniatures': '#1f618d',
  'Movies / TV / Radio theme': '#d35400',
  'Mythology': '#6e2f8a',
  'Napoleonic': '#922b21',
  'Novel-based': '#5d6d7e',
  'Science Fiction': '#0f7b72',
  'Territory Building': '#1a7a4a',
  'Trains': '#6e2723',
  'Transportation': '#2e4057',
  'Video Game Theme': '#1abc9c',
  'Wargame': '#2563a8',
  'World War II': '#515a5a',
  'Zombies': '#2d3a1e',
};

const GENRE_BINS = {
  'War & History': [
    'Wargame',
    'World War II',
    'American Civil War',
    'Civil War',
    'Napoleonic',
    'Age of Reason',
    'Ancient',
  ],
  'Fantasy & Horror': ['Fantasy', 'Horror', 'Mythology', 'Zombies', 'Comic Book / Strip'],
  'Sci-Fi & Modern': ['Science Fiction', 'Medical', 'Environmental', 'Video Game Theme', 'Movies / TV / Radio theme'],
  'Economy & Building': [
    'Economic',
    'Civilization',
    'City Building',
    'Territory Building',
    'Industry / Manufacturing',
    'Farming',
    'Trains',
    'Transportation',
  ],
  'Adventure & Action': ['Adventure', 'Fighting', 'Miniatures', 'Dice', 'Animals'],
  'Other': ['Card Game', 'Novel-based', 'Mature / Adult', 'Collectible Components'],
};

// ── STATIC BUBBLE MAP ──
const bubbleSvg = d3.select('#bubbleSvg');
const tooltip = d3.select('#tooltip');
let bubbles = [],
  activeFilter = 'all';

function resizeBubbles() {
  const container = bubbleSvg.node().parentElement;
  const W = container.clientWidth,
    H = container.clientHeight;
  bubbleSvg.attr('viewBox', `0 0 ${W} ${H}`);
  layoutBubbles(W, H);
  drawBubbles(W, H);
}

function layoutBubbles(W, H) {
  const sc = Math.min(W, H) / 760;
  const minR = 30 * sc,
    maxR = 78 * sc;
  const minRat = Math.min(...TOP_GAMES.map((g) => g.rating));
  const maxRat = Math.max(...TOP_GAMES.map((g) => g.rating));

  // Genre cluster centers
  const clusterPos = {
    'Card Game': { ax: 0.22, ay: 0.35 },
    'Wargame': { ax: 0.72, ay: 0.28 },
    'Fantasy': { ax: 0.55, ay: 0.65 },
    'Economic': { ax: 0.35, ay: 0.68 },
    'Abstract Strategy': { ax: 0.78, ay: 0.62 },
    'Other': { ax: 0.5, ay: 0.35 },
  };

  let bs = TOP_GAMES.map((g) => ({
    ...g,
    r: minR + ((g.rating - minRat) / (maxRat - minRat)) * (maxR - minR),
  }));

  const placed = [];
  const pad = 5 * sc;

  bs.forEach((b) => {
    const cp = clusterPos[b.genre] || { ax: 0.5, ay: 0.5 };
    let bx = cp.ax * W,
      by = cp.ay * H;
    for (let attempt = 0; attempt < 400; attempt++) {
      const spread = attempt * 2.2 * sc;
      const a2 = attempt * 2.399;
      bx = cp.ax * W + Math.cos(a2) * spread;
      by = cp.ay * H + Math.sin(a2) * spread * 0.8;
      bx = Math.max(b.r + 8, Math.min(W - b.r - 8, bx));
      by = Math.max(b.r + 48, Math.min(H - b.r - 14, by));
      let ok = true;
      for (const p of placed) {
        if (Math.hypot(bx - p.x, by - p.y) < b.r + p.r + pad) {
          ok = false;
          break;
        }
      }
      if (ok) break;
    }
    b.x = bx;
    b.y = by;
    placed.push(b);
  });
  bubbles = placed;
}

function drawBubbles(W, H) {
  // Clear previous content
  bubbleSvg.selectAll('*').remove();

  // Dot grid
  const dots = [];
  for (let x = 28; x < W; x += 28) {
    for (let y = 28; y < H; y += 28) {
      dots.push({ x, y });
    }
  }

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

  // Draw bubbles
  const bubbleGroup = bubbleSvg.append('g');

  const bubbleElements = bubbleGroup
    .selectAll('.bubble')
    .data(bubbles)
    .enter()
    .append('g')
    .attr('class', 'bubble')
    .style('opacity', (d) => (genreMatchesFilter(d) ? 1 : 0.1));

  // Main circles
  bubbleElements
    .append('circle')
    .attr('class', 'bubble-main')
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', (d) => d.r)
    .attr('fill', (d) => {
      const hex = COLORS[d.genre] || '#888';
      return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},0.10)`;
    })
    .attr('stroke', (d) => {
      const hex = COLORS[d.genre] || '#888';
      return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},0.45)`;
    })
    .attr('stroke-width', (d) => (genreMatchesFilter(d) ? 1.8 : 1));

  // Text labels
  bubbleElements
    .filter((d) => genreMatchesFilter(d))
    .each(function (d) {
      const g = d3.select(this);
      const maxW = d.r * 1.6;
      const words = d.name.split(' ');
      let lines = [],
        cur = '';

      // Simple text wrapping
      words.forEach((w) => {
        const test = cur ? cur + ' ' + w : w;
        // Approximate width check (rough estimate)
        if (test.length * 6 > maxW && cur) {
          lines.push(cur);
          cur = w;
        } else {
          cur = test;
        }
      });
      if (cur) lines.push(cur);

      // Add text elements
      const lineHeight = 12;
      const totalHeight = lines.length * lineHeight;
      const startY = d.y - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line, i) => {
        g.append('text')
          .attr('class', 'bubble-text')
          .attr('x', d.x)
          .attr('y', startY + i * lineHeight)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('font-family', 'Inter, sans-serif')
          .attr('font-weight', '500')
          .attr('fill', COLORS[d.genre] || '#888')
          .style('font-size', Math.max(8, Math.min(12.5, d.r * 0.235)) + 'px')
          .text(line);
      });
    });

  // Rating text
  bubbleElements
    .filter((d) => genreMatchesFilter(d))
    .append('text')
    .attr('class', 'bubble-rating')
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y + d.r * 0.5)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('font-family', 'Inter, sans-serif')
    .attr('font-weight', '400')
    .attr('fill', (d) => {
      const hex = COLORS[d.genre] || '#888';
      return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},0.7)`;
    })
    .style('font-size', (d) => Math.max(7, Math.max(8, Math.min(12.5, d.r * 0.235)) - 1.5) + 'px')
    .text((d) => `★ ${d.rating.toFixed(2)}`);
}

bubbleSvg.on('mousemove', function (event) {
  const [mx, my] = d3.pointer(event);
  let hit = null;
  bubbles.forEach((b) => {
    if (Math.hypot(b.x - mx, b.y - my) < b.r) hit = b;
  });
  if (hit && genreMatchesFilter(hit)) {
    tooltip.select('#tt-name').text(hit.name);
    tooltip.select('#tt-rating').text(hit.rating.toFixed(2) + ' / 10');
    tooltip.select('#tt-genre').text(hit.genres.join(', '));
    tooltip.select('#tt-votes').text(hit.votes.toLocaleString() + ' ratings');
    tooltip.style('left', Math.min(event.pageX + 14, window.innerWidth - 210) + 'px');
    tooltip.style('top', Math.min(event.pageY - 10, window.innerHeight - 130) + 'px');
    tooltip.classed('visible', true);
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

function filterGenre(btn, genre) {
  d3.selectAll('.topbar-pill').classed('active', false);
  d3.select(btn).classed('active', true);
  activeFilter = genre;
  const container = bubbleSvg.node().parentElement;
  drawBubbles(container.clientWidth, container.clientHeight);
}

function genreMatchesFilter(game) {
  if (activeFilter === 'all') return true;
  const bin = GENRE_BINS[activeFilter];
  return bin && game.genres.some((g) => bin.includes(g));
}

// ── BAR CHART ──
function buildBars(id, data, maxVal) {
  const el = d3.select(`#${id}`);
  if (el.empty()) return;
  const max = maxVal || d3.max(data, (d) => d.val);
  el.selectAll('*').remove(); // Clear existing bars

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

// ── YEAR LINE ──
function drawYearLine() {
  const data = [...TOP_GAMES]
    .sort((a, b) => a.year - b.year)
    .map((g) => ({
      year: g.year,
      rating: g.rating,
    }));

  const svg = d3.select('#yearLineSvg');
  if (svg.empty()) return;

  const container = svg.node().parentElement;
  const W = container.clientWidth - 36,
    H = 200;
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const pad = { l: 34, r: 16, t: 14, b: 28 };
  const plotW = W - pad.l - pad.r,
    plotH = H - pad.t - pad.b;

  const minY = d3.min(data, (d) => d.rating);
  const maxY = d3.max(data, (d) => d.rating);

  const xScale = d3
    .scaleLinear()
    .domain([0, data.length - 1])
    .range([pad.l, pad.l + plotW]);

  const yScale = d3
    .scaleLinear()
    .domain([minY, maxY])
    .nice() // makes ticks cleaner
    .range([pad.t + plotH, pad.t]);

  svg.selectAll('*').remove();

  // Generate ticks dynamically
  const yTicks = yScale.ticks(5);

  yTicks.forEach((v) => {
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

  const step = Math.ceil(data.length / 10);

  data.forEach((d, i) => {
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

  // Area
  const area = d3
    .area()
    .x((_, i) => xScale(i))
    .y0(yScale(minY))
    .y1((d) => yScale(d.rating));

  svg.append('path').datum(data).attr('fill', 'rgba(45,106,79,0.07)').attr('d', area);

  // Line
  const line = d3
    .line()
    .x((_, i) => xScale(i))
    .y((d) => yScale(d.rating))
    .curve(d3.curveMonotoneX);

  svg
    .append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#2d6a4f')
    .attr('stroke-width', 2)
    .attr('stroke-linejoin', 'round')
    .attr('d', line);

  // Start & end dots
  [0, data.length - 1].forEach((i) => {
    svg
      .append('circle')
      .attr('cx', xScale(i))
      .attr('cy', yScale(data[i].rating))
      .attr('r', 3.5)
      .attr('fill', '#2d6a4f');
  });
}

// ── HEATMAP ──
function buildHeatmap() {
  const mechs = [
    'Time Track',
    'Area-Impulse',
    'Deck / Pool Building',
    'Chit-Pull System',
    'Worker Placement',
    'Variable Phase Order',
    'Campaign / Battle CD',
    'Player Elimination',
  ];
  const cats = ['Card Game', 'Wargame', 'Fantasy', 'Abstract Strat.', 'Economic', 'Dice'];
  const vals = [
    [5.95, 7.21, 6.47, 6.98, 6.89, null],
    [6.56, 6.39, 6.63, 6.56, 6.13, null],
    [6.36, 6.21, 6.27, 6.74, 6.87, 6.44],
    [null, 6.37, 6.63, null, 6.86, 6.49],
    [6.05, 5.86, 6.34, 6.39, 6.28, 6.53],
    [6.25, 6.09, 6.81, 6.2, 6.32, 6.21],
    [5.69, 6.4, 6.08, 5.52, 5.34, 6.44],
    [6.33, 6.42, 6.49, 4.96, 6.34, 6.17],
  ];
  const allV = vals.flat().filter((v) => v !== null);
  const minV = d3.min(allV),
    maxV = d3.max(allV);
  const tbl = d3.select('#heatmap-table');
  if (tbl.empty()) return;

  tbl.selectAll('*').remove();

  const thead = tbl.append('thead').append('tr');
  thead.append('th');
  cats.forEach((c) => {
    thead.append('th').attr('class', 'hm-col-label').text(c);
  });

  const tbody = tbl.append('tbody');
  vals.forEach((row, ri) => {
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

// ── POPULATE ──
function populate() {
  buildBars(
    'bars-byname',
    TOP_GAMES.map((g) => ({
      name: g.name.length > 32 ? g.name.slice(0, 30) + '…' : g.name,
      val: g.rating,
      label: g.rating.toFixed(2),
      color: COLORS[g.genre] || '#888',
    })),
    9.2,
  );

  buildBars(
    'bars-bycategory',
    [
      { name: 'Vietnam War', val: 7.18, label: '7.18', color: '#2563a8' },
      { name: 'Civil War', val: 7.06, label: '7.06', color: '#2563a8' },
      { name: 'Expansion for Base-game', val: 7.02, label: '7.02', color: '#c0392b' },
      { name: 'Civilization', val: 6.98, label: '6.98', color: '#6d3fa0' },
      { name: 'Miniatures', val: 6.96, label: '6.96', color: '#6d3fa0' },
      { name: 'Book', val: 6.96, label: '6.96', color: '#2d6a4f' },
      { name: 'Age of Reason', val: 6.92, label: '6.94', color: '#b5830a' },
      { name: 'Post Napoleonic', val: 6.92, label: '6.92', color: '#0f7b72' },
      { name: 'Napoleonic', val: 6.89, label: '6.89', color: '#0f7b72' },
      { name: 'WW1', val: 6.89, label: '6.89', color: '#6d3fa0' },
      { name: 'WW2', val: 6.89, label: '6.89', color: '#c0392b' },
      { name: 'Trains', val: 6.86, label: '6.86', color: '#c0392b' },
      { name: 'American Indian Wars', val: 6.85, label: '6.85', color: '#6d3fa0' },
      { name: 'Renaissance', val: 6.8, label: '6.8', color: '#aaa' },
      { name: 'City Building', val: 6.79, label: '6.79', color: '#c0392b' },
      { name: 'Game System', val: 6.77, label: '6.77', color: '#6d3fa0' },
      { name: 'Pike and Shot', val: 6.77, label: '6.77', color: '#2563a8' },
      { name: 'Industry/Manufacturing', val: 6.76, label: '6.76', color: '#6d3fa0' },
      { name: 'Territory Building', val: 6.76, label: '6.76', color: '#2d6a4f' },
      { name: 'Wargame', val: 6.75, label: '6.75', color: '#6d3fa0' },
      { name: 'Space Exploration', val: 6.75, label: '6.75', color: '#b5830a' },
      { name: 'Korean War', val: 6.72, label: '6.85', color: '#2563a8' },
      { name: 'Transportation', val: 6.67, label: '6.67', color: '#aaa' },
      { name: 'Farming', val: 6.65, label: '6.65', color: '#6d3fa0' },
      { name: 'Ancient', val: 6.63, label: '6.63', color: '#2d6a4f' },
    ],
    7.0,
  );

  buildBars(
    'bars-bymechanic',
    [
      {
        name: 'Deck / Pool Building',
        val: 7.1,
        label: '7.1',
        color: '#6d3fa0',
      },
      { name: 'Worker Placement', val: 7.04, label: '7.04', color: '#2d6a4f' },
      {
        name: 'Variable Phase Order',
        val: 7.0,
        label: '7.0',
        color: '#0f7b72',
      },
      {
        name: 'Chit-Pull System',
        val: 6.99,
        label: '6.99',
        color: '#2563a8',
      },
      {
        name: 'Crayon Rail System',
        val: 6.96,
        label: '6.96',
        color: '#c0392b',
      },
      { name: 'Simulation', val: 6.93, label: '6.93', color: '#2563a8' },
      {
        name: 'Route/Network Building',
        val: 6.9,
        label: '6.9',
        color: '#c0392b',
      },
      { name: 'Grid Movement', val: 6.89, label: '6.89', color: '#6d3fa0' },
      { name: 'Campaign/Battle Card Driven', val: 6.89, label: '6.89', color: '#2d6a4f' },
      {
        name: 'Area Impulse',
        val: 6.83,
        label: '6.83',
        color: '#b5830a',
      },
      {
        name: 'Area Control / Area Influence',
        val: 6.83,
        label: '6.83',
        color: '#b5830a',
      },
      {
        name: 'Action Point Allowance',
        val: 6.79,
        label: '6.79',
        color: '#0f7b72',
      },
      { name: 'Variable Player Powers', val: 6.78, label: '6.78', color: '#2d6a4f' },
      { name: 'Stock Holding', val: 6.77, label: '6.77', color: '#2d6a4f' },
      { name: 'Time Track', val: 6.76, label: '6.76', color: '#2d6a4f' },
    ],
    7.0,
  );

  buildBars(
    'bars-expansions',
    [
      {
        name: 'With Expansions',
        val: 6.08,
        label: '6.08',
        color: '#2d6a4f',
      },
      {
        name: 'Without Expansions',
        val: 5.51,
        label: '5.51',
        color: '#aaa',
      },
    ],
    7.0,
  );

  buildBars(
    'bars-teamsize',
    [
      { name: '2 players', val: 6.61, label: '6.61', color: '#6d3fa0' },
      { name: '3 players', val: 6.38, label: '6.38', color: '#b5830a' },
      { name: '4 players', val: 6.27, label: '6.27', color: '#0f7b72' },
      { name: '5 players', val: 6.21, label: '6.21', color: '#2563a8' },
      { name: '6 players', val: 6.15, label: '6.15', color: '#c0392b' },
      { name: '7 players', val: 6.17, label: '6.17', color: '#6d3fa0' },
      { name: '8 players', val: 6.3, label: '6.3', color: '#b5830a' },
      { name: '9 players', val: 5.98, label: '5.98', color: '#0f7b72' },
      { name: '10 players', val: 6.1, label: '6.1', color: '#2563a8' },
      { name: '11 players', val: 6.4, label: '6.4', color: '#c0392b' },
      { name: '12 players', val: 6.3, label: '6.3', color: '#6d3fa0' },
      { name: '13 players', val: 6.1, label: '6.1', color: '#b5830a' },
      { name: '14 players', val: 6.4, label: '6.4', color: '#0f7b72' },
    ],
    7.0,
  );

  buildBars(
    'bars-playtime',
    [
      {
        name: '2–4 hours (870 games)',
        val: 6.15,
        label: '6.15',
        color: '#2d6a4f',
      },
      {
        name: '4+ hours (410 games)',
        val: 6.05,
        label: '6.05',
        color: '#2563a8',
      },
      {
        name: '1–2 hours (1,889 games)',
        val: 5.82,
        label: '5.82',
        color: '#6d3fa0',
      },
      {
        name: '30–60 min (3,027 games)',
        val: 5.68,
        label: '5.68',
        color: '#b5830a',
      },
      {
        name: 'Under 30 min (3,958 games)',
        val: 5.43,
        label: '5.43',
        color: '#aaa',
      },
    ],
    7.0,
  );

  buildBars('bars-distgenre', [
    { name: 'Card Game', val: 3419, label: '3,419 · 32%', color: '#2d6a4f' },
    { name: 'Wargame', val: 2074, label: '2,074 · 20%', color: '#2563a8' },
    { name: 'Fantasy', val: 1272, label: '1,272 · 12%', color: '#6d3fa0' },
    {
      name: 'Abstract Strategy',
      val: 994,
      label: '994 · 9%',
      color: '#0f7b72',
    },
    { name: 'Economic', val: 994, label: '994 · 9%', color: '#b5830a' },
    { name: 'Party Game', val: 909, label: '909 · 9%', color: '#c0392b' },
    { name: 'Science Fiction', val: 882, label: '882 · 8%', color: '#0f7b72' },
  ]);

  buildBars('bars-distplaytime', [
    { name: 'Under 30 min', val: 3958, label: '3,958 · 38%', color: '#c0392b' },
    { name: '30–60 min', val: 3027, label: '3,027 · 29%', color: '#b5830a' },
    { name: '1–2 hours', val: 1889, label: '1,889 · 18%', color: '#2563a8' },
    { name: '2–4 hours', val: 870, label: '870 · 8%', color: '#2d6a4f' },
    { name: '4+ hours', val: 410, label: '410 · 4%', color: '#6d3fa0' },
  ]);

  const tags = [
    'Card Game',
    'Wargame',
    'Fantasy',
    'Economic',
    'Abstract Strategy',
    'Dice',
    'Party Game',
    'Fighting',
    'Science Fiction',
    "Children's Game",
    'World War II',
    'Bluffing',
    'Animals',
    'Humor',
    'Medieval',
    'Action / Dexterity',
    'Adventure',
    'Deduction',
    'Ancient',
    'Negotiation',
    'Political',
    'Horror',
    'Civilization',
    'Exploration',
    'Racing',
    'Nautical',
    'Sports',
    'Transportation',
  ];
  const tc = d3.select('#tag-cloud');
  const cs = ['#2d6a4f', '#2563a8', '#6d3fa0', '#b5830a', '#0f7b72', '#c0392b'];
  tc.selectAll('*').remove(); // Clear existing tags

  tags.forEach((t, i) => {
    const c = cs[i % cs.length];
    tc.append('span')
      .attr('class', 'tag')
      .style('border-color', `${c}28`)
      .style('background', `${c}0a`)
      .style('color', `${c}bb`)
      .text(t);
  });

  buildBars(
    'bars-correlation',
    [
      {
        name: 'Time Track + Wargame',
        val: 7.21,
        label: '7.21',
        color: '#2563a8',
      },
      {
        name: 'Time Track + Abstract Strategy',
        val: 6.98,
        label: '6.98',
        color: '#0f7b72',
      },
      {
        name: 'Time Track + Economic',
        val: 6.89,
        label: '6.89',
        color: '#b5830a',
      },
      {
        name: 'Deck Building + Economic',
        val: 6.87,
        label: '6.87',
        color: '#b5830a',
      },
      {
        name: 'Chit-Pull + Economic',
        val: 6.86,
        label: '6.86',
        color: '#b5830a',
      },
      {
        name: 'Variable Phase Order + Fantasy',
        val: 6.81,
        label: '6.81',
        color: '#6d3fa0',
      },
      {
        name: 'Deck Building + Abstract',
        val: 6.74,
        label: '6.74',
        color: '#0f7b72',
      },
      {
        name: 'Chit-Pull + Fantasy',
        val: 6.63,
        label: '6.63',
        color: '#6d3fa0',
      },
    ],
    8.0,
  );

  buildHeatmap();
}

// ── VIEW SWITCHING ──
const TITLES = {
  bubbles: 'Game Popularity — Bubble Map',
  byname: 'Rating of Games by Name',
  bycategory: 'Rating of Games by Category',
  bymechanic: 'Rating of Games by Mechanic',
  expansions: 'Games with Expansions vs Ratings',
  teamsize: 'Rating by Average Team Size',
  playtime: 'Rating by Average Playtime',
  byyear: 'Rating by Year of Release',
  distribution: 'Distribution — Category Map',
  correlation: '1Mechanics × Categories × Ratings',
};

function switchView(id, btn) {
  d3.selectAll('.nav-item').classed('active', false);
  d3.select(btn).classed('active', true);
  Object.keys(TITLES).forEach((v) => {
    const el = d3.select(`#view-${v}`);
    if (!el.empty()) {
      el.style('display', 'none').classed('active', false);
    }
  });
  const t = d3.select(`#view-${id}`);
  if (!t.empty()) {
    t.style('display', 'block');
    if (id !== 'bubbles') t.classed('active', true);
  }
  d3.select('#genre-filters').style('display', id === 'bubbles' ? 'flex' : 'none');
  d3.select('#topbar-title').text(TITLES[id] || '');
  if (id === 'byyear') setTimeout(drawYearLine, 30);
}

window.addEventListener('resize', () => {
  resizeBubbles();
  const yls = d3.select('#yearLineSvg');
  if (!yls.empty() && yls.node().offsetParent) drawYearLine();
});
