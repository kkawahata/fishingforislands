// localStorage-backed override layer for QUESTS. The Quest Editor can save
// the current model here; on next page load, data.js merges the override
// over the base QUESTS export so the game sees the edits without a rebuild.
//
// Full-replacement semantics: if an override exists, it is treated as the
// complete quest set. Clearing the override restores the code-defined base.
// A schemaVersion lets us invalidate stale overrides in the future.

export const QUEST_OVERRIDE_KEY = 'fishing_quests_override_v1';
export const QUEST_OVERRIDE_SCHEMA_VERSION = 1;

export function hasOverride() {
  try {
    return !!(typeof localStorage !== 'undefined' && localStorage.getItem(QUEST_OVERRIDE_KEY));
  } catch {
    return false;
  }
}

export function loadOverride() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(QUEST_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== QUEST_OVERRIDE_SCHEMA_VERSION) {
      console.warn('[quests-override] schemaVersion mismatch, discarding');
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[quests-override] load failed:', err);
    return null;
  }
}

export function saveOverride(questsObj) {
  const payload = {
    schemaVersion: QUEST_OVERRIDE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    quests: questsObj,
  };
  localStorage.setItem(QUEST_OVERRIDE_KEY, JSON.stringify(payload));
}

export function clearOverride() {
  localStorage.removeItem(QUEST_OVERRIDE_KEY);
}

// Mutate `baseQuests` in place so `export const QUESTS = {...}` bindings
// stay stable. When an override is active, existing keys are deleted and
// replaced with the override's quests; when not, nothing changes.
export function applyOverrideInPlace(baseQuests) {
  const payload = loadOverride();
  if (!payload || !payload.quests) return false;
  for (const id of Object.keys(baseQuests)) delete baseQuests[id];
  for (const [id, q] of Object.entries(payload.quests)) {
    baseQuests[id] = reconstituteQuest(q);
  }
  return true;
}

// Override payloads carry step.check as source text (the editor stores it
// as a string so it can be edited in a textarea). Turn those strings back
// into live predicate functions. The fallback is a safe always-false check
// so a malformed string just stalls the step instead of crashing the game.
function reconstituteQuest(q) {
  const result = { ...q };
  if (Array.isArray(q.steps)) {
    result.steps = q.steps.map(s => ({
      ...s,
      check: typeof s.check === 'string' ? compileCheck(s.check) : s.check,
    }));
  }
  // Keep legacy handlers happy: they read `quest.island`.
  if (Array.isArray(q.islands) && q.islands.length && !q.island) {
    result.island = q.islands[0];
  }
  return result;
}

function compileCheck(src) {
  try {
    return new Function(`return (${src});`)();
  } catch (err) {
    console.warn('[quests-override] compile failed for:', src, err);
    return () => false;
  }
}
