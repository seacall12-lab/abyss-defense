const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const waveText = document.getElementById("waveText");
const goldText = document.getElementById("goldText");
const hpText = document.getElementById("hpText");
const messageText = document.getElementById("messageText");

const startWaveBtn = document.getElementById("startWaveBtn");
const upgradeBtn = document.getElementById("upgradeBtn");
const resetBtn = document.getElementById("resetBtn");
const towerButtons = document.querySelectorAll(".tower-btn");

const COLS = 8;
const ROWS = 10;
let tileSize = 48;

const path = [
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
  { x: 4, y: 1 },
  { x: 5, y: 1 },
  { x: 5, y: 2 },
  { x: 5, y: 3 },
  { x: 5, y: 4 },
  { x: 4, y: 4 },
  { x: 3, y: 4 },
  { x: 2, y: 4 },
  { x: 2, y: 5 },
  { x: 2, y: 6 },
  { x: 3, y: 6 },
  { x: 4, y: 6 },
  { x: 5, y: 6 },
  { x: 6, y: 6 },
  { x: 7, y: 6 },
  { x: 7, y: 7 },
  { x: 7, y: 8 },
  { x: 7, y: 9 }
];

const towerTypes = {
  archer: {
    name: "궁수",
    cost: 50,
    damage: 14,
    range: 2.45,
    cooldown: 520,
    color: "#facc15"
  },
  cannon: {
    name: "대포",
    cost: 90,
    damage: 28,
    range: 2.05,
    cooldown: 1150,
    splash: 0.8,
    color: "#fb923c"
  },
  ice: {
    name: "얼음",
    cost: 80,
    damage: 6,
    range: 2.25,
    cooldown: 800,
    slow: 0.55,
    slowTime: 1100,
    color: "#67e8f9"
  }
};

const enemyTypes = {
  slime: {
    name: "슬라임",
    hp: 38,
    speed: 38,
    reward: 8,
    color: "#22c55e"
  },
  bat: {
    name: "박쥐",
    hp: 24,
    speed: 62,
    reward: 7,
    color: "#a78bfa"
  },
  golem: {
    name: "골렘",
    hp: 140,
    speed: 24,
    reward: 22,
    color: "#9ca3af"
  },
  boss: {
    name: "보스",
    hp: 420,
    speed: 20,
    reward: 80,
    color: "#ef4444"
  }
};

const waves = [
  [{ type: "slime", count: 6, gap: 850 }],
  [{ type: "slime", count: 10, gap: 720 }],
  [{ type: "slime", count: 8, gap: 650 }, { type: "bat", count: 3, gap: 900 }],
  [{ type: "bat", count: 10, gap: 580 }],
  [{ type: "slime", count: 12, gap: 560 }, { type: "golem", count: 1, gap: 1400 }],
  [{ type: "slime", count: 15, gap: 480 }, { type: "bat", count: 6, gap: 700 }],
  [{ type: "golem", count: 4, gap: 1000 }],
  [{ type: "bat", count: 14, gap: 430 }, { type: "golem", count: 3, gap: 900 }],
  [{ type: "slime", count: 18, gap: 420 }, { type: "bat", count: 8, gap: 520 }, { type: "golem", count: 3, gap: 900 }],
  [{ type: "boss", count: 1, gap: 1000 }, { type: "slime", count: 20, gap: 360 }, { type: "bat", count: 10, gap: 460 }]
];

let gold = 150;
let baseHp = 10;
let currentWave = 0;
let selectedTowerType = "archer";
let selectedTower = null;

let towers = [];
let enemies = [];
let bullets = [];

let waveRunning = false;
let spawnQueue = [];
let spawnTimer = 0;
let gameOver = false;
let gameClear = false;

let lastTime = performance.now();

function resizeCanvas() {
  const wrap = document.querySelector(".canvas-wrap");
  const width = wrap.clientWidth;
  tileSize = Math.floor(width / COLS);

  canvas.width = tileSize * COLS;
  canvas.height = tileSize * ROWS;
}

function isPathTile(x, y) {
  return path.some((p) => p.x === x && p.y === y);
}

