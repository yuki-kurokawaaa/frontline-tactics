const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const selectionPanel = document.getElementById("selectionPanel");
const unitInfoEl = document.getElementById("unitInfo");
const delegateBtn = document.getElementById("delegateBtn");
const buildBunkerBtn = document.getElementById("buildBunkerBtn");
const buildFactoryBtn = document.getElementById("buildFactoryBtn");
const blueCountEl = document.getElementById("blueCount");
const redCountEl = document.getElementById("redCount");
const moneyCountEl = document.getElementById("moneyCount");
const incomeCountEl = document.getElementById("incomeCount");
const researchCountEl = document.getElementById("researchCount");
const logEl = document.getElementById("log");
const researchInfoEl = document.getElementById("researchInfo");
const upgradeCityBtn = document.getElementById("upgradeCityBtn");
const researchTechBtn = document.getElementById("researchTechBtn");
const techTreeEl = document.getElementById("techTree");
const productionPanel = document.getElementById("productionPanel");
const productionInfoEl = document.getElementById("productionInfo");
const autoProductionInfoEl = document.getElementById("autoProductionInfo");
const productionButtons = [...document.querySelectorAll("[data-produce]")];
const autoProductionButtons = [...document.querySelectorAll("[data-auto-produce]")];
const clearAutoProductionBtn = document.getElementById("clearAutoProductionBtn");
const rulesBtn = document.getElementById("rulesBtn");
const rulesOverlay = document.getElementById("rulesOverlay");
const closeRulesBtn = document.getElementById("closeRulesBtn");
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

const unitSprites = {
  tank: { x: 58, y: 146, w: 500, h: 458 },
  heavyTank: { x: 58, y: 146, w: 500, h: 458 },
  infantry: { x: 678, y: 203, w: 188, h: 386 },
  engineer: { x: 678, y: 203, w: 188, h: 386 },
  artillery: { x: 990, y: 155, w: 452, h: 454 },
  recon: { x: 1499, y: 199, w: 410, h: 412 },
};

const terrainSprites = {
  p: { x: 0, y: 0, w: 512, h: 512 },
  f: { x: 512, y: 0, w: 512, h: 512 },
  c: { x: 1024, y: 0, w: 512, h: 512 },
  x: { x: 0, y: 512, w: 512, h: 512 },
  m: { x: 512, y: 512, w: 512, h: 512 },
  w: { x: 1024, y: 512, w: 512, h: 512 },
};

const terrain = [
  "ppppppffffppppppxpcppppp",
  "ppppppffffpppppppppppppp",
  "ppmmmmffffpppppppppppppp",
  "ppmmmmffffpppppppppppppp",
  "ppppppffffwwwwwwpppppppp",
  "ppppppffffwwwwwwpppppppp",
  "ppppppppppcppcppffffpppp",
  "ppppppppppwwwwwwffffpppp",
  "ppcpppppppppppppffffmmpp",
  "ppppppppppppppppffffmmpp",
  "ppppppwwwwppppppppppmmpp",
  "ppppppwwwwppppppppppmmpp",
  "ppppppwwwwppcpcpffffpppp",
  "ppppppwwwwppppppffffpppp",
  "ppppppxpppppppppppffffpp",
  "ppppppppppppppppppffffpp",
].map((row) => row.split(""));

const terrainData = {
  p: { name: "平地", color: "#5f754f", move: 1, defense: 0 },
  f: { name: "森", color: "#2f5e3a", move: 2, defense: 1 },
  c: { name: "都市", color: "#777269", move: 1, defense: 2 },
  x: { name: "工場", color: "#6f6b84", move: 1, defense: 2 },
  m: { name: "山", color: "#77644e", move: 3, defense: 2 },
  w: { name: "水域", color: "#315f78", move: 99, defense: 0 },
};

