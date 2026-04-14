/**
 * Color system for board game genres and categories
 */
import { hsl } from './utils.js';

export const GENRE_BINS = {
  'War & History': [
    'Wargame',
    'World War II',
    'American Civil War',
    'Civil War',
    'Napoleonic',
    'Age of Reason',
    'Ancient',
    'American Indian Wars',
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

const BIN_PALETTES = {
  'War & History': { h: 215, s: 65 },
  'Fantasy & Horror': { h: 270, s: 55 },
  'Sci-Fi & Modern': { h: 175, s: 60 },
  'Economy & Building': { h: 38, s: 70 },
  'Adventure & Action': { h: 12, s: 68 },
  'Other': { h: 145, s: 45 },
};

// Dynamically builds the COLORS map from by_category.json.
export function buildColorMap(categories) {
  const colors = {};

  // 1. Assign colors to every genre listed in GENRE_BINS — these are
  //    guaranteed to cover all primaryGenre values used in top_games.json
  for (const [bin, genres] of Object.entries(GENRE_BINS)) {
    const palette = BIN_PALETTES[bin];
    genres.forEach((genre, idx) => {
      const l = 28 + (idx / Math.max(genres.length - 1, 1)) * 24;
      colors[genre] = hsl(palette.h, palette.s, l);
    });
  }

  // any extra categories
  const categoryToBin = {};
  for (const [bin, genres] of Object.entries(GENRE_BINS)) for (const g of genres) categoryToBin[g] = bin;

  const binIndexes = {};
  for (const { category } of categories) {
    if (colors[category]) continue; // already assigned above
    const bin = categoryToBin[category] || 'Other';
    const palette = BIN_PALETTES[bin] || BIN_PALETTES['Other'];
    const idx = (binIndexes[bin] = (binIndexes[bin] ?? 10) + 1);
    const l = Math.min(52, 28 + idx * 3);
    colors[category] = hsl(palette.h, palette.s, l);
  }

  return colors;
}
