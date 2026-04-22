import { Game } from './Game.js';
import { VERSION } from './version.js';
import { hasOverride, clearOverride } from './questsOverride.js';

const versionEl = document.getElementById('version-display');
if (versionEl) versionEl.textContent = `v${VERSION}`;

const overrideChip = document.getElementById('quest-override-chip');
if (overrideChip && hasOverride()) {
  overrideChip.style.display = 'block';
  overrideChip.addEventListener('click', () => {
    if (window.confirm('Clear the quest override and reload with base quests?')) {
      clearOverride();
      location.reload();
    }
  });
}

const game = new Game();

function animate() {
  requestAnimationFrame(animate);
  game.update();
}

animate();
