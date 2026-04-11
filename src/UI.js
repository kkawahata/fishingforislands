import { RESOURCES, RECIPES } from './data.js';

export class UI {
  constructor() {
    this.inventoryBar = document.getElementById('inventory-bar');
    this.questList = document.getElementById('quest-list');
    this.dayDisplay = document.getElementById('day-display');
    this.dialogueBox = document.getElementById('dialogue-box');
    this.dialogueSpeaker = document.getElementById('dialogue-speaker');
    this.dialogueText = document.getElementById('dialogue-text');
    this.dialogueContinue = document.getElementById('dialogue-continue');
    this.craftingMenu = document.getElementById('crafting-menu');
    this.recipeList = document.getElementById('recipe-list');
    this.craftingClose = document.getElementById('crafting-close');
    this.notifications = document.getElementById('notifications');
    this.interactPrompt = document.getElementById('interact-prompt');
    this.tooltip = document.getElementById('mouse-tooltip');
    this.devTools = document.getElementById('dev-tools');
    this._devToolsVisible = false;
    this.dayTransition = document.getElementById('day-transition');
    this.dayTransitionText = document.getElementById('day-transition-text');
    this.dayTransitionSub = document.getElementById('day-transition-sub');

    // Turtle scene
    this.turtleScene = document.getElementById('turtle-scene');
    this.turtleText = document.getElementById('turtle-text');
    this.turtleSpeaker = document.getElementById('turtle-speaker');
    this.turtleBtn = document.getElementById('turtle-btn');

    // Callbacks
    this._onDialogueContinue = null;
    this._onCraft = null;
    this._onTurtleContinue = null;

    this.dialogueContinue.addEventListener('click', () => {
      if (this._onDialogueContinue) this._onDialogueContinue();
    });
    this.craftingClose.addEventListener('click', () => {
      this.hideCrafting();
    });
    this.turtleBtn.addEventListener('click', () => {
      if (this._onTurtleContinue) this._onTurtleContinue();
    });

    // The items to show in inventory (ordered)
    this.displayItems = [
      'driftwood', 'seaweed', 'sticks', 'water', 'seeds', 'wheat',
      'wool', 'bread', 'firm_wood', 'logs', 'acorns', 'grain', 'coins',
      'halibut', 'herring', 'snapper', 'tuna', 'flounder', 'golden_trout', 'fish',
      'axe', 'shovel', 'fishing_rod', 'broken_spade', 'strange_stick',
      'old_mans_line', 'shears', 'hammer', 'bed', 'magic_wand',
      'pristine_shell', 'pearls', 'pearl_necklace',
      'flame_stone', 'frost_stone', 'shadow_stone',
      'mermaid_stone', 'faerie_stone', 'silent_stone',
    ];
  }

  // ── Inventory ──
  updateInventory(gameState) {
    this.inventoryBar.innerHTML = '';
    const items = this.displayItems.filter(id => gameState.getItemCount(id) > 0);

    for (const itemId of items) {
      const count = gameState.getItemCount(itemId);
      const def = RESOURCES[itemId];
      if (!def) continue;

      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.innerHTML = `
        <span class="icon">${def.icon}</span>
        <span class="label">${def.name}</span>
        ${count > 1 ? `<span class="count">${count}</span>` : ''}
      `;
      this.inventoryBar.appendChild(slot);
    }

    // Show empty slots up to min 8
    const remaining = Math.max(0, 8 - items.length);
    for (let i = 0; i < remaining; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      this.inventoryBar.appendChild(slot);
    }
  }

  // ── Day Display ──
  updateDay(day) {
    this.dayDisplay.textContent = `Day ${day}`;
  }

  // ── Quest Panel ──
  updateQuests(gameState) {
    const active = gameState.getActiveQuests();
    this.questList.innerHTML = '';

    for (const quest of active) {
      const progress = gameState.getQuestProgress(quest.id);
      if (!progress) continue;

      const questDiv = document.createElement('div');
      questDiv.style.marginBottom = '10px';

      const title = document.createElement('div');
      title.style.cssText = 'color: #f0e68c; font-weight: bold; font-size: 13px; margin-bottom: 4px;';
      title.textContent = quest.name;
      questDiv.appendChild(title);

      for (const step of progress.steps) {
        const stepDiv = document.createElement('div');
        stepDiv.className = `quest-item ${step.completed ? 'completed' : 'active'}`;
        stepDiv.textContent = `${step.completed ? '✓' : '○'} ${step.text}`;
        questDiv.appendChild(stepDiv);
      }

      this.questList.appendChild(questDiv);
    }
  }

  // ── Dialogue ──
  showDialogue(speaker, text, onContinue) {
    this.dialogueBox.style.display = 'block';
    this.dialogueSpeaker.textContent = speaker;
    this.dialogueText.textContent = text;
    this._onDialogueContinue = onContinue;
  }

  hideDialogue() {
    this.dialogueBox.style.display = 'none';
    this._onDialogueContinue = null;
  }