const unitTypes = {
  tank: { label: "戦車", hp: 10, move: 4, range: 1, attack: 5, armor: 2, cost: 420 },
  heavyTank: { label: "重戦車", hp: 14, move: 2, range: 1, attack: 7, armor: 4, cost: 720 },
  infantry: { label: "歩兵", hp: 7, move: 3, range: 1, attack: 3, armor: 1, cost: 180 },
  engineer: { label: "工兵", hp: 6, move: 3, range: 1, attack: 2, armor: 1, cost: 240 },
  artillery: { label: "自走砲", hp: 6, move: 2, range: 3, attack: 4, armor: 0, cost: 360 },
  recon: { label: "偵察車", hp: 5, move: 5, range: 1, attack: 2, armor: 0, cost: 260 },
};

const CITY_INCOME = 150;
const RESEARCH_CITY_UPGRADE_COST = 500;
const RESEARCH_CITY_POINTS = 1;
const BUNKER_BUILD_COST = 300;
const FACTORY_BUILD_COST = 900;
const BUNKER_DEFENSE = 3;
const AI_STEP_DELAY = 520;
const TECH_TREE = [
  { type: "infantry", cost: 0 },
  { type: "recon", cost: 2 },
  { type: "tank", cost: 4 },
  { type: "heavyTank", cost: 6 },
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
let buildings;
let money;
let research;
let unitCounter;

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
  };
}

function resetGame() {
  units = [
    newUnit("b1", "blue", "tank", 2, 12),
    newUnit("b2", "blue", "infantry", 1, 10),
    newUnit("b3", "blue", "artillery", 4, 14),
    newUnit("b4", "blue", "recon", 1, 14),
    newUnit("r1", "red", "tank", 20, 2),
    newUnit("r2", "red", "infantry", 22, 4),
    newUnit("r3", "red", "artillery", 18, 1),
    newUnit("r4", "red", "recon", 22, 1),
  ];
  selectedId = null;
  selectedFactoryKey = null;
  reachable = new Map();
  attackable = new Set();
  turn = "blue";
  phase = "play";
  gameOver = false;
  buildings = [
    { x: 16, y: 0, type: "factory", owner: "red" },
    { x: 18, y: 0, type: "city", owner: "red" },
    { x: 10, y: 6, type: "city", owner: null },
    { x: 13, y: 6, type: "city", owner: null },
    { x: 2, y: 8, type: "city", owner: null },
    { x: 12, y: 12, type: "city", owner: null },
    { x: 14, y: 12, type: "city", owner: null },
    { x: 6, y: 14, type: "factory", owner: "blue" },
  ];
  money = { blue: 600, red: 600 };
  research = {
    blue: { points: 0, unlocked: new Set(["infantry"]) },
    red: { points: 0, unlocked: new Set(TECH_TREE.map((tech) => tech.type)) },
  };
  unitCounter = 9;
  messages = ["作戦開始。Blue のターンです。"];
  undoStack = [];
  if (aiTimer) clearTimeout(aiTimer);
  aiTimer = null;
  hideVictoryScreen();
  updateUi();
  draw();
}

function tileKey(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

function unitAt(x, y) {
  return units.find((unit) => unit.x === x && unit.y === y);
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

function defenseAt(x, y) {
  const building = buildingAt(x, y);
  const buildingDefense = building?.type === "bunker" ? BUNKER_DEFENSE : 0;
  return terrainAt(x, y).defense + buildingDefense;
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
      if (occupant && occupant.side !== unit.side) continue;
      const stepCost = terrainAt(next.x, next.y).move;
      if (stepCost > unitTypes[unit.type].move) continue;
      const nextCost = current.cost + stepCost;
      const key = tileKey(next.x, next.y);
      if (nextCost <= unitTypes[unit.type].move && (!costs.has(key) || nextCost < costs.get(key))) {
        costs.set(key, nextCost);
        queue.push({ ...next, cost: nextCost });
      }
    }
  }

  costs.delete(tileKey(unit.x, unit.y));
  for (const ally of units.filter((item) => item.side === unit.side && item.id !== unit.id)) {
    costs.delete(tileKey(ally.x, ally.y));
  }
  return costs;
}

