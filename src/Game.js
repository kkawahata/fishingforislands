import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GameState } from './GameState.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { UI } from './UI.js';
import { DIALOGUES, RESOURCES, ISLANDS, ISLAND_GRID, ALL_FISH_IDS, ISLAND_UNLOCK_RULES } from './data.js';

export class Game {
  constructor() {
    // Three.js setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.setClearColor(0x1a1a2e);
    document.body.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87CEEB, 60, 150);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 15000);
    this.camera.position.set(8, 18, 30);

    // Game systems — try to load saved game
    const savedState = GameState.loadFromStorage();
    this.state = savedState || new GameState();
    this.world = new World(this.scene);
    this.player = new Player(this.scene, this.camera);
    this.ui = new UI();

    // Isometric snap state
    this._isoSnapping = false;
    this._isoAzimuth = Math.PI / 4;      // 45 deg
    this._isoPolar = Math.PI / 3.5;      // ~51 deg
    this._isoDistance = 22;

    // OrbitControls — restricted to a top-down-ish arc
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.minPolarAngle = Math.PI / 6;   // ~30 deg (near top-down)
    this.controls.maxPolarAngle = Math.PI / 2.5;  // ~72 deg (can tilt for horizon feel)
    this.controls.minDistance = 8;
    this.controls.maxDistance = 50;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    // Right-click to orbit so left-click stays free for game interactions
    this.controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    this.controls.target.copy(this.player.mesh.position);

    // Game mode
    this.mode = 'playing'; // playing | dialogue | crafting | turtle | transition
    this.dialogueQueue = [];
    this.dialogueCallback = null;

    // Turtle scene
    this.turtleRenderer = null;
    this.turtleScene = null;
    this.turtleCamera = null;

    // Mouse hover/click state
    this._mouseNDC = new THREE.Vector2();
    this._hoverRaycaster = new THREE.Raycaster();
    this._hoveredInteractable = null;
    this._pendingInteraction = null;
    this._mouseClientPos = { x: 0, y: 0 };

    // Clock
    this.clock = new THREE.Clock();

    // Initial build
    this.world.buildIslands(this.state);
    this.world.spawnDailyResources(this.state);
    this.ui.updateInventory(this.state);
    this.ui.updateQuests(this.state);
    this.ui.updateDay(this.state.day);

    this._setupInput();
    this._setupResize();
    this._setupDevTools();

    // Crafting close button must restore game mode (not just hide the UI)
    document.getElementById('crafting-close').addEventListener('click', () => {
      if (this.mode === 'crafting') {
        this.mode = 'playing';
      }
    });

    // Show intro (skip if loading a save)
    if (savedState) {
      this.ui.updateDay(this.state.day);
    } else {
      this._showDayIntro();
    }
  }

  async _showDayIntro() {
    this.mode = 'transition';
    await this.ui.showDayTransition(1, 'You wash ashore on a small island...');
    this.mode = 'playing';
  }

  _setupResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _setupDevTools() {
    document.getElementById('dev-skip-day')?.addEventListener('click', () => {
      const target = parseInt(document.getElementById('dev-day-input').value);
      if (isNaN(target) || target < 1) return;
      while (this.state.day < target) this.state.advanceDay();
      this.world.buildIslands(this.state);
      this.world.spawnDailyResources(this.state);
      this.ui.updateDay(this.state.day);
      this._refreshUI();
      this._clearHoverState();
      this.ui.notify(`Skipped to Day ${this.state.day}`);
    });

    document.getElementById('dev-add-item')?.addEventListener('click', () => {
      const id = document.getElementById('dev-item-select').value;
      const count = parseInt(document.getElementById('dev-item-count').value) || 1;
      this.state.addItem(id, count);
      this._refreshUI();
      this.ui.notify(`Added ${count}x ${RESOURCES[id]?.name || id}`);
    });

    document.getElementById('dev-unlock-all')?.addEventListener('click', () => {
      for (const id of Object.keys(ISLAND_UNLOCK_RULES)) {
        this.state.unlockedIslands.add(id);
      }
      this.world.buildIslands(this.state);
      this.world.spawnDailyResources(this.state);
      this._refreshUI();
      this._clearHoverState();
      this.ui.notify('All islands unlocked!');
    });

    document.getElementById('dev-clear-save')?.addEventListener('click', () => {
      GameState.clearSave();
      this.ui.notify('Save cleared! Refresh to start fresh.');
    });

    document.getElementById('dev-give-tools')?.addEventListener('click', () => {
      for (const tool of ['axe', 'shovel', 'fishing_rod', 'magic_wand', 'shears', 'hammer']) {
        if (!this.state.hasItem(tool)) this.state.addItem(tool, 1);
      }
      this._refreshUI();
      this.ui.notify('All tools added!');
    });

    document.getElementById('dev-toggle-flag')?.addEventListener('click', () => {
      const flag = document.getElementById('dev-flag-select').value;
      if (typeof this.state.flags[flag] === 'boolean') {
        this.state.flags[flag] = !this.state.flags[flag];
      } else if (typeof this.state.flags[flag] === 'number') {
        this.state.flags[flag] = this.state.flags[flag] ? 0 : 1;
      }
      this.world.buildIslands(this.state);
      this.world.spawnDailyResources(this.state);
      this._refreshUI();
      this._clearHoverState();
      this.ui.notify(`Flag "${flag}" = ${this.state.flags[flag]}`);
    });
  }

  _clearHoverState() {
    this._hoveredInteractable = null;
    this._pendingInteraction = null;
    this.world.hideHighlightRing();
    this.ui.hideTooltip();
  }

  _setupInput() {
    // E key for interaction
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'e' && this.mode === 'playing') {
        this._tryInteract();
      }
      if (e.key.toLowerCase() === 'c') {
        if (this.mode === 'playing') {
          this._tryCraft();
        } else if (this.mode === 'crafting') {
          this.ui.hideCrafting();
          this.mode = 'playing';
          this.player.clearKeys();
        }
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (this.mode === 'dialogue') {
          e.preventDefault();
          this._advanceDialogue();
        }
      }
      if (e.key === 'Escape') {
        if (this.mode === 'crafting') {
          this.ui.hideCrafting();
          this.mode = 'playing';
          this.player.clearKeys();
        }
      }
      // V = snap camera to isometric follow view
      if (e.key.toLowerCase() === 'v') {
        this._isoSnapping = true;
      }
      // Backtick = toggle dev tools
      if (e.key === '`' || e.code === 'Backquote') {
        e.preventDefault();
        this.ui.toggleDevTools();
        if (this.ui.isDevToolsVisible()) {
          this.ui.populateDevDropdowns(RESOURCES, this.state.flags);
        }
      }
      // WASD cancels pending interaction
      if (['w','a','s','d'].includes(e.key.toLowerCase()) && this._pendingInteraction) {
        this._pendingInteraction = null;
      }
    });

    // Mouse tracking for hover raycasting
    this.renderer.domElement.addEventListener('mousemove', (e) => {
      this._mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this._mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this._mouseClientPos.x = e.clientX;
      this._mouseClientPos.y = e.clientY;
    });

    // Click: move to ground or interact with object
    this.renderer.domElement.addEventListener('click', (e) => {
      if (this.mode !== 'playing') return;
      this._mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this._mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this._handleClick();
    });
  }

  // ── Interaction ──
  _tryInteract() {
    const playerPos = this.player.getWorldPosition();
    const nearest = this.world.getNearbyInteractable(playerPos, 2.2);
    if (nearest) {
      this._handleInteraction(nearest);
    }
  }

  _handleClick() {
    this._hoverRaycaster.setFromCamera(this._mouseNDC, this.camera);

    // Pass 1: check interactables (priority)
    const interactHits = this._hoverRaycaster.intersectObjects(this.world.interactables, true);
    if (interactHits.length > 0) {
      const interactable = this._findParentInteractable(interactHits[0].object);
      if (interactable) {
        const objWorld = new THREE.Vector3();
        interactable.getWorldPosition(objWorld);
        const playerPos = this.player.getWorldPosition();
        playerPos.y = objWorld.y;
        const dist = playerPos.distanceTo(objWorld);

        if (dist < 2.5) {
          this._handleInteraction(interactable);
        } else {
          // Walk there first, then interact on arrival
          this._pendingInteraction = { mesh: interactable };
          this.player.setMoveTarget(objWorld);
        }
        return;
      }
    }

    // Pass 2: check ground (click-to-move)
    const groundPos = this.world.getGroundPositionFromRay(this._hoverRaycaster);
    if (groundPos) {
      this._pendingInteraction = null;
      this.player.setMoveTarget(groundPos);
    }
  }

  _findParentInteractable(object) {
    let current = object;
    while (current) {
      if (this.world.interactables.includes(current)) return current;
      current = current.parent;
    }
    return null;
  }

  _handlePickup(mesh, data) {
    if (data.resource) {
      const resDef = RESOURCES[data.resource];
      this.state.addItem(data.resource, 1);
      this.ui.notify(`Collected ${resDef?.name || data.resource}!`);
      this.world.removeInteractable(mesh);

      if (data.resource === 'axe') {
        this.state.flags.picked_axe = true;
      }

      this._refreshUI();
    }
  }

  _handleWell() {
    if (!this.state.hasItem('water')) {
      this.state.addItem('water', 1);
      this.ui.notify('Filled a bucket of water!');
    } else {
      this.ui.notify('You already have a bucket of water.');
    }
    this._refreshUI();
  }

  _handleFirePit() {
    // Not yet lit: try to light it
    if (!this.state.flags.fire_lit) {
      if (this.state.hasItem('sticks', 2) && this.state.hasItem('driftwood', 2)) {
        this.state.removeItem('sticks', 2);
        this.state.removeItem('driftwood', 2);
        this.state.flags.fire_lit = true;
        this.world.buildIslands(this.state);
        this.world.spawnDailyResources(this.state);
        this._showDialogueSequence(DIALOGUES.fire_lit, () => {
          this._refreshUI();
        });
      } else {
        const need = [];
        if (!this.state.hasItem('sticks', 2)) need.push('2 Sticks');
        if (!this.state.hasItem('driftwood', 2)) need.push('2 Driftwood');
        this.ui.notify(`Need ${need.join(' and ')} to light the fire.`);
      }
      this._refreshUI();
      return;
    }

    // Fire is lit — cooking option
    if (!this.state.flags.cooked_fish) {
      const hasFish = ALL_FISH_IDS.some(id => this.state.hasItem(id));
      if (hasFish) {
        this.state.flags.cooked_fish = true;
        this._showDialogueSequence(DIALOGUES.cooking_lesson, () => {
          this.ui.notify('Learned to cook fish!');
          this._refreshUI();
        });
        return;
      }
    }

    this.ui.notify('The fire crackles warmly.');
  }

  _handleCraftStation(data) {
    const station = this.state.flags.has_crafting_table ? 'crafting_table' : (data.station || 'big_rock');
    this.mode = 'crafting';
    this.player.clearKeys();
    const onCraft = (recipe) => {
      if (this.state.craft(recipe)) {
        this.ui.notify(`Crafted ${recipe.name}!`);

        if (recipe.id === 'sticks_from_driftwood') {
          this.state.flags.made_sticks = true;
          this.state.removeItem('axe');
          this.ui.notify('The axe broke on the rock!');
        }

        if (recipe.id === 'crafting_table') {
          this.world.buildIslands(this.state);
          this.world.spawnDailyResources(this.state);
        }

        this._refreshUI();
        // Refresh crafting menu with updated state
        this.ui.showCrafting(this.state, station, onCraft);
      }
    };
    this.ui.showCrafting(this.state, station, onCraft);
  }

  _handleTurtle() {
    if (!this.state.flags.fire_lit && this.state.day === 1) {
      this.ui.notify('The Turtle is sleeping. Maybe a warm fire would wake it...');
      return;
    }

    if (!this.state.canEndDay()) {
      this.ui.notify("You still have things to do today before resting.");
      return;
    }

    this._startTurtleScene();
  }

  _handleDog() {
    if (!this.state.flags.met_dog) {
      this.state.flags.met_dog = true;
      this._showDialogueSequence(DIALOGUES.dog_first, () => {
        this._refreshUI();
      });
      return;
    }

    if (!this.state.flags.threw_stick && this.state.hasItem('sticks', 1)) {
      this.state.removeItem('sticks', 1);
      this.state.flags.threw_stick = true;
      this.state.addItem('broken_spade', 1);
      this._showDialogueSequence(DIALOGUES.dog_fetch, () => {
        this._refreshUI();
      });
      return;
    }

    // Second fetch: find Strange Stick (unlocks Magic Wand quest)
    if (this.state.flags.threw_stick && !this.state.flags.found_strange_stick
        && this.state.day >= 3 && this.state.hasItem('sticks', 1)) {
      this.state.removeItem('sticks', 1);
      this.state.flags.found_strange_stick = true;
      this.state.addItem('strange_stick', 1);
      this._showDialogueSequence(DIALOGUES.dog_fetch_2, () => {
        this._refreshUI();
      });
      return;
    }

    if (this.state.flags.threw_stick) {
      this._showDialogueSequence([
        { speaker: '', text: '*The dog wags its tail happily and licks your hand.*' },
      ]);
    } else {
      this._showDialogueSequence([
        { speaker: '', text: '*The dog looks at you expectantly. Maybe throw it a stick?*' },
      ]);
    }
  }

  _handleSally() {
    if (!this.state.flags.met_sally) {
      this.state.flags.met_sally = true;
      this.state.addItem('shears', 1);
      this._showDialogueSequence(DIALOGUES.sally_first, () => {
        this.ui.notify('Received Shears from Sally!');
        // Add driftwood (Sally's contribution)
        this.state.addItem('driftwood', 6);
        this.ui.notify("Sally shared her Driftwood collection! (+6)");
        this._refreshUI();
      });
      return;
    }

    // Magic wand: show Strange Stick to Sally
    if (this.state.hasItem('strange_stick')) {
      this.state.removeItem('strange_stick', 1);
      this.state.addItem('magic_wand', 1);
      this._showDialogueSequence(DIALOGUES.sally_magic_wand, () => {
        this.ui.notify('Received Magic Wand!');
        this._refreshUI();
      });
      return;
    }

    this._showDialogueSequence([
      { speaker: 'Sally', text: "How are the beds coming along? We could both use a good night's sleep!" },
    ]);
  }

  _handleMaria() {
    if (!this.state.flags.met_maria) {
      this.state.flags.met_maria = true;
      this._showDialogueSequence(DIALOGUES.maria_first, () => {
        this._refreshUI();
      });
      return;
    }

    if (this.state.hasItem('fishing_rod')) {
      // Check fishing catalogue completion
      if (this.state.hasAllFishTypes() && !this.state.flags.catalogue_complete) {
        this.state.flags.catalogue_complete = true;
        this._showDialogueSequence([
          { speaker: 'Maria', text: "You've caught every type of fish! The catalogue is complete!" },
          { speaker: 'Old Man', text: "Impressive... most impressive. The sea has truly blessed you." },
        ], () => this._refreshUI());
        return;
      }

      // Fish!
      const caught = this.state.catchFish();
      if (!caught) {
        this.ui.notify("No more fish today. Try again tomorrow! (max 10/day)");
        return;
      }
      const name = RESOURCES[caught]?.name || caught;
      this.ui.notify(`Caught a ${name}!`);

      if (this.state.totalFishCollected() >= 5 && !this.state.flags.shared_meal) {
        this.state.flags.shared_meal = true;
        this._showDialogueSequence([
          { speaker: 'Maria', text: "That's enough for a feast! Let me cook these up." },
          { speaker: '', text: "*Everyone gathers around for a warm meal under the stars.*" },
          { speaker: 'Maria', text: "Not bad for a beginner! Come back tomorrow and I'll teach you more." },
        ], () => this._refreshUI());
        return;
      }
      this._refreshUI();
      return;
    }

    this._showDialogueSequence([
      { speaker: 'Maria', text: "You need a fishing rod first! Talk to the Old Man for his line." },
    ]);
  }

  _handleOldMan() {
    if (!this.state.flags.met_old_man) {
      this.state.flags.met_old_man = true;
      this.state.addItem('old_mans_line', 1);
      this._showDialogueSequence(DIALOGUES.old_man_first, () => {
        this.ui.notify("Received Old Man's Line!");
        this._refreshUI();
      });
      return;
    }

    // Give hammer if needed for sheep quest and player doesn't have one yet
    if (!this.state.hasItem('hammer') && this.state.flags.met_sally) {
      this.state.addItem('hammer', 1);
      this._showDialogueSequence(DIALOGUES.old_man_hammer, () => {
        this.ui.notify('Received Hammer & Nails!');
        this._refreshUI();
      });
      return;
    }

    this._showDialogueSequence([
      { speaker: 'Old Man', text: "The islands sing to each other, you know... if you listen closely at sunset..." },
    ]);
  }

  _handleWheatField() {
    if (!this.state.hasItem('shovel')) {
      this.ui.notify("You need a shovel to dig here.");
      return;
    }

    if (!this.state.flags.found_seeds) {
      this.state.flags.found_seeds = true;
      this.state.addItem('seeds', 10);
      this.state.addItem('sticks', 5);
      this.ui.notify('Dug up a Bag of 10 Seeds and 5 Sticks!');
      this._refreshUI();
      return;
    }

    if (this.state.flags.found_seeds && !this.state.flags.planted_seeds && this.state.hasItem('seeds') && this.state.hasItem('water')) {
      const seedCount = this.state.getItemCount('seeds');
      this.state.removeItem('seeds', seedCount);
      this.state.removeItem('water', 1);
      this.state.flags.planted_seeds = true;
      this.state.flags.wheat_planted_day = this.state.day;

      this.ui.notify(`Planted ${seedCount} seeds and watered them!`);

      // Rebuild to show planted wheat
      this.world.buildIslands(this.state);
      this.world.spawnDailyResources(this.state);
      this._refreshUI();
      return;
    }

    if (this.state.flags.planted_seeds) {
      const daysSince = this.state.day - this.state.flags.wheat_planted_day;
      if (daysSince >= 3) {
        // Spec: 1 Wheat per harvest, 2-3 Seeds per Wheat
        const seedsPerPlant = Math.floor(Math.random() * 2) + 2; // 2-3
        this.state.addItem('wheat', 1);
        this.state.addItem('seeds', seedsPerPlant);
        this.state.flags.first_harvest_done = true;
        if (!this.state.flags._first_harvest_shown) {
          this.state.flags._first_harvest_shown = true;
          this._showDialogueSequence(DIALOGUES.wheat_harvest);
        }
        this.ui.notify(`Harvested 1 Wheat and ${seedsPerPlant} Seeds!`);
        this.state.flags.wheat_planted_day = this.state.day;
        this.world.buildIslands(this.state);
        this.world.spawnDailyResources(this.state);
      } else {
        const stages = ['Planted', 'Sprouting', 'Growing', 'Flowering'];
        this.ui.notify(`Wheat is ${stages[daysSince]}... ${3 - daysSince} day(s) until harvest.`);
      }
      this._refreshUI();
    }
  }

  _handlePier() {
    if (this.state.hasItem('fishing_rod')) {
      const caught = this.state.catchFish();
      if (!caught) {
        this.ui.notify("No more fish today. Try again tomorrow! (max 10/day)");
        return;
      }
      const name = RESOURCES[caught]?.name || caught;
      this.ui.notify(`Caught a ${name} from the pier!`);

      if (this.state.totalFishCollected() >= 5 && !this.state.flags.shared_meal) {
        this.state.flags.shared_meal = true;
        this._showDialogueSequence([
          { speaker: 'Maria', text: "That's enough for a feast! Let me cook these up." },
          { speaker: '', text: "*Everyone gathers for a warm meal.*" },
        ], () => this._refreshUI());
        return;
      }
      this._refreshUI();
    } else {
      this.ui.notify("You need a fishing rod to fish here. Talk to Maria and the Old Man.");
    }
  }

  // ── Tier 2 handlers ──

  _handlePierre() {
    if (!this.state.flags.met_pierre) {
      this.state.flags.met_pierre = true;
      this._showDialogueSequence(DIALOGUES.pierre_first, () => this._refreshUI());
      return;
    }
    // Dinner quest check
    if (!this.state.flags.dinner_hosted &&
        this.state.hasItem('halibut', 5) && this.state.hasItem('herring', 5) && this.state.hasItem('bread', 10)) {
      this.state.removeItem('halibut', 5);
      this.state.removeItem('herring', 5);
      this.state.removeItem('bread', 10);
      this.state.flags.dinner_hosted = true;
      this._showDialogueSequence(DIALOGUES.dinner_scene, () => this._refreshUI());
      return;
    }
    this._showDialogueSequence([
      { speaker: 'Pierre', text: "The Oven is ready whenever you need it, mon ami!" },
    ]);
  }

  _handleMouse() {
    // Cellar quest (q3)
    if ((this.state.flags.mouse_catches || 0) >= 5 && !this.state.flags.cellar_opened && this.state.hasItem('bread', 13)) {
      this.state.removeItem('bread', 13);
      this.state.flags.cellar_opened = true;
      this.state.flags.flame_stone_obtained = true;
      this.state.addItem('flame_stone', 1);
      this._showDialogueSequence(DIALOGUES.mouse_cellar, () => {
        this.ui.notify('Received Flame Stone!');
        this._refreshUI();
      });
      return;
    }
    // Chase quest (q1) — mouse flees to farthest island after each catch
    if ((this.state.flags.mouse_catches || 0) < 5) {
      this.state.flags.mouse_catches = (this.state.flags.mouse_catches || 0) + 1;
      if (this.state.flags.mouse_catches >= 5) {
        this.state.mouseIsland = 'bakery'; // returns home
        this._showDialogueSequence(DIALOGUES.mouse_final, () => {
          this.world.buildIslands(this.state);
          this.world.spawnDailyResources(this.state);
          this._refreshUI();
        });
      } else {
        this.state.moveMouseToFarthest();
        this._showDialogueSequence(DIALOGUES.mouse_catch, () => {
          this.world.buildIslands(this.state);
          this.world.spawnDailyResources(this.state);
          this._refreshUI();
        });
      }
      return;
    }
    this._showDialogueSequence([
      { speaker: 'Mouse', text: '"Squeak." (The Mouse nibbles on breadcrumbs contentedly.)' },
    ]);
  }

  _handleAshley() {
    if (!this.state.flags.met_ashley) {
      this.state.flags.met_ashley = true;
      this._showDialogueSequence(DIALOGUES.ashley_first, () => this._refreshUI());
      return;
    }
    this._showDialogueSequence([
      { speaker: 'Ashley', text: "Keep chopping! These trees grow back fast, don't worry." },
    ]);
  }

  _handleSquirrel() {
    // Winter: build snowman
    if (this.state.winter.active && !this.state.flags.snowman_built) {
      this.state.flags.snowman_built = true;
      this.state.flags.frost_stone_obtained = true;
      this.state.addItem('frost_stone', 1);
      this._showDialogueSequence([
        { speaker: '', text: '*The Squirrel and Ashley help you build a Snowman in the snow.*' },
        { speaker: '', text: "*The Squirrel topples the Snowman... revealing something glowing inside!*" },
        { speaker: '', text: "*You pick up a Frost Stone. It's cold to the touch, but beautiful.*" },
        { speaker: 'Ashley', text: "Well, that was unexpected! Winter is already fading." },
      ], () => {
        this.ui.notify('Received Frost Stone! Winter is ending.');
        this.world.buildIslands(this.state);
        this.world.spawnDailyResources(this.state);
        this._refreshUI();
      });
      return;
    }

    // Give acorns
    if (this.state.hasItem('acorns')) {
      const count = this.state.getItemCount('acorns');
      this.state.removeItem('acorns', count);
      this.state.flags.acorns_given = (this.state.flags.acorns_given || 0) + count;
      this._showDialogueSequence(DIALOGUES.squirrel_acorns, () => {
        this.ui.notify(`Gave ${count} Acorns to Squirrel! (${this.state.flags.acorns_given}/100)`);
        this._refreshUI();
      });
      return;
    }

    if (this.state.winter.active) {
      this._showDialogueSequence([
        { speaker: '', text: "*The Squirrel shivers but looks proud. Let's build a snowman!*" },
      ]);
    } else {
      this._showDialogueSequence([
        { speaker: '', text: '*The Squirrel chatters at you impatiently. It wants acorns!*' },
      ]);
    }
  }

  _handleTimmy() {
    if (!this.state.flags.met_timmy) {
      this.state.flags.met_timmy = true;
      this._showDialogueSequence(DIALOGUES.timmy_first, () => this._refreshUI());
      return;
    }
    // Hidden quest: 3 Golden Trout
    if (this.state.hasItem('golden_trout', 3) && !this.state.flags.shadow_stone_obtained) {
      this.state.removeItem('golden_trout', 3);
      this.state.flags.shadow_stone_obtained = true;
      this.state.addItem('shadow_stone', 1);
      this._showDialogueSequence([
        { speaker: 'Timmy', text: "Wow, Golden Trout! The Seals have never seen those before!" },
        { speaker: '', text: "*The Seals don't dance. Instead, they swim close and pull you under.*" },
        { speaker: '', text: "*In the depths, an ethereal queen named Sen speaks to you.*" },
        { speaker: '', text: "*You emerge holding a Shadow Stone, pulsing with dark energy.*" },
      ], () => {
        this.ui.notify('Received Shadow Stone!');
        this._refreshUI();
      });
      return;
    }
    // Daily pearl quest (rocks_q2)
    const q2Day = this.state.flags.rocks_q2_day || 0;
    const fishRequests = ['halibut', 'herring', 'snapper', 'tuna', 'flounder'];
    if (q2Day < 5 && this.state.flags.seals_dancing) {
      const needed = fishRequests[q2Day];
      if (this.state.hasItem(needed, 3)) {
        this.state.removeItem(needed, 3);
        this.state.flags.rocks_q2_day = q2Day + 1;
        this.state.addItem('pearls', 1);
        this.ui.notify(`Gave 3 ${RESOURCES[needed].name}! Received a Pearl!`);
        if (this.state.flags.rocks_q2_day >= 5) {
          this.state.addItem('pearl_necklace', 1);
          this.ui.notify('Received Pearl Necklace!');
        }
        this._refreshUI();
        return;
      }
      this.ui.notify(`Timmy wants 3 ${RESOURCES[needed].name} today.`);
      return;
    }
    // Basic: feed 3 of any fish for shell
    const anyFish = ALL_FISH_IDS.find(id => this.state.hasItem(id, 3));
    if (anyFish && !this.state.flags.seals_dancing) {
      this.state.removeItem(anyFish, 3);
      this.state.flags.seals_dancing = true;
      this.state.addItem('pristine_shell', 1);
      this._showDialogueSequence(DIALOGUES.seals_dance, () => {
        this.ui.notify('Received Pristine Shell!');
        this._refreshUI();
      });
      return;
    }
    if (!this.state.flags.seals_dancing) {
      this.ui.notify('Timmy needs 3 Fish (any type) for the Seals.');
    } else {
      this._showDialogueSequence([
        { speaker: 'Timmy', text: "The Seals are happy! Come back tomorrow with more fish!" },
      ]);
    }
  }

  // ── Tier 2 cont. + Stub handlers ──

  _handleRaven() {
    if (!this.state.flags.met_raven) {
      this.state.flags.met_raven = true;
      this._showDialogueSequence(DIALOGUES.raven_first, () => this._refreshUI());
      return;
    }
    // Tour quest: visiting other NPCs with Raven (simplified — talk to Raven after meeting others)
    const knownNPCs = ['met_sally', 'met_maria', 'met_old_man', 'met_pierre', 'met_ashley', 'met_timmy'].filter(f => this.state.flags[f]);
    if (!this.state.flags.raven_tour_count || this.state.flags.raven_tour_count < knownNPCs.length) {
      this.state.flags.raven_tour_count = Math.min(knownNPCs.length, 3);
      this.ui.notify(`Raven has heard about ${this.state.flags.raven_tour_count} of your friends!`);
      this._refreshUI();
      return;
    }
    // Repair quest
    if (!this.state.flags.granary_repaired && this.state.hasItem('firm_wood', 50)) {
      this.state.removeItem('firm_wood', 50);
      this.state.flags.granary_repaired = true;
      this._showDialogueSequence([
        { speaker: 'Raven', text: "The Granary is restored! Now we can mill proper Grain." },
        { speaker: '', text: "*The windmill creaks to life. Raven smiles for the first time.*" },
      ], () => this._refreshUI());
      return;
    }
    this._showDialogueSequence([
      { speaker: 'Raven', text: "The Crow watches. It always watches." },
    ]);
  }

  _handleAlvin() {
    // Sell items for coins (1 coin each)
    // For now, sell all of a random sellable item
    const sellable = ['driftwood', 'seaweed', 'sticks', 'wheat', 'wool', 'bread', 'firm_wood', 'grain'];
    const available = sellable.filter(id => this.state.hasItem(id));
    if (available.length === 0) {
      this.ui.notify("You don't have anything to sell right now.");
      return;
    }
    // Sell 1 of the first available
    const item = available[0];
    this.state.removeItem(item, 1);
    this.state.addItem('coins', 1);
    this.ui.notify(`Sold 1 ${RESOURCES[item].name} for 1 Coin!`);
    this._refreshUI();
  }

  _handleSimon() {
    // Buy common items for 1 coin each
    if (!this.state.hasItem('coins')) {
      this.ui.notify("You need Coins to buy things. Sell items to Alvin first!");
      return;
    }
    // Simple: buy 1 driftwood for 1 coin
    this.state.removeItem('coins', 1);
    this.state.addItem('driftwood', 1);
    this.ui.notify('Bought 1 Driftwood for 1 Coin!');
    this._refreshUI();
  }

  _handleTheodore() {
    if (!this.state.flags.met_merchants) {
      this.state.flags.met_merchants = true;
      this._showDialogueSequence(DIALOGUES.merchants_first, () => this._refreshUI());
      return;
    }
    // First request: 5 of anything
    if (!this.state.flags.first_request_done) {
      const giveable = Object.entries(this.state.inventory).find(([, c]) => c >= 5);
      if (giveable) {
        this.state.removeItem(giveable[0], 5);
        this.state.addItem('coins', 10);
        this.state.flags.first_request_done = true;
        this.ui.notify(`Gave 5 ${RESOURCES[giveable[0]]?.name || giveable[0]}! Received 10 Coins!`);
        this._refreshUI();
        return;
      }
      this.ui.notify("Theodore wants 5 of anything. Gather more resources!");
      return;
    }
    // Daily requests (quest 2)
    const day = this.state.flags.theodore_day || 0;
    const requests = [
      { item: 'wool', count: 7 },
      { item: 'bread', count: 7 },
      { item: 'logs', count: 7 },
      { item: 'pristine_shell', count: 7 },
      { item: 'flounder', count: 7 },
      { item: 'grain', count: 7 },
      { item: 'pearls', count: 7 },
    ];
    if (day < 7) {
      const req = requests[day];
      if (this.state.hasItem(req.item, req.count)) {
        this.state.removeItem(req.item, req.count);
        this.state.addItem('coins', 14);
        this.state.flags.theodore_day = day + 1;
        this.ui.notify(`Fulfilled request! Received 14 Coins!`);
        this._refreshUI();
        return;
      }
      this.ui.notify(`Theodore wants ${req.count} ${RESOURCES[req.item]?.name || req.item}.`);
      return;
    }
    this._showDialogueSequence([
      { speaker: 'Theodore', text: "All requests fulfilled! You're my best supplier." },
    ]);
  }

  _handleMermaid() {
    if (!this.state.hasItem('mermaid_stone')) {
      this.state.addItem('mermaid_stone', 1);
      this._showDialogueSequence(DIALOGUES.mermaid_first, () => {
        this.ui.notify('Received Mermaid Stone!');
        this._refreshUI();
      });
      return;
    }
    if (!this.state.flags.swam_south) {
      this.state.flags.swam_south = true;
      this._showDialogueSequence([
        { speaker: '', text: "*You dive beneath the waves and swim south to the Altar.*" },
        { speaker: '', text: "*The Altar glows faintly. Something ancient stirs here, but not yet.*" },
        { speaker: '', text: "*You return to shore, changed somehow.*" },
      ], () => this._refreshUI());
      return;
    }
    this._showDialogueSequence([
      { speaker: 'Mermaid', text: "The ocean remembers you now. Swim freely, land-walker." },
    ]);
  }

  _handleFaerie() {
    if (!this.state.hasItem('faerie_stone')) {
      this.state.addItem('faerie_stone', 1);
      this._showDialogueSequence(DIALOGUES.faerie_first, () => {
        this.ui.notify('Received Faerie Stone!');
        this._refreshUI();
      });
      return;
    }
    if (!this.state.flags.entered_faerie) {
      this.state.flags.entered_faerie = true;
      this._showDialogueSequence([
        { speaker: '', text: "*You step through the shimmering portal...*" },
        { speaker: '', text: "*A world of impossible beauty unfolds. Tiny lights dance everywhere.*" },
        { speaker: '', text: "*The Faerie Altar stands in a clearing. You touch it and return.*" },
      ], () => this._refreshUI());
      return;
    }
    this._showDialogueSequence([
      { speaker: 'Faerie', text: "The portal is always open for you now!" },
    ]);
  }

  _handleAuctioneer() {
    if (!this.state.flags.won_auction) {
      if (this.state.hasItem('coins', 21)) {
        this.state.removeItem('coins', 21);
        this.state.flags.won_auction = true;
        this._showDialogueSequence(DIALOGUES.auctioneer_first.concat([
          { speaker: 'Auctioneer', text: "Sold! The Mysterious Painting is yours!" },
          { speaker: '', text: "*A beautiful, enigmatic painting. It seems to shift when you look away.*" },
        ]), () => {
          this.ui.notify('Won the auction! The Mysterious Painting hangs in your house.');
          this._refreshUI();
        });
      } else {
        this._showDialogueSequence(DIALOGUES.auctioneer_first.concat([
          { speaker: 'Auctioneer', text: "Going once... going twice... SOLD to someone else for 20 Coins!" },
          { speaker: '', text: "*You'll need 21 Coins to win next time.*" },
        ]));
      }
      return;
    }
    this._showDialogueSequence([
      { speaker: 'Auctioneer', text: "No new auctions today. Enjoy your painting!" },
    ]);
  }

  _handleMiner() {
    if (!this.state.flags.has_mining_tools) {
      this.state.flags.has_mining_tools = true;
      this._showDialogueSequence(DIALOGUES.miner_first, () => {
        this.ui.notify('Received Pickaxe and Helmet!');
        this._refreshUI();
      });
      return;
    }
    if (!this.state.flags.mined_gold) {
      this.state.flags.mined_gold = true;
      this.state.addItem('coins', 20);
      this._showDialogueSequence([
        { speaker: '', text: "*You descend into the mine. The tunnels stretch beneath the islands.*" },
        { speaker: '', text: "*You find veins of gold! After hours of work, you emerge richer.*" },
        { speaker: 'Miner', text: "Not bad for your first run! There's plenty more down there." },
      ], () => {
        this.ui.notify('Mined 20 Coins worth of gold!');
        this._refreshUI();
      });
      return;
    }
    this._showDialogueSequence([
      { speaker: 'Miner', text: "The tunnels run deep. Come back anytime." },
    ]);
  }

  _handleMountain() {
    if (!this.state.flags.climbed_mountain) {
      this.state.flags.climbed_mountain = true;
      this.state.addItem('silent_stone', 1);
      this._showDialogueSequence(DIALOGUES.mountain_climb, () => {
        this.ui.notify('Received Silent Stone!');
        this._refreshUI();
      });
      return;
    }
    this._showDialogueSequence([
      { speaker: '', text: "*The peak is quiet. The Silent Stone pulses gently in your pack.*" },
    ]);
  }

  // Sheep shearing - handled via clicking sheep NPCs
  _handleSheepInteraction(mesh) {
    const sheepId = mesh.userData.id;

    // Pregnancy: sheep1 becomes the pregnant sheep once quest activates
    if (sheepId === 'sheep1' && this.state.isIslandUnlocked('sheep_pasture') &&
        this.state.flags.sheep_herded && !this.state.flags.lamb_born) {
      // Start pregnancy if not started
      if (!this.state.pregnancy.active && this.state.pregnancy.day === 0) {
        this.state.startPregnancy();
      }
      if (this.state.pregnancy.active && !this.state.pregnancy.actionDoneToday) {
        const needed = this.state.getPregnancyNeeded();
        if (needed.type === 'pet') {
          this.state.doPregnancyAction();
          this._showDialogueSequence([
            { speaker: '', text: '*You gently pet the sheep. She seems content.*' },
            { speaker: 'Sally', text: "She likes you! Come back tomorrow." },
          ], () => this._refreshUI());
          return;
        } else {
          if (this.state.hasItem('wheat', needed.wheat)) {
            this.state.removeItem('wheat', needed.wheat);
            this.state.doPregnancyAction();
            this._showDialogueSequence([
              { speaker: '', text: `*You feed the sheep ${needed.wheat} Wheat. She eats happily.*` },
              { speaker: 'Sally', text: this.state.pregnancy.day >= 4 ? "Any day now!" : "She's doing great! Come back tomorrow." },
            ], () => this._refreshUI());
            return;
          }
          this.ui.notify(`This sheep needs ${needed.wheat} Wheat today.`);
          return;
        }
      }
      if (this.state.pregnancy.actionDoneToday) {
        this.ui.notify("You've already cared for this sheep today. Come back tomorrow.");
        return;
      }
    }

    // Check for lamb born celebration
    if (this.state.flags.lamb_born && sheepId === 'sheep1') {
      this._showDialogueSequence([
        { speaker: 'Sally', text: "Look at the little one! Seven sheep now. Isn't it wonderful?" },
      ]);
      return;
    }

    // Normal shearing
    if (!this.state.hasItem('shears')) {
      this.ui.notify("You need shears to harvest wool.");
      return;
    }
    if (this.state.flags.sheep_shorn.has(sheepId)) {
      this.ui.notify("This sheep has already been shorn today.");
      return;
    }
    this.state.flags.sheep_shorn.add(sheepId);
    this.state.addItem('wool', 1);
    this.ui.notify('Harvested 1 Wool!');
    this._refreshUI();
  }

  // ── Dialogue System ──
  _showDialogueSequence(lines, callback) {
    this.mode = 'dialogue';
    this.player.clearKeys();
    this.dialogueQueue = [...lines];
    this.dialogueCallback = callback || null;
    this._showNextDialogue();
  }

  _showNextDialogue() {
    if (this.dialogueQueue.length === 0) {
      this.ui.hideDialogue();
      this.mode = 'playing';
      if (this.dialogueCallback) {
        this.dialogueCallback();
        this.dialogueCallback = null;
      }
      return;
    }
    const line = this.dialogueQueue.shift();
    this.ui.showDialogue(line.speaker, line.text, () => this._advanceDialogue());
  }

  _advanceDialogue() {
    this._showNextDialogue();
  }

  // ── Crafting ──
  _tryCraft() {
    const playerPos = this.player.getWorldPosition();
    const nearest = this.world.getNearbyInteractable(playerPos, 2.5);
    if (nearest && (nearest.userData.interaction === 'crafting' || nearest.userData.station)) {
      this._handleCraftStation(nearest.userData);
    } else {
      this.ui.notify('No crafting station nearby.');
    }
  }

  // ── Turtle Scene ──
  _startTurtleScene() {
    this.mode = 'turtle';
    this._setupTurtleScene();
    this.ui.showTurtleScene();

    const dialogueKey = this.state.day === 1 ? 'turtle_end_day' : `turtle_day${this.state.day}`;
    const lines = DIALOGUES[dialogueKey] || DIALOGUES.turtle_generic;
    let lineIdx = 0;

    // Start with turtle greeting
    const greeting = DIALOGUES.turtle_start;
    const allLines = this.state.day === 1
      ? [...greeting, ...lines]
      : lines;

    const showLine = () => {
      if (lineIdx >= allLines.length) {
        // End of turtle conversation - end day
        this.ui.setTurtleDialogue('', 'The sun sets over the western horizon...', 'End Day', () => {
          this._endDay();
        });
        return;
      }
      const line = allLines[lineIdx];
      lineIdx++;
      this.ui.setTurtleDialogue(line.speaker, line.text, 'Continue', showLine);
    };

    showLine();
  }

  _setupTurtleScene() {
    if (this.turtleRenderer) return; // Already set up

    const wrap = document.getElementById('turtle-canvas-wrap');
    this.turtleScene = new THREE.Scene();
    this.turtleScene.background = new THREE.Color(0xff8844); // Sunset

    this.turtleCamera = new THREE.PerspectiveCamera(50, window.innerWidth / (window.innerHeight * 0.6), 0.1, 100);
    this.turtleCamera.position.set(3, 2, 6);
    this.turtleCamera.lookAt(0, 0.5, 0);

    this.turtleRenderer = new THREE.WebGLRenderer({ antialias: true });
    this.turtleRenderer.setSize(window.innerWidth, window.innerHeight * 0.6);
    wrap.appendChild(this.turtleRenderer.domElement);

    // Sunset sky gradient
    this.turtleScene.fog = new THREE.Fog(0xff6633, 15, 40);

    // Ambient light - warm sunset
    this.turtleScene.add(new THREE.AmbientLight(0xffaa66, 0.8));
    const sunLight = new THREE.DirectionalLight(0xff9933, 1);
    sunLight.position.set(-5, 3, -2);
    this.turtleScene.add(sunLight);

    // Ocean
    const oceanGeo = new THREE.PlaneGeometry(60, 60, 20, 20);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x2a5a8a, flatShading: true, metalness: 0.3, roughness: 0.7,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -1;
    this.turtleScene.add(ocean);

    // Turtle side view
    const turtleGroup = new THREE.Group();
    // Body
    const bodyGeo = new THREE.SphereGeometry(2, 8, 6);
    bodyGeo.scale(1.5, 0.6, 1);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5a8a3a, flatShading: true });
    turtleGroup.add(new THREE.Mesh(bodyGeo, bodyMat));
    // Shell
    const shellGeo = new THREE.SphereGeometry(1.8, 6, 4);
    shellGeo.scale(1.4, 0.7, 0.9);
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x4a7a2a, flatShading: true });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.y = 0.3;
    turtleGroup.add(shell);
    // Head
    const headGeo = new THREE.SphereGeometry(0.5, 6, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x6a9a4a, flatShading: true });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(-2.5, 0.3, 0);
    turtleGroup.add(head);
    // Player on turtle
    const playerGroup = new THREE.Group();
    const pBody = new THREE.BoxGeometry(0.3, 0.4, 0.2);
    playerGroup.add(new THREE.Mesh(pBody, new THREE.MeshStandardMaterial({ color: 0x3366cc, flatShading: true })));
    const pHead = new THREE.SphereGeometry(0.15, 6, 6);
    const pH = new THREE.Mesh(pHead, new THREE.MeshStandardMaterial({ color: 0xf0c090, flatShading: true }));
    pH.position.y = 0.35;
    playerGroup.add(pH);
    playerGroup.position.set(0, 1.0, 0);
    turtleGroup.add(playerGroup);

    turtleGroup.position.set(0, -0.3, 0);
    this.turtleScene.add(turtleGroup);
    this._turtleGroup = turtleGroup;

    // Sun on horizon
    const sunGeo = new THREE.CircleGeometry(3, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffcc44 });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(-15, 2, -20);
    sun.lookAt(this.turtleCamera.position);
    this.turtleScene.add(sun);
  }

  async _endDay() {
    this.ui.hideTurtleScene();
    this.mode = 'transition';

    // Snapshot islands before advancing
    const previousIslands = new Set(this.state.unlockedIslands);
    const newDay = this.state.advanceDay();

    // Determine newly unlocked islands
    const justUnlocked = [...this.state.unlockedIslands].filter(id => !previousIslands.has(id));
    let newIslandName = '';
    if (justUnlocked.length > 0) {
      const names = justUnlocked.map(id => ISLANDS[id]?.name || id).filter(Boolean);
      newIslandName = names.join(', ');
    }

    const subtitle = newIslandName
      ? `A new island appears: ${newIslandName}!`
      : 'A new day dawns...';

    await this.ui.showDayTransition(newDay, subtitle);

    // Rebuild world with new islands
    this.world.buildIslands(this.state);
    this.world.spawnDailyResources(this.state);
    this._clearHoverState();
    this.ui.updateDay(newDay);
    this._refreshUI();

    // Auto-save
    this.state.save();

    this.mode = 'playing';
  }

  // ── UI Refresh ──
  _refreshUI() {
    this.ui.updateInventory(this.state);
    this.ui.updateQuests(this.state);
  }

  // ── Main Loop ──
  update() {
    const dt = this.clock.getDelta();
    const time = this.clock.elapsedTime;

    if (this.mode === 'playing') {
      this.player.update(dt, this.state);

      // E-key proximity prompt
      const pPos = this.player.getWorldPosition();
      const nearest = this.world.getNearbyInteractable(pPos, 2.0);
      if (nearest) {
        const name = nearest.userData.name || nearest.userData.resource || 'Object';
        const resName = nearest.userData.resource ? RESOURCES[nearest.userData.resource]?.name : null;
        const displayName = resName || name;
        const label = nearest.userData.shape === 'sheep' ? `[E] Shear ${nearest.userData.name}` : `[E] ${displayName}`;
        this.ui.showInteractPrompt(label);
      } else {
        this.ui.hideInteractPrompt();
      }

      // Mouse hover raycasting
      this._hoverRaycaster.setFromCamera(this._mouseNDC, this.camera);
      const hoverHits = this._hoverRaycaster.intersectObjects(this.world.interactables, true);
      let newHovered = null;
      if (hoverHits.length > 0) {
        newHovered = this._findParentInteractable(hoverHits[0].object);
      }
      if (newHovered !== this._hoveredInteractable) {
        this._hoveredInteractable = newHovered;
        if (newHovered) {
          this.renderer.domElement.style.cursor = 'pointer';
          const hName = newHovered.userData.name ||
            (newHovered.userData.resource ? RESOURCES[newHovered.userData.resource]?.name : null) || 'Object';
          this.ui.showTooltip(hName, this._mouseClientPos.x, this._mouseClientPos.y);
        } else {
          this.renderer.domElement.style.cursor = 'default';
          this.ui.hideTooltip();
        }
      }
      if (this._hoveredInteractable) {
        this.ui.updateTooltipPosition(this._mouseClientPos.x, this._mouseClientPos.y);
        const wp = new THREE.Vector3();
        this._hoveredInteractable.getWorldPosition(wp);
        this.world.showHighlightRing(wp, time);
      } else {
        this.world.hideHighlightRing();
      }

      // Check pending walk-then-interact arrival
      if (this._pendingInteraction && !this.player.isMovingToTarget()) {
        const mesh = this._pendingInteraction.mesh;
        const objW = new THREE.Vector3();
        mesh.getWorldPosition(objW);
        const pp = this.player.getWorldPosition();
        pp.y = objW.y;
        if (pp.distanceTo(objW) < 2.5) {
          this._handleInteraction(mesh);
        }
        this._pendingInteraction = null;
      }
    } else {
      this.player.clearKeys();
      this.ui.hideTooltip();
      this.world.hideHighlightRing();
      this.renderer.domElement.style.cursor = 'default';
    }

    // Animate ocean + clouds
    this.world.animateOcean(time);
    this.world.animateNPCs(time);

    // Camera: smoothly track player position as orbit target
    const playerPos = this.player.mesh.position;
    this.controls.target.lerp(playerPos, 0.06);

    // Isometric snap-back (V key)
    if (this._isoSnapping) {
      const offset = this.camera.position.clone().sub(this.controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta = THREE.MathUtils.lerp(spherical.theta, this._isoAzimuth, 0.08);
      spherical.phi = THREE.MathUtils.lerp(spherical.phi, this._isoPolar, 0.08);
      spherical.radius = THREE.MathUtils.lerp(spherical.radius, this._isoDistance, 0.08);

      const newOffset = new THREE.Vector3().setFromSpherical(spherical);
      this.camera.position.copy(this.controls.target).add(newOffset);

      // Stop snapping once close enough
      if (Math.abs(spherical.theta - this._isoAzimuth) < 0.01 &&
          Math.abs(spherical.phi - this._isoPolar) < 0.01 &&
          Math.abs(spherical.radius - this._isoDistance) < 0.1) {
        this._isoSnapping = false;
      }
    }

    this.controls.update();

    // Render main scene
    this.renderer.render(this.scene, this.camera);

    // Render turtle scene if active
    if (this.mode === 'turtle' && this.turtleRenderer && this.turtleScene) {
      if (this._turtleGroup) {
        this._turtleGroup.position.y = -0.3 + Math.sin(time * 0.5) * 0.1;
      }
      this.turtleRenderer.render(this.turtleScene, this.turtleCamera);
    }
  }

  // Override interaction for sheep
  _handleInteraction(mesh) {
    const data = mesh.userData;

    // Sheep special handling
    if (data.shape === 'sheep') {
      this._handleSheepInteraction(mesh);
      return;
    }

    switch (data.interaction) {
      case 'pickup': this._handlePickup(mesh, data); break;
      case 'well': this._handleWell(); break;
      case 'fire_pit': this._handleFirePit(); break;
      case 'crafting': this._handleCraftStation(data); break;
      case 'turtle': this._handleTurtle(); break;
      case 'dog': this._handleDog(); break;
      case 'sally': this._handleSally(); break;
      case 'maria': this._handleMaria(); break;
      case 'old_man': this._handleOldMan(); break;
      case 'wheat_field': this._handleWheatField(); break;
      case 'pier': this._handlePier(); break;
      case 'pierre': this._handlePierre(); break;
      case 'mouse': this._handleMouse(); break;
      case 'ashley': this._handleAshley(); break;
      case 'squirrel': this._handleSquirrel(); break;
      case 'timmy': this._handleTimmy(); break;
      case 'raven': this._handleRaven(); break;
      case 'alvin': this._handleAlvin(); break;
      case 'simon': this._handleSimon(); break;
      case 'theodore': this._handleTheodore(); break;
      case 'mermaid': this._handleMermaid(); break;
      case 'faerie': this._handleFaerie(); break;
      case 'auctioneer': this._handleAuctioneer(); break;
      case 'miner': this._handleMiner(); break;
      case 'mountain': this._handleMountain(); break;
      default:
        if (data.type === 'npc' && data.name) {
          this._showDialogueSequence([{ speaker: data.name, text: '...' }]);
        }
    }
  }
}
