import { loadData } from './modules/dataLoader.js';
import { resizeBubbles, filterGenre, setupBubbleInteractions } from './modules/bubbleMap.js';
import {
  populateStats,
  populateCategoryStats,
  populateMechanicStats,
  populateExpansions,
  populateTeamSizeStats,
  populatePlaytimeStats,
  populateYearStats,
} from './modules/stats.js';
import { populate, switchView } from './modules/ui.js';
import { drawYearLine } from './modules/yearLine.js';

async function initialize() {
  try {
    const { stats, byCategory, byMechanic, expansions, byTeamSize, byPlaytime, byYear } = await loadData();

    // Populate statistics cards
    populateStats(stats);
    populateCategoryStats(byCategory);
    populateMechanicStats(byMechanic);
    populateExpansions(expansions);
    populateTeamSizeStats(byTeamSize);
    populatePlaytimeStats(byPlaytime);
    populateYearStats(byYear);

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

window.openInfoModal = (id) => document.getElementById(id)?.classList.add('open');
window.closeInfoModal = (id) => document.getElementById(id)?.classList.remove('open');

// close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape')
    document.querySelectorAll('.info-modal-overlay.open').forEach((el) => el.classList.remove('open'));
});

document.addEventListener('DOMContentLoaded', initialize);
