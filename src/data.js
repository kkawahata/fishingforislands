// ── Resource definitions ──
export const RESOURCES = {
  driftwood:  { name: 'Driftwood',  icon: '🪵', color: 0x8b6914 },
  seaweed:    { name: 'Seaweed',    icon: '🌿', color: 0x2d8b3c },
  sticks:     { name: 'Sticks',     icon: '🥢', color: 0xa0822a },
  water:      { name: 'Water',      icon: '💧', color: 0x4a90d9 },
  seeds:      { name: 'Seeds',      icon: '🌱', color: 0x7ec850 },
  wheat:      { name: 'Wheat',      icon: '🌾', color: 0xdaa520 },
  wool:       { name: 'Wool',       icon: '🧶', color: 0xf0ead6 },
  fish:       { name: 'Fish',       icon: '🐟', color: 0x6a9fd8 },
  bread:      { name: 'Bread',      icon: '🍞', color: 0xd4a860 },
  axe:        { name: 'Axe',        icon: '🪓', color: 0x808080 },
  shovel:     { name: 'Shovel',     icon: '⛏️', color: 0x808080 },
  fishing_rod:{ name: 'Fishing Rod',icon: '🎣', color: 0x8b6914 },
  broken_spade:{ name:'Broken Spade',icon:'🔧', color: 0x666666 },
  magic_wand: { name: 'Magic Wand', icon: '✨', color: 0xc080ff },
  old_mans_line:{ name:"Old Man's Line", icon:'🧵', color: 0xcccccc },
  shears:     { name: 'Shears',     icon: '✂️', color: 0xaaaaaa },
  hammer:     { name: 'Hammer & Nails', icon: '🔨', color: 0x808080 },
  bed:        { name: 'Bed',        icon: '🛏️', color: 0x8b6914 },
  strange_stick:{ name:'Strange Stick',icon:'🪄', color: 0x9a6aff },
  firm_wood:  { name: 'Firm Wood',  icon: '🪵', color: 0x6b4226 },
  logs:       { name: 'Logs',       icon: '🪵', color: 0x5a3d1a },
  acorns:     { name: 'Acorns',     icon: '🌰', color: 0x8b6914 },
  grain:      { name: 'Grain',      icon: '🌾', color: 0xc8a84a },
  coins:      { name: 'Coins',      icon: '🪙', color: 0xffd700 },
  pristine_shell:{ name:'Pristine Shell',icon:'🐚', color: 0xfff0e0 },
  pearls:     { name: 'Pearls',     icon: '💎', color: 0xf0f0ff },
  pearl_necklace:{ name:'Pearl Necklace',icon:'📿', color: 0xf0f0ff },
  halibut:    { name: 'Halibut',    icon: '🐟', color: 0x6a9fd8 },
  herring:    { name: 'Herring',    icon: '🐟', color: 0x5888bb },
  snapper:    { name: 'Snapper',    icon: '🐟', color: 0xd46a6a },
  tuna:       { name: 'Tuna',       icon: '🐟', color: 0x4a7a9a },
  flounder:   { name: 'Flounder',   icon: '🐟', color: 0x8a8a6a },
  golden_trout:{ name:'Golden Trout',icon: '🐠', color: 0xffd700 },
  flame_stone:{ name: 'Flame Stone',icon: '🔥', color: 0xff4400 },
  frost_stone:{ name: 'Frost Stone',icon: '❄️', color: 0x66ccff },
  shadow_stone:{ name:'Shadow Stone',icon: '🌑', color: 0x333355 },
  mermaid_stone:{ name:'Mermaid Stone',icon:'🧜', color: 0x44aacc },
  faerie_stone:{ name:'Faerie Stone',icon: '🧚', color: 0xaaffaa },
  silent_stone:{ name:'Silent Stone',icon: '🔇', color: 0x888888 },
};

// ── Fish type system ──
export const FISH_TYPES = {
  halibut:      { name: 'Halibut',      baseChance: 0.33 },
  herring:      { name: 'Herring',      baseChance: 0.33 },
  snapper:      { name: 'Snapper',      baseChance: 0.20, oddDaysOnly: true },
  tuna:         { name: 'Tuna',         baseChance: 0.20, evenDaysOnly: true },
  flounder:     { name: 'Flounder',     baseChance: 0.12, divisibleBy3Chance: 0.08 },
  golden_trout: { name: 'Golden Trout', baseChance: 0.02, divisibleBy3Chance: 0.06 },
};
export const MAX_FISH_PER_DAY = 10;
export const ALL_FISH_IDS = Object.keys(FISH_TYPES);

// ── Crafting recipes ──
export const RECIPES = [
  {
    id: 'sticks_from_driftwood',
    name: 'Break Driftwood',
    description: 'Split driftwood into sticks',
    inputs: { driftwood: 1 },
    outputs: { sticks: 5 },
    oneTime: true,
    requiresTool: 'axe',
    station: 'big_rock',
  },
  {
    id: 'crafting_table',
    name: 'Build Crafting Table',
    description: 'A proper crafting surface',
    inputs: { driftwood: 3 },
    outputs: {},
    oneTime: true,
    special: 'unlock_crafting_table',
    station: 'big_rock',
  },
  {
    id: 'shovel',
    name: 'Craft Shovel',
    description: 'Repair the broken spade',
    inputs: { broken_spade: 1, sticks: 2, seaweed: 3 },
    outputs: { shovel: 1 },
    oneTime: true,
    station: 'crafting_table',
  },
  {
    id: 'repair_axe',
    name: 'Repair Axe',
    description: 'Fix your broken axe',
    inputs: { sticks: 2, seaweed: 3 },
    outputs: { axe: 1 },
    oneTime: true,
    station: 'crafting_table',
  },
  {
    id: 'fishing_rod',
    name: 'Craft Fishing Rod',
    description: 'A crude but functional rod',
    inputs: { sticks: 4, seaweed: 1, old_mans_line: 1 },
    outputs: { fishing_rod: 1 },
    oneTime: true,
    station: 'crafting_table',
  },
  {
    id: 'bed',
    name: 'Craft Bed',
    description: 'Somewhere to rest your head',
    inputs: { driftwood: 3, wool: 3 },
    outputs: { bed: 1 },
    station: 'crafting_table',
  },
  {
    id: 'sticks_to_driftwood',
    name: 'Combine Sticks',
    description: 'Magic wand binds sticks into driftwood',
    inputs: { sticks: 5 },
    outputs: { driftwood: 1 },
    requiresTool: 'magic_wand',
    station: 'crafting_table',
  },
  {
    id: 'driftwood_to_firm_wood',
    name: 'Harden Wood',
    description: 'Magic wand transforms driftwood into firm wood',
    inputs: { driftwood: 2 },
    outputs: { firm_wood: 1 },
    requiresTool: 'magic_wand',
    station: 'crafting_table',
  },
  {
    id: 'firm_wood_to_driftwood',
    name: 'Soften Wood',
    description: 'Magic wand reverses hardened wood',
    inputs: { firm_wood: 1 },
    outputs: { driftwood: 2 },
    requiresTool: 'magic_wand',
    station: 'crafting_table',
  },
  {
    id: 'log_to_firm_wood',
    name: 'Mill Log',
    description: 'Cut a log into firm wood planks',
    inputs: { logs: 1 },
    outputs: { firm_wood: 3 },
    station: 'logging_camp',
  },
  {
    id: 'bread',
    name: 'Bake Bread',
    description: 'A warm loaf of bread',
    inputs: { wheat: 1, water: 1, firm_wood: 1 },
    outputs: { bread: 1 },
    station: 'oven',
  },
  {
    id: 'wheat_to_grain',
    name: 'Mill Wheat',
    description: 'Grind wheat into fine grain',
    inputs: { wheat: 1 },
    outputs: { grain: 3 },
    station: 'granary',
  },
];

