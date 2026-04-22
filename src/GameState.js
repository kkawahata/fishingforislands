import { QUESTS, ISLAND_UNLOCK_RULES, RESOURCES, FISH_TYPES, MAX_FISH_PER_DAY, ALL_FISH_IDS, ISLAND_GRID } from './data.js';

export class GameState {
  constructor() {
    this.day = 1;
    this.inventory = {};
    this.unlockedIslands = new Set();
    this.completedRecipes = new Set();
    this.questProgress = {};
    this.flags = {
      picked_axe: false,
      made_sticks: false,
      fire_lit: false,
      has_crafting_table: false,
      met_dog: false,
      threw_stick: false,
      found_seeds: false,
      planted_seeds: false,
      met_sally: false,
      met_maria: false,
      met_old_man: false,
      shared_meal: false,
      beds_crafted: 0,
      wheat_planted_day: -1,
      sheep_shorn: new Set(),
      // Phase 1 new flags
      found_strange_stick: false,
      house_built: false,
      first_harvest_done: false,
      fence_built: false,
      sheep_herded: false,
      cooked_fish: false,
      catalogue_complete: false,
    };
    this._totalCollected = {};
    this.fishCaughtToday = 0;

    // Multi-day quest tracking
    // Each entry: { startedDay, currentStep, actionDoneToday }
    this.dailyQuests = {};

    // Sheep pregnancy
    this.pregnancy = { active: false, day: 0, actionDoneToday: false };

    // Mouse chase
    this.mouseIsland = 'bakery'; // where the mouse currently is

    // Winter event
    this.winter = { active: false, endDay: -1 };

    // Choice groups: pick one from each exclusive pair at run start
    this._choiceGroupPicks = {
      A: Math.random() < 0.5 ? 'sheep_pasture' : 'fishing_pier',
      B: Math.random() < 0.5 ? 'mermaid_cove' : 'faerie_woods',
    };
    // Legacy compat
    this.day3choice = this._choiceGroupPicks.A;
    this.day4choice = this.day3choice === 'sheep_pasture' ? 'fishing_pier' : 'sheep_pasture';

    // Unlock day-1 islands
    this._unlockIslandsForDay();
  }

  // ── Inventory ──

  addItem(itemId, count = 1) {
    this.inventory[itemId] = (this.inventory[itemId] || 0) + count;
    this._totalCollected[itemId] = (this._totalCollected[itemId] || 0) + count;
  }

  removeItem(itemId, count = 1) {
    if (!this.inventory[itemId]) return false;
    this.inventory[itemId] -= count;
    if (this.inventory[itemId] <= 0) delete this.inventory[itemId];
    return true;
  }

  hasItem(itemId, count = 1) {
    return (this.inventory[itemId] || 0) >= count;
  }

  getItemCount(itemId) {
    return this.inventory[itemId] || 0;
  }

  totalCollected(itemId) {
    return this._totalCollected[itemId] || 0;
  }

  // ── Fish system ──

  totalFishCollected() {
    let total = 0;
    for (const id of ALL_FISH_IDS) {
      total += this._totalCollected[id] || 0;
    }
    // Include legacy generic fish
    total += this._totalCollected['fish'] || 0;
    return total;
  }

  catchFish() {
    if (this.fishCaughtToday >= MAX_FISH_PER_DAY) return null;

    // Build probability pool for today
    const pool = [];
    let totalWeight = 0;
    for (const [id, info] of Object.entries(FISH_TYPES)) {
      if (info.oddDaysOnly && this.day % 2 === 0) continue;
      if (info.evenDaysOnly && this.day % 2 !== 0) continue;
      const chance = (this.day % 3 === 0 && info.divisibleBy3Chance !== undefined)
        ? info.divisibleBy3Chance
        : info.baseChance;
      pool.push({ id, weight: chance });
      totalWeight += chance;
    }

    // Normalize and roll
    const roll = Math.random() * totalWeight;
    let cumulative = 0;
    for (const entry of pool) {
      cumulative += entry.weight;
      if (roll <= cumulative) {
        this.addItem(entry.id, 1);
        this.fishCaughtToday++;
        return entry.id;
      }
    }
    // Fallback
    const fallback = pool[0]?.id || 'halibut';
    this.addItem(fallback, 1);
    this.fishCaughtToday++;
    return fallback;
  }

  hasAllFishTypes() {
    return ALL_FISH_IDS.every(id => this.totalCollected(id) >= 1);
  }

  // ── Crafting ──

  canCraft(recipe) {
    for (const [item, count] of Object.entries(recipe.inputs)) {
      if (!this.hasItem(item, count)) return false;
    }
    if (recipe.requiresTool && !this.hasItem(recipe.requiresTool)) return false;
    if (recipe.oneTime && this.completedRecipes.has(recipe.id)) return false;
    return true;
  }