function getTileCenter(tile) {
  return {
    x: tile.x * tileSize + tileSize / 2,
    y: tile.y * tileSize + tileSize / 2
  };
}

function getDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function setMessage(text) {
  messageText.textContent = text;
}

function updateHud() {
  waveText.textContent = `${currentWave} / ${waves.length}`;
  goldText.textContent = gold;
  hpText.textContent = baseHp;
}

function createSpawnQueue(waveIndex) {
  const queue = [];
  const groups = waves[waveIndex];

  groups.forEach((group) => {
    for (let i = 0; i < group.count; i++) {
      queue.push({
        type: group.type,
        delay: group.gap
      });
    }
  });

  return queue;
}

function startWave() {
  if (waveRunning || gameOver || gameClear) return;

  if (currentWave >= waves.length) {
    gameClear = true;
    setMessage("모든 웨이브를 클리어했습니다.");
    return;
  }

  spawnQueue = createSpawnQueue(currentWave);
  spawnTimer = 400;
  waveRunning = true;
  currentWave += 1;
  startWaveBtn.disabled = true;

  setMessage(`웨이브 ${currentWave} 시작.`);
  updateHud();
}

function spawnEnemy(type) {
  const data = enemyTypes[type];
  const start = getTileCenter(path[0]);

  enemies.push({
    type,
    name: data.name,
    maxHp: data.hp,
    hp: data.hp,
    speed: data.speed,
    reward: data.reward,
    color: data.color,
    x: start.x,
    y: start.y,
    pathIndex: 0,
    slowUntil: 0,
    slowFactor: 1
  });
}

function placeTower(tileX, tileY) {
  if (gameOver || gameClear) return;

  if (isPathTile(tileX, tileY)) {
    setMessage("길 위에는 타워를 설치할 수 없습니다.");
    return;
  }

  const existingTower = towers.find((t) => t.tileX === tileX && t.tileY === tileY);
  if (existingTower) {
    selectedTower = existingTower;
    setMessage(`${existingTower.name} Lv.${existingTower.level} 선택됨. 강화할 수 있습니다.`);
    return;
  }

  const data = towerTypes[selectedTowerType];
  if (gold < data.cost) {
    setMessage(`골드가 부족합니다. ${data.name} 설치 비용: ${data.cost}G`);
    return;
  }

  gold -= data.cost;

  const tower = {
    type: selectedTowerType,
    name: data.name,
    tileX,
    tileY,
    x: tileX * tileSize + tileSize / 2,
    y: tileY * tileSize + tileSize / 2,
    level: 1,
    cooldownLeft: 0
  };

  towers.push(tower);
  selectedTower = tower;

  setMessage(`${data.name} 설치 완료.`);
  updateHud();
}

function upgradeSelectedTower() {
  if (!selectedTower) {
    setMessage("강화할 타워를 먼저 선택하세요.");
    return;
  }

  const cost = 45 + selectedTower.level * 35;

  if (gold < cost) {
    setMessage(`강화 골드가 부족합니다. 필요 골드: ${cost}G`);
    return;
  }

  gold -= cost;
  selectedTower.level += 1;

  setMessage(`${selectedTower.name} Lv.${selectedTower.level} 강화 완료.`);
  updateHud();
}

function getTowerStats(tower) {
  const base = towerTypes[tower.type];
  return {
    damage: Math.round(base.damage * (1 + (tower.level - 1) * 0.38)),
    range: base.range + (tower.level - 1) * 0.08,
    cooldown: Math.max(260, base.cooldown * (1 - (tower.level - 1) * 0.05)),
    splash: base.splash || 0,
    slow: base.slow || 0,
    slowTime: base.slowTime || 0,
    color: base.color
  };
}

function updateSpawning(delta) {
  if (!waveRunning) return;

  if (spawnQueue.length > 0) {
    spawnTimer -= delta;

    if (spawnTimer <= 0) {
      const next = spawnQueue.shift();
      spawnEnemy(next.type);
      spawnTimer = next.delay;
    }
  }

  if (spawnQueue.length === 0 && enemies.length === 0) {
    waveRunning = false;
    startWaveBtn.disabled = false;

    if (currentWave >= waves.length) {
      gameClear = true;
      setMessage("클리어. 모든 웨이브를 방어했습니다.");
    } else {
      const bonus = 35 + currentWave * 8;
      gold += bonus;
      setMessage(`웨이브 클리어. 보너스 ${bonus}G 획득.`);
    }

    updateHud();
  }
}