// ── Island grid positions (col, row) from the spec flowchart ──
// All islands are size=8 on a uniform ISLAND_SPACING grid, so neighbors
// share edges exactly. The turtle is not an island — it floats at sea,
// reached by a dock extending from home.
export const ISLAND_SPACING = 8;

// Dock/turtle geometry (fixed — the turtle has no island to anchor to).
const DOCK_LENGTH = 4;
const DOCK_WIDTH = 1.2;
const DOCK_OVERLAP = 1; // how far the plank extends inside home
export const TURTLE_SCALE = 4;
const TURTLE_HEAD_LOCAL_X = 2.2; // head offset within the unscaled group
const TURTLE_HEAD_DOCK_GAP = 1;  // head center sits this far west of dock tip

export function getIslandWorldPos(islandId) {
  const g = ISLAND_GRID[islandId];
  if (!g) return { x: 0, y: 0, z: 0 };
  return {
    x: g.col * ISLAND_SPACING + (g.xOffset || 0),
    y: 0,
    z: g.row * ISLAND_SPACING + (g.zOffset || 0),
  };
}

// Axis-aligned walkable band for the dock. Shared between World rendering
// and Player walkability so they can't drift.
export function getTurtleBridgeBand() {
  const home = getIslandWorldPos('home');
  const homeSize = ISLANDS.home.size;
  const eastEdge = home.x - homeSize / 2 + DOCK_OVERLAP;
  const westEdge = eastEdge - DOCK_LENGTH;
  const halfWidth = DOCK_WIDTH / 2;
  return {
    minX: westEdge,
    maxX: eastEdge,
    minZ: home.z - halfWidth,
    maxZ: home.z + halfWidth,
  };
}

// Where the turtle's body sits in the water, west of the dock. The body
// is positioned so the (scaled) head lands just off the dock tip.
export function getTurtleBodyPos() {
  const band = getTurtleBridgeBand();
  return {
    x: band.minX - TURTLE_HEAD_DOCK_GAP - TURTLE_HEAD_LOCAL_X * TURTLE_SCALE,
    y: 0.3,
    z: (band.minZ + band.maxZ) / 2,
  };
}

export const ISLAND_GRID = {
  home:          { col: 1, row: 2 },
  wheat_farm:    { col: 2, row: 2 },
  fishing_pier:  { col: 1, row: 3 },
  sheep_pasture: { col: 2, row: 3 },
  bakery:        { col: 2, row: 1 },
  granary:       { col: 1, row: 1 },
  dense_forest:  { col: 3, row: 2 },
  market_square: { col: 3, row: 1 },
  auction_house: { col: 2, row: 0 },
  rocks:         { col: 1, row: 4 },
  mermaid_cove:  { col: 2, row: 4 },
  faerie_woods:  { col: 3, row: 3 },
  gold_mine:     { col: 3, row: 4 },
  mount_mystery: { col: 4, row: 4 },
};

