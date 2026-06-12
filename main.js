/* Abyss Defense v0.4 - Main Game */
(function () {
  "use strict";

  const DATA = window.ABYSS_DATA;
  const SAVE_KEY = DATA.saveKey;
  const COLS = DATA.board.cols;
  const ROWS = DATA.board.rows;

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const el = {
    gold: document.getElementById("goldText"),
    baseHp: document.getElementById("baseHpText"),
    wave: document.getElementById("waveText"),
    status: document.getElementById("statusText"),
    speed: document.getElementById("speedBtn"),
    pause: document.getElementById("pauseBtn"),
    start: document.getElementById("startWaveBtn"),
    reset: document.getElementById("resetBtn"),
    towerCards: document.getElementById("towerCards"),
    towerPanel: document.getElementById("towerPanel"),
    heroPanel: document.getElementById("heroPanel"),
    toast: document.getElementById("toast")
  };

  const pathCells = DATA.board.path.map((p) => ({ x: p.x, y: p.y }));
  const pathPoints = pathCells.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }));
  const pathSet = new Set(pathCells.map((p) => `${p.x},${p.y}`));

  let tileSize = 44;
  let boardWidth = 352;
  let boardHeight = 440;
  let lastTime = 0;
  let nextEntityId = 1;
  let autosaveTimer = 0;

  const state = createInitialState();

  function createInitialState() {
    return {
      gold: DATA.board.startGold,
      baseHp: DATA.board.startBaseHp,
      currentWave: 1,
      towers: [],
      hero: {
        level: 1,
        exp: 0,
        cooldown: 0
      },
      speed: 1,
      paused: false,
      status: "playing",
      selectedBuildType: "archer",
      selectedTowerId: null,
      enemies: [],
      projectiles: [],
      effects: [],
      floaters: [],
      waveRunning: false,
      spawnQueue: [],
      spawnTimer: 0
    };
  }

  function saveGame() {
    const payload = {
      version: DATA.version,
      gold: state.gold,
      baseHp: state.baseHp,
      currentWave: state.currentWave,
      towers: state.towers.map((tower) => ({
        id: tower.id,
        type: tower.type,
        col: tower.col,
        row: tower.row,
        level: tower.level
      })),
      hero: {
        level: state.hero.level,
        exp: state.hero.exp
      },
      status: state.status,
      speed: state.speed,
      paused: false
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  }

  function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") return;

      state.gold = Number.isFinite(saved.gold) ? saved.gold : DATA.board.startGold;
      state.baseHp = Number.isFinite(saved.baseHp) ? saved.baseHp : DATA.board.startBaseHp;
      state.currentWave = clamp(parseInt(saved.currentWave, 10) || 1, 1, DATA.waves.length + 1);
      state.towers = Array.isArray(saved.towers)
        ? saved.towers
            .filter((tower) => DATA.towers[tower.type])
            .map((tower) => ({
              id: tower.id || makeId("tower"),
              type: tower.type,
              col: clamp(parseInt(tower.col, 10), 0, COLS - 1),
              row: clamp(parseInt(tower.row, 10), 0, ROWS - 1),
              level: clamp(parseInt(tower.level, 10) || 1, 1, DATA.towers[tower.type].maxLevel),
              cooldown: 0
            }))
        : [];
      state.hero.level = Math.max(1, parseInt(saved.hero && saved.hero.level, 10) || 1);
      state.hero.exp = Math.max(0, parseInt(saved.hero && saved.hero.exp, 10) || 0);
      state.status = saved.status === "gameOver" || saved.status === "clear" ? saved.status : "playing";
      state.speed = [1, 2, 3].includes(saved.speed) ? saved.speed : 1;
      state.paused = false;
      state.waveRunning = false;
      state.enemies = [];
      state.projectiles = [];
      state.effects = [];
      state.floaters = [];
      normalizeNextId();
    } catch (error) {
      console.warn("Failed to load save", error);
    }
  }

  function normalizeNextId() {
    const maxTowerId = state.towers.reduce((max, tower) => {
      const num = Number(String(tower.id).replace(/\D/g, ""));
      return Number.isFinite(num) ? Math.max(max, num) : max;
    }, 1);
    nextEntityId = Math.max(nextEntityId, maxTowerId + 1);
  }

  function resetGame() {
    localStorage.removeItem(SAVE_KEY);
    const fresh = createInitialState();
    Object.keys(fresh).forEach((key) => {
      state[key] = fresh[key];
    });
    nextEntityId = 1;
    buildTowerCards();
    updatePanels();
    showToast("저장 데이터를 삭제하고 v0.4를 초기화했습니다.");
  }

  function makeId(prefix) {
    const id = `${prefix}_${nextEntityId}`;
    nextEntityId += 1;
    return id;
  }

  function resizeCanvas() {
    const wrap = canvas.parentElement;
    const rect = wrap.getBoundingClientRect();
    const cssWidth = Math.min(rect.width, 520);
    boardWidth = Math.floor(cssWidth);
    tileSize = boardWidth / COLS;
    boardHeight = tileSize * ROWS;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(boardWidth * dpr);
    canvas.height = Math.floor(boardHeight * dpr);
    canvas.style.width = `${boardWidth}px`;
    canvas.style.height = `${boardHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function buildTowerCards() {
    el.towerCards.innerHTML = "";
    Object.values(DATA.towers).forEach((tower) => {
      const button = document.createElement("button");
      button.className = "tower-card";
      button.type = "button";
      button.dataset.type = tower.id;
      button.innerHTML = `
        <span class="tower-card__top">
          <span class="tower-card__symbol" style="color:${tower.color}">${tower.symbol}</span>
          <span class="tower-card__name">${tower.shortName}</span>
        </span>
        <span class="tower-card__meta">${tower.cost}G · ${tower.description}</span>
      `;
      button.addEventListener("click", () => {
        state.selectedBuildType = tower.id;
        state.selectedTowerId = null;
        updatePanels();
        showToast(`${tower.name} 배치 모드`);
      });
      el.towerCards.appendChild(button);
    });
  }

  function updateTopBar() {
    el.gold.textContent = state.gold;
    el.baseHp.textContent = state.baseHp;
    const waveLabel = state.status === "clear" ? `${DATA.waves.length}/${DATA.waves.length}` : `${state.currentWave}/${DATA.waves.length}`;
    el.wave.textContent = waveLabel;
    el.speed.textContent = `${state.speed}x`;
    el.pause.textContent = state.paused ? "재개" : "일시정지";
    el.start.disabled = state.waveRunning || state.status !== "playing" || state.paused;

    if (state.status === "gameOver") {
      el.status.textContent = "GAME OVER";
    } else if (state.status === "clear") {
      el.status.textContent = "CLEAR";
    } else if (state.paused) {
      el.status.textContent = "PAUSED";
    } else if (state.waveRunning) {
      el.status.textContent = "전투 중";
    } else {
      const wave = DATA.waves[state.currentWave - 1];
      el.status.textContent = wave ? wave.name : "대기 중";
    }

    document.querySelectorAll(".tower-card").forEach((card) => {
      card.classList.toggle("is-active", card.dataset.type === state.selectedBuildType && !state.selectedTowerId);
    });
  }

  function updatePanels() {
    updateTopBar();
    updateTowerPanel();
    updateHeroPanel();
  }

  function updateTowerPanel() {
    const tower = getSelectedTower();
    if (!tower) {
      const selected = DATA.towers[state.selectedBuildType];
      el.towerPanel.innerHTML = `
        <div class="panel-title">타워 정보</div>
        <div class="empty-panel">
          <strong>${selected ? selected.name : "타워"}</strong> 선택 중<br>
          빈 타일을 누르면 배치합니다. 경로 위에는 설치할 수 없습니다.
        </div>
      `;
      return;
    }

    const table = DATA.towers[tower.type];
    const stats = DATA.formulas.towerStats(table, tower.level);
    const upgradeCost = DATA.formulas.towerUpgradeCost(table, tower.level);
    const sellValue = DATA.formulas.towerSellValue(table, tower.level);
    const isMax = upgradeCost === null;

    el.towerPanel.innerHTML = `
      <div class="panel-title">선택 타워</div>
      <div class="info-grid">
        <span>이름</span><strong>${table.name}</strong>
        <span>레벨</span><strong>Lv.${tower.level}/${table.maxLevel}</strong>
        <span>공격력</span><strong>${stats.damage}</strong>
        <span>사거리</span><strong>${stats.range}</strong>
        <span>강화 비용</span><strong>${isMax ? "MAX" : `${upgradeCost}G`}</strong>
        <span>판매 금액</span><strong>${sellValue}G</strong>
      </div>
      <div class="panel-actions">
        <button id="upgradeTowerBtn" class="small-btn" ${isMax ? "disabled" : ""}>강화</button>
        <button id="sellTowerBtn" class="small-btn danger">판매</button>
      </div>
    `;

    document.getElementById("upgradeTowerBtn").addEventListener("click", upgradeSelectedTower);
    document.getElementById("sellTowerBtn").addEventListener("click", sellSelectedTower);
  }

  function updateHeroPanel() {
    const heroStats = DATA.formulas.heroStats(DATA.hero, state.hero.level);
    const nextExp = DATA.formulas.heroNextExp(state.hero.level);
    const expPercent = clamp((state.hero.exp / nextExp) * 100, 0, 100);
    el.heroPanel.innerHTML = `
      <div class="panel-title">히어로: ${DATA.hero.name}</div>
      <div class="hero-line">
        <span>${DATA.hero.title}</span>
        <strong>Lv.${state.hero.level}</strong>
      </div>
      <div class="info-grid compact">
        <span>경험치</span><strong>${state.hero.exp}/${nextExp}</strong>
        <span>공격력</span><strong>${heroStats.damage}</strong>
        <span>사거리</span><strong>${heroStats.range}</strong>
      </div>
      <div class="exp-bar"><span style="width:${expPercent}%"></span></div>
    `;
  }

  function getSelectedTower() {
    if (!state.selectedTowerId) return null;
    return state.towers.find((tower) => tower.id === state.selectedTowerId) || null;
  }

  function upgradeSelectedTower() {
    const tower = getSelectedTower();
    if (!tower) return;
    const table = DATA.towers[tower.type];
    const cost = DATA.formulas.towerUpgradeCost(table, tower.level);
    if (cost === null) {
      showToast("이미 최대 레벨입니다.");
      return;
    }
    if (state.gold < cost) {
      showToast("골드가 부족합니다.");
      return;
    }
    state.gold -= cost;
    tower.level += 1;
    addEffect({ type: "upgrade", x: tower.col + 0.5, y: tower.row + 0.5, life: 0.55, maxLife: 0.55, color: table.color });
    showToast(`${table.name} Lv.${tower.level}`);
    saveGame();
    updatePanels();
  }

  function sellSelectedTower() {
    const tower = getSelectedTower();
    if (!tower) return;
    const table = DATA.towers[tower.type];
    const value = DATA.formulas.towerSellValue(table, tower.level);
    state.gold += value;
    state.towers = state.towers.filter((item) => item.id !== tower.id);
    state.selectedTowerId = null;
    state.selectedBuildType = "archer";
    showToast(`${table.name} 판매 +${value}G`);
    saveGame();
    updatePanels();
  }

  function placeTower(col, row) {
    const table = DATA.towers[state.selectedBuildType];
    if (!table) return;
    if (state.status !== "playing") {
      showToast("게임 종료 상태입니다. 초기화 후 다시 시작하세요.");
      return;
    }
    if (pathSet.has(`${col},${row}`)) {
      showToast("경로 위에는 설치할 수 없습니다.");
      return;
    }
    if (getTowerAt(col, row)) {
      showToast("이미 타워가 있습니다.");
      return;
    }
    if (isHeroTile(col, row)) {
      showToast("히어로 위치에는 설치할 수 없습니다.");
      return;
    }
    if (state.gold < table.cost) {
      showToast("골드가 부족합니다.");
      return;
    }

    const tower = {
      id: makeId("tower"),
      type: table.id,
      col,
      row,
      level: 1,
      cooldown: 0
    };
    state.gold -= table.cost;
    state.towers.push(tower);
    state.selectedTowerId = tower.id;
    addEffect({ type: "upgrade", x: col + 0.5, y: row + 0.5, life: 0.45, maxLife: 0.45, color: table.color });
    saveGame();
    updatePanels();
  }

  function getTowerAt(col, row) {
    return state.towers.find((tower) => tower.col === col && tower.row === row) || null;
  }

  function isHeroTile(col, row) {
    return Math.floor(DATA.hero.x) === col && Math.floor(DATA.hero.y) === row;
  }

  function startWave() {
    if (state.status !== "playing" || state.paused || state.waveRunning) return;
    const wave = DATA.waves[state.currentWave - 1];
    if (!wave) return;

    state.waveRunning = true;
    state.spawnQueue = createSpawnQueue(wave);
    state.spawnTimer = 0.2;
    state.selectedTowerId = null;
    showToast(`Wave ${wave.id}: ${wave.name}`);
    saveGame();
    updatePanels();
  }

  function createSpawnQueue(wave) {
    const queue = [];
    wave.groups.forEach((group, groupIndex) => {
      for (let i = 0; i < group.count; i += 1) {
        queue.push({
          type: group.type,
          waveId: wave.id,
          hpScale: group.hpScale || 1,
          delay: i === 0 && groupIndex > 0 ? Math.max(0.8, group.gap) : group.gap
        });
      }
    });
    return queue;
  }

  function spawnEnemy(spawn) {
    const table = DATA.monsters[spawn.type];
    const stats = DATA.formulas.monsterStats(table, spawn.waveId, spawn.hpScale);
    const first = pathPoints[0];
    state.enemies.push({
      id: makeId("enemy"),
      type: spawn.type,
      name: table.name,
      x: first.x,
      y: first.y,
      pathIndex: 1,
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      gold: stats.gold,
      exp: stats.exp,
      radius: table.radius,
      color: table.color,
      aura: table.aura,
      boss: !!table.boss,
      slowTimer: 0,
      slowFactor: 1,
      dead: false,
      escaped: false
    });
  }

  function update(dt) {
    if (state.paused || state.status !== "playing") return;

    updateSpawning(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateHero(dt);
    updateProjectiles(dt);
    updateEffects(dt);
    cleanupEntities();
    checkWaveEnd();

    autosaveTimer += dt;
    if (autosaveTimer >= 3) {
      autosaveTimer = 0;
      saveGame();
    }
  }

  function updateSpawning(dt) {
    if (!state.waveRunning || state.spawnQueue.length === 0) return;
    state.spawnTimer -= dt;
    while (state.spawnTimer <= 0 && state.spawnQueue.length > 0) {
      const spawn = state.spawnQueue.shift();
      spawnEnemy(spawn);
      const nextDelay = state.spawnQueue[0] ? state.spawnQueue[0].delay : 0.5;
      state.spawnTimer += nextDelay;
    }
  }

  function updateEnemies(dt) {
    state.enemies.forEach((enemy) => {
      if (enemy.dead || enemy.escaped) return;

      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
        if (enemy.slowTimer <= 0) {
          enemy.slowFactor = 1;
        }
      }

      let remaining = enemy.speed * enemy.slowFactor * dt;
      while (remaining > 0 && !enemy.escaped) {
        const target = pathPoints[enemy.pathIndex];
        if (!target) {
          enemy.escaped = true;
          state.baseHp -= enemy.boss ? 3 : 1;
          addFloater("-HP", enemy.x, enemy.y, "#ff7875");
          if (state.baseHp <= 0) {
            state.baseHp = 0;
            state.status = "gameOver";
            state.waveRunning = false;
            showToast("Base가 파괴되었습니다.");
            saveGame();
          }
          return;
        }
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= remaining) {
          enemy.x = target.x;
          enemy.y = target.y;
          enemy.pathIndex += 1;
          remaining -= dist;
        } else {
          enemy.x += (dx / dist) * remaining;
          enemy.y += (dy / dist) * remaining;
          remaining = 0;
        }
      }
    });
  }

  function updateTowers(dt) {
    state.towers.forEach((tower) => {
      const table = DATA.towers[tower.type];
      const stats = DATA.formulas.towerStats(table, tower.level);
      tower.cooldown -= dt;
      if (tower.cooldown > 0) return;

      const target = findTarget(tower.col + 0.5, tower.row + 0.5, stats.range);
      if (!target) return;

      tower.cooldown = stats.attackInterval;
      attackWithTower(tower, table, stats, target);
    });
  }

  function updateHero(dt) {
    state.hero.cooldown -= dt;
    if (state.hero.cooldown > 0) return;

    const stats = DATA.formulas.heroStats(DATA.hero, state.hero.level);
    const target = findTarget(DATA.hero.x, DATA.hero.y, stats.range);
    if (!target) return;

    state.hero.cooldown = stats.attackInterval;
    state.projectiles.push({
      id: makeId("projectile"),
      type: "hero",
      x: DATA.hero.x,
      y: DATA.hero.y,
      targetId: target.id,
      damage: stats.damage,
      speed: 5.4,
      color: DATA.hero.projectileColor,
      radius: 0.07
    });
    addEffect({ type: "muzzle", x: DATA.hero.x, y: DATA.hero.y, life: 0.12, maxLife: 0.12, color: DATA.hero.projectileColor });
  }

  function attackWithTower(tower, table, stats, target) {
    const x = tower.col + 0.5;
    const y = tower.row + 0.5;

    if (tower.type === "lightning") {
      fireLightning(x, y, table, stats, target);
      return;
    }

    state.projectiles.push({
      id: makeId("projectile"),
      type: tower.type,
      x,
      y,
      targetId: target.id,
      damage: stats.damage,
      speed: tower.type === "cannon" ? 3.6 : 4.8,
      color: table.color,
      radius: tower.type === "cannon" ? 0.1 : 0.065,
      splashRadius: stats.splashRadius,
      slowFactor: stats.slowFactor,
      slowDuration: stats.slowDuration
    });
    addEffect({ type: "muzzle", x, y, life: 0.1, maxLife: 0.1, color: table.color });
  }

  function fireLightning(x, y, table, stats, firstTarget) {
    const hit = new Set();
    const chainPoints = [{ x, y }];
    let current = firstTarget;
    let damage = stats.damage;

    for (let i = 0; i < stats.chainCount && current; i += 1) {
      hit.add(current.id);
      chainPoints.push({ x: current.x, y: current.y });
      damageEnemy(current, damage, "lightning");

      let next = null;
      let bestDistance = Infinity;
      state.enemies.forEach((enemy) => {
        if (enemy.dead || enemy.escaped || hit.has(enemy.id)) return;
        const dist = distance(current.x, current.y, enemy.x, enemy.y);
        if (dist <= stats.chainRange && dist < bestDistance) {
          next = enemy;
          bestDistance = dist;
        }
      });
      current = next;
      damage = Math.max(5, Math.round(damage * 0.72));
    }

    addEffect({
      type: "lightning",
      points: chainPoints,
      life: 0.16,
      maxLife: 0.16,
      color: table.color
    });
  }

  function updateProjectiles(dt) {
    state.projectiles.forEach((projectile) => {
      if (projectile.done) return;
      const target = state.enemies.find((enemy) => enemy.id === projectile.targetId && !enemy.dead && !enemy.escaped);
      if (!target) {
        projectile.done = true;
        return;
      }
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const dist = Math.hypot(dx, dy);
      const move = projectile.speed * dt;
      if (dist <= move || dist < 0.05) {
        projectile.x = target.x;
        projectile.y = target.y;
        projectileHit(projectile, target);
        projectile.done = true;
      } else {
        projectile.x += (dx / dist) * move;
        projectile.y += (dy / dist) * move;
      }
    });
  }

  function projectileHit(projectile, target) {
    if (projectile.type === "cannon") {
      damageEnemy(target, projectile.damage, "cannon");
      state.enemies.forEach((enemy) => {
        if (enemy.id === target.id || enemy.dead || enemy.escaped) return;
        if (distance(projectile.x, projectile.y, enemy.x, enemy.y) <= projectile.splashRadius) {
          damageEnemy(enemy, Math.round(projectile.damage * 0.58), "cannonSplash");
        }
      });
      addEffect({ type: "explosion", x: projectile.x, y: projectile.y, radius: projectile.splashRadius, life: 0.28, maxLife: 0.28, color: projectile.color });
      return;
    }

    if (projectile.type === "ice") {
      target.slowTimer = Math.max(target.slowTimer, projectile.slowDuration || 0);
      target.slowFactor = Math.min(target.slowFactor, projectile.slowFactor || 1);
      addEffect({ type: "slow", x: target.x, y: target.y, life: 0.28, maxLife: 0.28, color: projectile.color });
    }

    damageEnemy(target, projectile.damage, projectile.type);
    addEffect({ type: "hit", x: projectile.x, y: projectile.y, life: 0.16, maxLife: 0.16, color: projectile.color });
  }

  function damageEnemy(enemy, amount, source) {
    if (!enemy || enemy.dead || enemy.escaped) return;
    enemy.hp -= amount;
    if (enemy.hp <= 0) {
      killEnemy(enemy, source);
    }
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    state.gold += enemy.gold;
    addHeroExp(enemy.exp);
    addFloater(`+${enemy.gold}G`, enemy.x, enemy.y - 0.1, "#facc15");
    saveGame();
    addEffect({ type: enemy.boss ? "bossDeath" : "death", x: enemy.x, y: enemy.y, life: enemy.boss ? 0.55 : 0.32, maxLife: enemy.boss ? 0.55 : 0.32, color: enemy.aura });
  }

  function addHeroExp(exp) {
    state.hero.exp += exp;
    let nextExp = DATA.formulas.heroNextExp(state.hero.level);
    let leveled = false;
    while (state.hero.exp >= nextExp) {
      state.hero.exp -= nextExp;
      state.hero.level += 1;
      nextExp = DATA.formulas.heroNextExp(state.hero.level);
      leveled = true;
    }
    if (leveled) {
      addEffect({ type: "heroLevel", x: DATA.hero.x, y: DATA.hero.y, life: 0.85, maxLife: 0.85, color: "#fde047" });
      showToast(`${DATA.hero.name} 레벨업: Lv.${state.hero.level}`);
    }
    updateHeroPanel();
  }

  function cleanupEntities() {
    state.enemies = state.enemies.filter((enemy) => !enemy.dead && !enemy.escaped);
    state.projectiles = state.projectiles.filter((projectile) => !projectile.done);
  }

  function checkWaveEnd() {
    if (!state.waveRunning) return;
    if (state.spawnQueue.length > 0 || state.enemies.length > 0) return;

    const completedWave = state.currentWave;
    const wave = DATA.waves[completedWave - 1];
    state.waveRunning = false;
    state.gold += wave.reward;
    addFloater(`Wave 보상 +${wave.reward}G`, 4, 4.5, "#facc15");

    if (completedWave >= DATA.waves.length) {
      state.status = "clear";
      state.currentWave = DATA.waves.length;
      showToast("Abyss Defense v0.4 클리어");
    } else {
      state.currentWave += 1;
      showToast(`Wave ${completedWave} 완료`);
    }
    saveGame();
    updatePanels();
  }

  function updateEffects(dt) {
    state.effects.forEach((effect) => {
      effect.life -= dt;
    });
    state.effects = state.effects.filter((effect) => effect.life > 0);

    state.floaters.forEach((floater) => {
      floater.life -= dt;
      floater.y -= dt * 0.55;
    });
    state.floaters = state.floaters.filter((floater) => floater.life > 0);
  }

  function findTarget(x, y, range) {
    let best = null;
    let bestProgress = -Infinity;
    state.enemies.forEach((enemy) => {
      if (enemy.dead || enemy.escaped) return;
      const dist = distance(x, y, enemy.x, enemy.y);
      if (dist > range) return;
      const progress = enemy.pathIndex * 100 - distanceToNextPoint(enemy);
      if (progress > bestProgress) {
        best = enemy;
        bestProgress = progress;
      }
    });
    return best;
  }

  function distanceToNextPoint(enemy) {
    const target = pathPoints[enemy.pathIndex];
    if (!target) return 0;
    return distance(enemy.x, enemy.y, target.x, target.y);
  }

  function render() {
    ctx.clearRect(0, 0, boardWidth, boardHeight);
    drawBackground();
    drawPath();
    drawBuildHighlights();
    drawTowers();
    drawHero();
    drawEnemies();
    drawProjectiles();
    drawEffects();
    drawFloaters();
    drawOverlayText();
    updateTopBar();
  }

  function drawBackground() {
    const grd = ctx.createLinearGradient(0, 0, 0, boardHeight);
    grd.addColorStop(0, "#0f172a");
    grd.addColorStop(1, "#111827");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, boardWidth, boardHeight);

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const x = col * tileSize;
        const y = row * tileSize;
        ctx.fillStyle = (row + col) % 2 === 0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.04)";
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.strokeStyle = "rgba(148,163,184,0.12)";
        ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);
      }
    }
  }

  function drawPath() {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    pathPoints.forEach((point, index) => {
      const x = point.x * tileSize;
      const y = point.y * tileSize;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "rgba(88, 69, 45, 0.92)";
    ctx.lineWidth = tileSize * 0.64;
    ctx.stroke();

    ctx.beginPath();
    pathPoints.forEach((point, index) => {
      const x = point.x * tileSize;
      const y = point.y * tileSize;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "rgba(191, 132, 69, 0.95)";
    ctx.lineWidth = tileSize * 0.46;
    ctx.stroke();

    drawCellBadge(pathCells[0].x, pathCells[0].y, "IN", "#22c55e");
    const end = pathCells[pathCells.length - 1];
    drawCellBadge(end.x, end.y, "BASE", "#ef4444");
  }

  function drawCellBadge(col, row, text, color) {
    const x = (col + 0.5) * tileSize;
    const y = (row + 0.5) * tileSize;
    ctx.fillStyle = color;
    roundedRect(x - tileSize * 0.33, y - tileSize * 0.14, tileSize * 0.66, tileSize * 0.28, 7);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(9, tileSize * 0.18)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }

  function drawBuildHighlights() {
    const selected = getSelectedTower();
    if (selected) {
      const table = DATA.towers[selected.type];
      const stats = DATA.formulas.towerStats(table, selected.level);
      drawRangeCircle(selected.col + 0.5, selected.row + 0.5, stats.range, table.color);
      return;
    }

    if (!state.selectedBuildType || state.status !== "playing") return;
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (pathSet.has(`${col},${row}`) || getTowerAt(col, row) || isHeroTile(col, row)) continue;
        ctx.fillStyle = DATA.towers[state.selectedBuildType].color;
        ctx.fillRect(col * tileSize + tileSize * 0.31, row * tileSize + tileSize * 0.31, tileSize * 0.38, tileSize * 0.38);
      }
    }
    ctx.restore();
  }

  function drawRangeCircle(x, y, range, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x * tileSize, y * tileSize, range * tileSize, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(color, 0.08);
    ctx.strokeStyle = hexToRgba(color, 0.42);
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawTowers() {
    state.towers.forEach((tower) => {
      const table = DATA.towers[tower.type];
      const x = (tower.col + 0.5) * tileSize;
      const y = (tower.row + 0.5) * tileSize;
      const r = tileSize * 0.31;
      const selected = tower.id === state.selectedTowerId;

      ctx.save();
      ctx.shadowColor = selected ? table.color : "transparent";
      ctx.shadowBlur = selected ? 18 : 0;
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.strokeStyle = selected ? "#ffffff" : table.color;
      ctx.lineWidth = selected ? 3 : 2;
      roundedRect(x - r, y - r, r * 2, r * 2, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = table.color;
      ctx.font = `700 ${tileSize * 0.32}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(table.symbol, x, y - tileSize * 0.04);

      ctx.fillStyle = "#e5e7eb";
      ctx.font = `700 ${tileSize * 0.17}px system-ui`;
      ctx.fillText(`Lv.${tower.level}`, x, y + tileSize * 0.24);
      ctx.restore();
    });
  }

  function drawHero() {
    const x = DATA.hero.x * tileSize;
    const y = DATA.hero.y * tileSize;
    const pulse = 1 + Math.sin(performance.now() / 260) * 0.04;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, tileSize * 0.34 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(250, 204, 21, 0.16)";
    ctx.fill();
    ctx.strokeStyle = "rgba(250, 204, 21, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();

    drawStar(x, y, tileSize * 0.25, tileSize * 0.12, 5, "#fde047", "#fff7ad");
    ctx.fillStyle = "#111827";
    ctx.font = `900 ${tileSize * 0.18}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("H", x, y + 1);
    ctx.restore();
  }

  function drawEnemies() {
    state.enemies.forEach((enemy) => {
      const x = enemy.x * tileSize;
      const y = enemy.y * tileSize;
      const r = enemy.radius * tileSize;

      ctx.save();
      if (enemy.boss) {
        const pulse = 1 + Math.sin(performance.now() / 180) * 0.08;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.75 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(enemy.aura, 0.18);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = enemy.color;
      ctx.fill();
      ctx.lineWidth = enemy.boss ? 3 : 2;
      ctx.strokeStyle = enemy.slowTimer > 0 ? "#67e8f9" : enemy.aura;
      ctx.stroke();

      if (enemy.type === "bat") {
        ctx.beginPath();
        ctx.moveTo(x - r * 0.4, y);
        ctx.lineTo(x - r * 1.3, y - r * 0.55);
        ctx.lineTo(x - r * 1.0, y + r * 0.45);
        ctx.moveTo(x + r * 0.4, y);
        ctx.lineTo(x + r * 1.3, y - r * 0.55);
        ctx.lineTo(x + r * 1.0, y + r * 0.45);
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      drawHpBar(x, y - r - tileSize * 0.16, r * 2.1, tileSize * 0.08, enemy.hp / enemy.maxHp, enemy.boss);
      ctx.restore();
    });
  }

  function drawHpBar(x, y, w, h, ratio, boss) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    roundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = boss ? "#f97316" : "#22c55e";
    roundedRect(x - w / 2, y - h / 2, Math.max(0, w * clamp(ratio, 0, 1)), h, h / 2);
    ctx.fill();
  }

  function drawProjectiles() {
    state.projectiles.forEach((projectile) => {
      const x = projectile.x * tileSize;
      const y = projectile.y * tileSize;
      const r = Math.max(3, projectile.radius * tileSize);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = projectile.color;
      ctx.shadowColor = projectile.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    });
  }

  function drawEffects() {
    state.effects.forEach((effect) => {
      const t = clamp(effect.life / effect.maxLife, 0, 1);
      ctx.save();
      if (effect.type === "lightning") {
        ctx.globalAlpha = t;
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        effect.points.forEach((point, index) => {
          const jitterX = (Math.random() - 0.5) * tileSize * 0.08;
          const jitterY = (Math.random() - 0.5) * tileSize * 0.08;
          const x = point.x * tileSize + jitterX;
          const y = point.y * tileSize + jitterY;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      } else if (effect.type === "explosion") {
        ctx.globalAlpha = t;
        ctx.beginPath();
        ctx.arc(effect.x * tileSize, effect.y * tileSize, effect.radius * tileSize * (1.2 - t * 0.2), 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(effect.color, 0.28);
        ctx.fill();
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (effect.type === "upgrade" || effect.type === "heroLevel") {
        ctx.globalAlpha = t;
        ctx.beginPath();
        ctx.arc(effect.x * tileSize, effect.y * tileSize, tileSize * (0.28 + (1 - t) * 0.55), 0, Math.PI * 2);
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else if (effect.type === "bossDeath" || effect.type === "death") {
        ctx.globalAlpha = t * 0.8;
        ctx.beginPath();
        ctx.arc(effect.x * tileSize, effect.y * tileSize, tileSize * (0.18 + (1 - t) * (effect.type === "bossDeath" ? 0.9 : 0.45)), 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(effect.color, 0.32);
        ctx.fill();
      } else {
        ctx.globalAlpha = t;
        ctx.beginPath();
        ctx.arc(effect.x * tileSize, effect.y * tileSize, tileSize * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = effect.color;
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawFloaters() {
    state.floaters.forEach((floater) => {
      const t = clamp(floater.life / floater.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.fillStyle = floater.color;
      ctx.font = `800 ${Math.max(11, tileSize * 0.22)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.75)";
      ctx.shadowBlur = 4;
      ctx.fillText(floater.text, floater.x * tileSize, floater.y * tileSize);
      ctx.restore();
    });
  }

  function drawOverlayText() {
    if (state.status !== "gameOver" && state.status !== "clear" && !state.paused) return;
    ctx.save();
    ctx.fillStyle = "rgba(2, 6, 23, 0.55)";
    ctx.fillRect(0, 0, boardWidth, boardHeight);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${tileSize * 0.52}px system-ui`;
    const text = state.status === "gameOver" ? "GAME OVER" : state.status === "clear" ? "CLEAR" : "PAUSED";
    ctx.fillText(text, boardWidth / 2, boardHeight / 2 - tileSize * 0.2);
    ctx.font = `600 ${tileSize * 0.24}px system-ui`;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(state.paused ? "재개 버튼을 누르면 계속 진행" : "초기화 후 다시 시작 가능", boardWidth / 2, boardHeight / 2 + tileSize * 0.35);
    ctx.restore();
  }

  function onCanvasPointerDown(event) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * boardWidth;
    const y = ((event.clientY - rect.top) / rect.height) * boardHeight;
    const col = clamp(Math.floor(x / tileSize), 0, COLS - 1);
    const row = clamp(Math.floor(y / tileSize), 0, ROWS - 1);

    const tower = getTowerAt(col, row);
    if (tower) {
      state.selectedTowerId = tower.id;
      state.selectedBuildType = null;
      updatePanels();
      return;
    }

    if (state.selectedBuildType) {
      placeTower(col, row);
      return;
    }

    state.selectedTowerId = null;
    state.selectedBuildType = "archer";
    updatePanels();
  }

  function addEffect(effect) {
    state.effects.push(effect);
  }

  function addFloater(text, x, y, color) {
    state.floaters.push({ text, x, y, color, life: 0.9, maxLife: 0.9 });
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      el.toast.classList.remove("is-visible");
    }, 1500);
  }

  function gameLoop(time) {
    if (!lastTime) lastTime = time;
    const rawDt = Math.min(0.06, (time - lastTime) / 1000);
    lastTime = time;
    const dt = rawDt * state.speed;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  function bindEvents() {
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("pointerdown", onCanvasPointerDown);

    el.start.addEventListener("click", startWave);
    el.speed.addEventListener("click", () => {
      state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
      saveGame();
      updatePanels();
    });
    el.pause.addEventListener("click", () => {
      if (state.status !== "playing") return;
      state.paused = !state.paused;
      updatePanels();
    });
    el.reset.addEventListener("click", resetGame);
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function roundedRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  function drawStar(cx, cy, outerRadius, innerRadius, points, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (i * Math.PI) / points;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }

  function hexToRgba(hex, alpha) {
    const normalized = hex.replace("#", "");
    if (normalized.length !== 6) return `rgba(255,255,255,${alpha})`;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function init() {
    resizeCanvas();
    buildTowerCards();
    loadGame();
    bindEvents();
    updatePanels();
    requestAnimationFrame(gameLoop);
  }

  init();
})();