function computeAttackable(unit) {
  const targets = new Set();
  const range = unitTypes[unit.type].range;
  for (const enemy of units.filter((item) => item.side !== unit.side)) {
    if (distance(unit, enemy) <= range) targets.add(enemy.id);
  }
  return targets;
}

function selectUnit(unit) {
  if (gameOver || phase !== "play" || unit.side !== turn) return;
  selectedId = unit.id;
  reachable = unit.moved || unit.delegated ? new Map() : computeReachable(unit);
  attackable = unit.acted ? new Set() : computeAttackable(unit);
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
    buildings: buildings.map((building) => ({ ...building })),
    money: { ...money },
    research: {
      blue: { points: research.blue.points, unlocked: [...research.blue.unlocked] },
      red: { points: research.red.points, unlocked: [...research.red.unlocked] },
    },
    unitCounter,
    selectedId,
    selectedFactoryKey,
    turn,
    phase,
    gameOver,
    messages: [...messages],
  };
}

function saveUndo() {
  undoStack.push(makeSnapshot());
  undoStack = undoStack.slice(-20);
}

function restoreSnapshot(snapshot) {
  units = snapshot.units.map((unit) => ({ ...unit }));
  buildings = snapshot.buildings.map((building) => ({ ...building }));
  money = { ...snapshot.money };
  research = {
    blue: { points: snapshot.research.blue.points, unlocked: new Set(snapshot.research.blue.unlocked) },
    red: { points: snapshot.research.red.points, unlocked: new Set(snapshot.research.red.unlocked) },
  };
  unitCounter = snapshot.unitCounter;
  selectedId = units.some((unit) => unit.id === snapshot.selectedId) ? snapshot.selectedId : null;
  selectedFactoryKey = snapshot.selectedFactoryKey;
  turn = snapshot.turn;
  phase = snapshot.phase;
  gameOver = snapshot.gameOver;
  messages = [...snapshot.messages];
  const unit = selectedUnit();
  reachable = unit && !unit.moved ? computeReachable(unit) : new Map();
  attackable = unit && !unit.acted ? computeAttackable(unit) : new Set();
}

function undoLastMove() {
  if (!undoStack.length) return;
  if (aiTimer) clearTimeout(aiTimer);
  aiTimer = null;
  restoreSnapshot(undoStack.pop());
  hideVictoryScreen();
  log("一手戻しました。");
  updateUi();
  draw();
}

function moveSelected(x, y) {
  const unit = selectedUnit();
  if (!unit || unit.delegated || unit.moved || !reachable.has(tileKey(x, y))) return false;
  saveUndo();
  selectedFactoryKey = null;
  unit.x = x;
  unit.y = y;
  unit.moved = true;
  reachable = new Map();
  attackable = unit.acted ? new Set() : computeAttackable(unit);
  log(`${sideName(unit.side)} ${unitTypes[unit.type].label} が移動。`);
  updateUi();
  draw();
  return true;
}