  craft(recipe) {
    if (!this.canCraft(recipe)) return false;
    // Remove inputs (but not tools)
    for (const [item, count] of Object.entries(recipe.inputs)) {
      if (item === recipe.requiresTool) continue;
      this.removeItem(item, count);
    }
    // Add outputs
    for (const [item, count] of Object.entries(recipe.outputs)) {
      this.addItem(item, count);
    }
    if (recipe.oneTime) this.completedRecipes.add(recipe.id);

    // Handle special effects
    if (recipe.special === 'unlock_crafting_table') {
      this.flags.has_crafting_table = true;
    }
    if (recipe.id === 'bed') {
      this.flags.beds_crafted = (this.flags.beds_crafted || 0) + 1;
    }

    return true;
  }

  // ── Islands ──

  _unlockIslandsForDay() {
    const rules = ISLAND_UNLOCK_RULES;

    // 1. Auto-unlock all fixed islands whose day has arrived
    for (const [id, rule] of Object.entries(rules)) {
      if (rule.fixed && rule.day <= this.day && !this.unlockedIslands.has(id)) {
        this.unlockedIslands.add(id);
      }
    }

    // 2. For each past day that hasn't produced a draw, draw one island
    //    (handles catching up on initial load / multi-day jumps)
    const targetDrawCount = Math.max(0, this.day - 2); // days 3+ each draw one
    const fixedIds = new Set(Object.entries(rules).filter(([, r]) => r.fixed).map(([id]) => id));
    const drawnCount = [...this.unlockedIslands].filter(id => !fixedIds.has(id)).length;

    for (let i = drawnCount; i < targetDrawCount; i++) {
      const drawn = this._drawOneIsland();
      if (!drawn) break; // no eligible islands left
    }
  }

  _drawOneIsland() {
    const rules = ISLAND_UNLOCK_RULES;
    const eligible = [];

    for (const [id, rule] of Object.entries(rules)) {
      if (rule.fixed) continue;
      if (this.unlockedIslands.has(id)) continue;
      if (rule.day > this.day) continue;

      // Check requires (all must be unlocked)
      if (rule.requires && !rule.requires.every(r => this.unlockedIslands.has(r))) continue;

      // Check requiresAny (at least one must be unlocked)
      if (rule.requiresAny && !rule.requiresAny.some(r => this.unlockedIslands.has(r))) continue;

      // Check choice group: only eligible if this is the picked member,
      // OR the picked member is already unlocked (then the other becomes available)
      if (rule.choiceGroup) {
        const picked = this._choiceGroupPicks[rule.choiceGroup];
        const otherInGroup = Object.entries(rules)
          .filter(([oid, or]) => or.choiceGroup === rule.choiceGroup && oid !== id)
          .map(([oid]) => oid);
        const pickedIsUnlocked = this.unlockedIslands.has(picked);

        if (id === picked) {
          // This is the first pick — always eligible
        } else if (pickedIsUnlocked) {
          // First pick already drawn — second becomes eligible
        } else {
          // First pick not yet drawn — skip the second
          continue;
        }
      }

      eligible.push(id);
    }

    if (eligible.length === 0) return null;

    // Pick randomly from eligible
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    this.unlockedIslands.add(pick);
    return pick;
  }

  isIslandUnlocked(id) {
    return this.unlockedIslands.has(id);
  }

  // ── Day progression ──

  advanceDay() {
    this.day++;
    this.fishCaughtToday = 0;
    this.flags.sheep_shorn = new Set();

    // Tick sheep pregnancy
    if (this.pregnancy.active && this.pregnancy.actionDoneToday) {
      this.pregnancy.day++;
      this.pregnancy.actionDoneToday = false;
      if (this.pregnancy.day >= 6) {
        this.flags.lamb_born = true;
        this.pregnancy.active = false;
      }
    }

    // Tick daily quests (Theodore, Rocks Q2, etc.)
    for (const [id, dq] of Object.entries(this.dailyQuests)) {
      if (dq.actionDoneToday) {
        dq.currentStep++;
        dq.actionDoneToday = false;
      }
    }

    // Check winter trigger: 3 days after forest_q2 complete
    if (this.flags.acorns_given >= 100 && !this.winter.active && !this.flags.frost_stone_obtained) {
      if (!this._winterCheckDay) {
        this._winterCheckDay = this.day + 3;
      } else if (this.day >= this._winterCheckDay) {
        this.winter.active = true;
        this.winter.endDay = -1; // ends when frost stone obtained
      }
    }
    if (this.winter.active && this.flags.frost_stone_obtained) {
      this.winter.active = false;
    }

    this._unlockIslandsForDay();
    return this.day;
  }

  // ── Mouse chase helpers ──

  moveMouseToFarthest() {
    const currentGrid = ISLAND_GRID[this.mouseIsland];
    if (!currentGrid) return;
    let farthest = null;
    let maxDist = 0;
    for (const id of this.unlockedIslands) {
      if (id === this.mouseIsland || id === 'turtle') continue;
      const g = ISLAND_GRID[id];
      if (!g) continue;
      const dist = Math.abs(g.col - currentGrid.col) + Math.abs(g.row - currentGrid.row);
      if (dist > maxDist) {
        maxDist = dist;
        farthest = id;
      }
    }
    if (farthest) this.mouseIsland = farthest;
  }

  // ── Pregnancy helpers ──