function updateEnemies(delta, now) {
  enemies.forEach((enemy) => {
    const currentSlow = enemy.slowUntil > now ? enemy.slowFactor : 1;
    const moveSpeed = enemy.speed * currentSlow;
    const nextIndex = enemy.pathIndex + 1;

    if (nextIndex >= path.length) {
      enemy.reachedBase = true;
      return;
    }

    const target = getTileCenter(path[nextIndex]);
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      enemy.pathIndex = nextIndex;
      return;
    }

    const step = (moveSpeed * delta) / 1000;
    enemy.x += (dx / dist) * step;
    enemy.y += (dy / dist) * step;
  });

  const reached = enemies.filter((e) => e.reachedBase).length;

  if (reached > 0) {
    baseHp -= reached;
    enemies = enemies.filter((e) => !e.reachedBase);

    if (baseHp <= 0) {
      baseHp = 0;
      gameOver = true;
      waveRunning = false;
      startWaveBtn.disabled = true;
      setMessage("게임오버. 기지가 파괴되었습니다.");
    }

    updateHud();
  }
}

function updateTowers(delta, now) {
  towers.forEach((tower) => {
    tower.cooldownLeft -= delta;

    if (tower.cooldownLeft > 0 || enemies.length === 0) return;

    const stats = getTowerStats(tower);
    const rangePx = stats.range * tileSize;

    const target = enemies
      .filter((enemy) => getDistance(tower, enemy) <= rangePx)
      .sort((a, b) => b.pathIndex - a.pathIndex)[0];

    if (!target) return;

    bullets.push({
      x: tower.x,
      y: tower.y,
      target,
      speed: 420,
      damage: stats.damage,
      splash: stats.splash,
      slow: stats.slow,
      slowTime: stats.slowTime,
      color: stats.color
    });

    tower.cooldownLeft = stats.cooldown;
  });
}

function updateBullets(delta, now) {
  bullets.forEach((bullet) => {
    if (!bullet.target || bullet.target.hp <= 0) {
      bullet.dead = true;
      return;
    }

    const dx = bullet.target.x - bullet.x;
    const dy = bullet.target.y - bullet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      hitEnemy(bullet, now);
      bullet.dead = true;
      return;
    }

    const step = (bullet.speed * delta) / 1000;
    bullet.x += (dx / dist) * step;
    bullet.y += (dy / dist) * step;
  });

  bullets = bullets.filter((b) => !b.dead);
}

function hitEnemy(bullet, now) {
  const target = bullet.target;

  if (bullet.splash > 0) {
    const radius = bullet.splash * tileSize;

    enemies.forEach((enemy) => {
      if (getDistance(enemy, target) <= radius) {
        enemy.hp -= bullet.damage;
      }
    });
  } else {
    target.hp -= bullet.damage;
  }

  if (bullet.slow > 0) {
    target.slowFactor = bullet.slow;
    target.slowUntil = now + bullet.slowTime;
  }

  removeDeadEnemies();
}

function removeDeadEnemies() {
  let gained = 0;

  enemies.forEach((enemy) => {
    if (enemy.hp <= 0) {
      gained += enemy.reward;
    }
  });

  if (gained > 0) {
    gold += gained;
    updateHud();
  }

  enemies = enemies.filter((enemy) => enemy.hp > 0);
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const isPath = isPathTile(x, y);
      const isEnd = x === path[path.length - 1].x && y === path[path.length - 1].y;

      ctx.fillStyle = isPath ? "#374151" : "#0f172a";
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

      if (isEnd) {
        ctx.fillStyle = "#7f1d1d";
        ctx.fillRect(x * tileSize + 4, y * tileSize + 4, tileSize - 8, tileSize - 8);
      }

      ctx.strokeStyle = "#1f2937";
      ctx.lineWidth = 1;
      ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
}