// ── Island definitions ──
export const ISLANDS = {
  home: {
    id: 'home',
    name: 'Your Home',
    tier: 1,
    size: 8,
    groundColor: 0x6db84a,
    objects: [
      { id: 'well', name: 'Well', x: 5, z: 2, color: 0x606060, shape: 'well', interaction: 'well' },
      { id: 'fire_pit', name: 'Fire Pit', x: 3, z: 5, color: 0x555555, shape: 'fire_pit', interaction: 'fire_pit' },
      { id: 'big_rock', name: 'Big Rock', x: 6, z: 5, color: 0x8a8a8a, shape: 'rock', interaction: 'crafting', station: 'big_rock' },
      { id: 'axe_pickup', name: 'Axe', x: 6, z: 4, color: 0x808080, shape: 'item', interaction: 'pickup', resource: 'axe', oneTime: true },
    ],
    npcs: [],
    dailyResources: [
      { resource: 'driftwood', count: 4, zone: 'beach' },
      { resource: 'seaweed', countMin: 4, countMax: 8, zone: 'beach' },
    ],
  },

  wheat_farm: {
    id: 'wheat_farm',
    name: 'Wheat Farm',
    tier: 1,
    size: 8,
    groundColor: 0x8aba5a,
    objects: [
      { id: 'wheat_field', name: 'Wheat Field', x: 3, z: 3, color: 0xb89a30, shape: 'field', interaction: 'wheat_field', width: 4, height: 3 },
    ],
    npcs: [
      { id: 'dog', name: 'Dog', x: 5, z: 6, color: 0xb07040, shape: 'dog', interaction: 'dog' },
    ],
    dailyResources: [],
  },

  sheep_pasture: {
    id: 'sheep_pasture',
    name: 'Sheep Pasture',
    tier: 1,
    size: 8,
    groundColor: 0x7ec850,
    objects: [
      { id: 'sally_hut', name: "Sally's Hut", x: 6, z: 1, color: 0x8b6914, shape: 'hut' },
    ],
    npcs: [
      { id: 'sally', name: 'Sally', x: 5, z: 2, color: 0xd88a8a, shape: 'person', interaction: 'sally' },
      { id: 'sheep1', name: 'Sheep', x: 2, z: 3, color: 0xf0ead6, shape: 'sheep' },
      { id: 'sheep2', name: 'Sheep', x: 4, z: 4, color: 0xf0ead6, shape: 'sheep' },
      { id: 'sheep3', name: 'Sheep', x: 3, z: 5, color: 0xf0ead6, shape: 'sheep' },
      { id: 'sheep4', name: 'Sheep', x: 5, z: 6, color: 0xf0ead6, shape: 'sheep' },
      { id: 'sheep5', name: 'Sheep', x: 1, z: 5, color: 0xf0ead6, shape: 'sheep' },
      { id: 'sheep6', name: 'Sheep', x: 6, z: 4, color: 0xf0ead6, shape: 'sheep' },
    ],
    dailyResources: [],
  },

  fishing_pier: {
    id: 'fishing_pier',
    name: 'Fishing Pier',
    tier: 1,
    size: 8,
    groundColor: 0x6aaa4a,
    objects: [
      { id: 'pier', name: 'Fishing Pier', x: 1, z: 4, color: 0x8b6914, shape: 'pier', interaction: 'pier' },
    ],
    npcs: [
      { id: 'maria', name: 'Maria', x: 3, z: 3, color: 0x8ab4d8, shape: 'person', interaction: 'maria' },
      { id: 'old_man', name: 'Old Man', x: 5, z: 5, color: 0x9a9a7a, shape: 'person', interaction: 'old_man' },
    ],
    dailyResources: [],
  },

  // ── Tier 2 Islands ──

  bakery: {
    id: 'bakery',
    name: 'Bakery',
    tier: 2,
    size: 8,
    groundColor: 0xc8a870,
    objects: [
      { id: 'oven', name: 'Oven', x: 3, z: 3, color: 0x8a4a2a, shape: 'oven', interaction: 'crafting', station: 'oven' },
      { id: 'flour_sack', name: 'Flour Sack', x: 5, z: 2, color: 0xf0e8d0, shape: 'sack' },
    ],
    npcs: [
      { id: 'pierre', name: 'Pierre', x: 2, z: 5, color: 0xeeccaa, shape: 'person', interaction: 'pierre' },
      { id: 'mouse', name: 'Mouse', x: 6, z: 6, color: 0x888888, shape: 'mouse', interaction: 'mouse' },
    ],
    dailyResources: [],
  },

  dense_forest: {
    id: 'dense_forest',
    name: 'Dense Forest',
    tier: 2,
    size: 8,
    groundColor: 0x3a6a2a,
    objects: [
      { id: 'logging_camp', name: 'Logging Camp', x: 2, z: 2, color: 0x6b4226, shape: 'logging_camp', interaction: 'crafting', station: 'logging_camp' },
    ],
    npcs: [
      { id: 'ashley', name: 'Ashley', x: 4, z: 3, color: 0xcc6644, shape: 'person', interaction: 'ashley' },
      { id: 'squirrel', name: 'Squirrel', x: 7, z: 5, color: 0x8b6914, shape: 'squirrel', interaction: 'squirrel' },
    ],
    dailyResources: [],
    hasTrees: true,
  },

  rocks: {
    id: 'rocks',
    name: 'Rocks',
    tier: 2,
    size: 8,
    groundColor: 0x8a8a7a,
    objects: [
      { id: 'rock_pool', name: 'Rock Pool', x: 3, z: 6, color: 0x4a90d9, shape: 'pool' },
      { id: 'rock_big1', name: 'Rock', x: 1, z: 4, color: 0x777777, shape: 'rock' },
      { id: 'rock_big2', name: 'Rock', x: 6, z: 5, color: 0x888888, shape: 'rock' },
    ],
    npcs: [
      { id: 'timmy', name: 'Timmy', x: 4, z: 2, color: 0xffaa66, shape: 'child', interaction: 'timmy' },
      { id: 'seal1', name: 'Seal', x: 1, z: 6, color: 0x666688, shape: 'seal' },
      { id: 'seal2', name: 'Seal', x: 3, z: 7, color: 0x777799, shape: 'seal' },
      { id: 'seal3', name: 'Seal', x: 5, z: 6, color: 0x666688, shape: 'seal' },
    ],
    dailyResources: [],
  },

  // ── Tier 2 cont. + Stubs ──

  granary: {
    id: 'granary',
    name: 'Granary',
    tier: 2,
    size: 8,
    groundColor: 0x9a8a5a,
    objects: [
      { id: 'windmill', name: 'Granary Mill', x: 3, z: 3, color: 0x8b7d5a, shape: 'windmill', interaction: 'crafting', station: 'granary' },
    ],
    npcs: [
      { id: 'raven', name: 'Raven', x: 5, z: 5, color: 0x4a2a4a, shape: 'person', interaction: 'raven' },
      { id: 'crow', name: 'Crow', x: 6, z: 2, color: 0x222222, shape: 'crow' },
    ],
    dailyResources: [],
  },

  market_square: {
    id: 'market_square',
    name: 'Market Square',
    tier: 2,
    size: 8,
    groundColor: 0xc8b080,
    objects: [
      { id: 'market_stall', name: 'Market Stall', x: 4, z: 3, color: 0xaa4444, shape: 'stall' },
    ],
    npcs: [
      { id: 'alvin', name: 'Alvin', x: 2, z: 4, color: 0x44aa44, shape: 'person', interaction: 'alvin' },
      { id: 'simon', name: 'Simon', x: 4, z: 5, color: 0x4444aa, shape: 'person', interaction: 'simon' },
      { id: 'theodore', name: 'Theodore', x: 6, z: 4, color: 0xaaaa44, shape: 'person', interaction: 'theodore' },
    ],
    dailyResources: [],
  },

  mermaid_cove: {
    id: 'mermaid_cove',
    name: 'Mermaid Cove',
    tier: 2,
    size: 8,
    groundColor: 0x5a9aaa,
    objects: [
      { id: 'altar_south', name: 'Southern Altar', x: 3, z: 6, color: 0x6a8aaa, shape: 'altar' },
    ],
    npcs: [
      { id: 'mermaid', name: 'Mermaid', x: 4, z: 3, color: 0x44cccc, shape: 'person', interaction: 'mermaid' },
    ],
    dailyResources: [],
  },

  faerie_woods: {
    id: 'faerie_woods',
    name: 'Faerie Woods',
    tier: 2,
    size: 8,
    groundColor: 0x4aaa6a,
    objects: [
      { id: 'faerie_portal', name: 'Faerie Portal', x: 4, z: 5, color: 0xaaffaa, shape: 'portal' },
    ],
    npcs: [
      { id: 'faerie', name: 'Faerie', x: 3, z: 3, color: 0xaaffaa, shape: 'child', interaction: 'faerie' },
    ],
    dailyResources: [],
  },

  auction_house: {
    id: 'auction_house',
    name: 'Auction House',
    tier: 2,
    size: 8,
    groundColor: 0xb8a070,
    objects: [
      { id: 'auction_podium', name: 'Auction Podium', x: 4, z: 3, color: 0x8b6914, shape: 'hut' },
    ],
    npcs: [
      { id: 'auctioneer', name: 'Auctioneer', x: 4, z: 5, color: 0xaa6644, shape: 'person', interaction: 'auctioneer' },
    ],
    dailyResources: [],
  },

  gold_mine: {
    id: 'gold_mine',
    name: 'Gold Mine',
    tier: 2,
    size: 8,
    groundColor: 0x7a6a4a,
    objects: [
      { id: 'mine_entrance', name: 'Mine Entrance', x: 4, z: 5, color: 0x555555, shape: 'rock' },
    ],
    npcs: [
      { id: 'miner', name: 'Miner', x: 3, z: 3, color: 0x886644, shape: 'person', interaction: 'miner' },
    ],
    dailyResources: [],
  },

  mount_mystery: {
    id: 'mount_mystery',
    name: 'Mount Mystery',
    tier: 2,
    size: 8,
    groundColor: 0x8888aa,
    objects: [
      { id: 'mountain_peak', name: 'Mountain Peak', x: 5, z: 3, color: 0x999999, shape: 'mountain', interaction: 'mountain' },
    ],
    npcs: [],
    dailyResources: [],
  },
};

