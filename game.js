const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const selectionPanel = document.getElementById("selectionPanel");
const unitInfoEl = document.getElementById("unitInfo");
const delegateBtn = document.getElementById("delegateBtn");
const buildBunkerBtn = document.getElementById("buildBunkerBtn");
const buildFactoryBtn = document.getElementById("buildFactoryBtn");
const buildAirportBtn = document.getElementById("buildAirportBtn");
const blueCountEl = document.getElementById("blueCount");
const redCountEl = document.getElementById("redCount");
const moneyCountEl = document.getElementById("moneyCount");
const incomeCountEl = document.getElementById("incomeCount");
const logEl = document.getElementById("log");
const techInfoEl = document.getElementById("techInfo");
const researchTechBtn = document.getElementById("researchTechBtn");
const techTreeEl = document.getElementById("techTree");
const cityPanel = document.getElementById("cityPanel");
const cityInfoEl = document.getElementById("cityInfo");
const upgradeCityBtn = document.getElementById("upgradeCityBtn");
const productionPanel = document.getElementById("productionPanel");
const productionInfoEl = document.getElementById("productionInfo");
const autoProductionInfoEl = document.getElementById("autoProductionInfo");
const productionButtons = [...document.querySelectorAll("[data-produce]")];
const autoProductionButtons = [...document.querySelectorAll("[data-auto-produce]")];
const clearAutoProductionBtn = document.getElementById("clearAutoProductionBtn");
const titleOverlay = document.getElementById("titleOverlay");
const mapButtons = [...document.querySelectorAll("[data-map]")];
const startGameBtn = document.getElementById("startGameBtn");
const titleBtn = document.getElementById("titleBtn");
const rulesBtn = document.getElementById("rulesBtn");
const unitGuideBtn = document.getElementById("unitGuideBtn");
const soundBtn = document.getElementById("soundBtn");
const rulesOverlay = document.getElementById("rulesOverlay");
const closeRulesBtn = document.getElementById("closeRulesBtn");
const unitGuideOverlay = document.getElementById("unitGuideOverlay");
const unitGuideTable = document.getElementById("unitGuideTable");
const closeUnitGuideBtn = document.getElementById("closeUnitGuideBtn");
const undoBtn = document.getElementById("undoBtn");
const endTurnBtn = document.getElementById("endTurnBtn");
const restartBtn = document.getElementById("restartBtn");
const victoryOverlay = document.getElementById("victoryOverlay");
const victoryTitle = document.getElementById("victoryTitle");
const victoryText = document.getElementById("victoryText");
const victoryBadge = document.getElementById("victoryBadge");
const victoryRestartBtn = document.getElementById("victoryRestartBtn");

const COLS = 24;
const ROWS = 16;
const HEX_SIZE = 45;
const HEX_W = Math.sqrt(3) * HEX_SIZE;
const HEX_OFFSET_X = (canvas.width - (HEX_W * COLS + HEX_W / 2)) / 2;
const HEX_OFFSET_Y = (canvas.height - (HEX_SIZE * 2 + (ROWS - 1) * HEX_SIZE * 1.5)) / 2;
const unitImage = new Image();
unitImage.src = "assets/units.png";
unitImage.addEventListener("load", () => draw());
const terrainTileImage = new Image();
terrainTileImage.src = "assets/terrain-tiles.png";
terrainTileImage.addEventListener("load", () => draw());

let audioCtx;
let audioUnlocked = false;
const MASTER_VOLUME = 0.9;

function ensureAudio() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === "suspended") {
    const resumeResult = audioCtx.resume();
    if (resumeResult?.catch) resumeResult.catch(() => {});
  }
  return audioCtx;
}

function unlockAudio() {
  const ctxAudio = ensureAudio();
  if (!ctxAudio) return false;
  if (ctxAudio.state === "suspended") {
    const resumeResult = ctxAudio.resume();
    if (resumeResult?.catch) resumeResult.catch(() => {});
  }
  if (audioUnlocked) return true;
  const buffer = ctxAudio.createBuffer(1, 1, ctxAudio.sampleRate);
  const source = ctxAudio.createBufferSource();
  const gain = ctxAudio.createGain();
  gain.gain.value = 0.0001;
  source.buffer = buffer;
  source.connect(gain).connect(ctxAudio.destination);
  source.start(0);
  audioUnlocked = true;
  updateSoundButton();
  return true;
}

function updateSoundButton() {
  if (!soundBtn) return;
  const active = audioUnlocked && audioCtx && audioCtx.state !== "suspended";
  soundBtn.textContent = active ? "音ON" : "音OFF";
  soundBtn.classList.toggle("sound-active", active);
}

