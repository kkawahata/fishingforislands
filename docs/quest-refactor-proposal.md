# Quest refactor proposal

Inventory of quest-adjacent information currently scattered across the
codebase, and a recommendation on how to consolidate it into the quests
themselves.

## Inventory — what is *not* on the quest today

### 1. Dialogue
`DIALOGUES` in `data.js` holds 30+ keyed arrays. Many of them map 1:1 to
a quest moment but live outside the quest object:

| Dialogue key | Belongs to |
|---|---|
| `fire_lit` | `home_q1` completion |
| `wheat_harvest` | `wheat_q3` first harvest |
| `cooking_lesson` | `pier_q2` cooking step |
| `mouse_catch`, `mouse_final`, `mouse_cellar` | `bakery_q1` / `bakery_q3` |
| `ashley_first`, `squirrel_acorns` | `forest_q1` / `forest_q2` |
| `seals_dance`, `dinner_scene` | `rocks_q1`, `bakery_q2` |
| `miner_first`, `mountain_climb` | `mine_q1`, `mystery_q1` |
| `pierre_first`, `mermaid_first`, `faerie_first`, `auctioneer_first`, `raven_first`, `timmy_first`, `sally_first`, `maria_first`, `old_man_first`, `dog_first` | all are "first meeting" lines, each ties to a specific quest |
| `turtle_start`, `turtle_day2…`, `turtle_generic` | shared (end-of-day), not per-quest |

Roughly **~22 of ~29 DIALOGUES keys** are quest-owned. The remaining 7
(turtle daily lines, generic NPC chatter, cooking_lesson shared reuse)
are truly shared.

### 2. Rewards
No quest declares its rewards today. Stones, coins, and items are
awarded inline inside handler functions:

- `_handleSquirrel` → `addItem('frost_stone', 1)` when the snowman
  quest completes.
- `_handleMouse` → `addItem('flame_stone', 1)` on cellar opening.
- `_handleTimmy` → `addItem('shadow_stone', 1)` for 3 golden trout.
- `_handleMountain` → `addItem('silent_stone', 1)` on first climb.
- `_handleMermaid`/`_handleFaerie` → stone + flag set.
- `_handleMiner` → `addItem('coins', 20)` on first mine run.
- `_handleOldMan` → `addItem('old_mans_line', 1)`; `_handleSally` →
  `addItem('shears', 1)`; etc.

### 3. Flags as hidden quest state
`gameState.flags` is a flat bag of ~60 fields. A large chunk exists
only because one quest needs to track progress:

- Counters that could be quest-local: `mouse_catches`, `theodore_day`,
  `rocks_q2_day`, `acorns_given`, `raven_tour_count`, `beds_crafted`.
- One-shot markers: `met_sally`, `met_maria`, `met_pierre`, `met_ashley`,
  `met_timmy`, `met_raven`, `met_merchants`, etc. — each is a first-
  meeting flag driven by a specific quest's `meet_xxx` step.
- Stone markers: `flame_stone_obtained`, `frost_stone_obtained`,
  `shadow_stone_obtained` duplicate the inventory (`hasItem('flame_stone')`).

### 4. Handler dispatch
NPC-handler functions in `Game.js` mix three kinds of logic:
- **Generic NPC dialogue** (first meeting, ambient chatter)
- **Quest-specific branches** that inspect flags and decide what to do
- **Rewards + flag mutations** that belong to a quest's completion

Handlers currently: `_handleDog`, `_handleSally`, `_handleMaria`,
`_handleOldMan`, `_handlePierre`, `_handleAshley`, `_handleSquirrel`,
`_handleTimmy`, `_handleRaven`, `_handleAlvin`, `_handleSimon`,
`_handleTheodore`, `_handleMermaid`, `_handleFaerie`, `_handleAuctioneer`,
`_handleMiner`, `_handleMountain`, `_handleMouse`. Every one of them
embeds quest-specific branching.

### 5. NPC → quest binding
`ISLANDS[id].npcs[]` defines NPC placement and an `interaction` name
that maps to a handler. There's no explicit "this NPC serves quest X"
link — the link is implicit in the handler's if-ladder over flags.

### 6. Day / island gating duplication
`ISLAND_UNLOCK_RULES` gates islands by day. `quest.requiresDay` gates
quests by day. These often align (e.g. mermaid_cove unlocks day 6 and
`mermaid_q1` requires day 6). No structural link between them today.

