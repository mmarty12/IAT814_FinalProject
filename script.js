import { loadData } from './modules/dataLoader.js';
import { resizeBubbles, filterGenre, setupBubbleInteractions } from './modules/bubbleMap.js';
import { populateStats, populateCategoryStats, populateMechanicStats } from './modules/stats.js';
import { populate, switchView } from './modules/ui.js';
import { drawYearLine } from './modules/yearLine.js';

async function initialize() {
  try {
    const { stats, byCategory, byMechanic } = await loadData();

    // Populate statistics cards
    populateStats(stats);
    populateCategoryStats(byCategory);
    populateMechanicStats(byMechanic);

    // Setup bubble map interactions (tooltip, resize)
    setupBubbleInteractions();
    resizeBubbles();

    // Render all charts
    populate();
  } catch (error) {
    console.error('Error initializing application:', error);
  }
}

window.switchView = switchView;
window.filterGenre = filterGenre;

window.addEventListener('resize', () => {
  resizeBubbles();
  const yls = d3.select('#yearLineSvg');
  if (!yls.empty() && yls.node().offsetParent) {
    drawYearLine();
  }
});

document.addEventListener('DOMContentLoaded', initialize);