// ── Quest definitions ──
export const QUESTS = {
  // Your Home quests
  home_q1: {
    id: 'home_q1',
    island: 'home',
    name: 'Start a Fire',
    description: 'Use the axe on driftwood at the Big Rock to make sticks, then light the fire pit',
    steps: [
      { id: 'pick_axe', text: 'Pick up the Axe', check: (gs) => gs.flags.picked_axe },
      { id: 'collect_driftwood', text: 'Collect Driftwood (1)', check: (gs) => gs.inventory.driftwood >= 1 || gs.flags.made_sticks },
      { id: 'make_sticks', text: 'Make Sticks at the Big Rock', check: (gs) => gs.flags.made_sticks },
      { id: 'collect_more_driftwood', text: 'Collect more Driftwood (2)', check: (gs) => gs.inventory.driftwood >= 2 || gs.flags.fire_lit },
      { id: 'light_fire', text: 'Light the Fire (2 Sticks + 2 Driftwood)', check: (gs) => gs.flags.fire_lit },
    ],
    completesDay: true,
  },
  home_q2: {
    id: 'home_q2',
    island: 'home',
    name: 'Make a Crafting Table',
    description: 'Build a proper crafting table from driftwood',
    steps: [
      { id: 'gather_driftwood', text: 'Gather 3 Driftwood', check: (gs) => gs.inventory.driftwood >= 3 || gs.flags.has_crafting_table },
      { id: 'build_table', text: 'Build Crafting Table at the Big Rock', check: (gs) => gs.flags.has_crafting_table },
    ],
    requiresDay: 2,
  },
  wheat_q1: {
    id: 'wheat_q1',
    island: 'wheat_farm',
    name: 'Play with Dog & Plant Seeds',
    description: 'Throw a stick to the Dog and plant wheat seeds',
    steps: [
      { id: 'throw_stick', text: 'Throw a Stick to the Dog', check: (gs) => gs.flags.threw_stick },
      { id: 'craft_shovel', text: 'Craft Shovel (Broken Spade + 2 Sticks + 3 Seaweed)', check: (gs) => gs.hasItem('shovel') },
      { id: 'dig_seeds', text: 'Dig for seeds on the Wheat Farm', check: (gs) => gs.flags.found_seeds },
      { id: 'plant_seeds', text: 'Plant seeds and water them', check: (gs) => gs.flags.planted_seeds },
    ],
    completesDay: true,
    requiresDay: 2,
  },
  sheep_q1: {
    id: 'sheep_q1',
    island: 'sheep_pasture',
    name: 'Make Beds for You and Sally',
    description: 'Shear sheep and craft beds',
    steps: [
      { id: 'meet_sally', text: 'Meet Sally', check: (gs) => gs.flags.met_sally },
      { id: 'get_shears', text: 'Get Shears from Sally', check: (gs) => gs.hasItem('shears') },
      { id: 'shear_sheep', text: 'Shear 6 Sheep (Wool: 6)', check: (gs) => gs.totalCollected('wool') >= 6 },
      { id: 'craft_beds', text: 'Craft 2 Beds (3 Driftwood + 3 Wool each)', check: (gs) => gs.flags.beds_crafted >= 2 },
    ],
    completesDay: true,
    requiresDay: 3,
  },
  pier_q1: {
    id: 'pier_q1',
    island: 'fishing_pier',
    name: 'Learn to Fish',
    description: 'Meet Maria and the Old Man, build a fishing rod',
    steps: [
      { id: 'meet_maria', text: 'Meet Maria', check: (gs) => gs.flags.met_maria },
      { id: 'get_line', text: "Get the Old Man's Line", check: (gs) => gs.hasItem('old_mans_line') },
      { id: 'craft_rod', text: 'Craft Fishing Rod (4 Sticks + 1 Seaweed + Line)', check: (gs) => gs.hasItem('fishing_rod') },
      { id: 'catch_fish', text: 'Catch 5 Fish', check: (gs) => gs.totalFishCollected() >= 5 },
      { id: 'share_meal', text: 'Share a meal with everyone', check: (gs) => gs.flags.shared_meal },
    ],
    completesDay: true,
    requiresDay: 3,
  },

  // ── New Tier 1 quests ──
  home_q3: {
    id: 'home_q3',
    island: 'home',
    name: 'Make a Fishing Rod',
    description: 'Craft a fishing rod at the crafting table',
    steps: [
      { id: 'craft_rod', text: 'Craft a Fishing Rod', check: (gs) => gs.hasItem('fishing_rod') },
    ],
    requiresDay: 3,
  },
  home_q4: {
    id: 'home_q4',
    island: 'home',
    name: 'Make a Bed',
    description: 'Craft a bed for yourself',
    steps: [
      { id: 'craft_bed', text: 'Craft a Bed', check: (gs) => gs.flags.beds_crafted >= 1 },
    ],
    requiresDay: 3,
  },
  home_q5: {
    id: 'home_q5',
    island: 'home',
    name: 'Make Your House',
    description: 'Build a real house with firm wood',
    steps: [
      { id: 'gather_wood', text: 'Gather 30 Firm Wood', check: (gs) => gs.hasItem('firm_wood', 30) || gs.flags.house_built },
      { id: 'get_hammer', text: 'Have Hammer & Nails', check: (gs) => gs.hasItem('hammer') || gs.flags.house_built },
      { id: 'build_house', text: 'Build Your House', check: (gs) => gs.flags.house_built },
    ],
    requiresDay: 5,
  },
  wheat_q2: {
    id: 'wheat_q2',
    island: 'wheat_farm',
    name: 'Find the Magic Wand',
    description: 'Play fetch again — the Dog finds something strange',
    steps: [
      { id: 'throw_stick_2', text: 'Throw another Stick to the Dog', check: (gs) => gs.flags.found_strange_stick },
      { id: 'show_sally', text: 'Show the Strange Stick to Sally', check: (gs) => gs.hasItem('magic_wand') },
    ],
    requiresDay: 3,
  },
  wheat_q3: {
    id: 'wheat_q3',
    island: 'wheat_farm',
    name: 'Harvest the Wheat',
    description: 'Your wheat is finally ready to harvest!',
    steps: [
      { id: 'harvest', text: 'Harvest the Wheat', check: (gs) => gs.flags.first_harvest_done },
    ],
    requiresDay: 5,
  },
  sheep_q2: {
    id: 'sheep_q2',
    island: 'sheep_pasture',
    name: 'Build a Fence',
    description: 'The sheep scattered! Get a hammer and build a fence.',
    steps: [
      { id: 'get_hammer', text: 'Get Hammer & Nails from the Pier', check: (gs) => gs.hasItem('hammer') },
      { id: 'get_firm_wood', text: 'Get 3 Firm Wood', check: (gs) => gs.hasItem('firm_wood', 3) || gs.flags.fence_built },
      { id: 'build_fence', text: 'Build the Fence on Sheep Pasture', check: (gs) => gs.flags.fence_built },
      { id: 'herd_sheep', text: 'Herd all sheep with Dog', check: (gs) => gs.flags.sheep_herded },
    ],
    requiresDay: 4,
  },
  sheep_q3: {
    id: 'sheep_q3',
    island: 'sheep_pasture',
    name: 'Adding a Lamb',
    description: 'One of the sheep is expecting! Care for her over several days.',
    steps: [
      { id: 'day0', text: 'Pet the pregnant Sheep', check: (gs) => gs.pregnancy.day >= 1 || gs.flags.lamb_born },
      { id: 'day1', text: 'Bring 1 Wheat', check: (gs) => gs.pregnancy.day >= 2 || gs.flags.lamb_born },
      { id: 'day2', text: 'Bring 2 Wheat', check: (gs) => gs.pregnancy.day >= 3 || gs.flags.lamb_born },
      { id: 'day3', text: 'Bring 3 Wheat', check: (gs) => gs.pregnancy.day >= 4 || gs.flags.lamb_born },
      { id: 'day4', text: 'Bring 4 Wheat', check: (gs) => gs.pregnancy.day >= 5 || gs.flags.lamb_born },
      { id: 'lamb', text: 'Welcome the new lamb!', check: (gs) => gs.flags.lamb_born },
    ],
    requiresDay: 5,
  },
  pier_q2: {
    id: 'pier_q2',
    island: 'fishing_pier',
    name: 'Learn to Cook',
    description: 'Maria teaches you to cook fish over the fire',
    steps: [
      { id: 'catch_3', text: 'Catch 3 Fish', check: (gs) => gs.totalFishCollected() >= 8 },
      { id: 'cook', text: 'Cook Fish at the Fire Pit', check: (gs) => gs.flags.cooked_fish },
    ],
    requiresDay: 4,
  },
  pier_q3: {
    id: 'pier_q3',
    island: 'fishing_pier',
    name: 'Fishing Catalogue',
    description: 'Catch one of every type of fish',
    steps: [
      { id: 'halibut', text: 'Catch a Halibut', check: (gs) => gs.totalCollected('halibut') >= 1 },
      { id: 'herring', text: 'Catch a Herring', check: (gs) => gs.totalCollected('herring') >= 1 },
      { id: 'snapper', text: 'Catch a Snapper (odd days)', check: (gs) => gs.totalCollected('snapper') >= 1 },
      { id: 'tuna', text: 'Catch a Tuna (even days)', check: (gs) => gs.totalCollected('tuna') >= 1 },
      { id: 'flounder', text: 'Catch a Flounder', check: (gs) => gs.totalCollected('flounder') >= 1 },
      { id: 'golden_trout', text: 'Catch a Golden Trout (rare!)', check: (gs) => gs.totalCollected('golden_trout') >= 1 },
      { id: 'turn_in', text: 'Show the catalogue to Maria', check: (gs) => gs.flags.catalogue_complete },
    ],
    requiresDay: 5,
  },

  // ── Tier 2 Quests ──

  bakery_q1: {
    id: 'bakery_q1',
    island: 'bakery',
    name: 'Catching the Mouse',
    description: "The Mouse stole Pierre's flour! Catch it 5 times.",
    steps: [
      { id: 'meet_pierre', text: 'Meet Pierre', check: (gs) => gs.flags.met_pierre },
      { id: 'catch_1', text: 'Catch Mouse (1/5)', check: (gs) => (gs.flags.mouse_catches || 0) >= 1 },
      { id: 'catch_2', text: 'Catch Mouse (2/5)', check: (gs) => (gs.flags.mouse_catches || 0) >= 2 },
      { id: 'catch_3', text: 'Catch Mouse (3/5)', check: (gs) => (gs.flags.mouse_catches || 0) >= 3 },
      { id: 'catch_4', text: 'Catch Mouse (4/5)', check: (gs) => (gs.flags.mouse_catches || 0) >= 4 },
      { id: 'catch_5', text: 'Catch Mouse (5/5)', check: (gs) => (gs.flags.mouse_catches || 0) >= 5 },
    ],
    completesDay: true,
    requiresDay: 5,
  },
  bakery_q2: {
    id: 'bakery_q2',
    island: 'bakery',
    name: 'A Welcome Dinner',
    description: 'Pierre wants to host a dinner for everyone!',
    steps: [
      { id: 'halibut', text: 'Bring 5 Halibut', check: (gs) => gs.getItemCount('halibut') >= 5 || gs.flags.dinner_hosted },
      { id: 'herring', text: 'Bring 5 Herring', check: (gs) => gs.getItemCount('herring') >= 5 || gs.flags.dinner_hosted },
      { id: 'bread', text: 'Bring 10 Bread', check: (gs) => gs.getItemCount('bread') >= 10 || gs.flags.dinner_hosted },
      { id: 'dinner', text: 'Host the dinner', check: (gs) => gs.flags.dinner_hosted },
    ],
    requiresDay: 6,
  },
  bakery_q3: {
    id: 'bakery_q3',
    island: 'bakery',
    name: 'Into the Cellar',
    description: 'The Mouse has a secret to share... for a price.',
    steps: [
      { id: 'pay_mouse', text: 'Give the Mouse 13 Bread', check: (gs) => gs.flags.cellar_opened },
      { id: 'enter', text: 'Enter the Cellar', check: (gs) => gs.flags.flame_stone_obtained },
    ],
    requiresDay: 7,
  },
  forest_q1: {
    id: 'forest_q1',
    island: 'dense_forest',
    name: 'Learn to Log',
    description: 'Ashley wants to see what you can do with an axe.',
    steps: [
      { id: 'meet_ashley', text: 'Meet Ashley', check: (gs) => gs.flags.met_ashley },
      { id: 'chop_5', text: 'Chop 5 Trees (need Axe)', check: (gs) => gs.totalCollected('logs') >= 5 },
    ],
    completesDay: true,
    requiresDay: 5,
  },
  forest_q2: {
    id: 'forest_q2',
    island: 'dense_forest',
    name: 'Storing Acorns',
    description: 'The Squirrel wants to stock up for winter.',
    steps: [
      { id: 'give_acorns', text: 'Give Acorns to Squirrel (0/100)', check: (gs) => (gs.flags.acorns_given || 0) >= 100 },
    ],
    requiresDay: 6,
  },
  forest_q3: {
    id: 'forest_q3',
    island: 'dense_forest',
    name: 'Winter is Here',
    description: 'The Squirrel was right — winter has come!',
    steps: [
      { id: 'wait', text: 'Wait for winter to arrive...', check: (gs) => gs.winter.active || gs.flags.frost_stone_obtained },
      { id: 'snowman', text: 'Build a Snowman with Squirrel', check: (gs) => gs.flags.snowman_built },
      { id: 'stone', text: 'Receive the Frost Stone', check: (gs) => gs.flags.frost_stone_obtained },
    ],
    requiresDay: 7,
  },
  rocks_q1: {
    id: 'rocks_q1',
    island: 'rocks',
    name: 'Make the Seals Dance',
    description: "Timmy's friends haven't come out to play. Can you help?",
    steps: [
      { id: 'meet_timmy', text: 'Meet Timmy', check: (gs) => gs.flags.met_timmy },
      { id: 'feed_seals', text: 'Give Timmy 3 Fish (any type)', check: (gs) => gs.flags.seals_dancing },
    ],
    completesDay: true,
    requiresDay: 5,
  },
  rocks_q2: {
    id: 'rocks_q2',
    island: 'rocks',
    name: 'Dancing for Pearls',
    description: 'The Seals want specific fish each day for a Pearl.',
    steps: [
      { id: 'day1', text: 'Bring 3 Halibut', check: (gs) => (gs.flags.rocks_q2_day || 0) >= 1 },
      { id: 'day2', text: 'Bring 3 Herring', check: (gs) => (gs.flags.rocks_q2_day || 0) >= 2 },
      { id: 'day3', text: 'Bring 3 Snapper', check: (gs) => (gs.flags.rocks_q2_day || 0) >= 3 },
      { id: 'day4', text: 'Bring 3 Tuna', check: (gs) => (gs.flags.rocks_q2_day || 0) >= 4 },
      { id: 'day5', text: 'Bring 3 Flounder', check: (gs) => (gs.flags.rocks_q2_day || 0) >= 5 },
    ],
    requiresDay: 6,
  },
  rocks_q3: {
    id: 'rocks_q3',
    island: 'rocks',
    name: '???',
    description: 'Something stirs in the deep...',
    hidden: true,
    steps: [
      { id: 'trout', text: 'Give 3 Golden Trout to Timmy', check: (gs) => gs.flags.shadow_stone_obtained },
    ],
    requiresDay: 7,
  },

  // ── Tier 2 cont. + Stub Quests ──

  granary_q1: {
    id: 'granary_q1',
    island: 'granary',
    name: 'Tour the Island',
    description: 'Take Raven on a tour to meet everyone.',
    steps: [
      { id: 'meet_raven', text: 'Meet Raven', check: (gs) => gs.flags.met_raven },
      { id: 'tour', text: 'Visit 3 other NPCs with Raven', check: (gs) => (gs.flags.raven_tour_count || 0) >= 3 },
    ],
    completesDay: true,
    requiresDay: 6,
  },
  granary_q2: {
    id: 'granary_q2',
    island: 'granary',
    name: 'Repair the Granary',
    description: 'The windmill needs a lot of wood to repair.',
    steps: [
      { id: 'gather', text: 'Gather 50 Firm Wood', check: (gs) => gs.hasItem('firm_wood', 50) || gs.flags.granary_repaired },
      { id: 'repair', text: 'Repair the Granary', check: (gs) => gs.flags.granary_repaired },
    ],
    requiresDay: 7,
  },
  market_q1: {
    id: 'market_q1',
    island: 'market_square',
    name: 'A Simple Request',
    description: "Theodore wants 5 of anything. Even sticks!",
    steps: [
      { id: 'meet_merchants', text: 'Meet the Merchants', check: (gs) => gs.flags.met_merchants },
      { id: 'give_5', text: 'Give Theodore 5 of anything', check: (gs) => gs.flags.first_request_done },
    ],
    completesDay: true,
    requiresDay: 6,
  },
  market_q2: {
    id: 'market_q2',
    island: 'market_square',
    name: "Theodore's Requests",
    description: 'Fill 7 specific requests over 7 days.',
    steps: [
      { id: 'd1', text: 'Day 1: Give 7 Wool', check: (gs) => (gs.flags.theodore_day || 0) >= 1 },
      { id: 'd2', text: 'Day 2: Give 7 Bread', check: (gs) => (gs.flags.theodore_day || 0) >= 2 },
      { id: 'd3', text: 'Day 3: Give 7 Logs', check: (gs) => (gs.flags.theodore_day || 0) >= 3 },
      { id: 'd4', text: 'Day 4: Give 7 Pristine Shells', check: (gs) => (gs.flags.theodore_day || 0) >= 4 },
      { id: 'd5', text: 'Day 5: Give 7 Flounder', check: (gs) => (gs.flags.theodore_day || 0) >= 5 },
      { id: 'd6', text: 'Day 6: Give 7 Grain', check: (gs) => (gs.flags.theodore_day || 0) >= 6 },
      { id: 'd7', text: 'Day 7: Give 7 Pearls', check: (gs) => (gs.flags.theodore_day || 0) >= 7 },
    ],
    requiresDay: 7,
  },
  mermaid_q1: {
    id: 'mermaid_q1',
    island: 'mermaid_cove',
    name: 'Swim to the South',
    description: 'The Mermaids offer you a stone that lets you swim.',
    steps: [
      { id: 'get_stone', text: 'Receive Mermaid Stone', check: (gs) => gs.hasItem('mermaid_stone') },
      { id: 'swim', text: 'Swim to the Southern Altar', check: (gs) => gs.flags.swam_south },
    ],
    completesDay: true,
    requiresDay: 6,
  },
  faerie_q1: {
    id: 'faerie_q1',
    island: 'faerie_woods',
    name: 'Enter the Faerie Realm',
    description: 'The Faeries offer you a stone that opens a portal.',
    steps: [
      { id: 'get_stone', text: 'Receive Faerie Stone', check: (gs) => gs.hasItem('faerie_stone') },
      { id: 'portal', text: 'Walk through the Faerie Portal', check: (gs) => gs.flags.entered_faerie },
    ],
    completesDay: true,
    requiresDay: 6,
  },
  auction_q1: {
    id: 'auction_q1',
    island: 'auction_house',
    name: 'Participate in an Auction',
    description: 'Win a Mysterious Painting at auction!',
    steps: [
      { id: 'bid', text: 'Bid 21 Coins for the Painting', check: (gs) => gs.flags.won_auction },
    ],
    completesDay: true,
    requiresDay: 7,
  },
  mine_q1: {
    id: 'mine_q1',
    island: 'gold_mine',
    name: 'Enter the Mine',
    description: 'The Miner gives you tools to explore below.',
    steps: [
      { id: 'get_tools', text: 'Get Pickaxe and Helmet', check: (gs) => gs.flags.has_mining_tools },
      { id: 'mine', text: 'Mine for Gold', check: (gs) => gs.flags.mined_gold },
    ],
    completesDay: true,
    requiresDay: 8,
  },
  mystery_q1: {
    id: 'mystery_q1',
    island: 'mount_mystery',
    name: 'A Stone of Silence',
    description: 'Climb the mountain and find what awaits.',
    steps: [
      { id: 'climb', text: 'Climb to the Peak', check: (gs) => gs.flags.climbed_mountain },
      { id: 'stone', text: 'Receive the Silent Stone', check: (gs) => gs.hasItem('silent_stone') },
    ],
    completesDay: true,
    requiresDay: 9,
  },
  mystery_q2: {
    id: 'mystery_q2',
    island: 'mount_mystery',
    name: 'Gather the Stones',
    description: 'Collect all five magical stones.',
    steps: [
      { id: 'flame', text: 'Flame Stone', check: (gs) => gs.hasItem('flame_stone') },
      { id: 'frost', text: 'Frost Stone', check: (gs) => gs.hasItem('frost_stone') },
      { id: 'shadow', text: 'Shadow Stone', check: (gs) => gs.hasItem('shadow_stone') },
      { id: 'realm', text: 'Mermaid or Faerie Stone', check: (gs) => gs.hasItem('mermaid_stone') || gs.hasItem('faerie_stone') },
      { id: 'silent', text: 'Silent Stone', check: (gs) => gs.hasItem('silent_stone') },
    ],
    requiresDay: 10,
  },
};