function attack(attacker, defender) {
  if (!attacker || !defender || attacker.acted) return false;
  if (attacker.side === defender.side) return false;
  if (distance(attacker, defender) > unitTypes[attacker.type].range) return false;

  const attackPower = unitTypes[attacker.type].attack;
  const defense = unitTypes[defender.type].armor + defenseAt(defender.x, defender.y);
  const damage = Math.max(1, attackPower - Math.floor(defense / 2) + Math.floor(Math.random() * 2));
  selectedFactoryKey = null;
  defender.hp -= damage;
  attacker.acted = true;
  attacker.moved = true;
  log(`${sideName(attacker.side)} ${unitTypes[attacker.type].label} が ${sideName(defender.side)} ${unitTypes[defender.type].label} に ${damage} ダメージ。`);

  if (defender.hp <= 0) {
    log(`${sideName(defender.side)} ${unitTypes[defender.type].label} 撃破。`);
    units = units.filter((unit) => unit.id !== defender.id);
  } else if (distance(attacker, defender) === 1) {
    const counterDamage = Math.max(1, Math.round(damage * 0.7));
    attacker.hp -= counterDamage;
    log(`${sideName(attacker.side)} ${unitTypes[attacker.type].label} が反撃で ${counterDamage} ダメージ。`);
    if (attacker.hp <= 0) {
      log(`${sideName(attacker.side)} ${unitTypes[attacker.type].label} 撃破。`);
      units = units.filter((unit) => unit.id !== attacker.id);
    }
  }

  checkVictory();
  selectedId = attacker.side === turn && units.some((unit) => unit.id === attacker.id) ? attacker.id : null;
  reachable = new Map();
  attackable = selectedUnit() && !selectedUnit().acted ? computeAttackable(selectedUnit()) : new Set();
  updateUi();
  draw();
  return true;
}

function sideName(side) {
  return side === "blue" ? "Blue" : "Red";
}

