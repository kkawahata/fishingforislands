import { Game } from './Game.js';

const game = new Game();

function animate() {
  requestAnimationFrame(animate);
  game.update();
}

animate();