function drawTowers() {
  towers.forEach((tower) => {
    const stats = getTowerStats(tower);
    const isSelected = selectedTower === tower;

    if (isSelected) {
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, stats.range * tileSize, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(250, 204, 21, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.35)";
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tileSize * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = stats.color;
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.font = `700 ${Math.floor(tileSize * 0.22)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const label = tower.type === "archer" ? "A" : tower.type === "cannon" ? "C" : "I";
    ctx.fillText(label, tower.x, tower.y - 3);

    ctx.fillStyle = "#f9fafb";
    ctx.font = `700 ${Math.floor(tileSize * 0.16)}px system-ui`;
    ctx.fillText(`Lv${tower.level}`, tower.x, tower.y + tileSize * 0.23);
  });
}

function drawEnemies(now) {
  enemies.forEach((enemy) => {
    const radius = tileSize * 0.26;

    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = enemy.color;
    ctx.fill();

    if (enemy.slowUntil > now) {
      ctx.strokeStyle = "#67e8f9";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const hpRate = Math.max(0, enemy.hp / enemy.maxHp);
    const barWidth = tileSize * 0.58;
    const barHeight = 5;

    ctx.fillStyle = "#450a0a";
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - radius - 10, barWidth, barHeight);

    ctx.fillStyle = "#22c55e";
    ctx.fillRect(enemy.x - barWidth / 2, enemy.y - radius - 10, barWidth * hpRate, barHeight);
  });
}

function drawBullets() {
  bullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = bullet.color;
    ctx.fill();
  });
}

function drawOverlayText() {
  if (!gameOver && !gameClear) return;

  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f9fafb";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.floor(tileSize * 0.5)}px system-ui`;
  ctx.fillText(gameClear ? "CLEAR" : "GAME OVER", canvas.width / 2, canvas.height / 2);
}

function draw() {
  const now = performance.now();

  drawGrid();
  drawTowers();
  drawEnemies(now);
  drawBullets();
  drawOverlayText();
}

function gameLoop(now) {
  const delta = Math.min(40, now - lastTime);
  lastTime = now;

  if (!gameOver && !gameClear) {
    updateSpawning(delta);
    updateEnemies(delta, now);
    updateTowers(delta, now);
    updateBullets(delta, now);
  }

  draw();
  requestAnimationFrame(gameLoop);
}

function handleCanvasPointer(event) {
  event.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  const tileX = Math.floor(x / tileSize);
  const tileY = Math.floor(y / tileSize);

  if (tileX < 0 || tileX >= COLS || tileY < 0 || tileY >= ROWS) return;

  placeTower(tileX, tileY);
}

function resetGame() {
  gold = 150;
  baseHp = 10;
  currentWave = 0;
  selectedTowerType = "archer";
  selectedTower = null;
  towers = [];
  enemies = [];
  bullets = [];
  waveRunning = false;
  spawnQueue = [];
  spawnTimer = 0;
  gameOver = false;
  gameClear = false;

  startWaveBtn.disabled = false;

  towerButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tower === selectedTowerType);
  });

  setMessage("초기화 완료. 타워를 배치하고 웨이브를 시작하세요.");
  updateHud();
}

towerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedTowerType = button.dataset.tower;

    towerButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    const tower = towerTypes[selectedTowerType];
    setMessage(`${tower.name} 선택됨. 빈 타일을 터치해서 배치하세요.`);
  });
});

startWaveBtn.addEventListener("click", startWave);
upgradeBtn.addEventListener("click", upgradeSelectedTower);
resetBtn.addEventListener("click", resetGame);

canvas.addEventListener("pointerdown", handleCanvasPointer, { passive: false });
window.addEventListener("resize", () => {
  resizeCanvas();

  towers.forEach((tower) => {
    tower.x = tower.tileX * tileSize + tileSize / 2;
    tower.y = tower.tileY * tileSize + tileSize / 2;
  });
});

resizeCanvas();
updateHud();
setMessage("궁수, 대포, 얼음 중 하나를 선택하고 빈 타일에 배치하세요.");
requestAnimationFrame(gameLoop);
