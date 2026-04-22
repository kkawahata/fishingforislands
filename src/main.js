import { Game } from './Game.js';
import { VERSION } from './version.js';

const versionEl = document.getElementById('version-display');
if (versionEl) versionEl.textContent = `v${VERSION}`;

const game = new Game();

function animate() {
  requestAnimationFrame(animate);
  game.update();
}

animate();