  startPregnancy() {
    if (!this.pregnancy.active && !this.flags.lamb_born) {
      this.pregnancy.active = true;
      this.pregnancy.day = 0;
      this.pregnancy.actionDoneToday = false;
    }
  }

  doPregnancyAction() {
    if (!this.pregnancy.active) return false;
    this.pregnancy.actionDoneToday = true;
    return true;
  }

  getPregnancyNeeded() {
    // Day 0: pet, Day 1-4: 1-4 wheat
    const d = this.pregnancy.day;
    if (d === 0) return { type: 'pet', wheat: 0 };
    return { type: 'feed', wheat: d };
  }

  // ── Quests ──

  getActiveQuests() {
    const active = [];
    for (const quest of Object.values(QUESTS)) {
      if (quest.requiresDay && quest.requiresDay > this.day) continue;
      // Island gating: support both the legacy single `island` and `islands[]`.
      // All listed islands must be unlocked (AND semantics).
      const islandIds = Array.isArray(quest.islands) && quest.islands.length
        ? quest.islands
        : (quest.island ? [quest.island] : []);
      if (!islandIds.every(id => this.isIslandUnlocked(id))) continue;
      // Prerequisite quests: all must be complete.
      if (Array.isArray(quest.requiresQuests) &&
          !quest.requiresQuests.every(qid => this.isQuestComplete(qid))) continue;
      if (this.isQuestComplete(quest.id)) continue;
      // Hidden quests only show when close to completion
      if (quest.hidden) {
        const progress = this.getQuestProgress(quest.id);
        if (!progress || progress.steps.filter(s => s.completed).length === 0) continue;
      }
      active.push(quest);
    }
    return active;
  }

  isQuestComplete(questId) {
    const quest = QUESTS[questId];
    if (!quest) return false;
    return quest.steps.every(step => step.check(this));
  }

  getQuestProgress(questId) {
    const quest = QUESTS[questId];
    if (!quest) return null;
    const steps = quest.steps.map(step => ({
      ...step,
      completed: step.check(this),
    }));
    const currentStep = steps.find(s => !s.completed) || steps[steps.length - 1];
    return { quest, steps, currentStep, allComplete: steps.every(s => s.completed) };
  }

  canEndDay() {
    if (this.day === 1) return this.flags.fire_lit;
    if (this.day === 2) return this.isQuestComplete('wheat_q1') || this.flags.planted_seeds;
    return true;
  }

  // ── Save / Load ──

  serialize() {
    // Convert Sets to arrays for JSON
    const flags = { ...this.flags };
    flags.sheep_shorn = [...(flags.sheep_shorn || [])];

    return JSON.stringify({
      day: this.day,
      inventory: { ...this.inventory },
      unlockedIslands: [...this.unlockedIslands],
      completedRecipes: [...this.completedRecipes],
      flags,
      _totalCollected: { ...this._totalCollected },
      fishCaughtToday: this.fishCaughtToday,
      _choiceGroupPicks: this._choiceGroupPicks,
      day3choice: this.day3choice,
      day4choice: this.day4choice,
      pregnancy: { ...this.pregnancy },
      mouseIsland: this.mouseIsland,
      winter: { ...this.winter },
      _winterCheckDay: this._winterCheckDay,
      dailyQuests: { ...this.dailyQuests },
    });
  }

  deserialize(json) {
    try {
      const data = JSON.parse(json);
      this.day = data.day || 1;
      this.inventory = data.inventory || {};
      this.unlockedIslands = new Set(data.unlockedIslands || []);
      this.completedRecipes = new Set(data.completedRecipes || []);
      this._totalCollected = data._totalCollected || {};
      this.fishCaughtToday = data.fishCaughtToday || 0;
      this._choiceGroupPicks = data._choiceGroupPicks || this._choiceGroupPicks;
      this.day3choice = data.day3choice || this.day3choice;
      this.day4choice = data.day4choice || this.day4choice;
      this.pregnancy = data.pregnancy || { active: false, day: 0, actionDoneToday: false };
      this.mouseIsland = data.mouseIsland || 'bakery';
      this.winter = data.winter || { active: false, endDay: -1 };
      this._winterCheckDay = data._winterCheckDay;
      this.dailyQuests = data.dailyQuests || {};

      // Restore flags with Set conversion
      const flags = data.flags || {};
      flags.sheep_shorn = new Set(flags.sheep_shorn || []);
      this.flags = { ...this.flags, ...flags };

      return true;
    } catch (e) {
      console.warn('Failed to load save:', e);
      return false;
    }
  }

  static SAVE_KEY = 'fishing_for_islands_save';

  save() {
    try {
      localStorage.setItem(GameState.SAVE_KEY, this.serialize());
    } catch (e) {
      console.warn('Failed to save:', e);
    }
  }

  static loadFromStorage() {
    try {
      const json = localStorage.getItem(GameState.SAVE_KEY);
      if (!json) return null;
      const state = new GameState();
      if (state.deserialize(json)) return state;
    } catch (e) {
      console.warn('Failed to load save:', e);
    }
    return null;
  }

  static clearSave() {
    localStorage.removeItem(GameState.SAVE_KEY);
  }
}