  // ── Crafting Menu ──
  showCrafting(gameState, station, onCraft) {
    this.craftingMenu.style.display = 'block';
    this._onCraft = onCraft;
    this._renderRecipes(gameState, station);
  }

  _renderRecipes(gameState, station) {
    this.recipeList.innerHTML = '';

    const available = RECIPES.filter(r => {
      // Match station
      if (station === 'crafting_table' && (r.station === 'big_rock' || r.station === 'crafting_table')) return true;
      if (station === 'big_rock' && r.station === 'big_rock') return true;
      return false;
    }).filter(r => {
      // Hide completed one-time recipes
      if (r.oneTime && gameState.completedRecipes.has(r.id)) return false;
      return true;
    });

    for (const recipe of available) {
      const canCraft = gameState.canCraft(recipe);
      const item = document.createElement('div');
      item.className = `recipe-item ${canCraft ? 'craftable' : 'disabled'}`;

      const costParts = Object.entries(recipe.inputs).map(([itemId, count]) => {
        const has = gameState.getItemCount(itemId) >= count;
        const def = RESOURCES[itemId];
        return `<span class="${has ? 'has' : 'missing'}">${def?.icon || ''} ${def?.name || itemId} x${count}</span>`;
      }).join(', ');

      const outputParts = Object.entries(recipe.outputs).map(([itemId, count]) => {
        const def = RESOURCES[itemId];
        return `${def?.icon || ''} ${def?.name || itemId}${count > 1 ? ` x${count}` : ''}`;
      }).join(', ');

      item.innerHTML = `
        <div>
          <div class="recipe-name">${recipe.name}</div>
          <div class="recipe-cost">Needs: ${costParts}</div>
          ${outputParts ? `<div class="recipe-cost" style="color:#6a6">Makes: ${outputParts}</div>` : ''}
        </div>
      `;

      if (canCraft) {
        item.addEventListener('click', () => {
          if (this._onCraft) this._onCraft(recipe);
        });
      }

      this.recipeList.appendChild(item);
    }

    if (available.length === 0) {
      this.recipeList.innerHTML = '<div style="color:#888;font-size:13px;">No recipes available at this station.</div>';
    }
  }

  hideCrafting() {
    this.craftingMenu.style.display = 'none';
    this._onCraft = null;
  }

  isCraftingOpen() {
    return this.craftingMenu.style.display !== 'none';
  }

  // ── Notifications ──
  notify(text) {
    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = text;
    this.notifications.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  // ── Interaction Prompt ──
  showInteractPrompt(text) {
    this.interactPrompt.style.display = 'block';
    this.interactPrompt.textContent = text;
  }

  hideInteractPrompt() {
    this.interactPrompt.style.display = 'none';
  }

  // ── Day Transition ──
  async showDayTransition(day, subtitle = '') {
    this.dayTransition.style.display = 'flex';
    this.dayTransitionText.textContent = `Day ${day}`;
    this.dayTransitionSub.textContent = subtitle;
    await new Promise(r => setTimeout(r, 2000));
    this.dayTransition.style.display = 'none';
  }

  // ── Turtle Scene ──
  showTurtleScene() {
    this.turtleScene.style.display = 'flex';
  }

  hideTurtleScene() {
    this.turtleScene.style.display = 'none';
  }

  setTurtleDialogue(speaker, text, btnText, onContinue) {
    this.turtleSpeaker.textContent = speaker;
    this.turtleText.textContent = text;
    this.turtleBtn.textContent = btnText || 'Continue';
    this._onTurtleContinue = onContinue;
  }

  isDialogueOpen() {
    return this.dialogueBox.style.display !== 'none';
  }

  // ── Tooltip ──
  showTooltip(text, clientX, clientY) {
    this.tooltip.textContent = text;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = (clientX + 14) + 'px';
    this.tooltip.style.top = (clientY + 14) + 'px';
  }

  updateTooltipPosition(clientX, clientY) {
    this.tooltip.style.left = (clientX + 14) + 'px';
    this.tooltip.style.top = (clientY + 14) + 'px';
  }

  hideTooltip() {
    this.tooltip.style.display = 'none';
  }

  // ── Dev Tools ──
  toggleDevTools() {
    this._devToolsVisible = !this._devToolsVisible;
    this.devTools.style.display = this._devToolsVisible ? 'block' : 'none';
  }

  isDevToolsVisible() {
    return this._devToolsVisible;
  }

  populateDevDropdowns(resources, flags) {
    const itemSelect = document.getElementById('dev-item-select');
    itemSelect.innerHTML = '';
    for (const [id, def] of Object.entries(resources)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${def.icon} ${def.name}`;
      itemSelect.appendChild(opt);
    }
    const flagSelect = document.getElementById('dev-flag-select');
    flagSelect.innerHTML = '';
    for (const key of Object.keys(flags)) {
      if (key === 'sheep_shorn') continue;
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = key;
      flagSelect.appendChild(opt);
    }
  }
}