function endTurn(recordUndo = true) {
  if (gameOver || phase !== "play") return;
  if (recordUndo) saveUndo();
  resolveCaptures(turn);
  selectedId = null;
  selectedFactoryKey = null;
  reachable = new Map();
  attackable = new Set();
  turn = turn === "blue" ? "red" : "blue";
  collectIncome(turn);
  collectResearch(turn);
  for (const unit of units.filter((item) => item.side === turn)) {
    unit.moved = false;
    unit.acted = false;
    unit.deploying = false;
  }
  if (turn === "blue") runAutoProduction("blue");
  log(`${sideName(turn)} のターン。`);
  updateUi();
  draw();
  if (turn === "red") runAiTurn();
  else runDelegatedTurn();
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

function runDelegatedTurn() {
  if (gameOver || turn !== "blue") return;
  const delegatedIds = units
    .filter((unit) => unit.side === "blue" && unit.delegated && !unit.deploying && (!unit.moved || !unit.acted))
    .map((unit) => unit.id);
  if (!delegatedIds.length) return;
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

  const target = nearestEnemy(unit);
  if (!target) {
    finishStep(unitIds, index + 1);
    return;
  }

  if (distance(unit, target) > unitTypes[unit.type].range) {
    const move = bestAiMove(unit, target);
    if (move) {
      unit.x = move.x;
      unit.y = move.y;
      unit.moved = true;
      log(`${sideName(side)} ${unitTypes[unit.type].label} が移動。`);
      updateUi();
      draw();
    }
  }

  scheduleAiStep(() => {
    const current = units.find((item) => item.id === unit.id && item.side === side);
    if (current && !gameOver) {
      const possibleTargets = units
        .filter((enemy) => enemy.side !== side && distance(current, enemy) <= unitTypes[current.type].range)
        .sort((a, b) => a.hp - b.hp);
      if (possibleTargets[0]) attack(current, possibleTargets[0]);
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
}

function resolveCaptures(side) {
  for (const unit of units.filter((item) => item.side === side && item.type === "infantry")) {
    const building = buildingAt(unit.x, unit.y);
    if (!building || building.owner === side) continue;
    building.owner = side;
    building.autoProduce = null;
    log(`${sideName(side)} が ${buildingLabel(building)} を占領。`);
  }
}

function collectIncome(side) {
  const income = incomeFor(side);
  if (!income) return;
  money[side] += income;
  log(`${sideName(side)} 収入 +${income}G。`);
}

function collectResearch(side) {
  const points = researchIncomeFor(side);
  if (!points) return;
  research[side].points += points;
  log(`${sideName(side)} 研究 +${points}P。`);
}

function incomeFor(side) {
  return buildings.filter((building) => building.type === "city" && building.owner === side).length * CITY_INCOME;
}

function researchIncomeFor(side) {
  return buildings.filter((building) => building.type === "city" && building.owner === side && building.research).length * RESEARCH_CITY_POINTS;
}

function buildingLabel(building) {
  if (building.type === "bunker") return "バンカー";
  if (building.type === "factory") return "工場";
  return building.research ? "研究都市" : "都市";
}

function isTechUnlocked(side, type) {
  return !TECH_TREE.some((tech) => tech.type === type) || research[side].unlocked.has(type);
}

function canProduce(side, factory, type) {
  return (
    factory &&
    factory.type === "factory" &&
    factory.owner === side &&
    !unitAt(factory.x, factory.y) &&
    isTechUnlocked(side, type) &&
    money[side] >= unitTypes[type].cost
  );
}

function produceAtFactory(side, factory, type, options = {}) {
  if (!canProduce(side, factory, type)) return false;
  money[side] -= unitTypes[type].cost;
  const unit = newUnit(`${side[0]}${unitCounter}`, side, type, factory.x, factory.y);
  unitCounter += 1;
  unit.moved = true;
  unit.acted = true;
  unit.deploying = true;
  unit.delegated = Boolean(options.delegated);
  units.push(unit);
  log(`${sideName(side)} 工場で ${unitTypes[type].label} を生産${unit.delegated ? "、委任ON" : ""}。`);
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
  unit.delegated = !unit.delegated;
  log(`Blue ${unitTypes[unit.type].label} の委任を${unit.delegated ? "ON" : "OFF"}にしました。`);
  reachable = unit.moved || unit.delegated ? new Map() : computeReachable(unit);
  attackable = unit.acted ? new Set() : computeAttackable(unit);
  updateUi();
  draw();
  if (turn === "blue" && phase === "play" && unit.delegated && !unit.moved && !unit.acted && !unit.deploying) {
    runDelegatedTurn();
  }
}

function setAutoProduction(type) {
  if (turn !== "blue" || phase !== "play" || gameOver || !selectedFactoryKey) return;
  const [x, y] = selectedFactoryKey.split(",").map(Number);
  const factory = buildingAt(x, y);
  if (!factory || factory.type !== "factory" || factory.owner !== "blue") return;
  saveUndo();
  factory.autoProduce = type;
  if (canProduce("blue", factory, type)) {
    produceAtFactory("blue", factory, type, { delegated: true });
  }
  log(`Blue 工場: ${unitTypes[type].label}を毎ターン生産して委任します。`);
  updateUi();
  draw();
}

function clearAutoProduction() {
  if (turn !== "blue" || phase !== "play" || gameOver || !selectedFactoryKey) return;
  const [x, y] = selectedFactoryKey.split(",").map(Number);
  const factory = buildingAt(x, y);
  if (!factory || factory.type !== "factory" || factory.owner !== "blue" || !factory.autoProduce) return;
  saveUndo();
  factory.autoProduce = null;
  log("Blue 工場の継続生産を解除。");
  updateUi();
  draw();
}

function canEngineerBuild(unit, kind) {
  if (!unit || unit.side !== "blue" || unit.type !== "engineer") return false;
  if (turn !== "blue" || phase !== "play" || gameOver || unit.moved || unit.acted || unit.deploying) return false;
  if (buildingAt(unit.x, unit.y)) return false;
  if (["w", "m"].includes(terrain[unit.y][unit.x])) return false;
  const cost = kind === "factory" ? FACTORY_BUILD_COST : BUNKER_BUILD_COST;
  return money.blue >= cost;
}

function buildStructure(kind) {
  const unit = selectedUnit();
  if (!canEngineerBuild(unit, kind)) return;
  saveUndo();
  const cost = kind === "factory" ? FACTORY_BUILD_COST : BUNKER_BUILD_COST;
  money.blue -= cost;
  buildings.push({ x: unit.x, y: unit.y, type: kind, owner: "blue" });
  unit.moved = true;
  unit.acted = true;
  reachable = new Map();
  attackable = new Set();
  log(`Blue 工兵が${kind === "factory" ? "工場" : "バンカー"}を建設。`);
  updateUi();
  draw();
}

function upgradeSelectedCity() {
  if (turn !== "blue" || phase !== "play" || gameOver || !selectedFactoryKey) return;
  const [x, y] = selectedFactoryKey.split(",").map(Number);
  const city = buildingAt(x, y);
  if (!city || city.type !== "city" || city.owner !== "blue" || city.research || money.blue < RESEARCH_CITY_UPGRADE_COST) return;
  saveUndo();
  money.blue -= RESEARCH_CITY_UPGRADE_COST;
  city.research = true;
  log("Blue 都市を研究都市にアップグレード。");
  updateUi();
  draw();
}

function nextResearchTech(side) {
  return TECH_TREE.find((tech) => !research[side].unlocked.has(tech.type));
}

function researchNextTech() {
  if (turn !== "blue" || phase !== "play" || gameOver) return;
  const tech = nextResearchTech("blue");
  if (!tech || research.blue.points < tech.cost) return;
  saveUndo();
  research.blue.points -= tech.cost;
  research.blue.unlocked.add(tech.type);
  log(`Blue 技術「${unitTypes[tech.type].label}」をアンロック。`);
  updateUi();
  draw();
}

function runAutoProduction(side) {
  for (const factory of buildings.filter((building) => building.type === "factory" && building.owner === side && building.autoProduce)) {
    produceAtFactory(side, factory, factory.autoProduce, { delegated: true });
  }
}

function runAiProduction() {
  const choices = ["heavyTank", "tank", "artillery", "recon", "infantry"];
  for (const factory of buildings.filter((building) => building.type === "factory" && building.owner === "red")) {
    if (unitAt(factory.x, factory.y)) continue;
    const type = choices.find((item) => money.red >= unitTypes[item].cost);
    if (type) produceAtFactory("red", factory, type);
  }
}

function nearestEnemy(unit) {
  return units
    .filter((item) => item.side !== unit.side)
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
  showVictoryScreen(winner);
}

function showVictoryScreen(winner) {
  victoryTitle.textContent = `${winner} 勝利`;
  victoryBadge.textContent = winner === "Blue" ? "作戦成功" : "作戦失敗";
  victoryText.textContent =
    winner === "Blue" ? "敵部隊をすべて撃破しました。" : "自軍部隊が壊滅しました。";
  victoryOverlay.hidden = false;
}

function hideVictoryScreen() {
  victoryOverlay.hidden = true;
}

function updateUi() {
  blueCountEl.textContent = units.filter((unit) => unit.side === "blue").length;
  redCountEl.textContent = units.filter((unit) => unit.side === "red").length;
  moneyCountEl.textContent = `${money.blue}G`;
  incomeCountEl.textContent = `+${incomeFor("blue")}G`;
  researchCountEl.textContent = `${research.blue.points}P`;
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
    unitInfoEl.innerHTML = [
      `<strong>${sideName(unit.side)} ${type.label}</strong>`,
      `HP ${unit.hp}/${unit.maxHp}`,
      `移動 ${type.move} / 射程 ${type.range}`,
      `攻撃 ${type.attack} / 装甲 ${type.armor} / 価格 ${type.cost}G`,
      `委任 ${unit.delegated ? "ON" : "OFF"}`,
      `状態 ${unit.deploying ? "配備中" : unit.moved ? "移動済" : "移動可"}・${unit.acted ? "攻撃済" : "攻撃可"}`,
    ].join("<br>");
  }

  delegateBtn.hidden = !unit || unit.side !== "blue";
  delegateBtn.textContent = unit?.delegated ? "委任を解除" : "委任する";
  delegateBtn.disabled = !unit || unit.side !== "blue" || gameOver || phase !== "play";
  buildBunkerBtn.hidden = !unit || unit.side !== "blue" || unit.type !== "engineer";
  buildFactoryBtn.hidden = !unit || unit.side !== "blue" || unit.type !== "engineer";
  buildBunkerBtn.textContent = `バンカー建設 ${BUNKER_BUILD_COST}G`;
  buildFactoryBtn.textContent = `工場建設 ${FACTORY_BUILD_COST}G`;
  buildBunkerBtn.disabled = !canEngineerBuild(unit, "bunker");
  buildFactoryBtn.disabled = !canEngineerBuild(unit, "factory");

  const factory = selectedFactoryKey
    ? buildingAt(...selectedFactoryKey.split(",").map(Number))
    : null;
  const ownCity = turn === "blue" && phase === "play" && factory?.type === "city" && factory.owner === "blue";
  const factoryReady =
    turn === "blue" && phase === "play" && factory?.type === "factory" && factory.owner === "blue" && !unitAt(factory.x, factory.y);
  const ownFactory = turn === "blue" && phase === "play" && factory?.type === "factory" && factory.owner === "blue";
  productionPanel.hidden = !(factory?.type === "factory" && factory.owner === "blue");
  researchInfoEl.textContent = researchStatusText(factory, ownCity);
  upgradeCityBtn.hidden = !(factory?.type === "city" && factory.owner === "blue");
  upgradeCityBtn.disabled = !ownCity || factory.research || money.blue < RESEARCH_CITY_UPGRADE_COST;
  upgradeCityBtn.textContent = `研究都市にする ${RESEARCH_CITY_UPGRADE_COST}G`;
  const nextTech = nextResearchTech("blue");
  researchTechBtn.disabled = !nextTech || research.blue.points < nextTech.cost || phase !== "play" || turn !== "blue";
  researchTechBtn.textContent = nextTech ? `技術ツリー: ${unitTypes[nextTech.type].label} ${nextTech.cost}P` : "技術ツリー: 完了";
  techTreeEl.innerHTML = TECH_TREE.map((tech) => {
    const unlocked = research.blue.unlocked.has(tech.type);
    return `<span class="${unlocked ? "unlocked" : ""}">${unitTypes[tech.type].label}<strong>${unlocked ? "解除済" : `${tech.cost}P`}</strong></span>`;
  }).join("");
  productionInfoEl.textContent = productionStatusText(factory, factoryReady);
  for (const button of productionButtons) {
    const type = button.dataset.produce;
    button.textContent = `${unitTypes[type].label} ${unitTypes[type].cost}G`;
    button.disabled = !factoryReady || !isTechUnlocked("blue", type) || money.blue < unitTypes[type].cost;
  }
  autoProductionInfoEl.textContent = autoProductionStatusText(factory, ownFactory);
  for (const button of autoProductionButtons) {
    const type = button.dataset.autoProduce;
    button.textContent = `${unitTypes[type].label}委任`;
    button.disabled = !ownFactory || !isTechUnlocked("blue", type);
  }
  clearAutoProductionBtn.hidden = !(ownFactory && factory?.autoProduce);
  clearAutoProductionBtn.disabled = !ownFactory || !factory?.autoProduce;

  logEl.innerHTML = messages.map((message) => `<li>${message}</li>`).join("");
}

function productionStatusText(factory, factoryReady) {
  if (!factory) return "自軍工場を選択";
  if (factory.owner !== "blue") return "敵または中立の工場です";
  if (factory.type !== "factory") return `${buildingLabel(factory)}を選択中`;
  if (unitAt(factory.x, factory.y)) return "工場の上に部隊がいます";
  if (!factoryReady) return "自軍ターンで生産できます";
  return `資金 ${money.blue}G。生産する部隊を選択`;
}

function researchStatusText(building, ownCity) {
  const income = researchIncomeFor("blue");
  if (!building) return `研究都市収入 +${income}P`;
  if (building.type !== "city") return `研究都市収入 +${income}P`;
  if (building.owner !== "blue") return "自軍都市を選択するとアップグレードできます";
  if (building.research) return `研究都市: 毎ターン +${RESEARCH_CITY_POINTS}P`;
  if (!ownCity) return "自軍ターンにアップグレードできます";
  return `都市を研究都市へ: ${RESEARCH_CITY_UPGRADE_COST}G`;
}

function autoProductionStatusText(factory, ownFactory) {
  if (!factory) return "継続生産なし";
  if (!ownFactory) return "自軍工場で設定できます";
  if (!factory.autoProduce) return "継続生産なし";
  return `毎ターン ${unitTypes[factory.autoProduce].label} を生産して委任`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawHighlights();
  drawUnits();
}

function drawMap() {
  ctx.fillStyle = "#c8d9a7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const data = terrainAt(x, y);
      drawTerrainTile(x, y, terrain[y][x]);
      ctx.strokeStyle = "rgba(14, 18, 16, 0.28)";
      ctx.lineWidth = 1.25;
      hexPath(x, y);
      ctx.stroke();
      drawBuildingOwner(x, y);
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
  if (building.type === "bunker") {
    ctx.fillStyle = "rgba(40, 45, 42, 0.9)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(center.x - 22, center.y - 14, 44, 28, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f1f4ef";
    ctx.font = "800 13px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("B", center.x, center.y);
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
  ctx.fillStyle = color;
  ctx.strokeStyle = "#101314";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x + HEX_W * 0.28, center.y - HEX_SIZE * 0.45, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (building.research) {
    ctx.fillStyle = "#d9f7ff";
    ctx.font = "800 11px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("R", center.x + HEX_W * 0.28, center.y - HEX_SIZE * 0.45);
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
  for (const unit of units) {
    const pos = hexCenter(unit.x, unit.y);
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
    const maxW = unit.type === "infantry" || unit.type === "engineer" ? 40 : unit.type === "heavyTank" ? 82 : 70;
    const maxH = unit.type === "infantry" || unit.type === "engineer" ? 68 : unit.type === "heavyTank" ? 66 : 58;
    const scale = Math.min(maxW / sprite.w, maxH / sprite.h);
    const drawW = sprite.w * scale;
    const drawH = sprite.h * scale;
    ctx.drawImage(unitImage, sprite.x, sprite.y, sprite.w, sprite.h, -drawW / 2, -drawH / 2, drawW, drawH);
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

function drawHpBar(unit) {
  ctx.fillStyle = "#111314";
  ctx.fillRect(-28, -34, 56, 7);
  ctx.fillStyle = unit.hp / unit.maxHp > 0.45 ? "#88d46b" : "#f2c75b";
  ctx.fillRect(-27, -33, 54 * (unit.hp / unit.maxHp), 5);
}

function unitIcon(type) {
  return { tank: "T", heavyTank: "H", infantry: "I", engineer: "E", artillery: "A", recon: "R" }[type];
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
  const clicked = unitAt(pos.x, pos.y);
  const building = buildingAt(pos.x, pos.y);
  const current = selectedUnit();

  if (clicked && clicked.side === "blue") {
    selectedFactoryKey = null;
    selectUnit(clicked);
    return;
  }

  if (current && !current.delegated && clicked && clicked.side === "red") {
    if (!current.acted && distance(current, clicked) <= unitTypes[current.type].range) saveUndo();
    attack(current, clicked);
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
rulesBtn.addEventListener("click", () => {
  rulesOverlay.hidden = false;
});
closeRulesBtn.addEventListener("click", () => {
  rulesOverlay.hidden = true;
});
rulesOverlay.addEventListener("click", (event) => {
  if (event.target === rulesOverlay) rulesOverlay.hidden = true;
});

resetGame();
