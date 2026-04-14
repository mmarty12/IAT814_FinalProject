/**
 * Data loading and global state management
 */
import { buildColorMap, GENRE_BINS } from './colors.js';

export let TOP_GAMES = [];
export let DATA = {};
export let COLORS = {};

export async function loadData() {
  const [topGames, byCategory, byMechanic, expansions, byTeamSize, byPlaytime, byYear, distribution, heatmap, stats] =
    await Promise.all([
      d3.json('./data/top_games.json'),
      d3.json('./data/by_category.json'),
      d3.json('./data/by_mechanic.json'),
      d3.json('./data/expansions.json'),
      d3.json('./data/by_team_size.json'),
      d3.json('./data/by_playtime.json'),
      d3.json('./data/by_year.json'),
      d3.json('./data/distribution.json'),
      d3.json('./data/heatmap.json'),
      d3.json('data/stats.json'),
    ]);

  TOP_GAMES = topGames.slice(0, 40);
  DATA = { byCategory, byMechanic, expansions, byTeamSize, byPlaytime, byYear, distribution, heatmap };
  COLORS = buildColorMap(byCategory);

  TOP_GAMES.forEach((g) => {
    if (!COLORS[g.primaryGenre])
      console.warn('No color for primaryGenre:', JSON.stringify(g.primaryGenre), '— game:', g.name);
  });

  return { stats, byCategory, byMechanic };
}