### 7. Seasonal / chain state
Winter is a gameplay phase (`gameState.winter`) that gates `forest_q3`
and alters `_handleSquirrel`. The pregnancy state machine
(`gameState.pregnancy`) is purely `sheep_q3`'s state but lives as its
own top-level subsystem. Both would benefit from being owned by their
driving quest.

### 8. Meta-quests
`mystery_q2` (gather 5 stones) reads its step state entirely from
inventory. `rocks_q3` is hidden and gated on `shadow_stone_obtained`.
These don't expose their chain relationship to the system — they're
just check functions that happen to inspect other quests' fruits.

## Recommendation

Three levels of refactor, in increasing scope. I recommend **Option B**.

### Option A — Data-only enrichment (safe, minimal)
Extend the quest schema with optional fields; leave handlers alone.
- Add `dialogue: { onStart, onComplete }` — either inline arrays or
  string refs into `DIALOGUES`.
- Add `rewards: { item: count }`, displayed in tooltips and awarded on
  completion via a generic `_applyQuestCompletion` helper.
- Add `npcs: [id,...]` — pure metadata, consumed by the editor for
  cross-navigation.

Effort: ~1 day. Risk: very low. Payoff: editor shows a complete per-
quest picture; rewards become discoverable; dialogue starts migrating
into quests without breaking existing handlers.

### Option B — Structured migration (recommended)
Do Option A, **plus**:
- Move each quest-specific `DIALOGUES` entry onto its quest as inline
  arrays. Keep the top-level `DIALOGUES` for truly shared lines
  (turtle daily, generic). A codemod pass does the bulk; handlers
  switch from `DIALOGUES.fire_lit` to `QUESTS.home_q1.dialogue.onComplete`.
- Introduce a namespaced per-quest state bucket:
  `gameState.questState[id] = {}`. Migrate counter flags
  (`mouse_catches`, `theodore_day`, etc.) into it. Keep `flags` for
  shared world state (`fire_lit`, `house_built`).
- Add a declarative `onComplete` field:
  `{ unlockIsland?: id, giveItems?: {item:count}, setFlags?: {...} }`.
  The existing handler calls `_applyQuestCompletion(quest)` once to
  fire all of these. Inline imperative code in handlers shrinks.

Effort: ~3–5 days spread across data.js, GameState.js, Game.js. Risk:
medium — save-file compatibility needs a migration for moved flags.
Payoff: the editor can drive 70–80% of quest content without code
edits. New quests can be added by editing QUESTS alone.

### Option C — Fully declarative quests
Do Option B, **plus**:
- Replace `step.check` arrow functions with structured predicates:
  `{ type: 'flag', flag: 'fire_lit' }`,
  `{ type: 'hasItem', item: 'axe', count: 1 }`,
  `{ type: 'totalCollected', item: 'logs', count: 5 }`,
  `{ type: 'all', of: [...] }`. Quest data becomes pure JSON.
- Handlers become generic dispatchers keyed by `npc.interaction` +
  quest state. Pregnancy, Theodore's daily requests, mouse chasing
  — all become declarative quest state machines.

Effort: ~2–3 weeks. Risk: high, touches almost everything. Payoff:
quest data is persistable as plain JSON, the editor becomes a full
designer tool, and a scripting language is no longer necessary for
new content.

## My pick: **Option B**

It delivers on the stated goal ("each quest contains all of its
associated information") for the two most concrete pain points —
dialogue and rewards — without rewriting the game engine. It also
gets us a migration template for any future step toward Option C,
without committing to the full rewrite up front.

## Suggested phased rollout for Option B

1. **v0.3.0 (minor bump — this is structural).** Dialogue + rewards
   migration. Quests gain `dialogue.onStart`, `dialogue.onComplete`,
   `rewards`. Handlers switch to reading from the quest. All tests
   via playtest through day 9.
2. **v0.3.1.** Per-quest state bucket. Counter flags migrate.
   Save-file migration on load.
3. **v0.3.2.** Declarative `onComplete` effects. Inline reward and
   unlock code removed from handlers.
4. **v0.4.0.** (Optional, later.) Begin Option C — structured step
   predicates. Enables JSON round-trip in the editor.