function playTone(freq, duration, options = {}) {
  const ctxAudio = ensureAudio();
  if (!ctxAudio) return;
  const start = ctxAudio.currentTime + (options.delay || 0);
  const osc = ctxAudio.createOscillator();
  const gain = ctxAudio.createGain();
  osc.type = options.type || "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (options.toFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, options.toFreq), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime((options.gain || 0.08) * MASTER_VOLUME, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctxAudio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playNoise(duration, options = {}) {
  const ctxAudio = ensureAudio();
  if (!ctxAudio) return;
  const start = ctxAudio.currentTime + (options.delay || 0);
  const buffer = ctxAudio.createBuffer(1, Math.max(1, Math.floor(ctxAudio.sampleRate * duration)), ctxAudio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctxAudio.createBufferSource();
  const filter = ctxAudio.createBiquadFilter();
  const gain = ctxAudio.createGain();
  source.buffer = buffer;
  filter.type = options.filter || "lowpass";
  filter.frequency.setValueAtTime(options.freq || 700, start);
  gain.gain.setValueAtTime((options.gain || 0.12) * MASTER_VOLUME, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(ctxAudio.destination);
  source.start(start);
}

function playSound(name) {
  unlockAudio();
  if (audioCtx?.state === "suspended") return;
  if (name === "move") {
    playTone(180, 0.09, { type: "triangle", gain: 0.12, toFreq: 240 });
    playTone(260, 0.08, { type: "triangle", gain: 0.1, delay: 0.06 });
  } else if (name === "attack") {
    playNoise(0.24, { gain: 0.28, freq: 820 });
    playNoise(0.18, { gain: 0.18, freq: 180, filter: "lowpass", delay: 0.02 });
    playTone(82, 0.26, { type: "sawtooth", gain: 0.13, toFreq: 42 });
  } else if (name === "missile") {
    playTone(520, 0.28, { type: "sawtooth", gain: 0.08, toFreq: 120 });
    playNoise(0.3, { gain: 0.2, freq: 1200, delay: 0.08 });
    playTone(70, 0.32, { type: "sawtooth", gain: 0.12, toFreq: 36, delay: 0.12 });
  } else if (name === "nuke") {
    playTone(68, 0.72, { type: "sawtooth", gain: 0.2, toFreq: 24 });
    playNoise(0.72, { gain: 0.32, freq: 440, delay: 0.04 });
    playNoise(0.45, { gain: 0.18, freq: 90, filter: "lowpass", delay: 0.08 });
  } else if (name === "produce") {
    playTone(210, 0.08, { type: "square", gain: 0.05 });
    playTone(330, 0.1, { type: "triangle", gain: 0.06, delay: 0.06 });
  } else if (name === "capture") {
    playTone(360, 0.09, { gain: 0.05 });
    playTone(540, 0.1, { gain: 0.05, delay: 0.08 });
    playTone(720, 0.12, { gain: 0.05, delay: 0.16 });
  } else if (name === "build") {
    playNoise(0.08, { gain: 0.13, freq: 420 });
    playTone(150, 0.12, { type: "square", gain: 0.05, delay: 0.03 });
  } else if (name === "tech") {
    playTone(440, 0.08, { gain: 0.045 });
    playTone(660, 0.08, { gain: 0.045, delay: 0.07 });
    playTone(880, 0.14, { gain: 0.05, delay: 0.14 });
  } else if (name === "turn") {
    playTone(310, 0.08, { gain: 0.04 });
    playTone(230, 0.1, { gain: 0.035, delay: 0.08 });
  } else if (name === "undo") {
    playTone(420, 0.08, { gain: 0.04, toFreq: 260 });
  } else if (name === "victory") {
    [523, 659, 784, 1046].forEach((freq, i) => playTone(freq, 0.16, { gain: 0.055, delay: i * 0.11 }));
  } else if (name === "defeat") {
    [330, 247, 196].forEach((freq, i) => playTone(freq, 0.18, { type: "triangle", gain: 0.055, delay: i * 0.13 }));
  } else {
    playTone(520, 0.08, { gain: 0.16 });
  }
}

function playTestSound() {
  unlockAudio();
  playTone(440, 0.14, { type: "square", gain: 0.18 });
  playTone(660, 0.14, { type: "triangle", gain: 0.18, delay: 0.12 });
  playTone(880, 0.18, { type: "sine", gain: 0.18, delay: 0.24 });
}

const unitSprites = {
  tank: { x: 58, y: 146, w: 500, h: 458 },
  heavyTank: { x: 58, y: 146, w: 500, h: 458 },
  infantry: { x: 678, y: 203, w: 188, h: 386 },
  engineer: { x: 678, y: 203, w: 188, h: 386 },
  artillery: { x: 990, y: 155, w: 452, h: 454 },
  recon: { x: 1499, y: 199, w: 410, h: 412 },
  fighter: { x: 1983, y: 0, w: 512, h: 512 },
  bomber: { x: 2495, y: 0, w: 512, h: 512 },
  rocketArtillery: { x: 3007, y: 0, w: 512, h: 512 },
  icbm: { x: 3519, y: 0, w: 512, h: 512 },
  nuke: { x: 4031, y: 0, w: 512, h: 512 },
  patrolBoat: { x: 4543, y: 0, w: 512, h: 512 },
  destroyer: { x: 5055, y: 0, w: 512, h: 512 },
  landingShip: { x: 5567, y: 0, w: 512, h: 512 },
};

const terrainSprites = {
  p: { x: 0, y: 0, w: 512, h: 512 },
  f: { x: 512, y: 0, w: 512, h: 512 },
  c: { x: 1024, y: 0, w: 512, h: 512 },
  x: { x: 0, y: 512, w: 512, h: 512 },
  m: { x: 512, y: 512, w: 512, h: 512 },
  w: { x: 1024, y: 512, w: 512, h: 512 },
  b: { x: 0, y: 1024, w: 512, h: 512 },
  a: { x: 512, y: 1024, w: 512, h: 512 },
  k: { x: 1024, y: 1024, w: 512, h: 512 },
  q: { x: 0, y: 1536, w: 512, h: 512 },
  h: { x: 512, y: 1536, w: 512, h: 512 },
};

const INITIAL_TERRAIN = [
  "ppppppffffppppppxpcppppp",
  "ppppppffffpppppppppppppp",
  "ppmmmmffffpppppppppppppp",
  "ppmmmmffffpppppppppppppp",
  "ppppppffffppmmpppppppppp",
  "ppppppffffppmmpppppppppp",
  "ppppppppppcppcppffffpppp",
  "ppppppppppppppppffffpppp",
  "ppcpppppppppppppffffmmpp",
  "ppppppppppppppppffffmmpp",
  "ppppppffffppppppppppmmpp",
  "ppppppffffppppppppppmmpp",
  "ppppppffffppcpcpffffpppp",
  "ppppppffffppppppffffpppp",
  "ppppppxappppppppppffffpp",
  "ppppppppppppppppppffffpp",
].map((row) => row.split(""));

let terrain = INITIAL_TERRAIN.map((row) => [...row]);

const OPEN_TERRAIN = [
  "ppppppppppppppppxpcppppp",
  "pppppppppppppppppppppppp",
  "pppppppppppppppppppppppp",
  "pppppppppppppppppppppppp",
  "pppppppppppppppppppppppp",
  "pppppppppppppppppppppppp",
  "ppppppppppcppcpppppppppp",
  "pppppppppppppppppppppppp",
  "ppcppppppppppppppppppppp",
  "pppppppppppppppppppppppp",
  "pppppppppppppppppppppppp",
  "pppppppppppppppppppppppp",
  "ppppppppppcpcppppppppppp",
  "pppppppppppppppppppppppp",
  "ppppppxapppppppppppppppp",
  "pppppppppppppppppppppppp",
].map((row) => row.split(""));

const ISLAND_TERRAIN = [
  "wwwwwwwwwwwwwwwwwpppppww",
  "wwwwwwwwwwwwwwwhaxpppppw",
  "wwwwwwwwwwwwwwwppppcpppp",
  "wwwwwpppwwwwwwwwppmpfppw",
  "wwwwphcppwwwwwwwwpppppww",
  "wwwwwpppwwwpwwwwwwwwwwww",
  "wwwwwwwwwpppppwwwwwwwwww",
  "wwwwwwwwhpppcppwwwwwwwww",
  "wwwwwwwwwpppppppppwwwwww",
  "wwwwwwwwwwwpwppcpphwwwww",
  "wwwwwwwwwwwwwpppppwwwwww",
  "wwpppppwwwwwwwwwwwwwwwww",
  "wppfppmpwwwwwwwwwwwwwwww",
  "wppppcpppwwwwwwwwwwwwwww",
  "whppppxawwwwwwwwwwwwwwww",
  "wwpppppwwwwwwwwwwwwwwwww",
].map((row) => row.split(""));

const MAPS = {
  standard: { name: "中央戦線", terrain: INITIAL_TERRAIN },
  open: { name: "平原突破", terrain: OPEN_TERRAIN },
  ridge: { name: "島嶼海戦", terrain: ISLAND_TERRAIN, units: "island", buildings: "island", money: { blue: 900, red: 900 } },
};

const terrainData = {
  p: { name: "平地", color: "#5f754f", move: 1, defense: 0 },
  f: { name: "森", color: "#2f5e3a", move: 2, defense: 1 },
  c: { name: "都市", color: "#777269", move: 1, defense: 2 },
  x: { name: "工場", color: "#6f6b84", move: 1, defense: 2 },
  a: { name: "空港", color: "#5d8395", move: 1, defense: 1 },
  h: { name: "港", color: "#5d8395", move: 1, defense: 1 },
  b: { name: "バンカー", color: "#65705c", move: 1, defense: 2 },
  k: { name: "建設中工場", color: "#806f54", move: 1, defense: 1 },
  q: { name: "建設中空港", color: "#7b735d", move: 1, defense: 1 },
  m: { name: "山", color: "#77644e", move: 3, defense: 2 },
  w: { name: "水域", color: "#315f78", move: 99, defense: 0 },
};

const unitTypes = {
  tank: { label: "戦車", hp: 10, move: 4, range: 1, attack: 5, armor: 2, cost: 420, domain: "land", vision: 3 },
  heavyTank: { label: "重戦車", hp: 14, move: 2, range: 1, attack: 7, armor: 4, cost: 720, domain: "land", vision: 3 },
  infantry: { label: "歩兵", hp: 7, move: 3, range: 1, attack: 3, armor: 1, cost: 180, domain: "land", vision: 3 },
  engineer: { label: "工兵", hp: 6, move: 3, range: 1, attack: 2, armor: 1, cost: 240, domain: "land", vision: 3 },
  artillery: { label: "自走砲", hp: 6, move: 2, range: 3, attack: 4, armor: 0, cost: 360, domain: "land", vision: 3 },
  rocketArtillery: { label: "ロケット砲", hp: 6, move: 2, range: 4, attack: 6, armor: 0, cost: 760, domain: "land", tech: "rocketArtillery", vision: 3 },
  icbm: { label: "ICBM", hp: 4, move: 1, range: 8, attack: 10, armor: 0, cost: 1400, domain: "land", tech: "icbm", vision: 2 },
  nuke: { label: "核ミサイル", hp: 3, move: 1, range: 10, attack: 16, armor: 0, cost: 2200, domain: "land", tech: "nuke", vision: 2 },
  recon: { label: "偵察車", hp: 5, move: 5, range: 1, attack: 2, armor: 0, cost: 260, domain: "land", vision: 6 },
  fighter: { label: "戦闘機", hp: 7, move: 7, range: 1, attack: 4, armor: 1, cost: 520, domain: "air", vision: 6 },
  bomber: { label: "爆撃機", hp: 8, move: 5, range: 2, attack: 6, armor: 1, cost: 680, domain: "air", vision: 5 },
  patrolBoat: { label: "魚雷艇", hp: 6, move: 6, range: 1, attack: 4, armor: 0, cost: 300, domain: "sea", vision: 5 },
  destroyer: { label: "駆逐艦", hp: 10, move: 5, range: 2, attack: 6, armor: 2, cost: 620, domain: "sea", vision: 5 },
  landingShip: { label: "揚陸艦", hp: 8, move: 4, range: 1, attack: 3, armor: 1, cost: 420, domain: "sea", captures: true, vision: 4 },
};

const CITY_INCOME = 150;
const CITY_MAX_LEVEL = 3;
const CITY_UPGRADE_COSTS = { 2: 400, 3: 700 };
const BUNKER_BUILD_COST = 300;
const FACTORY_BUILD_COST = 1800;
const AIRPORT_BUILD_COST = 2000;
const FACILITY_BUILD_TURNS = 3;
const BUNKER_DEFENSE = 3;
const AI_STEP_DELAY = 520;
const SUPPLY_RANGE = 7;
const OBJECTIVE_HOLD_TURNS = 5;
const LAND_UNITS = ["infantry", "engineer", "recon", "tank", "heavyTank", "artillery", "rocketArtillery", "icbm", "nuke"];
const AIR_UNITS = ["fighter", "bomber"];
const NAVAL_UNITS = ["patrolBoat", "destroyer", "landingShip"];
const UNIT_GUIDE_ORDER = [...LAND_UNITS, ...AIR_UNITS, ...NAVAL_UNITS];
const PRODUCTION_FACILITIES = ["factory", "airport", "port"];
const TECH_TREE = [
  { id: "rocketArtillery", type: "rocketArtillery", cost: 1200 },
  { id: "icbm", type: "icbm", cost: 2400, requires: "rocketArtillery" },
  { id: "nuke", type: "nuke", cost: 4200, requires: "icbm" },
];

let units;
let selectedId;
let selectedFactoryKey;
let reachable;
let attackable;
let turn;
let phase;
let gameOver;
let messages;
let undoStack;
let aiTimer;
let effectTimer;
let movementTimer;
let attackEffects;
let movementAnimations;
let buildings;
let money;
let techState;
let unitCounter;
let currentMapId = "standard";
let delegatedAfterComplete = null;

function newUnit(id, side, type, x, y) {
  const base = unitTypes[type];
  return {
    id,
    side,
    type,
    x,
    y,
    hp: base.hp,
    maxHp: base.hp,
    moved: false,
    acted: false,
    deploying: false,
    delegated: false,
    botControlledThisTurn: false,
    carriedBy: null,
  };
}

function resetGame(mapId = currentMapId) {
  currentMapId = MAPS[mapId] ? mapId : "standard";
  const map = MAPS[currentMapId];
  terrain = map.terrain.map((row) => [...row]);
  units = initialUnits(map.units);
  selectedId = null;
  selectedFactoryKey = null;
  reachable = new Map();
  attackable = new Set();
  turn = "blue";
  phase = "play";
  gameOver = false;
  buildings = initialBuildings(map.buildings);
  money = map.money ? { ...map.money } : { blue: 600, red: 600 };
  techState = {
    blue: { unlocked: new Set() },
    red: { unlocked: new Set(TECH_TREE.map((tech) => tech.id)) },
  };
  unitCounter = units.length + 1;
  messages = [`${MAPS[currentMapId].name} 作戦開始。Blue のターンです。`];
  undoStack = [];
  if (aiTimer) clearTimeout(aiTimer);
  aiTimer = null;
  if (effectTimer) cancelAnimationFrame(effectTimer);
  effectTimer = null;
  if (movementTimer) cancelAnimationFrame(movementTimer);
  movementTimer = null;
  attackEffects = [];
  movementAnimations = [];
  delegatedAfterComplete = null;
  hideVictoryScreen();
  updateUi();
  draw();
}

function initialUnits(kind) {
  const specs =
    kind === "island"
      ? [
          ["b1", "blue", "landingShip", 1, 14],
          ["b2", "blue", "destroyer", 0, 14],
          ["b3", "blue", "patrolBoat", 1, 15],
          ["b4", "blue", "infantry", 2, 14],
          ["b5", "blue", "fighter", 7, 14],
          ["r1", "red", "landingShip", 15, 1],
          ["r2", "red", "destroyer", 14, 1],
          ["r3", "red", "patrolBoat", 14, 2],
          ["r4", "red", "infantry", 16, 2],
          ["r5", "red", "fighter", 16, 1],
        ]
      : [
          ["b1", "blue", "tank", 2, 12],
          ["b2", "blue", "infantry", 1, 10],
          ["b3", "blue", "artillery", 4, 14],
          ["b4", "blue", "recon", 1, 14],
          ["b5", "blue", "fighter", 7, 14],
          ["r1", "red", "tank", 20, 2],
          ["r2", "red", "infantry", 22, 4],
          ["r3", "red", "artillery", 18, 1],
          ["r4", "red", "recon", 22, 1],
          ["r5", "red", "fighter", 17, 0],
        ];
  return specs.map(([id, side, type, x, y]) => newUnit(id, side, type, x, y));
}

function initialBuildings(kind) {
  if (kind === "island") {
    return [
      { x: 5, y: 13, type: "city", owner: "blue", capital: true },
      { x: 6, y: 14, type: "factory", owner: "blue" },
      { x: 7, y: 14, type: "airport", owner: "blue" },
      { x: 1, y: 14, type: "port", owner: "blue" },
      { x: 19, y: 2, type: "city", owner: "red", capital: true },
      { x: 17, y: 1, type: "factory", owner: "red" },
      { x: 16, y: 1, type: "airport", owner: "red" },
      { x: 15, y: 1, type: "port", owner: "red" },
      { x: 6, y: 4, type: "city", owner: null },
      { x: 5, y: 4, type: "port", owner: null },
      { x: 12, y: 7, type: "city", owner: null },
      { x: 8, y: 7, type: "port", owner: null },
      { x: 15, y: 9, type: "city", owner: null },
      { x: 18, y: 9, type: "port", owner: null },
    ];
  }
  return [
    { x: 16, y: 0, type: "factory", owner: "red" },
    { x: 18, y: 0, type: "city", owner: "red", capital: true },
    { x: 10, y: 6, type: "city", owner: null },
    { x: 13, y: 6, type: "city", owner: null },
    { x: 2, y: 8, type: "city", owner: null },
    { x: 12, y: 12, type: "city", owner: "blue", capital: true },
    { x: 14, y: 12, type: "city", owner: null },
    { x: 6, y: 14, type: "factory", owner: "blue" },
    { x: 7, y: 14, type: "airport", owner: "blue" },
    { x: 17, y: 0, type: "airport", owner: "red" },
  ];
}

function tileKey(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

function unitAt(x, y) {
  return units.find((unit) => !unit.carriedBy && unit.x === x && unit.y === y);
}

function buildingAt(x, y) {
  return buildings.find((building) => building.x === x && building.y === y);
}

function selectedUnit() {
  return units.find((unit) => unit.id === selectedId);
}

function terrainAt(x, y) {
  return terrainData[terrain[y][x]];
}

function isAirUnit(unitOrType) {
  const type = typeof unitOrType === "string" ? unitOrType : unitOrType.type;
  return unitTypes[type].domain === "air";
}

function isSeaUnit(unitOrType) {
  const type = typeof unitOrType === "string" ? unitOrType : unitOrType.type;
  return unitTypes[type].domain === "sea";
}

function isTransportableLandUnit(unit) {
  return unit && !isAirUnit(unit) && !isSeaUnit(unit) && !isConsumableMissile(unit);
}

function cargoOf(transport) {
  return units.find((unit) => unit.carriedBy === transport.id);
}

function transportOfCargo(cargo) {
  return cargo?.carriedBy ? units.find((unit) => unit.id === cargo.carriedBy) : null;
}

function canBoardTransport(unit, transport) {
  return (
    isTransportableLandUnit(unit) &&
    transport?.type === "landingShip" &&
    transport.side === unit.side &&
    !cargoOf(transport)
  );
}

function canUnloadTransport(transport, x, y) {
  const cargo = cargoOf(transport);
  return (
    cargo &&
    distance(transport, { x, y }) === 1 &&
    !unitAt(x, y) &&
    movementCostFor(cargo, x, y) < 99
  );
}

function computeCargoUnloadTargets(cargo) {
  const transport = transportOfCargo(cargo);
  const targets = new Map();
  if (!transport) return targets;
  for (const tile of neighbors(transport.x, transport.y)) {
    if (canUnloadTransport(transport, tile.x, tile.y)) targets.set(tileKey(tile.x, tile.y), 1);
  }
  return targets;
}

function movementCostFor(unit, x, y) {
  if (isAirUnit(unit)) return 1;
  if (isSeaUnit(unit)) return ["w", "h"].includes(terrain[y][x]) ? 1 : 99;
  if (terrain[y][x] === "m") return 99;
  return terrainAt(x, y).move;
}

function defenseAt(x, y, defender = null) {
  const building = buildingAt(x, y);
  const buildingDefense = building?.type === "bunker" ? BUNKER_DEFENSE : 0;
  const terrainDefense = terrainAt(x, y).defense;
  const infantryCover = defender?.type === "infantry" && ["c", "f"].includes(terrain[y][x]) ? 1 : 0;
  return terrainDefense + buildingDefense + infantryCover;
}

function matchupBonus(attacker, defender) {
  if (attacker.type === "tank" && defender.type === "infantry") return 2;
  if (attacker.type === "heavyTank" && ["tank", "heavyTank", "infantry"].includes(defender.type)) return 2;
  if (attacker.type === "infantry" && ["tank", "heavyTank"].includes(defender.type) && ["c", "f"].includes(terrain[attacker.y][attacker.x])) return 1;
  if (attacker.type === "artillery" && !isAirUnit(defender)) return 1;
  if (attacker.type === "rocketArtillery" && !isAirUnit(defender)) return 2;
  if (attacker.type === "fighter" && isAirUnit(defender)) return 3;
  if (attacker.type === "bomber" && !isAirUnit(defender)) return 2;
  if (attacker.type === "destroyer" && (isAirUnit(defender) || isSeaUnit(defender))) return 2;
  if (attacker.type === "patrolBoat" && isSeaUnit(defender)) return 2;
  if (attacker.type === "landingShip" && !isSeaUnit(defender)) return -1;
  return 0;
}

function hexCenter(x, y) {
  return {
    x: HEX_OFFSET_X + HEX_W / 2 + x * HEX_W + (y % 2) * (HEX_W / 2),
    y: HEX_OFFSET_Y + HEX_SIZE + y * HEX_SIZE * 1.5,
  };
}

function hexPath(x, y, inset = 0) {
  const center = hexCenter(x, y);
  const radius = HEX_SIZE - inset;
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    const px = center.x + radius * Math.cos(angle);
    const py = center.y + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function offsetToCube(x, y) {
  const q = x - Math.floor(y / 2);
  const r = y;
  return { x: q, y: -q - r, z: r };
}

function distance(a, b) {
  const ac = offsetToCube(a.x, a.y);
  const bc = offsetToCube(b.x, b.y);
  return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
}

function hasUnlimitedAttackRange(unit) {
  return unit.type === "icbm" || unit.type === "nuke";
}

function isConsumableMissile(unit) {
  return unit.type === "icbm" || unit.type === "nuke";
}

function isInstantKillAttack(unit) {
  return unit.type === "nuke";
}

function canAttackTarget(attacker, defender) {
  if (!attacker || !defender || attacker.side === defender.side || attacker.acted) return false;
  if (attacker.carriedBy || defender.carriedBy) return false;
  if (!canSeeUnit(attacker.side, defender)) return false;
  return hasUnlimitedAttackRange(attacker) || distance(attacker, defender) <= unitTypes[attacker.type].range;
}

function canNukeTile(attacker, x, y) {
  if (!attacker || attacker.type !== "nuke" || attacker.acted) return false;
  if (!visibleTiles(attacker.side).has(tileKey(x, y))) return false;
  return Boolean(buildingAt(x, y)) || ["c", "x", "a", "h", "b", "k", "q"].includes(terrain[y][x]);
}

function visibleTiles(side) {
  const visible = new Set();
  const reveal = (x, y, radius) => {
    for (let yy = 0; yy < ROWS; yy += 1) {
      for (let xx = 0; xx < COLS; xx += 1) {
        if (distance({ x, y }, { x: xx, y: yy }) <= radius) visible.add(tileKey(xx, yy));
      }
    }
  };
  for (const unit of units.filter((item) => item.side === side && !item.carriedBy)) {
    reveal(unit.x, unit.y, unitTypes[unit.type].vision || 3);
  }
  for (const building of buildings.filter((item) => item.owner === side)) {
    reveal(building.x, building.y, building.type === "city" || building.capital ? 3 : 2);
  }
  return visible;
}

function canSeeUnit(side, unit) {
  if (unit.side === side) return true;
  return visibleTiles(side).has(tileKey(unit.x, unit.y));
}

function isSupplied(unit) {
  if (!unit || unit.carriedBy || isConsumableMissile(unit)) return true;
  const supplyTypes = isSeaUnit(unit) ? ["port", "city"] : isAirUnit(unit) ? ["airport", "city"] : ["city", "factory", "port"];
  return buildings.some(
    (building) =>
      building.owner === unit.side &&
      supplyTypes.includes(building.type) &&
      distance(unit, building) <= SUPPLY_RANGE
  );
}

function effectiveMove(unit) {
  return Math.max(1, unitTypes[unit.type].move - (isSupplied(unit) ? 0 : 1));
}

function effectiveAttack(unit) {
  return Math.max(1, unitTypes[unit.type].attack - (isSupplied(unit) ? 0 : 2));
}

function neighbors(x, y) {
  const offsets =
    y % 2 === 0
      ? [
          { x: 1, y: 0 },
          { x: 0, y: -1 },
          { x: -1, y: -1 },
          { x: -1, y: 0 },
          { x: -1, y: 1 },
          { x: 0, y: 1 },
        ]
      : [
          { x: 1, y: 1 },
          { x: 1, y: 0 },
          { x: 1, y: -1 },
          { x: 0, y: -1 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
        ];
  return offsets.map((pos) => ({ x: x + pos.x, y: y + pos.y })).filter((pos) => inBounds(pos.x, pos.y));
}

function computeReachable(unit) {
  const costs = new Map([[tileKey(unit.x, unit.y), 0]]);
  const queue = [{ x: unit.x, y: unit.y, cost: 0 }];

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();

    for (const next of neighbors(current.x, current.y)) {
      const occupant = unitAt(next.x, next.y);
      const key = tileKey(next.x, next.y);
      if (occupant && canBoardTransport(unit, occupant)) {
        const nextCost = current.cost + 1;
        if (nextCost <= effectiveMove(unit) && (!costs.has(key) || nextCost < costs.get(key))) costs.set(key, nextCost);
        continue;
      }
      if (occupant && occupant.side !== unit.side) continue;
      const stepCost = movementCostFor(unit, next.x, next.y);
      if (stepCost > effectiveMove(unit)) continue;
      const nextCost = current.cost + stepCost;
      if (nextCost <= effectiveMove(unit) && (!costs.has(key) || nextCost < costs.get(key))) {
        costs.set(key, nextCost);
        queue.push({ ...next, cost: nextCost });
      }
    }
  }

  costs.delete(tileKey(unit.x, unit.y));
  for (const ally of units.filter((item) => item.side === unit.side && item.id !== unit.id)) {
    if (canBoardTransport(unit, ally)) continue;
    costs.delete(tileKey(ally.x, ally.y));
  }
  return costs;
}

function computeAttackable(unit) {
  const targets = new Set();
  for (const enemy of units.filter((item) => !item.carriedBy && item.side !== unit.side)) {
    if (canAttackTarget(unit, enemy)) targets.add(enemy.id);
  }
  return targets;
}

function selectUnit(unit) {
  if (gameOver || phase !== "play" || unit.side !== turn) return;
  selectedId = unit.id;
  if (unit.carriedBy) {
    reachable = computeCargoUnloadTargets(unit);
    attackable = new Set();
  } else {
    reachable = unit.moved || unit.delegated ? new Map() : computeReachable(unit);
    attackable = unit.acted ? new Set() : computeAttackable(unit);
  }
  updateUi();
  draw();
}

function log(message) {
  messages.unshift(message);
  messages = messages.slice(0, 9);
}

function makeSnapshot() {
  return {
    units: units.map((unit) => ({ ...unit })),
    terrain: terrain.map((row) => [...row]),
    buildings: buildings.map((building) => ({ ...building })),
    money: { ...money },
    techState: {
      blue: { unlocked: [...techState.blue.unlocked] },
      red: { unlocked: [...techState.red.unlocked] },
    },
    unitCounter,
    attackEffects: attackEffects.map((effect) => ({ ...effect })),
    selectedId,
    selectedFactoryKey,
    turn,
    phase,
    gameOver,
    currentMapId,
    messages: [...messages],
  };
}

function saveUndo() {
  undoStack.push(makeSnapshot());
  undoStack = undoStack.slice(-20);
}

function restoreSnapshot(snapshot) {
  units = snapshot.units.map((unit) => ({ ...unit }));
  terrain = snapshot.terrain.map((row) => [...row]);
  buildings = snapshot.buildings.map((building) => ({ ...building }));
  money = { ...snapshot.money };
  techState = {
    blue: { unlocked: new Set(snapshot.techState.blue.unlocked) },
    red: { unlocked: new Set(snapshot.techState.red.unlocked) },
  };
  unitCounter = snapshot.unitCounter;
  attackEffects = snapshot.attackEffects.map((effect) => ({ ...effect }));
  selectedId = units.some((unit) => unit.id === snapshot.selectedId) ? snapshot.selectedId : null;
  selectedFactoryKey = snapshot.selectedFactoryKey;
  turn = snapshot.turn;
  phase = snapshot.phase;
  gameOver = snapshot.gameOver;
  currentMapId = snapshot.currentMapId || currentMapId;
  messages = [...snapshot.messages];
  const unit = selectedUnit();
  reachable = unit?.carriedBy ? computeCargoUnloadTargets(unit) : unit && !unit.moved ? computeReachable(unit) : new Map();
  attackable = unit && !unit.carriedBy && !unit.acted ? computeAttackable(unit) : new Set();
}

function undoLastMove() {
  if (!undoStack.length) return;
  if (aiTimer) clearTimeout(aiTimer);
  aiTimer = null;
  if (effectTimer) cancelAnimationFrame(effectTimer);
  effectTimer = null;
  if (movementTimer) cancelAnimationFrame(movementTimer);
  movementTimer = null;
  movementAnimations = [];
  delegatedAfterComplete = null;
  restoreSnapshot(undoStack.pop());
  hideVictoryScreen();
  playSound("undo");
  log("一手戻しました。");
  updateUi();
  draw();
}

function moveSelected(x, y) {
  const unit = selectedUnit();
  if (!unit || unit.carriedBy || unit.delegated || unit.moved || !reachable.has(tileKey(x, y))) return false;
  saveUndo();
  selectedFactoryKey = null;
  const transport = unitAt(x, y);
  if (canBoardTransport(unit, transport)) {
    unit.x = transport.x;
    unit.y = transport.y;
    unit.carriedBy = transport.id;
    unit.moved = true;
    unit.acted = true;
    selectedId = transport.id;
    reachable = new Map();
    attackable = transport.acted ? new Set() : computeAttackable(transport);
    playSound("move");
    log(`${sideName(unit.side)} ${unitTypes[unit.type].label} が ${unitTypes[transport.type].label} に乗船。`);
    updateUi();
    draw();
    return true;
  }
  const from = { x: unit.x, y: unit.y };
  unit.x = x;
  unit.y = y;
  syncCargoPosition(unit);
  unit.moved = true;
  startUnitMoveAnimation(unit, from, { x, y });
  playSound("move");
  reachable = new Map();
  attackable = unit.acted ? new Set() : computeAttackable(unit);
  log(`${sideName(unit.side)} ${unitTypes[unit.type].label} が移動。`);
  updateUi();
  draw();
  return true;
}

function unloadTransport(transport, x, y) {
  if (!canUnloadTransport(transport, x, y)) return false;
  saveUndo();
  const cargo = cargoOf(transport);
  cargo.carriedBy = null;
  cargo.x = x;
  cargo.y = y;
  cargo.moved = true;
  cargo.acted = true;
  transport.moved = true;
  selectedId = cargo.id;
  reachable = new Map();
  attackable = new Set();
  playSound("move");
  log(`${sideName(transport.side)} ${unitTypes[cargo.type].label} が ${unitTypes[transport.type].label} から揚陸。`);
  updateUi();
  draw();
  return true;
}

function syncCargoPosition(transport) {
  if (transport.type !== "landingShip") return;
  const cargo = cargoOf(transport);
  if (!cargo) return;
  cargo.x = transport.x;
  cargo.y = transport.y;
}

function attack(attacker, defender) {
  if (!canAttackTarget(attacker, defender)) return false;

  const from = { x: attacker.x, y: attacker.y };
  const to = { x: defender.x, y: defender.y };
  const attackPower = effectiveAttack(attacker) + matchupBonus(attacker, defender);
  const defense = unitTypes[defender.type].armor + defenseAt(defender.x, defender.y, defender);
  const damage = isInstantKillAttack(attacker)
    ? defender.hp
    : Math.max(1, attackPower - Math.floor(defense / 2) + Math.floor(Math.random() * 2));
  const isConsumable = isConsumableMissile(attacker);
  selectedFactoryKey = null;
  defender.hp -= damage;
  attacker.acted = true;
  attacker.moved = true;
  addAttackEffect(from, to, damage, unitTypes[attacker.type].range > 1 || isConsumable ? "shell" : "hit");
  playSound(attacker.type === "nuke" ? "nuke" : isConsumable ? "missile" : "attack");
  log(`${sideName(attacker.side)} ${unitTypes[attacker.type].label} が ${sideName(defender.side)} ${unitTypes[defender.type].label} に ${damage} ダメージ。`);

  if (defender.hp <= 0) {
    log(`${sideName(defender.side)} ${unitTypes[defender.type].label} 撃破。`);
    removeUnit(defender.id);
    if (attacker.type === "nuke") destroyTileAt(to.x, to.y, attacker.side);
  } else if (!isConsumable && distance(attacker, defender) === 1) {
    const counterDamage = Math.max(1, Math.round(damage * 0.7));
    attacker.hp -= counterDamage;
    addAttackEffect(to, from, counterDamage, "counter");
    log(`${sideName(attacker.side)} ${unitTypes[attacker.type].label} が反撃で ${counterDamage} ダメージ。`);
    if (attacker.hp <= 0) {
      log(`${sideName(attacker.side)} ${unitTypes[attacker.type].label} 撃破。`);
      removeUnit(attacker.id);
    }
  }
  if (isConsumable && units.some((unit) => unit.id === attacker.id)) {
    removeUnit(attacker.id);
    log(`${sideName(attacker.side)} ${unitTypes[attacker.type].label} は発射後に消滅。`);
  }

  checkVictory();
  selectedId = attacker.side === turn && units.some((unit) => unit.id === attacker.id) ? attacker.id : null;
  reachable = new Map();
  attackable = selectedUnit() && !selectedUnit().acted ? computeAttackable(selectedUnit()) : new Set();
  updateUi();
  draw();
  return true;
}

function nukeTile(attacker, x, y) {
  if (!canNukeTile(attacker, x, y)) return false;
  saveUndo();
  selectedFactoryKey = null;
  const from = { x: attacker.x, y: attacker.y };
  const to = { x, y };
  attacker.acted = true;
  attacker.moved = true;
  addAttackEffect(from, to, 999, "shell");
  playSound("nuke");
  destroyTileAt(x, y, attacker.side);
  removeUnit(attacker.id);
  log(`${sideName(attacker.side)} ${unitTypes[attacker.type].label} は発射後に消滅。`);
  checkVictory();
  selectedId = null;
  reachable = new Map();
  attackable = new Set();
  updateUi();
  draw();
  return true;
}

function removeUnit(unitId) {
  units = units.filter((unit) => unit.id !== unitId && unit.carriedBy !== unitId);
}

function destroyTileAt(x, y, attackerSide) {
  const building = buildingAt(x, y);
  const previousOwner = building?.owner;
  const wasCapital = Boolean(building?.capital);
  if (building || ["c", "x", "a", "h", "b", "k", "q"].includes(terrain[y][x])) {
    buildings = buildings.filter((item) => item.x !== x || item.y !== y);
    terrain[y][x] = terrain[y][x] === "h" || building?.type === "port" ? "w" : "p";
    log(`核攻撃で ${building ? buildingLabel(building) : "施設"} が破壊されました。`);
  }
  if (wasCapital && previousOwner) {
    const winner = previousOwner === attackerSide ? (attackerSide === "blue" ? "red" : "blue") : attackerSide;
    endGameByCapital(winner, previousOwner, "破壊");
  }
}

function attackEffectText(effect) {
  if (effect.damage >= 999) return "ズドーン!";
  if (effect.kind === "shell") return "ドーン!";
  if (effect.kind === "counter") return "ガン!";
  return "ドン!";
}

function addAttackEffect(from, to, damage, kind) {
  attackEffects.push({
    fromX: from.x,
    fromY: from.y,
    toX: to.x,
    toY: to.y,
    damage,
    kind,
    start: performance.now(),
    duration: damage >= 999 ? 900 : kind === "shell" ? 720 : 600,
  });
  if (!effectTimer) animateEffects();
}

function startUnitMoveAnimation(unit, from, to) {
  if (!movementAnimations) movementAnimations = [];
  movementAnimations = movementAnimations.filter((animation) => animation.unitId !== unit.id);
  movementAnimations.push({
    unitId: unit.id,
    fromX: from.x,
    fromY: from.y,
    toX: to.x,
    toY: to.y,
    start: performance.now(),
    duration: 380,
  });
  if (!movementTimer) animateMovement();
}

function animateEffects() {
  const now = performance.now();
  attackEffects = attackEffects.filter((effect) => now - effect.start < effect.duration);
  draw();
  if (attackEffects.length) {
    effectTimer = requestAnimationFrame(animateEffects);
  } else {
    effectTimer = null;
  }
}

function animateMovement() {
  const now = performance.now();
  movementAnimations = movementAnimations.filter((animation) => now - animation.start < animation.duration);
  draw();
  if (movementAnimations.length) {
    movementTimer = requestAnimationFrame(animateMovement);
  } else {
    movementTimer = null;
  }
}

function sideName(side) {
  return side === "blue" ? "Blue" : "Red";
}

function endTurn(recordUndo = true) {
  if (gameOver || phase !== "play") return;
  if (turn === "blue") {
    if (recordUndo) saveUndo();
    if (recordUndo) playSound("turn");
    const finishBlueTurn = () => {
      runAutoProduction("blue");
      advanceTurn(false);
    };
    if (delegatedUnitIds().length) runDelegatedTurn(finishBlueTurn);
    else finishBlueTurn();
    return;
  }
  advanceTurn(recordUndo);
}

function advanceTurn(recordUndo = true) {
  if (gameOver) return;
  if (recordUndo) saveUndo();
  if (recordUndo) playSound("turn");
  resolveCaptures(turn);
  if (gameOver) return;
  updateObjectiveControl(turn);
  if (gameOver) return;
  progressConstruction(turn);
  selectedId = null;
  selectedFactoryKey = null;
  reachable = new Map();
  attackable = new Set();
  turn = turn === "blue" ? "red" : "blue";
  collectIncome(turn);
  for (const unit of units.filter((item) => item.side === turn)) {
    unit.moved = false;
    unit.acted = false;
    unit.deploying = false;
    unit.botControlledThisTurn = false;
  }
  for (const building of buildings.filter((item) => item.owner === turn && item.type === "city")) {
    building.upgradedThisTurn = false;
  }
  log(`${sideName(turn)} のターン。`);
  updateUi();
  draw();
  if (turn === "red") runAiTurn();
}

function runAiTurn() {
  phase = "ai";
  selectedId = null;
  reachable = new Map();
  attackable = new Set();
  statusEl.textContent = "Red 思考中...";
  updateUi();
  scheduleAiStep(() => {
    runAiProduction();
    updateUi();
    draw();
    runBotUnitStep(
      "red",
      units.filter((item) => item.side === "red" && !item.deploying).map((unit) => unit.id),
      0,
      finishAiTurnOrContinue
    );
  }, AI_STEP_DELAY);
}

function scheduleAiStep(callback, delay = AI_STEP_DELAY) {
  aiTimer = setTimeout(() => {
    aiTimer = null;
    callback();
  }, delay);
}

function delegatedUnitIds() {
  return units
    .filter((unit) => unit.side === "blue" && unit.delegated && !unit.deploying && (!unit.moved || !unit.acted))
    .map((unit) => unit.id);
}

function runDelegatedTurn(afterComplete = null) {
  if (gameOver || turn !== "blue") return;
  const delegatedIds = delegatedUnitIds();
  if (!delegatedIds.length) return;
  delegatedAfterComplete = afterComplete;
  phase = "delegate";
  selectedId = null;
  reachable = new Map();
  attackable = new Set();
  statusEl.textContent = "委任ユニット行動中...";
  updateUi();
  draw();
  scheduleAiStep(() => runBotUnitStep("blue", delegatedIds, 0, finishDelegatedTurnOrContinue), AI_STEP_DELAY);
}

function runBotUnitStep(side, unitIds, index, finishStep) {
  if (gameOver) return;
  const unit = units.find((item) => item.id === unitIds[index] && item.side === side);
  if (!unit || unit.deploying) {
    finishStep(unitIds, index + 1);
    return;
  }

  selectedId = unit.id;
  reachable = new Map();
  attackable = unit.acted ? new Set() : computeAttackable(unit);
  statusEl.textContent = `${sideName(side)} ${unitTypes[unit.type].label} 行動中...`;
  updateUi();
  draw();

  const target = nearestBotTarget(unit);
  if (!target) {
    finishStep(unitIds, index + 1);
    return;
  }

  if (!hasUnlimitedAttackRange(unit) && distance(unit, target) > unitTypes[unit.type].range) {
    const move = bestAiMove(unit, target);
    if (move) {
      if (side === "blue") unit.botControlledThisTurn = true;
      const from = { x: unit.x, y: unit.y };
      unit.x = move.x;
      unit.y = move.y;
      syncCargoPosition(unit);
      unit.moved = true;
      startUnitMoveAnimation(unit, from, move);
      playSound("move");
      log(`${sideName(side)} ${unitTypes[unit.type].label} が移動。`);
      updateUi();
      draw();
    }
  }

  scheduleAiStep(() => {
    const current = units.find((item) => item.id === unit.id && item.side === side);
    if (current && !gameOver) {
      const possibleTargets = units
        .filter((enemy) => canAttackTarget(current, enemy))
        .sort((a, b) => a.hp - b.hp);
      if (possibleTargets[0]) {
        if (side === "blue") current.botControlledThisTurn = true;
        attack(current, possibleTargets[0]);
      }
    }
    scheduleAiStep(() => finishStep(unitIds, index + 1), AI_STEP_DELAY);
  }, AI_STEP_DELAY);
}

function finishAiTurnOrContinue(unitIds, nextIndex) {
  if (gameOver) return;
  if (nextIndex < unitIds.length) {
    runBotUnitStep("red", unitIds, nextIndex, finishAiTurnOrContinue);
    return;
  }
  selectedId = null;
  reachable = new Map();
  attackable = new Set();
  phase = "play";
  endTurn(false);
}

function finishDelegatedTurnOrContinue(unitIds, nextIndex) {
  if (gameOver) return;
  if (nextIndex < unitIds.length) {
    runBotUnitStep("blue", unitIds, nextIndex, finishDelegatedTurnOrContinue);
    return;
  }
  selectedId = null;
  reachable = new Map();
  attackable = new Set();
  phase = "play";
  updateUi();
  draw();
  const afterComplete = delegatedAfterComplete;
  delegatedAfterComplete = null;
  if (afterComplete) afterComplete();
}

function resolveCaptures(side) {
  for (const unit of units.filter((item) => !item.carriedBy && item.side === side && canCaptureBuilding(item))) {
    const building = buildingAt(unit.x, unit.y);
    if (!building || building.owner === side) continue;
    const previousOwner = building.owner;
    building.owner = side;
    building.autoProduce = null;
    building.controlTurns = 0;
    playSound("capture");
    log(`${sideName(side)} が ${buildingLabel(building)} を占領。`);
    if (building.capital && previousOwner && previousOwner !== side) {
      endGameByCapital(side, previousOwner);
      return;
    }
  }
}

function updateObjectiveControl(side) {
  for (const building of buildings.filter((item) => item.type === "city" && !item.capital)) {
    if (distance(building, { x: 12, y: 8 }) > 5) continue;
    if (building.owner !== side) continue;
    building.controlTurns = (building.controlTurns || 0) + 1;
    log(`${sideName(side)} が ${buildingLabel(building)} を保持中 (${building.controlTurns}/${OBJECTIVE_HOLD_TURNS})。`);
    if (building.controlTurns >= OBJECTIVE_HOLD_TURNS) {
      endGameByObjective(side, building);
      return;
    }
  }
}

function canCaptureBuilding(unit) {
  return unit.type === "infantry" || unitTypes[unit.type].captures;
}

function collectIncome(side) {
  const income = incomeFor(side);
  if (!income) return;
  money[side] += income;
  log(`${sideName(side)} 収入 +${income}G。`);
}

function cityLevel(building) {
  return building.level || 1;
}

function cityIncome(building) {
  return CITY_INCOME * cityLevel(building);
}

function incomeFor(side) {
  return buildings
    .filter((building) => building.type === "city" && building.owner === side)
    .reduce((total, building) => total + cityIncome(building), 0);
}

function isTechUnlocked(side, type) {
  const techId = unitTypes[type].tech;
  return !techId || techState[side].unlocked.has(techId);
}

function domainLabel(domain) {
  if (domain === "air") return "空";
  if (domain === "sea") return "海";
  return "陸";
}

function productionFacilityLabel(type) {
  if (LAND_UNITS.includes(type)) return "工場";
  if (AIR_UNITS.includes(type)) return "空港";
  if (NAVAL_UNITS.includes(type)) return "港";
  return "-";
}

function unitRoleText(type) {
  const roles = {
    infantry: "占領・市街地防御",
    engineer: "建設",
    recon: "索敵・高速移動",
    tank: "主力近接戦闘",
    heavyTank: "高耐久・高火力",
    artillery: "間接攻撃",
    rocketArtillery: "長射程火力",
    icbm: "全域攻撃・使い切り",
    nuke: "全域破壊・使い切り",
    fighter: "高速航空戦力",
    bomber: "対地火力",
    patrolBoat: "高速海上戦力",
    destroyer: "海上火力",
    landingShip: "輸送・占領",
  };
  return roles[type] || "";
}

function renderUnitGuide() {
  if (!unitGuideTable) return;
  const rows = UNIT_GUIDE_ORDER.map((type) => {
    const unit = unitTypes[type];
    const range = hasUnlimitedAttackRange({ type }) ? "全域" : unit.range;
    const attack = isInstantKillAttack({ type }) ? "無限" : unit.attack;
    const tech = unit.tech ? "技術解放" : "初期";
    return `
      <tr>
        <th scope="row">${unit.label}</th>
        <td>${domainLabel(unit.domain)}</td>
        <td>${unit.hp}</td>
        <td>${unit.move}</td>
        <td>${range}</td>
        <td>${attack}</td>
        <td>${unit.armor}</td>
        <td>${unit.vision || 3}</td>
        <td>${unit.cost}G</td>
        <td>${productionFacilityLabel(type)}</td>
        <td>${tech}</td>
        <td>${unitRoleText(type)}</td>
      </tr>
    `;
  }).join("");
  unitGuideTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ユニット</th>
          <th>種別</th>
          <th>HP</th>
          <th>移動</th>
          <th>射程</th>
          <th>攻撃</th>
          <th>装甲</th>
          <th>視界</th>
          <th>価格</th>
          <th>生産</th>
          <th>解放</th>
          <th>役割</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function nextResearchTech(side) {
  return TECH_TREE.find((tech) => !techState[side].unlocked.has(tech.id) && (!tech.requires || techState[side].unlocked.has(tech.requires)));
}

function researchNextTech() {
  if (turn !== "blue" || phase !== "play" || gameOver) return;
  const tech = nextResearchTech("blue");
  if (!tech || money.blue < tech.cost) return;
  saveUndo();
  money.blue -= tech.cost;
  techState.blue.unlocked.add(tech.id);
  playSound("tech");
  log(`Blue ${tech.cost}Gで技術「${unitTypes[tech.type].label}」を解放。`);
  updateUi();
  draw();
}

function buildingLabel(building) {
  if (building.type === "bunker") return "バンカー";
  if (building.type === "factory") return "工場";
  if (building.type === "airport") return "空港";
  if (building.type === "port") return "港";
  if (building.type === "construction") return `${buildingLabel({ type: building.buildKind })}建設現場`;
  return "都市";
}

function canFacilityProduce(facility, type) {
  if (!facility) return false;
  if (facility.type === "factory") return LAND_UNITS.includes(type);
  if (facility.type === "airport") return AIR_UNITS.includes(type);
  if (facility.type === "port") return NAVAL_UNITS.includes(type);
  return false;
}

function canUseProductionTile(type, x, y) {
  if (!inBounds(x, y) || unitAt(x, y)) return false;
  const terrainType = terrain[y][x];
  if (NAVAL_UNITS.includes(type)) return ["w", "h"].includes(terrainType);
  if (AIR_UNITS.includes(type)) return terrainType !== "w" && terrainType !== "m";
  return terrainType !== "w" && terrainType !== "m";
}

function findProductionOutputTile(side, factory, type, options = {}) {
  if (
    !factory ||
    factory.owner !== side ||
    !canFacilityProduce(factory, type) ||
    !isTechUnlocked(side, type) ||
    money[side] < unitTypes[type].cost
  ) {
    return null;
  }
  const candidates = [{ x: factory.x, y: factory.y }];
  if (options.allowAdjacent) candidates.push(...neighbors(factory.x, factory.y));
  return candidates.find((tile) => canUseProductionTile(type, tile.x, tile.y)) || null;
}

function canProduce(side, factory, type, options = {}) {
  return (
    Boolean(findProductionOutputTile(side, factory, type, options))
  );
}

function produceAtFactory(side, factory, type, options = {}) {
  const outputTile = findProductionOutputTile(side, factory, type, options);
  if (!outputTile) return false;
  money[side] -= unitTypes[type].cost;
  const unit = newUnit(`${side[0]}${unitCounter}`, side, type, outputTile.x, outputTile.y);
  unitCounter += 1;
  unit.moved = true;
  unit.acted = true;
  unit.deploying = true;
  unit.delegated = Boolean(options.delegated);
  units.push(unit);
  playSound("produce");
  log(`${sideName(side)} ${buildingLabel(factory)}で ${unitTypes[type].label} を生産${unit.delegated ? "、委任ON" : ""}。`);
  return true;
}

function produceSelected(type) {
  if (turn !== "blue" || phase !== "play" || gameOver || !selectedFactoryKey) return;
  const [x, y] = selectedFactoryKey.split(",").map(Number);
  const factory = buildingAt(x, y);
  if (!canProduce("blue", factory, type)) return;
  saveUndo();
  selectedId = null;
  produceAtFactory("blue", factory, type);
  updateUi();
  draw();
}

function toggleDelegation() {
  const unit = selectedUnit();
  if (!unit || unit.side !== "blue" || gameOver || phase !== "play") return;
  saveUndo();
  const wasDelegated = unit.delegated;
  unit.delegated = !unit.delegated;
  playSound("ui");
  if (wasDelegated && !unit.delegated && unit.botControlledThisTurn) {
    unit.moved = false;
    unit.acted = false;
    unit.botControlledThisTurn = false;
    log(`Blue ${unitTypes[unit.type].label} の行動権を手動に戻しました。`);
  }
  log(`Blue ${unitTypes[unit.type].label} の委任を${unit.delegated ? "ON" : "OFF"}にしました。`);
  reachable = unit.moved || unit.delegated ? new Map() : computeReachable(unit);
  attackable = unit.acted ? new Set() : computeAttackable(unit);
  updateUi();
  draw();
}

function setAutoProduction(type) {
  if (turn !== "blue" || phase !== "play" || gameOver || !selectedFactoryKey) return;
  const [x, y] = selectedFactoryKey.split(",").map(Number);
  const factory = buildingAt(x, y);
  if (!factory || !PRODUCTION_FACILITIES.includes(factory.type) || factory.owner !== "blue") return;
  if (!canFacilityProduce(factory, type)) return;
  saveUndo();
  factory.autoProduce = type;
  if (canProduce("blue", factory, type, { allowAdjacent: true })) {
    produceAtFactory("blue", factory, type, { delegated: true, allowAdjacent: true });
  } else {
    playSound("ui");
  }
  log(`Blue ${buildingLabel(factory)}: ${unitTypes[type].label}を毎ターン生産して委任します。`);
  updateUi();
  draw();
}

function clearAutoProduction() {
  if (turn !== "blue" || phase !== "play" || gameOver || !selectedFactoryKey) return;
  const [x, y] = selectedFactoryKey.split(",").map(Number);
  const factory = buildingAt(x, y);
  if (!factory || !PRODUCTION_FACILITIES.includes(factory.type) || factory.owner !== "blue" || !factory.autoProduce) return;
  saveUndo();
  factory.autoProduce = null;
  const producedUnit = unitAt(factory.x, factory.y);
  if (producedUnit?.side === "blue" && producedUnit.deploying && producedUnit.delegated) {
    producedUnit.delegated = false;
  }
  playSound("ui");
  log(`Blue ${buildingLabel(factory)}の継続生産を解除。`);
  updateUi();
  draw();
}

function cityUpgradeCost(city) {
  const nextLevel = cityLevel(city) + 1;
  if (nextLevel > CITY_MAX_LEVEL) return null;
  return CITY_UPGRADE_COSTS[nextLevel] || null;
}

function upgradeSelectedCity() {
  if (turn !== "blue" || phase !== "play" || gameOver || !selectedFactoryKey) return;
  const [x, y] = selectedFactoryKey.split(",").map(Number);
  const city = buildingAt(x, y);
  if (!city || city.type !== "city" || city.owner !== "blue") return;
  const cost = cityUpgradeCost(city);
  if (!cost || city.upgradedThisTurn || money.blue < cost) return;
  saveUndo();
  money.blue -= cost;
  city.level = cityLevel(city) + 1;
  city.upgradedThisTurn = true;
  playSound("tech");
  log(`Blue 都市をLv${city.level}に強化。都市収入 ${cityIncome(city)}G。`);
  updateUi();
  draw();
}

function canEngineerBuild(unit, kind) {
  if (!unit || unit.side !== "blue" || unit.type !== "engineer") return false;
  if (turn !== "blue" || phase !== "play" || gameOver || unit.moved || unit.acted || unit.deploying) return false;
  if (buildingAt(unit.x, unit.y)) return false;
  if (["w", "m"].includes(terrain[unit.y][unit.x])) return false;
  const cost = kind === "factory" ? FACTORY_BUILD_COST : kind === "airport" ? AIRPORT_BUILD_COST : BUNKER_BUILD_COST;
  return money.blue >= cost;
}

function buildStructure(kind) {
  const unit = selectedUnit();
  if (!canEngineerBuild(unit, kind)) return;
  saveUndo();
  const cost = kind === "factory" ? FACTORY_BUILD_COST : kind === "airport" ? AIRPORT_BUILD_COST : BUNKER_BUILD_COST;
  money.blue -= cost;
  if (["factory", "airport"].includes(kind)) {
    terrain[unit.y][unit.x] = kind === "factory" ? "k" : "q";
    buildings.push({
      x: unit.x,
      y: unit.y,
      type: "construction",
      buildKind: kind,
      owner: "blue",
      turnsRemaining: FACILITY_BUILD_TURNS,
      builderId: unit.id,
      startedThisTurn: true,
    });
  } else {
    if (kind === "bunker") terrain[unit.y][unit.x] = "b";
    buildings.push({ x: unit.x, y: unit.y, type: kind, owner: "blue" });
  }
  unit.moved = true;
  unit.acted = true;
  reachable = new Map();
  attackable = new Set();
  playSound("build");
  log(`Blue 工兵が${buildingLabel({ type: kind })}${["factory", "airport"].includes(kind) ? `の建設を開始。完成まで${FACILITY_BUILD_TURNS}ターン。` : "を建設。"}`);
  updateUi();
  draw();
}

function progressConstruction(side) {
  for (const building of buildings.filter((item) => item.type === "construction" && item.owner === side)) {
    if (building.startedThisTurn) {
      delete building.startedThisTurn;
      continue;
    }
    const builder = units.find(
      (unit) =>
        unit.id === building.builderId &&
        unit.side === side &&
        unit.type === "engineer" &&
        unit.x === building.x &&
        unit.y === building.y &&
        !unit.moved &&
        !unit.acted &&
        !unit.deploying
    );
    if (!builder) {
      log(`${sideName(side)} ${buildingLabel(building)}: 工兵が作業できず建設停止。`);
      continue;
    }
    building.turnsRemaining -= 1;
    builder.moved = true;
    builder.acted = true;
    if (building.turnsRemaining <= 0) {
      building.type = building.buildKind;
      delete building.buildKind;
      delete building.turnsRemaining;
      delete building.builderId;
      if (building.type === "factory") terrain[building.y][building.x] = "x";
      if (building.type === "airport") terrain[building.y][building.x] = "a";
      log(`${sideName(side)} ${buildingLabel(building)}が完成。`);
    } else {
      log(`${sideName(side)} ${buildingLabel(building)}: 完成まで${building.turnsRemaining}ターン。`);
    }
  }
}

function runAutoProduction(side) {
  for (const factory of buildings.filter((building) => PRODUCTION_FACILITIES.includes(building.type) && building.owner === side && building.autoProduce)) {
    produceAtFactory(side, factory, factory.autoProduce, { delegated: true, allowAdjacent: true });
  }
}

function runAiProduction() {
  const choices = ["nuke", "icbm", "rocketArtillery", "destroyer", "landingShip", "patrolBoat", "bomber", "fighter", "heavyTank", "tank", "artillery", "recon", "infantry"];
  for (const factory of buildings.filter((building) => PRODUCTION_FACILITIES.includes(building.type) && building.owner === "red")) {
    if (unitAt(factory.x, factory.y)) continue;
    const type = choices.find((item) => canProduce("red", factory, item));
    if (type) produceAtFactory("red", factory, type);
  }
}

function nearestEnemy(unit) {
  return units
    .filter((item) => !item.carriedBy && item.side !== unit.side)
    .sort((a, b) => distance(unit, a) - distance(unit, b))[0];
}

function objectiveScore(unit, building) {
  const base = distance(unit, building);
  const capitalBonus = building.capital ? -8 : 0;
  const centralBonus = building.type === "city" && !building.capital && distance(building, { x: 12, y: 8 }) <= 5 ? -4 : 0;
  const ownerBonus = building.owner && building.owner !== unit.side ? -2 : 0;
  return base + capitalBonus + centralBonus + ownerBonus;
}

function nearestObjective(unit) {
  if (!canCaptureBuilding(unit)) return null;
  return buildings
    .filter((building) => building.owner !== unit.side && ["city", "factory", "airport", "port"].includes(building.type))
    .sort((a, b) => objectiveScore(unit, a) - objectiveScore(unit, b))[0];
}

function nearestBotTarget(unit) {
  const attackableTarget = units
    .filter((enemy) => canAttackTarget(unit, enemy))
    .sort((a, b) => a.hp - b.hp)[0];
  if (attackableTarget) return attackableTarget;
  return nearestObjective(unit) || nearestEnemy(unit);
}

function nearestVisibleEnemy(unit) {
  return units
    .filter((item) => !item.carriedBy && item.side !== unit.side && canSeeUnit(unit.side, item))
    .sort((a, b) => distance(unit, a) - distance(unit, b))[0];
}

function bestAiMove(unit, target) {
  const options = [...computeReachable(unit).keys()]
    .map((key) => {
      const [x, y] = key.split(",").map(Number);
      return { x, y, score: distance({ x, y }, target) };
    })
    .sort((a, b) => a.score - b.score);
  return options[0];
}

function checkVictory() {
  const blue = units.some((unit) => unit.side === "blue");
  const red = units.some((unit) => unit.side === "red");
  if (blue && red) return;
  gameOver = true;
  phase = "done";
  const winner = blue ? "Blue" : "Red";
  statusEl.textContent = `${winner} 勝利`;
  log(`${winner} が戦場を制圧。`);
  showVictoryScreen(winner, "敵部隊をすべて撃破しました。");
}

function endGameByCapital(winnerSide, loserSide, action = "占領") {
  gameOver = true;
  phase = "done";
  selectedId = null;
  selectedFactoryKey = null;
  reachable = new Map();
  attackable = new Set();
  const winner = sideName(winnerSide);
  const loser = sideName(loserSide);
  statusEl.textContent = `${winner} 勝利`;
  log(`${winner} が ${loser} 首都を${action}。`);
  showVictoryScreen(winner, `${loser} 首都を${action}しました。`);
  updateUi();
  draw();
}

function endGameByObjective(winnerSide, building) {
  gameOver = true;
  phase = "done";
  selectedId = null;
  selectedFactoryKey = null;
  reachable = new Map();
  attackable = new Set();
  const winner = sideName(winnerSide);
  statusEl.textContent = `${winner} 勝利`;
  log(`${winner} が中央拠点を保持して勝利。`);
  showVictoryScreen(winner, `中央拠点を${OBJECTIVE_HOLD_TURNS}ターン保持しました。`);
  updateUi();
  draw();
}

function showVictoryScreen(winner, message) {
  victoryTitle.textContent = `${winner} 勝利`;
  victoryBadge.textContent = winner === "Blue" ? "作戦成功" : "作戦失敗";
  victoryText.textContent = message || (winner === "Blue" ? "敵部隊をすべて撃破しました。" : "自軍部隊が壊滅しました。");
  victoryOverlay.hidden = false;
  playSound(winner === "Blue" ? "victory" : "defeat");
}

function hideVictoryScreen() {
  victoryOverlay.hidden = true;
}

function updateUi() {
  blueCountEl.textContent = units.filter((unit) => unit.side === "blue").length;
  redCountEl.textContent = units.filter((unit) => unit.side === "red").length;
  moneyCountEl.textContent = `${money.blue}G`;
  incomeCountEl.textContent = `+${incomeFor("blue")}G`;
  undoBtn.disabled = !undoStack.length;
  endTurnBtn.disabled = gameOver || phase !== "play" || turn !== "blue";
  if (!gameOver && phase !== "ai" && phase !== "delegate") {
    statusEl.textContent = `${sideName(turn)} ターン: ${turn === "blue" ? "ユニットを選択" : "作戦実行中"}`;
  }

  const unit = selectedUnit();
  selectionPanel.hidden = !unit;
  if (!unit) {
    unitInfoEl.textContent = "未選択";
  } else {
    const type = unitTypes[unit.type];
    const transport = transportOfCargo(unit);
    unitInfoEl.innerHTML = [
      `<strong>${sideName(unit.side)} ${type.label}</strong>`,
      `HP ${unit.hp}/${unit.maxHp}`,
      `移動 ${effectiveMove(unit)} / 射程 ${hasUnlimitedAttackRange(unit) ? "全域" : type.range}`,
      `攻撃 ${isInstantKillAttack(unit) ? "無限" : effectiveAttack(unit)} / 装甲 ${type.armor} / 価格 ${type.cost}G`,
      `視界 ${type.vision || 3} / 補給 ${isSupplied(unit) ? "OK" : "不足"}`,
      transport ? `輸送中 ${unitTypes[transport.type].label}` : "",
      unit.type === "landingShip" ? `積載 ${cargoOf(unit) ? unitTypes[cargoOf(unit).type].label : "空き"}` : "",
      `委任 ${unit.delegated ? "ON" : "OFF"}`,
      `状態 ${unit.carriedBy ? "輸送中" : unit.deploying ? "配備中" : unit.moved ? "移動済" : "移動可"}・${unit.acted ? "攻撃済" : "攻撃可"}`,
    ].filter(Boolean).join("<br>");
  }

  delegateBtn.hidden = !unit || unit.side !== "blue" || unit.carriedBy;
  delegateBtn.textContent = unit?.delegated ? "委任を解除" : "委任する";
  delegateBtn.disabled = !unit || unit.side !== "blue" || unit.carriedBy || gameOver || phase !== "play";
  buildBunkerBtn.hidden = !unit || unit.side !== "blue" || unit.type !== "engineer";
  buildFactoryBtn.hidden = !unit || unit.side !== "blue" || unit.type !== "engineer";
  buildAirportBtn.hidden = !unit || unit.side !== "blue" || unit.type !== "engineer";
  buildBunkerBtn.textContent = `バンカー建設 ${BUNKER_BUILD_COST}G`;
  buildFactoryBtn.textContent = `工場建設 ${FACTORY_BUILD_COST}G/${FACILITY_BUILD_TURNS}T`;
  buildAirportBtn.textContent = `空港建設 ${AIRPORT_BUILD_COST}G/${FACILITY_BUILD_TURNS}T`;
  buildBunkerBtn.disabled = !canEngineerBuild(unit, "bunker");
  buildFactoryBtn.disabled = !canEngineerBuild(unit, "factory");
  buildAirportBtn.disabled = !canEngineerBuild(unit, "airport");

  const nextTech = nextResearchTech("blue");
  techInfoEl.textContent = nextTech
    ? `次: ${unitTypes[nextTech.type].label} ${nextTech.cost}G`
    : "すべて解放済み";
  researchTechBtn.disabled = !nextTech || money.blue < nextTech.cost || phase !== "play" || turn !== "blue";
  researchTechBtn.textContent = nextTech ? `解放する ${unitTypes[nextTech.type].label} ${nextTech.cost}G` : "解放完了";
  techTreeEl.innerHTML = TECH_TREE.map((tech) => {
    const unlocked = techState.blue.unlocked.has(tech.id);
    const lockedByParent = tech.requires && !techState.blue.unlocked.has(tech.requires);
    const status = unlocked ? "解放済" : lockedByParent ? "前提あり" : `${tech.cost}G`;
    return `<span class="${unlocked ? "unlocked" : ""}">${unitTypes[tech.type].label}<strong>${status}</strong></span>`;
  }).join("");

  const factory = selectedFactoryKey
    ? buildingAt(...selectedFactoryKey.split(",").map(Number))
    : null;
  const ownCity = turn === "blue" && phase === "play" && factory?.type === "city" && factory.owner === "blue";
  cityPanel.hidden = !(factory?.type === "city" && factory.owner === "blue");
  cityInfoEl.textContent = cityStatusText(factory, ownCity);
  const upgradeCost = factory?.type === "city" ? cityUpgradeCost(factory) : null;
  upgradeCityBtn.hidden = !(factory?.type === "city" && factory.owner === "blue");
  upgradeCityBtn.disabled = !ownCity || !upgradeCost || factory.upgradedThisTurn || money.blue < upgradeCost;
  upgradeCityBtn.textContent = upgradeCost ? `都市強化 ${upgradeCost}G` : "都市強化 完了";
  const factoryReady =
    turn === "blue" &&
    phase === "play" &&
    PRODUCTION_FACILITIES.includes(factory?.type) &&
    factory.owner === "blue" &&
    !unitAt(factory.x, factory.y);
  const ownFactory = turn === "blue" && phase === "play" && PRODUCTION_FACILITIES.includes(factory?.type) && factory.owner === "blue";
  productionPanel.hidden = !(PRODUCTION_FACILITIES.includes(factory?.type) && factory.owner === "blue");
  productionInfoEl.textContent = productionStatusText(factory, factoryReady);
  for (const button of productionButtons) {
    const type = button.dataset.produce;
    button.textContent = `${unitTypes[type].label} ${unitTypes[type].cost}G`;
    button.disabled = !factoryReady || !canFacilityProduce(factory, type) || !isTechUnlocked("blue", type) || money.blue < unitTypes[type].cost;
  }
  autoProductionInfoEl.textContent = autoProductionStatusText(factory, ownFactory);
  for (const button of autoProductionButtons) {
    const type = button.dataset.autoProduce;
    button.textContent = `${unitTypes[type].label}委任`;
    button.disabled = !ownFactory || !canFacilityProduce(factory, type) || !isTechUnlocked("blue", type);
  }
  clearAutoProductionBtn.hidden = !(ownFactory && factory?.autoProduce);
  clearAutoProductionBtn.disabled = !ownFactory || !factory?.autoProduce;

  logEl.innerHTML = messages.map((message) => `<li>${message}</li>`).join("");
}

function productionStatusText(factory, factoryReady) {
  if (!factory) return "自軍工場・空港・港を選択";
  if (factory.owner !== "blue") return "敵または中立の施設です";
  if (!PRODUCTION_FACILITIES.includes(factory.type)) return `${buildingLabel(factory)}を選択中`;
  if (unitAt(factory.x, factory.y)) return `${buildingLabel(factory)}の上に部隊がいます`;
  if (!factoryReady) return "自軍ターンで生産できます";
  return `資金 ${money.blue}G。${buildingLabel(factory)}で生産する部隊を選択`;
}

function cityStatusText(city, ownCity) {
  if (!city || city.type !== "city") return "自軍都市を選択";
  const level = cityLevel(city);
  const income = cityIncome(city);
  const cost = cityUpgradeCost(city);
  const prefix = city.capital ? "首都 " : "";
  if (city.owner !== "blue") return `${prefix}${buildingLabel(city)} Lv${level} / 収入 ${income}G`;
  if (!cost) return `${prefix}Lv${level} / 収入 ${income}G / 最大強化`;
  if (city.upgradedThisTurn) return `${prefix}Lv${level} / 収入 ${income}G / このターン強化済み`;
  if (!ownCity) return `${prefix}Lv${level} / 収入 ${income}G / 自軍ターンに強化可能`;
  return `${prefix}Lv${level} / 収入 ${income}G / 次 ${cost}G`;
}

function autoProductionStatusText(factory, ownFactory) {
  if (!factory) return "継続生産なし";
  if (!ownFactory) return "自軍工場・空港・港で設定できます";
  if (!factory.autoProduce) return "継続生産なし";
  return `毎ターン ${unitTypes[factory.autoProduce].label} を生産して委任`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawHighlights();
  drawUnits();
  drawAttackEffects();
}

function drawMap() {
  ctx.fillStyle = "#c8d9a7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const blueVisible = visibleTiles("blue");

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      drawTerrainTile(x, y, terrain[y][x]);
      ctx.strokeStyle = "rgba(14, 18, 16, 0.28)";
      ctx.lineWidth = 1.25;
      hexPath(x, y);
      ctx.stroke();
      drawBuildingOwner(x, y);
      if (!blueVisible.has(tileKey(x, y))) {
        ctx.fillStyle = "rgba(5, 8, 10, 0.42)";
        hexPath(x, y, 1);
        ctx.fill();
      }
    }
  }
}

function drawTerrainTile(x, y, type) {
  const center = hexCenter(x, y);
  const sprite = terrainSprites[type];
  ctx.save();
  hexPath(x, y);
  ctx.clip();
  ctx.fillStyle = terrainData[type].color;
  ctx.fillRect(center.x - HEX_W / 2, center.y - HEX_SIZE, HEX_W, HEX_SIZE * 2);

  if (terrainTileImage.complete && terrainTileImage.naturalWidth && sprite) {
    const drawW = HEX_SIZE * 2.42;
    const drawH = HEX_SIZE * 2.42;
    ctx.drawImage(
      terrainTileImage,
      sprite.x,
      sprite.y,
      sprite.w,
      sprite.h,
      center.x - drawW / 2,
      center.y - drawH / 2,
      drawW,
      drawH
    );
  } else {
    ctx.fillRect(center.x - HEX_W / 2, center.y - HEX_SIZE, HEX_W, HEX_SIZE * 2);
  }

  ctx.restore();
}

function drawBuildingOwner(x, y) {
  const building = buildingAt(x, y);
  if (!building) return;
  const color = building.owner === "blue" ? "#55a7ff" : building.owner === "red" ? "#ff6f63" : "#f2c75b";
  const center = hexCenter(x, y);
  ctx.save();
  if (building.type === "construction") {
    ctx.fillStyle = "rgba(44, 48, 51, 0.78)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(center.x - 25, center.y - 16, 50, 32);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f1f4ef";
    ctx.font = "800 13px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`C${building.turnsRemaining}`, center.x, center.y);
    ctx.restore();
    return;
  }
  if (building.type === "bunker") {
    ctx.fillStyle = color;
    ctx.strokeStyle = "#101314";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x + HEX_W * 0.28, center.y - HEX_SIZE * 0.45, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (building.type === "factory" && terrain[y][x] !== "x") {
    ctx.fillStyle = "rgba(44, 48, 51, 0.88)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(center.x - 23, center.y - 16, 46, 32);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f1f4ef";
    ctx.font = "800 13px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("F", center.x, center.y);
  }
  if (building.type === "airport") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(center.x - 26, center.y + 14);
    ctx.lineTo(center.x + 26, center.y + 14);
    ctx.moveTo(center.x, center.y + 14);
    ctx.lineTo(center.x, center.y - 20);
    ctx.moveTo(center.x - 15, center.y - 4);
    ctx.lineTo(center.x + 15, center.y - 4);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.strokeStyle = "#101314";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x + HEX_W * 0.28, center.y - HEX_SIZE * 0.45, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = "#101314";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x + HEX_W * 0.28, center.y - HEX_SIZE * 0.45, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (building.type === "city" && cityLevel(building) > 1) {
    ctx.fillStyle = "#101314";
    ctx.font = "800 10px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`L${cityLevel(building)}`, center.x + HEX_W * 0.28, center.y - HEX_SIZE * 0.45);
  }
  if (building.type === "city" && building.capital) {
    ctx.fillStyle = "#f2c75b";
    ctx.strokeStyle = "#101314";
    ctx.lineWidth = 3;
    ctx.font = "900 20px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("★", center.x, center.y - 4);
    ctx.fillText("★", center.x, center.y - 4);
  }
  ctx.restore();
}

function drawHighlights() {
  for (const key of reachable.keys()) {
    const [x, y] = key.split(",").map(Number);
    ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
    hexPath(x, y, 5);
    ctx.fill();
  }

  for (const id of attackable) {
    const unit = units.find((item) => item.id === id);
    if (!unit) continue;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 4;
    hexPath(unit.x, unit.y, 7);
    ctx.stroke();
  }

  const unit = selectedUnit();
  if (unit) {
    ctx.strokeStyle = "#f2c75b";
    ctx.lineWidth = 4;
    hexPath(unit.x, unit.y, 5);
    ctx.stroke();
  }

  if (selectedFactoryKey) {
    const [x, y] = selectedFactoryKey.split(",").map(Number);
    ctx.strokeStyle = "#f2c75b";
    ctx.lineWidth = 4;
    hexPath(x, y, 8);
    ctx.stroke();
  }
}

function drawUnits() {
  const blueVisible = visibleTiles("blue");
  for (const unit of units) {
    if (unit.carriedBy) continue;
    if (unit.side !== "blue" && !blueVisible.has(tileKey(unit.x, unit.y))) continue;
    const pos = displayPositionForUnit(unit);
    const color = unit.side === "blue" ? "#55a7ff" : "#ff6f63";
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.beginPath();
    ctx.ellipse(2, 23, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (unit.deploying) ctx.globalAlpha = 0.46;
    drawSideBase(color);
    drawUnitSprite(unit);
    ctx.globalAlpha = 1;
    drawHpBar(unit);
    if (unit.moved && unit.acted && !unit.deploying) {
      ctx.globalAlpha = 0.36;
      ctx.fillStyle = "#000";
      ctx.fillRect(-30, -30, 60, 60);
    } else if (unit.deploying) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 4, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (unit.delegated) {
      ctx.fillStyle = "#f2c75b";
      ctx.strokeStyle = "#101314";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(24, -24, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#101314";
      ctx.font = "800 10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A", 24, -24);
    }
    const cargo = cargoOf(unit);
    if (cargo) {
      ctx.fillStyle = "#f1f4ef";
      ctx.strokeStyle = "#101314";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-24, -24, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#101314";
      ctx.font = "800 10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("1", -24, -24);
    }
    ctx.restore();
  }
}

function displayPositionForUnit(unit) {
  const animation = movementAnimations?.find((item) => item.unitId === unit.id);
  if (!animation) return hexCenter(unit.x, unit.y);
  const now = performance.now();
  const rawProgress = Math.min(1, Math.max(0, (now - animation.start) / animation.duration));
  const progress = rawProgress < 0.5
    ? 2 * rawProgress * rawProgress
    : 1 - ((-2 * rawProgress + 2) ** 2) / 2;
  const from = hexCenter(animation.fromX, animation.fromY);
  const to = hexCenter(animation.toX, animation.toY);
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  };
}

function drawAttackEffects() {
  const now = performance.now();
  for (const effect of attackEffects) {
    const progress = Math.min(1, (now - effect.start) / effect.duration);
    const target = hexCenter(effect.toX, effect.toY);
    const source = hexCenter(effect.fromX, effect.fromY);
    const alpha = 1 - progress;

    if (effect.kind === "shell") {
      const trailProgress = Math.min(1, progress * 1.45);
      const bx = source.x + (target.x - source.x) * trailProgress;
      const by = source.y + (target.y - source.y) * trailProgress;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 238, 170, ${0.55 * alpha})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(source.x, source.y - 8);
      ctx.lineTo(bx, by - 8);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 248, 202, ${0.95 * alpha})`;
      ctx.beginPath();
      ctx.arc(bx, by - 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(target.x, target.y - 6);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = effect.kind === "counter" ? "#9ad8ff" : "#ffd36d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 12 + progress * 34, 0, Math.PI * 2);
    ctx.stroke();

    const sparks = 8;
    for (let i = 0; i < sparks; i += 1) {
      const angle = (Math.PI * 2 * i) / sparks + progress * 0.7;
      const inner = 8 + progress * 10;
      const outer = 18 + progress * 34;
      ctx.strokeStyle = i % 2 ? "#fff0b0" : "#ff8a3d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }

    const boomText = attackEffectText(effect);
    const boomScale = 1 + Math.sin(Math.min(1, progress * 2) * Math.PI) * 0.18;
    const boomAlpha = Math.max(0, 1 - Math.max(0, progress - 0.12) / 0.78);
    ctx.save();
    ctx.translate(0, -58 - progress * 16);
    ctx.rotate(effect.kind === "counter" ? -0.08 : 0.08);
    ctx.scale(boomScale, boomScale);
    ctx.globalAlpha = boomAlpha;
    ctx.font = effect.damage >= 999 ? "900 38px system-ui" : "900 32px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#15110d";
    ctx.fillStyle = effect.damage >= 999 ? "#ff5b35" : effect.kind === "counter" ? "#9ad8ff" : "#ffd36d";
    ctx.strokeText(boomText, 0, 0);
    ctx.fillText(boomText, 0, 0);
    ctx.restore();

    ctx.fillStyle = "#fff4c8";
    ctx.strokeStyle = "#111314";
    ctx.lineWidth = 4;
    ctx.font = "900 24px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textY = -36 - progress * 24;
    ctx.strokeText(`-${effect.damage}`, 0, textY);
    ctx.fillText(`-${effect.damage}`, 0, textY);
    ctx.restore();
  }
}

function drawSideBase(color) {
  ctx.beginPath();
  ctx.arc(0, 4, 31, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.36;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawUnitSprite(unit) {
  const sprite = unitSprites[unit.type];
  if (unitImage.complete && unitImage.naturalWidth && sprite) {
    const bounds = unitSpriteBounds(unit.type);
    const maxW = bounds.w;
    const maxH = bounds.h;
    const scale = Math.min(maxW / sprite.w, maxH / sprite.h);
    const drawW = sprite.w * scale;
    const drawH = sprite.h * scale;
    ctx.drawImage(unitImage, sprite.x, sprite.y, sprite.w, sprite.h, -drawW / 2, -drawH / 2, drawW, drawH);
    return;
  }

  if (isAirUnit(unit)) {
    drawReadableAirUnit(unit);
    return;
  }
  if (unit.type === "rocketArtillery" || unit.type === "icbm" || unit.type === "nuke") {
    drawMissileUnit(unit);
    return;
  }

  ctx.fillStyle = unit.side === "blue" ? "#55a7ff" : "#ff6f63";
  ctx.strokeStyle = "#101314";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-24, -18, 48, 36, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#101314";
  ctx.font = "700 13px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(unitIcon(unit.type), 0, 0);
}

function unitSpriteBounds(type) {
  if (type === "infantry" || type === "engineer") return { w: 40, h: 68 };
  if (type === "heavyTank") return { w: 82, h: 66 };
  if (type === "fighter" || type === "bomber") return { w: 86, h: 72 };
  if (type === "rocketArtillery") return { w: 78, h: 64 };
  if (type === "icbm" || type === "nuke") return { w: 84, h: 68 };
  if (NAVAL_UNITS.includes(type)) return { w: 92, h: 68 };
  return { w: 70, h: 58 };
}

function drawMissileUnit(unit) {
  const color = unit.side === "blue" ? "#55a7ff" : "#ff6f63";
  ctx.save();
  ctx.translate(0, -1);
  ctx.fillStyle = "#7f875d";
  ctx.strokeStyle = "#101314";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-27, 4, 54, 24, 6);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (unit.type === "nuke") {
    ctx.moveTo(-20, 4);
    ctx.lineTo(21, -29);
    ctx.moveTo(-4, 5);
    ctx.lineTo(30, -21);
    ctx.moveTo(-16, 15);
    ctx.lineTo(14, -4);
  } else if (unit.type === "icbm") {
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, -26);
    ctx.moveTo(-8, 2);
    ctx.lineTo(24, -20);
  } else {
    ctx.moveTo(-22, -2);
    ctx.lineTo(22, -16);
    ctx.moveTo(-20, 8);
    ctx.lineTo(24, -6);
    ctx.moveTo(-14, 17);
    ctx.lineTo(18, 5);
  }
  ctx.stroke();
  ctx.fillStyle = "#f1f4ef";
  ctx.font = "900 12px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(unit.type === "nuke" ? "NUKE" : unit.type === "icbm" ? "ICBM" : "MLRS", 0, 17);
  ctx.restore();
}

function drawReadableAirUnit(unit) {
  const color = unit.side === "blue" ? "#55a7ff" : "#ff6f63";
  const accent = unit.side === "blue" ? "#d9efff" : "#ffe2de";
  ctx.save();
  ctx.translate(0, -2);
  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  drawAirUnitShape(unit.type, "#101314", 1.18);
  ctx.shadowBlur = 0;
  drawAirUnitShape(unit.type, color, 1);
  drawAirUnitDetails(unit.type, accent);
  ctx.restore();
}

function drawAirUnitShape(type, color, scale = 1) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#101314";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (type === "bomber") {
    ctx.moveTo(0, -31);
    ctx.lineTo(11, 6);
    ctx.lineTo(31, 18);
    ctx.lineTo(8, 20);
    ctx.lineTo(0, 31);
    ctx.lineTo(-8, 20);
    ctx.lineTo(-31, 18);
    ctx.lineTo(-11, 6);
  } else {
    ctx.moveTo(0, -32);
    ctx.lineTo(9, 9);
    ctx.lineTo(30, 21);
    ctx.lineTo(5, 18);
    ctx.lineTo(0, 29);
    ctx.lineTo(-5, 18);
    ctx.lineTo(-30, 21);
    ctx.lineTo(-9, 9);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawAirUnitDetails(type, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (type === "bomber") {
    ctx.moveTo(-28, 6);
    ctx.lineTo(28, 6);
    ctx.moveTo(0, -26);
    ctx.lineTo(0, 26);
    ctx.moveTo(-8, 20);
    ctx.lineTo(8, 20);
  } else {
    ctx.moveTo(-22, 10);
    ctx.lineTo(22, 10);
    ctx.moveTo(0, -27);
    ctx.lineTo(0, 25);
    ctx.moveTo(-7, 18);
    ctx.lineTo(7, 18);
  }
  ctx.stroke();
}

function drawHpBar(unit) {
  ctx.fillStyle = "#111314";
  ctx.fillRect(-28, -34, 56, 7);
  ctx.fillStyle = unit.hp / unit.maxHp > 0.45 ? "#88d46b" : "#f2c75b";
  ctx.fillRect(-27, -33, 54 * (unit.hp / unit.maxHp), 5);
}

function unitIcon(type) {
  return {
    tank: "T",
    heavyTank: "H",
    infantry: "I",
    engineer: "E",
    artillery: "A",
    rocketArtillery: "M",
    icbm: "N",
    nuke: "X",
    recon: "R",
    fighter: "F",
    bomber: "B",
    patrolBoat: "P",
    destroyer: "D",
    landingShip: "L",
  }[type];
}

function canvasPos(event) {
  const rect = canvas.getBoundingClientRect();
  const point = {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
  let best = null;
  let bestDistance = Infinity;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const center = hexCenter(x, y);
      const score = (center.x - point.x) ** 2 + (center.y - point.y) ** 2;
      if (score < bestDistance) {
        bestDistance = score;
        best = { x, y };
      }
    }
  }
  return bestDistance <= HEX_SIZE ** 2 ? best : { x: -1, y: -1 };
}

canvas.addEventListener("click", (event) => {
  if (turn !== "blue" || phase !== "play" || gameOver) return;
  const pos = canvasPos(event);
  if (!inBounds(pos.x, pos.y)) return;
  const rawClicked = unitAt(pos.x, pos.y);
  const clicked = rawClicked && (rawClicked.side === "blue" || canSeeUnit("blue", rawClicked)) ? rawClicked : null;
  const building = buildingAt(pos.x, pos.y);
  const current = selectedUnit();

  if (current?.carriedBy) {
    const transport = transportOfCargo(current);
    if (transport && clicked?.id === transport.id) {
      selectedFactoryKey = null;
      selectUnit(transport);
      return;
    }
    if (transport && canUnloadTransport(transport, pos.x, pos.y)) {
      unloadTransport(transport, pos.x, pos.y);
      return;
    }
  }

  if (current && clicked?.id === current.id) {
    const cargo = cargoOf(current);
    if (cargo) {
      selectedFactoryKey = null;
      selectUnit(cargo);
      return;
    }
  }

  if (current && current.type === "landingShip" && canUnloadTransport(current, pos.x, pos.y)) {
    unloadTransport(current, pos.x, pos.y);
    return;
  }

  if (current && !current.delegated && clicked && canBoardTransport(current, clicked) && reachable.has(tileKey(pos.x, pos.y))) {
    moveSelected(pos.x, pos.y);
    return;
  }

  if (clicked && clicked.side === "blue") {
    selectedFactoryKey = null;
    selectUnit(clicked);
    return;
  }

  if (current && !current.delegated && clicked && clicked.side === "red") {
    if (canAttackTarget(current, clicked)) saveUndo();
    attack(current, clicked);
    return;
  }

  if (current && !current.delegated && canNukeTile(current, pos.x, pos.y)) {
    nukeTile(current, pos.x, pos.y);
    return;
  }

  if (current && reachable.has(tileKey(pos.x, pos.y))) {
    moveSelected(pos.x, pos.y);
    return;
  }

  if (building) {
    selectedId = null;
    reachable = new Map();
    attackable = new Set();
    selectedFactoryKey = tileKey(pos.x, pos.y);
    updateUi();
    draw();
    return;
  }

  if (current && !moveSelected(pos.x, pos.y)) {
    selectedId = null;
    reachable = new Map();
    attackable = new Set();
    updateUi();
    draw();
  }
});

undoBtn.addEventListener("click", undoLastMove);
delegateBtn.addEventListener("click", toggleDelegation);
buildBunkerBtn.addEventListener("click", () => buildStructure("bunker"));
buildFactoryBtn.addEventListener("click", () => buildStructure("factory"));
buildAirportBtn.addEventListener("click", () => buildStructure("airport"));
upgradeCityBtn.addEventListener("click", upgradeSelectedCity);
researchTechBtn.addEventListener("click", researchNextTech);
endTurnBtn.addEventListener("click", endTurn);
restartBtn.addEventListener("click", resetGame);
victoryRestartBtn.addEventListener("click", resetGame);
for (const button of productionButtons) {
  button.addEventListener("click", () => produceSelected(button.dataset.produce));
}
for (const button of autoProductionButtons) {
  button.addEventListener("click", () => setAutoProduction(button.dataset.autoProduce));
}
clearAutoProductionBtn.addEventListener("click", clearAutoProduction);
for (const button of mapButtons) {
  button.addEventListener("click", () => {
    playSound("ui");
    currentMapId = button.dataset.map;
    for (const item of mapButtons) item.classList.toggle("selected", item === button);
    resetGame(currentMapId);
  });
}
startGameBtn.addEventListener("click", () => {
  playSound("ui");
  resetGame(currentMapId);
  titleOverlay.hidden = true;
});
titleBtn.addEventListener("click", () => {
  playSound("ui");
  if (aiTimer) clearTimeout(aiTimer);
  aiTimer = null;
  if (effectTimer) cancelAnimationFrame(effectTimer);
  effectTimer = null;
  phase = "play";
  titleOverlay.hidden = false;
});
rulesBtn.addEventListener("click", () => {
  playSound("ui");
  rulesOverlay.hidden = false;
});
unitGuideBtn.addEventListener("click", () => {
  playSound("ui");
  renderUnitGuide();
  unitGuideOverlay.hidden = false;
});
soundBtn.addEventListener("click", () => {
  playTestSound();
  updateSoundButton();
});
closeRulesBtn.addEventListener("click", () => {
  playSound("ui");
  rulesOverlay.hidden = true;
});
rulesOverlay.addEventListener("click", (event) => {
  if (event.target === rulesOverlay) {
    playSound("ui");
    rulesOverlay.hidden = true;
  }
});
closeUnitGuideBtn.addEventListener("click", () => {
  playSound("ui");
  unitGuideOverlay.hidden = true;
});
unitGuideOverlay.addEventListener("click", (event) => {
  if (event.target === unitGuideOverlay) {
    playSound("ui");
    unitGuideOverlay.hidden = true;
  }
});

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlockAudio, { capture: true });
  window.addEventListener("keydown", unlockAudio, { capture: true });
  window.addEventListener("touchstart", unlockAudio, { capture: true, passive: true });
}

resetGame();