// ── Island unlock rules (prerequisite system) ──
export const ISLAND_UNLOCK_RULES = {
  home:           { day: 1, fixed: true },
  turtle:         { day: 1, fixed: true },
  wheat_farm:     { day: 2, fixed: true },
  sheep_pasture:  { day: 3, choiceGroup: 'A' },
  fishing_pier:   { day: 3, choiceGroup: 'A' },
  bakery:         { day: 5, requires: ['wheat_farm'] },
  dense_forest:   { day: 5 },
  rocks:          { day: 5 },
  granary:        { day: 6, requires: ['bakery'] },
  market_square:  { day: 6, requires: ['bakery'] },
  mermaid_cove:   { day: 6, requires: ['rocks'], choiceGroup: 'B' },
  faerie_woods:   { day: 6, requires: ['dense_forest'], choiceGroup: 'B' },
  auction_house:  { day: 7, requires: ['bakery', 'market_square'] },
  gold_mine:      { day: 8, requiresAny: ['mermaid_cove', 'faerie_woods'] },
  mount_mystery:  { day: 9, requires: ['gold_mine'] },
};

// Keep legacy export name for compatibility
export const ISLAND_SCHEDULE = [];

// ── Dialogue lines ──
export const DIALOGUES = {
  turtle_start: [
    { speaker: 'Turtle', text: '...' },
    { speaker: 'Turtle', text: '*The turtle slowly opens one eye and regards you with ancient wisdom.*' },
    { speaker: 'Turtle', text: "Ah, you've made a fire. Good. The nights can be cold out here on the water." },
    { speaker: 'Turtle', text: "I've been swimming west for a long time now. But I could use some company..." },
    { speaker: 'Turtle', text: "Tell me a story about your day, and I'll keep swimming. Deal?" },
  ],
  turtle_end_day: [
    { speaker: 'You', text: "I found this island, started a fire, and made myself at home." },
    { speaker: 'Turtle', text: "A good start! *The turtle nods approvingly.*" },
    { speaker: 'Turtle', text: "I can see something on the horizon... looks like another island floating this way." },
    { speaker: 'Turtle', text: "Rest well. Tomorrow will bring new things." },
  ],
  turtle_day2: [
    { speaker: 'You', text: 'I found a wheat farm today! And a dog.' },
    { speaker: 'Turtle', text: "A dog, you say? Every good island needs a dog." },
    { speaker: 'Turtle', text: "The horizon holds more surprises. I can feel it in the currents." },
    { speaker: 'Turtle', text: "Sleep well, friend." },
  ],
  dog_first: [
    { speaker: '', text: '*A friendly dog bounds towards you, tail wagging!*' },
    { speaker: '', text: "*The dog sniffs you, decides you're okay, and runs off towards Your Home.*" },
    { speaker: '', text: 'The dog seems to want to play fetch! Throw it a stick.' },
  ],
  dog_fetch: [
    { speaker: '', text: '*You throw a stick! The dog runs after it...*' },
    { speaker: '', text: "*...and completely ignores the stick. Instead, it digs a hole and comes back with something.*" },
    { speaker: '', text: "The dog found a Broken Spade! Maybe you can fix this." },
  ],
  sally_first: [
    { speaker: 'Sally', text: "Oh! Hello there! I didn't expect to see anyone else out here." },
    { speaker: 'Sally', text: "I'm Sally. I've been taking care of these sheep for... well, a while now." },
    { speaker: 'Sally', text: "Here, take these shears. You'll need them to get wool from the sheep." },
    { speaker: 'Sally', text: "If you could help me make some beds, that would be amazing! I have some driftwood saved up." },
  ],
  maria_first: [
    { speaker: 'Maria', text: "Hey! Welcome to the pier - or what's left of it, anyway." },
    { speaker: 'Maria', text: "I'm Maria. My father and I have been here since... well, we don't remember." },
    { speaker: 'Maria', text: "He's a bit... eccentric. But he has a good fishing line you could use!" },
    { speaker: 'Maria', text: "Talk to him and I'll teach you how to fish." },
  ],
  old_man_first: [
    { speaker: 'Old Man', text: "Eh? Another one, washed up by the tides..." },
    { speaker: 'Old Man', text: "The islands... they weren't always like this, you know. Scattered across the sea..." },
    { speaker: 'Old Man', text: "Here. Take my fishing line. I don't need it anymore. *He hands you a weathered line.*" },
    { speaker: 'Old Man', text: "Catch enough fish and we'll have ourselves a proper feast!" },
  ],
  fire_lit: [
    { speaker: '', text: '*The fire crackles to life, sending sparks into the evening sky.*' },
    { speaker: '', text: '*In the distance, you see the Turtle stir. It seems drawn to the warmth.*' },
    { speaker: '', text: 'You can now Talk to the Turtle to end the day.' },
  ],
  turtle_day3: [
    { speaker: 'You', text: "I met someone new today. This ocean is full of surprises." },
    { speaker: 'Turtle', text: "People find each other, even out here. The currents bring what's needed." },
    { speaker: 'Turtle', text: "I see another shape on the horizon. Tomorrow brings more." },
  ],
  turtle_day4: [
    { speaker: 'You', text: "The island is growing. We have friends, animals, and a fire that never goes out." },
    { speaker: 'Turtle', text: "You're building something special. I can feel the islands humming with life." },
    { speaker: 'Turtle', text: "Keep going, friend. The west holds answers." },
  ],
  turtle_day5: [
    { speaker: 'You', text: "New islands keep appearing. Each one has its own story." },
    { speaker: 'Turtle', text: "Stories are what keep me swimming. Every tale gives me strength." },
    { speaker: 'Turtle', text: "The deeper we go, the stranger things become. But that's why we press on." },
  ],
  turtle_generic: [
    { speaker: 'You', text: "Another day, another island. The journey continues." },
    { speaker: 'Turtle', text: "Every day brings us closer to something. I can feel it." },
    { speaker: 'Turtle', text: "Rest now. The sea will carry us forward." },
  ],
  dog_fetch_2: [
    { speaker: '', text: '*You throw another stick! The dog runs after it...*' },
    { speaker: '', text: "*...and once again ignores the stick. More digging. The dog returns with a Strange Stick.*" },
    { speaker: '', text: "This stick is glowing faintly. Maybe someone knows what it is?" },
  ],
  sally_magic_wand: [
    { speaker: 'Sally', text: "What's that you've got there? Let me see..." },
    { speaker: '', text: "*Sally touches the Strange Stick and — POOF! Her hair turns from purple to brown.*" },
    { speaker: 'Sally', text: "Whoa! That's... that's a Magic Wand! It reverses things!" },
    { speaker: 'Sally', text: "Here, you keep it. I think you'll find more use for it than I will." },
  ],
  old_man_hammer: [
    { speaker: 'Old Man', text: "A hammer? Sure, I've got a spare one somewhere around here..." },
    { speaker: 'Old Man', text: "*He rummages through a pile of old tools and produces a hammer and some nails.*" },
    { speaker: 'Old Man', text: "Take good care of these. Tools are hard to come by out here." },
  ],
  wheat_harvest: [
    { speaker: '', text: "*The golden wheat sways in the breeze, ready to be harvested.*" },
    { speaker: '', text: "*You carefully gather the wheat. The Dog barks happily at your side.*" },
    { speaker: '', text: "First harvest! The seeds of your labor have borne fruit." },
  ],
  cooking_lesson: [
    { speaker: 'Maria', text: "Now that you've caught some fish, let me show you how to cook them properly." },
    { speaker: 'Maria', text: "Take them to the fire pit on Your Home island. Season with seaweed and cook over the flames." },
    { speaker: '', text: "*The aroma of freshly cooked fish fills the air.*" },
    { speaker: 'Maria', text: "Not bad for a beginner! You can cook fish at the fire pit whenever you like now." },
  ],
  // Tier 2 dialogues
  pierre_first: [
    { speaker: 'Pierre', text: "Ah, bonjour! Welcome to my Bakery... or what's left of it." },
    { speaker: 'Pierre', text: "That accursed Mouse has stolen my flour! Without it, I cannot bake." },
    { speaker: 'Pierre', text: "Please, catch that little thief! He's hiding somewhere on this island." },
  ],
  mouse_catch: [
    { speaker: '', text: "*You corner the Mouse! It squeaks indignantly and drops a handful of flour.*" },
    { speaker: 'Mouse', text: "'Squeak!' (The Mouse darts away to a new hiding spot.)" },
  ],
  mouse_final: [
    { speaker: '', text: "*The Mouse finally gives up. It sits down and pushes the flour bag toward you.*" },
    { speaker: 'Mouse', text: '"...Fine. You win. But know this:"' },
    { speaker: 'Mouse', text: '"This mosaic of islands hides more mysteries than you know. Look below for answers."' },
    { speaker: 'Pierre', text: "Magnifique! Now I can bake again. The Oven is yours to use, friend." },
  ],
  mouse_cellar: [
    { speaker: 'Mouse', text: '"You want to know a secret? It will cost you 13 Bread."' },
    { speaker: '', text: "*You hand over 13 loaves. The Mouse arranges them in a circle.*" },
    { speaker: 'Mouse', text: '"I place this bread to remember those who defied the dreaded Symmetry."' },
    { speaker: 'Mouse', text: '"Though they were branded Heretics, their defiance made us who we are today."' },
    { speaker: 'Mouse', text: '"All of us owe them our gratitude. With this bounty, we remember and honor them."' },
    { speaker: 'Mouse', text: '"And for you — you have my gratitude. I wasn\'t always a mouse, you know."' },
    { speaker: '', text: "*The Mouse reveals a hidden door. In the cellar below, a red rune glows.*" },
    { speaker: '', text: "*You receive a Flame Stone. Its warmth pulses in your hand.*" },
  ],
  ashley_first: [
    { speaker: 'Ashley', text: "Hey there! Welcome to the forest. Name's Ashley." },
    { speaker: 'Ashley', text: "I've been logging these trees for years. They grow back fast — don't worry about that." },
    { speaker: 'Ashley', text: "Grab your axe and show me what you've got. Chop down 5 trees!" },
    { speaker: '', text: "*A suspicious Squirrel watches from a nearby branch...*" },
  ],
  squirrel_acorns: [
    { speaker: '', text: "*The Squirrel eyes your acorns greedily.*" },
    { speaker: '', text: "*It scurries closer, waiting for you to share...*" },
  ],
  timmy_first: [
    { speaker: 'Timmy', text: "Hi! I'm Timmy. My friends haven't come out today..." },
    { speaker: 'Timmy', text: "The Seals love fish! If you bring some, maybe they'll come play!" },
    { speaker: '', text: "*Timmy looks out at the water hopefully.*" },
  ],
  seals_dance: [
    { speaker: '', text: "*Timmy throws the fish into the water. Three Seals burst from the waves!*" },
    { speaker: '', text: "*The Seals spin, splash, and put on a magnificent show!*" },
    { speaker: 'Timmy', text: "They're dancing! Thank you so much!" },
    { speaker: 'Timmy', text: "Here — I found this on the rocks. It's really pretty, isn't it?" },
  ],
  dinner_scene: [
    { speaker: 'Pierre', text: "Welcome, everyone! Tonight, we feast!" },
    { speaker: '', text: "*Pierre prepares an incredible meal. Everyone gathers around the table.*" },
    { speaker: '', text: "*Laughter, stories, and warm food fill the evening.*" },
    { speaker: 'Pierre', text: "To friends — old and new. May our island grow ever more delicious!" },
  ],
  raven_first: [
    { speaker: 'Raven', text: "...You're here. I wasn't expecting visitors." },
    { speaker: 'Raven', text: "I'm Raven. This old windmill is all I have left of my family's granary." },
    { speaker: 'Raven', text: "If you help me repair it, I can turn your Wheat into proper Grain." },
    { speaker: 'Raven', text: "But first... would you show me around? I'd like to meet the others." },
  ],
  merchants_first: [
    { speaker: 'Alvin', text: "Welcome to the Market Square! I'm Alvin — I'll buy anything you've got." },
    { speaker: 'Simon', text: "And I'm Simon — I sell what others have brought. Browse freely!" },
    { speaker: 'Theodore', text: "And I'm Theodore. I make requests — fulfill them for double the reward!" },
  ],
  mermaid_first: [
    { speaker: 'Mermaid', text: "Hello, land-walker. We've been watching your islands grow." },
    { speaker: 'Mermaid', text: "Take this Mermaid Stone. It will let you breathe beneath the waves." },
    { speaker: 'Mermaid', text: "Swim south to the Altar. There is something there you should see." },
  ],
  faerie_first: [
    { speaker: 'Faerie', text: "*A tiny glowing figure flutters before you.*" },
    { speaker: 'Faerie', text: "Take this Faerie Stone! It opens the way to our realm." },
    { speaker: 'Faerie', text: "Step through the portal when you're ready. We'll be waiting!" },
  ],
  auctioneer_first: [
    { speaker: 'Auctioneer', text: "Step right up! Today we have a most Mysterious Painting for auction." },
    { speaker: 'Auctioneer', text: "The bidding starts at 20 Coins. Do I hear 21?" },
  ],
  miner_first: [
    { speaker: 'Miner', text: "Ah, fresh blood! The mine's been lonely." },
    { speaker: 'Miner', text: "Here — take this Pickaxe and Helmet. You'll need the light down there." },
    { speaker: 'Miner', text: "The tunnels run under all the islands. Who knows what you'll find?" },
  ],
  mountain_climb: [
    { speaker: '', text: "*You begin the long climb up Mount Mystery.*" },
    { speaker: '', text: "*The wind howls. Clouds part to reveal an ancient stone at the peak.*" },
    { speaker: '', text: "*You touch the stone and feel... silence. Pure, absolute silence.*" },
    { speaker: '', text: "*The Silent Stone is yours. But what does it mean?*" },
  ],
};
