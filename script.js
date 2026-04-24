import { loadData } from './modules/dataLoader.js';
import { resizeBubbles, filterGenre, setupBubbleInteractions, buildBubbleLegend } from './modules/bubbleMap.js';
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

    populateStats(stats);
    populateCategoryStats(byCategory);
    populateMechanicStats(byMechanic);
    populateExpansions(expansions);
    populateTeamSizeStats(byTeamSize);
    populatePlaytimeStats(byPlaytime);
    populateYearStats(byYear);

    setupBubbleInteractions();
    resizeBubbles();
    buildBubbleLegend();

    populate();

    // ← moved here — DOM is fully ready and nav items exist
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (window.innerWidth <= 768) window.closeSidebar();
      });
    });
  } catch (error) {
    console.error('Error initializing application:', error);
  }
}

// ── GLOBAL HANDLERS ───────────────────────────────────────────────────────────

window.switchView = switchView;
window.filterGenre = filterGenre;

window.openInfoModal = (id) => document.getElementById(id)?.classList.add('open');
window.closeInfoModal = (id) => document.getElementById(id)?.classList.remove('open');

window.toggleSidebar = () => {
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('visible');
};
window.closeSidebar = () => {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
};

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  resizeBubbles();
  const yls = d3.select('#yearLineSvg');
  if (!yls.empty() && yls.node().offsetParent) drawYearLine();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape')
    document.querySelectorAll('.info-modal-overlay.open').forEach((el) => el.classList.remove('open'));
});

document.addEventListener('DOMContentLoaded', initialize);
