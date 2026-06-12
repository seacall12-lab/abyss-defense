/* Abyss Defense v0.6 - Main Game */
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
    autoWave: document.getElementById("autoWaveBtn"),
    heroSkill: document.getElementById("heroSkillBtn"),
    towerCards: document.getElementById("towerCards"),
    nextWavePanel: document.getElementById("nextWavePanel"),
    heroPanel: document.getElementById("heroPanel"),
    relicPanel: document.getElementById("relicPanel"),
    actionMenu: document.getElementById("towerActionMenu"),
    toast: document.getElementById("toast"),
    traitModal: document.getElementById("traitModal"),
    traitModalTitle: document.getElementById("traitModalTitle"),
    traitModalDesc: document.getElementById("traitModalDesc"),
    traitOptions: document.getElementById("traitOptions"),
    relicModal: document.getElementById("relicModal"),
    relicOptions: document.getElementById("relicOptions")
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
        cooldown: 0,
        skillCooldown: 0
      },
      relics: [],
      relicWavesClaimed: [],
      speed: 1,
      paused: false,
      autoWave: false,
      autoStartTimer: 0,
      status: "playing",
      selectedBuildType: "archer",
      selectedTowerId: null,
      traitModalTowerId: null,
      relicChoices: [],
      enemies: [],
      projectiles: [],
      effects: [],
      floaters: [],
      waveRunning: false,
      spawnQueue: [],
      spawnTimer: 0,
      bossWarningTimer: 0
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
        level: tower.level,
        trait: tower.trait || null
      })),
      hero: {
        level: state.hero.level,
        exp: state.hero.exp
      },
      relics: state.relics,
      relicWavesClaimed: state.relicWavesClaimed,
      status: state.status,
      speed: state.speed,
      autoWave: state.autoWave
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
      state.currentWave = clamp(parseInt(saved.currentWave, 10) || 1, 1, DATA.waves.length);
      state.towers = Array.isArray(saved.towers)
        ? saved.towers
            .filter((tower) => DATA.towers[tower.type])
            .map((tower) => ({
              id: tower.id || makeId("tower"),
              type: tower.type,
              col: clamp(parseInt(tower.col, 10), 0, COLS - 1),
              row: clamp(parseInt(tower.row, 10), 0, ROWS - 1),
              level: clamp(parseInt(tower.level, 10) || 1, 1, DATA.towers[tower.type].maxLevel),
              trait: typeof tower.trait === "string" ? tower.trait : null,
              cooldown: 0
            }))
        : [];

      state.hero.level = Math.max(1, parseInt(saved.hero && saved.hero.level, 10) || 1);
      state.hero.exp = Math.max(0, parseInt(saved.hero && saved.hero.exp, 10) || 0);
      state.hero.cooldown = 0;
      state.hero.skillCooldown = 0;

      state.relics = Array.isArray(saved.relics) ? saved.relics.filter((id) => DATA.relics.some((relic) => relic.id === id)) : [];
      state.relicWavesClaimed = Array.isArray(saved.relicWavesClaimed) ? saved.relicWavesClaimed : [];

      state.status = saved.status === "gameOver" || saved.status === "clear" ? saved.status : "playing";
      state.speed = [1, 2, 3].includes(saved.speed) ? saved.speed : 1;
      state.autoWave = !!saved.autoWave;
      state.paused = false;
      state.waveRunning = false;
      state.enemies = [];
      state.projectiles = [];
      state.effects = [];
      state.floaters = [];
      state.spawnQueue = [];
      state.spawnTimer = 0;
      state.bossWarningTimer = 0;
      state.traitModalTowerId = null;
      state.relicChoices = [];

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
    closeAllModals();
    buildTowerCards();
    updatePanels();
    showToast("v0.6 저장 데이터를 삭제하고 초기화했습니다.");
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

    updateActionMenu();
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
      if (isBlockingModal()) return;
      state.paused = !state.paused;
      updatePanels();
    });

    el.autoWave.addEventListener("click", () => {
      state.autoWave = !state.autoWave;
      state.autoStartTimer = 0;
      saveGame();
      updatePanels();
      showToast(state.autoWave ? "자동 웨이브 ON" : "자동 웨이브 OFF");
    });

    el.heroSkill.addEventListener("click", useHeroSkill);
    el.reset.addEventListener("click", resetGame);
  }

  function updateTopBar() {
    el.gold.textContent = state.gold;
    el.baseHp.textContent = state.baseHp;
    el.wave.textContent = `${Math.min(state.currentWave, DATA.waves.length)}/${DATA.waves.length}`;
    el.speed.textContent = `${state.speed}x`;
    el.pause.textContent = state.paused ? "재개" : "일시정지";
    el.autoWave.textContent = state.autoWave ? "자동 ON" : "자동 OFF";

    const skillStats = getHeroSkillStats();
    const skillReady = state.hero.skillCooldown <= 0;
    el.heroSkill.textContent = skillReady ? DATA.hero.skillName : `${Math.ceil(state.hero.skillCooldown)}초`;
    el.heroSkill.disabled = state.status !== "playing" || state.paused || isBlockingModal() || !skillReady;

    el.start.disabled = state.waveRunning || state.status !== "playing" || state.paused || isBlockingModal();

    if (isBlockingModal()) {
      el.status.textContent = "선택 필요";
    } else if (state.status === "gameOver") {
      el.status.textContent = "GAME OVER";
    } else if (state.status === "clear") {
      el.status.textContent = "CLEAR";
    } else if (state.paused) {
      el.status.textContent = "PAUSED";
    } else if (state.bossWarningTimer > 0) {
      el.status.textContent = "BOSS";
    } else if (state.waveRunning) {
      el.status.textContent = "전투 중";
    } else if (state.autoWave && state.autoStartTimer > 0) {
      el.status.textContent = "자동 대기";
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
    updateActionMenu();
    updateNextWavePanel();
    updateHeroPanel();
    updateRelicPanel();
  }

  function updateActionMenu() {
    const tower = getSelectedTower();

    if (!tower) {
      el.actionMenu.classList.remove("is-visible");
      el.actionMenu.innerHTML = "";
      return;
    }

    const table = DATA.towers[tower.type];
    const stats = getTowerStats(tower);
    const upgradeCost = DATA.formulas.towerUpgradeCost(table, tower.level);
    const sellValue = DATA.formulas.towerSellValue(table, tower.level);
    const isMax = upgradeCost === null;
    const trait = getTraitById(tower.trait);
    const traitStatus = trait
      ? `${trait.name} 적용 중`
      : tower.level >= table.traitUnlockLevel
        ? "특성 선택 가능"
        : `Lv.${table.traitUnlockLevel}에서 특성 해금`;

    const menuWidth = 232;
    const left = clamp((tower.col + 0.5) * tileSize, menuWidth / 2 + 6, boardWidth - menuWidth / 2 - 6);
    const top = clamp((tower.row + 0.5) * tileSize - 92, 8, boardHeight - 134);

    el.actionMenu.style.left = `${left}px`;
    el.actionMenu.style.top = `${top}px`;
    el.actionMenu.classList.add("is-visible");

    el.actionMenu.innerHTML = `
      <div class="action-title">
        ${table.symbol} ${table.name}
        <span>Lv.${tower.level}/${table.maxLevel}</span>
      </div>
      <div class="action-info">
        <span>공격력</span><strong>${stats.damage}</strong>
        <span>사거리</span><strong>${stats.range}</strong>
        <span>강화</span><strong>${isMax ? "MAX" : `${upgradeCost}G`}</strong>
        <span>판매</span><strong>${sellValue}G</strong>
      </div>
      <div class="action-trait">${traitStatus}</div>
      <div class="action-buttons">
        <button id="quickUpgradeBtn" class="small-btn" ${isMax ? "disabled" : ""}>강화</button>
        <button id="quickSellBtn" class="small-btn danger">판매</button>
      </div>
    `;

    const upgradeBtn = document.getElementById("quickUpgradeBtn");
    const sellBtn = document.getElementById("quickSellBtn");

    if (upgradeBtn) upgradeBtn.addEventListener("click", upgradeSelectedTower);
    if (sellBtn) sellBtn.addEventListener("click", sellSelectedTower);
  }

  function updateNextWavePanel() {
    const wave = DATA.waves[state.currentWave - 1];

    if (!wave || state.status === "clear") {
      el.nextWavePanel.innerHTML = `
        <div class="panel-title">다음 웨이브</div>
        <div class="empty-panel">모든 웨이브를 클리어했습니다.</div>
      `;
      return;
    }

    const groupRows = wave.groups.map((group) => {
      const monster = DATA.monsters[group.type];
      const traits = getMonsterTraitLabels(monster).join(", ");
      return `<div><b>${monster.name}</b> x${group.count}${traits ? ` · ${traits}` : ""}</div>`;
    }).join("");

    const traitTags = collectWaveTraits(wave).map((traitId) => {
      const trait = DATA.monsterTraits[traitId];
      return `<span class="tag">${trait ? trait.symbol : traitId}</span>`;
    }).join("");

    el.nextWavePanel.innerHTML = `
      <div class="panel-title">다음 웨이브</div>
      <div class="info-grid">
        <span>Wave</span><strong>${wave.id}</strong>
        <span>이름</span><strong>${wave.name}</strong>
        <span>완료 보상</span><strong>${wave.reward}G</strong>
        <span>보스</span><strong>${wave.boss ? "있음" : "없음"}</strong>
      </div>
      <div class="wave-list">${groupRows}</div>
      <div class="tag-row">${traitTags || '<span class="tag">기본</span>'}</div>
      <div class="wave-list"><b>추천:</b> ${wave.recommendation}</div>
    `;
  }

  function updateHeroPanel() {
    const heroStats = getHeroStats();
    const skillStats = getHeroSkillStats();
    const nextExp = DATA.formulas.heroNextExp(state.hero.level);
    const expPercent = clamp((state.hero.exp / nextExp) * 100, 0, 100);

    const passiveRows = DATA.heroPassives
      .filter((passive) => state.hero.level >= passive.level)
      .map((passive) => `<div><b>Lv.${passive.level}</b> ${passive.name}</div>`)
      .join("");

    el.heroPanel.innerHTML = `
      <div class="panel-title">히어로: ${DATA.hero.name}</div>
      <div class="hero-line">
        <span>${DATA.hero.title}</span>
        <strong>Lv.${state.hero.level}</strong>
      </div>
      <div class="info-grid">
        <span>경험치</span><strong>${state.hero.exp}/${nextExp}</strong>
        <span>공격력</span><strong>${heroStats.damage}</strong>
        <span>사거리</span><strong>${heroStats.range}</strong>
        <span>스킬 피해</span><strong>${skillStats.damage}</strong>
      </div>
      <div class="exp-bar"><span style="width:${expPercent}%"></span></div>
      <div class="passive-list">${passiveRows || "해금된 패시브 없음"}</div>
    `;
  }

  function updateRelicPanel() {
    const counts = getRelicCounts();
    const entries = Object.entries(counts);

    const relicRows = entries.length
      ? entries.map(([id, count]) => {
          const relic = DATA.relics.find((item) => item.id === id);
          if (!relic) return "";
          return `<div><b>${relic.name}${count > 1 ? ` x${count}` : ""}</b> · ${relic.description}</div>`;
        }).join("")
      : "보스 처치 후 유물을 획득할 수 있습니다.";

    el.relicPanel.innerHTML = `
      <div class="panel-title">유물</div>
      <div class="info-grid">
        <span>보유 수</span><strong>${state.relics.length}</strong>
        <span>보스 보상</span><strong>3택1</strong>
      </div>
      <div class="relic-list">${relicRows}</div>
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

    addEffect({
      type: "upgrade",
      x: tower.col + 0.5,
      y: tower.row + 0.5,
      life: 0.55,
      maxLife: 0.55,
      color: table.color
    });

    showToast(`${table.name} Lv.${tower.level}`);
    maybeOpenTraitModal(tower);
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

  function maybeOpenTraitModal(tower) {
    const table = DATA.towers[tower.type];
    const options = DATA.towerTraits[tower.type] || [];

    if (!options.length) return;
    if (tower.trait) return;
    if (tower.level < table.traitUnlockLevel) return;

    state.traitModalTowerId = tower.id;
    el.traitModalTitle.textContent = `${table.name} 특성 선택`;
    el.traitModalDesc.textContent = `Lv.${table.traitUnlockLevel}에 도달했습니다. 이 선택은 저장되며 현재 버전에서는 변경할 수 없습니다.`;
    el.traitOptions.innerHTML = "";

    options.forEach((trait) => {
      const button = document.createElement("button");
      button.className = "choice-btn";
      button.type = "button";
      button.innerHTML = `
        <strong>${trait.name}</strong>
        <span>${trait.summary}</span>
        <span>${trait.effectText}</span>
      `;
      button.addEventListener("click", () => selectTowerTrait(trait.id));
      el.traitOptions.appendChild(button);
    });

    el.traitModal.classList.add("is-visible");
    updatePanels();
  }

  function selectTowerTrait(traitId) {
    const tower = state.towers.find((item) => item.id === state.traitModalTowerId);
    const trait = getTraitById(traitId);

    if (tower && trait) {
      tower.trait = traitId;
      addEffect({
        type: "upgrade",
        x: tower.col + 0.5,
        y: tower.row + 0.5,
        life: 0.8,
        maxLife: 0.8,
        color: DATA.towers[tower.type].color
      });
      showToast(`${trait.name} 특성 적용`);
    }

    state.traitModalTowerId = null;
    el.traitModal.classList.remove("is-visible");
    saveGame();
    updatePanels();
  }

  function getTraitById(traitId) {
    if (!traitId) return null;

    for (const traits of Object.values(DATA.towerTraits)) {
      const found = traits.find((trait) => trait.id === traitId);
      if (found) return found;
    }

    return null;
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
      trait: null,
      cooldown: 0
    };

    state.gold -= table.cost;
    state.towers.push(tower);
    state.selectedTowerId = tower.id;

    addEffect({
      type: "upgrade",
      x: col + 0.5,
      y: row + 0.5,
      life: 0.45,
      maxLife: 0.45,
      color: table.color
    });

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
    if (state.status !== "playing" || state.paused || state.waveRunning || isBlockingModal()) return;

    const wave = DATA.waves[state.currentWave - 1];
    if (!wave) return;

    state.waveRunning = true;
    state.spawnQueue = createSpawnQueue(wave);
    state.spawnTimer = wave.boss ? 2.1 : 0.2;
    state.bossWarningTimer = wave.boss ? 2.0 : 0;
    state.selectedTowerId = null;
    state.autoStartTimer = 0;

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
    const traits = Array.isArray(table.traits) ? [...table.traits] : [];
    if (table.boss && !traits.includes("boss")) traits.push("boss");

    const shield = traits.includes("shield") ? Math.round(stats.hp * (table.boss ? 0.28 : 0.22)) : 0;

    state.enemies.push({
      id: makeId("enemy"),
      type: spawn.type,
      name: table.name,
      waveId: spawn.waveId,
      x: first.x,
      y: first.y,
      pathIndex: 1,
      hp: stats.hp,
      maxHp: stats.hp,
      shield,
      maxShield: shield,
      speed: stats.speed,
      gold: stats.gold,
      exp: stats.exp,
      radius: table.radius,
      color: table.color,
      aura: table.aura,
      traits,
      boss: !!table.boss,
      slowTimer: 0,
      slowFactor: 1,
      freezeTimer: 0,
      poisonTimer: 0,
      poisonDps: 0,
      poisonTick: 0,
      vulnerabilityTimer: 0,
      vulnerabilityFactor: 1,
      dead: false,
      escaped: false
    });
  }

  function update(dt) {
    updateEffects(dt);

    if (isBlockingModal()) return;
    if (state.paused || state.status !== "playing") return;

    if (state.bossWarningTimer > 0) {
      state.bossWarningTimer = Math.max(0, state.bossWarningTimer - dt);
    }

    updateAutoWave(dt);
    updateHeroCooldowns(dt);
    updateSpawning(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateHero(dt);
    updateProjectiles(dt);
    cleanupEntities();
    checkWaveEnd();

    autosaveTimer += dt;
    if (autosaveTimer >= 3) {
      autosaveTimer = 0;
      saveGame();
    }
  }

  function updateAutoWave(dt) {
    if (!state.autoWave) return;
    if (state.waveRunning) return;
    if (state.status !== "playing") return;
    if (state.currentWave > DATA.waves.length) return;

    if (state.autoStartTimer > 0) {
      state.autoStartTimer -= dt;
      if (state.autoStartTimer <= 0) {
        startWave();
      }
    }
  }

  function updateHeroCooldowns(dt) {
    if (state.hero.skillCooldown > 0) {
      state.hero.skillCooldown = Math.max(0, state.hero.skillCooldown - dt);
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

      updateEnemyStatuses(enemy, dt);
      if (enemy.dead || enemy.escaped) return;

      if (enemy.freezeTimer > 0) return;

      let auraFactor = hasHasteAura(enemy) ? 1.18 : 1;
      let remaining = enemy.speed * enemy.slowFactor * auraFactor * dt;

      while (remaining > 0 && !enemy.escaped) {
        const target = pathPoints[enemy.pathIndex];

        if (!target) {
          enemy.escaped = true;
          state.baseHp -= enemy.boss ? 3 : 1;
          addFloater(enemy.boss ? "-3 HP" : "-1 HP", enemy.x, enemy.y, "#ff7875");

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

        if (dist <= 0.0001) {
          enemy.pathIndex += 1;
          continue;
        }

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

  function updateEnemyStatuses(enemy, dt) {
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;
      if (enemy.slowTimer <= 0) {
        enemy.slowFactor = 1;
      }
    }

    if (enemy.freezeTimer > 0) {
      enemy.freezeTimer = Math.max(0, enemy.freezeTimer - dt);
    }

    if (enemy.vulnerabilityTimer > 0) {
      enemy.vulnerabilityTimer -= dt;
      if (enemy.vulnerabilityTimer <= 0) {
        enemy.vulnerabilityFactor = 1;
      }
    }

    if (enemy.poisonTimer > 0) {
      enemy.poisonTimer -= dt;
      enemy.poisonTick -= dt;

      if (enemy.poisonTick <= 0) {
        enemy.poisonTick += 0.5;
        damageEnemy(enemy, enemy.poisonDps * 0.5, "poisonDot");
      }

      if (enemy.poisonTimer <= 0) {
        enemy.poisonDps = 0;
      }
    }

    if (!enemy.dead && enemy.traits.includes("regen")) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.014 * dt);
    }
  }

  function hasHasteAura(enemy) {
    return state.enemies.some((other) => {
      if (other.id === enemy.id || other.dead || other.escaped) return false;
      if (!other.traits.includes("darkAura")) return false;
      return distance(enemy.x, enemy.y, other.x, other.y) <= 2.05;
    });
  }

  function updateTowers(dt) {
    state.towers.forEach((tower) => {
      const table = DATA.towers[tower.type];
      const stats = getTowerStats(tower);

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

    const stats = getHeroStats();
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

    addEffect({
      type: "muzzle",
      x: DATA.hero.x,
      y: DATA.hero.y,
      life: 0.12,
      maxLife: 0.12,
      color: DATA.hero.projectileColor
    });
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
      splashRadius: stats.splashRadius || 0,
      slowFactor: stats.slowFactor || 0,
      slowDuration: stats.slowDuration || 0,
      slowRadius: stats.slowRadius || 0,
      freezeChance: stats.freezeChance || 0,
      dotDamagePerSecond: stats.dotDamagePerSecond || 0,
      dotDuration: stats.dotDuration || 0,
      poisonRadius: stats.poisonRadius || 0,
      bossDamageMultiplier: stats.bossDamageMultiplier || 1
    });

    addEffect({
      type: "muzzle",
      x,
      y,
      life: 0.1,
      maxLife: 0.1,
      color: table.color
    });
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

      if (stats.vulnerabilityFactor > 1) {
        applyVulnerability(current, stats.vulnerabilityFactor, stats.vulnerabilityDuration);
      }

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
      const directDamage = target.boss ? projectile.damage * projectile.bossDamageMultiplier : projectile.damage;
      damageEnemy(target, directDamage, "cannon");

      state.enemies.forEach((enemy) => {
        if (enemy.id === target.id || enemy.dead || enemy.escaped) return;
        if (distance(projectile.x, projectile.y, enemy.x, enemy.y) <= projectile.splashRadius) {
          damageEnemy(enemy, Math.round(projectile.damage * 0.58), "cannonSplash");
        }
      });

      addEffect({
        type: "explosion",
        x: projectile.x,
        y: projectile.y,
        radius: projectile.splashRadius,
        life: 0.28,
        maxLife: 0.28,
        color: projectile.color
      });

      return;
    }

    if (projectile.type === "ice") {
      applySlow(target, projectile.slowFactor, projectile.slowDuration);
      applyFreeze(target, projectile.freezeChance);

      if (projectile.slowRadius > 0) {
        state.enemies.forEach((enemy) => {
          if (enemy.id === target.id || enemy.dead || enemy.escaped) return;
          if (distance(target.x, target.y, enemy.x, enemy.y) <= projectile.slowRadius) {
            applySlow(enemy, projectile.slowFactor, projectile.slowDuration * 0.8);
          }
        });
      }

      addEffect({
        type: "slow",
        x: target.x,
        y: target.y,
        life: 0.28,
        maxLife: 0.28,
        color: projectile.color
      });

      damageEnemy(target, projectile.damage, "ice");
      return;
    }

    if (projectile.type === "poison") {
      damageEnemy(target, projectile.damage, "poison");
      applyPoison(target, projectile.dotDamagePerSecond, projectile.dotDuration);

      if (projectile.poisonRadius > 0) {
        state.enemies.forEach((enemy) => {
          if (enemy.id === target.id || enemy.dead || enemy.escaped) return;
          if (distance(target.x, target.y, enemy.x, enemy.y) <= projectile.poisonRadius) {
            damageEnemy(enemy, Math.round(projectile.damage * 0.45), "poison");
            applyPoison(enemy, projectile.dotDamagePerSecond * 0.55, projectile.dotDuration * 0.75);
          }
        });

        addEffect({
          type: "poisonCloud",
          x: target.x,
          y: target.y,
          radius: projectile.poisonRadius,
          life: 0.34,
          maxLife: 0.34,
          color: projectile.color
        });
      } else {
        addEffect({
          type: "hit",
          x: projectile.x,
          y: projectile.y,
          life: 0.16,
          maxLife: 0.16,
          color: projectile.color
        });
      }

      return;
    }

    damageEnemy(target, projectile.damage, projectile.type);

    addEffect({
      type: "hit",
      x: projectile.x,
      y: projectile.y,
      life: 0.16,
      maxLife: 0.16,
      color: projectile.color
    });
  }

  function applySlow(enemy, factor, duration) {
    if (!enemy || enemy.dead || enemy.escaped || !factor || !duration) return;

    let finalFactor = factor;
    let finalDuration = duration;

    if (enemy.traits.includes("boss")) {
      finalFactor = Math.max(finalFactor, 0.72);
      finalDuration *= 0.55;
    }

    enemy.slowTimer = Math.max(enemy.slowTimer, finalDuration);
    enemy.slowFactor = Math.min(enemy.slowFactor, finalFactor);
  }

  function applyFreeze(enemy, chance) {
    if (!enemy || enemy.dead || enemy.escaped || !chance) return;

    let finalChance = chance;
    if (enemy.traits.includes("boss")) finalChance *= 0.35;

    if (Math.random() < finalChance) {
      enemy.freezeTimer = Math.max(enemy.freezeTimer, enemy.traits.includes("boss") ? 0.18 : 0.45);
      addEffect({
        type: "freeze",
        x: enemy.x,
        y: enemy.y,
        life: 0.32,
        maxLife: 0.32,
        color: "#67e8f9"
      });
    }
  }

  function applyPoison(enemy, dps, duration) {
    if (!enemy || enemy.dead || enemy.escaped || !dps || !duration) return;

    enemy.poisonDps = Math.max(enemy.poisonDps, dps);
    enemy.poisonTimer = Math.max(enemy.poisonTimer, duration);
    enemy.poisonTick = Math.min(enemy.poisonTick || 0.5, 0.5);
  }

  function applyVulnerability(enemy, factor, duration) {
    if (!enemy || enemy.dead || enemy.escaped) return;

    let finalDuration = duration;
    if (enemy.traits.includes("boss")) finalDuration *= 0.55;

    enemy.vulnerabilityFactor = Math.max(enemy.vulnerabilityFactor, factor);
    enemy.vulnerabilityTimer = Math.max(enemy.vulnerabilityTimer, finalDuration);
  }

  function damageEnemy(enemy, amount, source) {
    if (!enemy || enemy.dead || enemy.escaped) return;

    const multiplier = getDamageMultiplier(enemy, source);
    let damage = Math.max(1, Math.round(amount * multiplier));

    if (enemy.shield > 0) {
      const absorbed = Math.min(enemy.shield, damage);
      enemy.shield -= absorbed;
      damage -= absorbed;

      if (absorbed > 0) {
        addEffect({
          type: "shield",
          x: enemy.x,
          y: enemy.y,
          life: 0.14,
          maxLife: 0.14,
          color: "#7dd3fc"
        });
      }

      if (damage <= 0) return;
    }

    enemy.hp -= damage;

    if (enemy.hp <= 0) {
      killEnemy(enemy, source);
    }
  }

  function getDamageMultiplier(enemy, source) {
    let multiplier = 1;

    if (enemy.traits.includes("flying") && (source === "cannon" || source === "cannonSplash")) {
      multiplier *= 0.55;
    }

    if (enemy.traits.includes("armored")) {
      if (source === "cannon" || source === "cannonSplash") multiplier *= 1.1;
      else if (source === "poison" || source === "poisonDot") multiplier *= 1.2;
      else multiplier *= 0.82;
    }

    if (enemy.traits.includes("toxicResist") && (source === "poison" || source === "poisonDot")) {
      multiplier *= 0.55;
    }

    if (enemy.vulnerabilityTimer > 0) {
      multiplier *= enemy.vulnerabilityFactor;
    }

    return multiplier;
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;

    enemy.dead = true;

    const relicEffects = getRelicEffects();
    const gainedGold = Math.round(enemy.gold * (1 + relicEffects.goldGainPct));
    state.gold += gainedGold;

    addHeroExp(enemy.exp);
    addFloater(`+${gainedGold}G`, enemy.x, enemy.y - 0.1, "#facc15");

    addEffect({
      type: enemy.boss ? "bossDeath" : "death",
      x: enemy.x,
      y: enemy.y,
      life: enemy.boss ? 0.55 : 0.32,
      maxLife: enemy.boss ? 0.55 : 0.32,
      color: enemy.aura
    });

    if (enemy.boss && !state.relicWavesClaimed.includes(enemy.waveId)) {
      state.relicWavesClaimed.push(enemy.waveId);
      openRelicModal();
    }

    saveGame();
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
      addEffect({
        type: "heroLevel",
        x: DATA.hero.x,
        y: DATA.hero.y,
        life: 0.85,
        maxLife: 0.85,
        color: "#fde047"
      });

      showToast(`${DATA.hero.name} 레벨업: Lv.${state.hero.level}`);
    }

    updateHeroPanel();
  }

  function useHeroSkill() {
    if (state.status !== "playing" || state.paused || isBlockingModal()) return;
    if (state.hero.skillCooldown > 0) return;

    const stats = getHeroSkillStats();
    let hitCount = 0;

    state.enemies.forEach((enemy) => {
      if (enemy.dead || enemy.escaped) return;
      if (distance(DATA.hero.x, DATA.hero.y, enemy.x, enemy.y) <= stats.radius) {
        damageEnemy(enemy, enemy.boss ? stats.damage * 1.25 : stats.damage, "skill");
        hitCount += 1;
      }
    });

    state.hero.skillCooldown = stats.cooldown;

    addEffect({
      type: "heroSkill",
      x: DATA.hero.x,
      y: DATA.hero.y,
      radius: stats.radius,
      life: 0.55,
      maxLife: 0.55,
      color: "#fde047"
    });

    showToast(hitCount > 0 ? `성광 폭발 ${hitCount}명 타격` : "성광 폭발 사용");
    saveGame();
    updatePanels();
  }

  function cleanupEntities() {
    state.enemies = state.enemies.filter((enemy) => !enemy.dead && !enemy.escaped);
    state.projectiles = state.projectiles.filter((projectile) => !projectile.done);
  }

  function checkWaveEnd() {
    if (!state.waveRunning) return;
    if (state.relicChoices.length > 0) return;
    if (state.spawnQueue.length > 0 || state.enemies.length > 0) return;

    const completedWave = state.currentWave;
    const wave = DATA.waves[completedWave - 1];

    state.waveRunning = false;
    state.gold += wave.reward;

    addFloater(`Wave 보상 +${wave.reward}G`, 4, 4.5, "#facc15");

    if (completedWave >= DATA.waves.length) {
      state.status = "clear";
      state.currentWave = DATA.waves.length;
      showToast("Abyss Defense v0.6 클리어");
    } else {
      state.currentWave += 1;
      showToast(`Wave ${completedWave} 완료`);

      if (state.autoWave) {
        state.autoStartTimer = 1.25;
      }
    }

    saveGame();
    updatePanels();
  }

  function openRelicModal() {
    state.relicChoices = pickRelicChoices(3);
    el.relicOptions.innerHTML = "";

    state.relicChoices.forEach((relic) => {
      const button = document.createElement("button");
      button.className = "choice-btn";
      button.type = "button";
      button.innerHTML = `
        <strong>${relic.name}</strong>
        <span>${relic.description}</span>
      `;
      button.addEventListener("click", () => selectRelic(relic.id));
      el.relicOptions.appendChild(button);
    });

    el.relicModal.classList.add("is-visible");
    updatePanels();
  }

  function pickRelicChoices(count) {
    const pool = [...DATA.relics];

    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, count);
  }

  function selectRelic(relicId) {
    const relic = DATA.relics.find((item) => item.id === relicId);
    if (!relic) return;

    state.relics.push(relicId);

    if (relic.effects.baseRepair) {
      state.baseHp = Math.min(DATA.board.startBaseHp, state.baseHp + relic.effects.baseRepair);
    }

    state.relicChoices = [];
    el.relicModal.classList.remove("is-visible");

    showToast(`${relic.name} 획득`);
    saveGame();
    updatePanels();
  }

  function closeAllModals() {
    state.traitModalTowerId = null;
    state.relicChoices = [];
    el.traitModal.classList.remove("is-visible");
    el.relicModal.classList.remove("is-visible");
  }

  function isBlockingModal() {
    return !!state.traitModalTowerId || state.relicChoices.length > 0;
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

  function getTowerStats(tower) {
    const table = DATA.towers[tower.type];
    const base = DATA.formulas.towerStats(table, tower.level);
    const relic = getRelicEffects();

    let stats = {
      ...base,
      bossDamageMultiplier: 1,
      freezeChance: 0,
      slowRadius: 0,
      poisonRadius: 0,
      vulnerabilityFactor: 1,
      vulnerabilityDuration: 0
    };

    stats.damage *= 1 + relic.towerDamagePct;

    if (tower.type === "archer") {
      stats.attackInterval *= 1 - relic.archerAttackSpeedPct;
    }

    if (tower.type === "cannon") {
      stats.splashRadius *= 1 + relic.cannonSplashPct;
    }

    if (tower.type === "ice") {
      stats.slowDuration *= 1 + relic.iceSlowDurationPct;
    }

    if (tower.type === "lightning") {
      stats.chainCount += relic.lightningChainFlat;
    }

    if (tower.type === "poison") {
      stats.damage *= 1 + relic.poisonDamagePct;
      stats.dotDamagePerSecond *= 1 + relic.poisonDamagePct;
    }

    switch (tower.trait) {
      case "archer_sniper":
        stats.damage *= 1.35;
        stats.range += 0.2;
        stats.attackInterval *= 1.12;
        break;
      case "archer_rapid":
        stats.damage *= 0.88;
        stats.attackInterval *= 0.72;
        break;
      case "cannon_blast":
        stats.damage *= 0.94;
        stats.splashRadius += 0.32;
        break;
      case "cannon_siege":
        stats.attackInterval *= 1.08;
        stats.bossDamageMultiplier = 1.5;
        break;
      case "ice_freeze":
        stats.freezeChance = 0.14 + tower.level * 0.012;
        break;
      case "ice_chill":
        stats.slowDuration += 0.5;
        stats.slowRadius = 0.75;
        break;
      case "lightning_chain":
        stats.damage *= 0.9;
        stats.chainCount += 2;
        break;
      case "lightning_shock":
        stats.vulnerabilityFactor = 1.15;
        stats.vulnerabilityDuration = 2.2;
        break;
      case "poison_venom":
        stats.dotDamagePerSecond *= 1.55;
        break;
      case "poison_cloud":
        stats.poisonRadius = 0.75;
        break;
      default:
        break;
    }

    stats.damage = Math.max(1, Math.round(stats.damage));
    stats.range = Number(stats.range.toFixed(2));
    stats.attackInterval = Number(Math.max(0.22, stats.attackInterval).toFixed(2));
    stats.splashRadius = Number((stats.splashRadius || 0).toFixed(2));
    stats.slowDuration = Number((stats.slowDuration || 0).toFixed(2));
    stats.chainCount = Math.max(0, Math.round(stats.chainCount || 0));
    stats.dotDamagePerSecond = Math.max(0, Math.round(stats.dotDamagePerSecond || 0));

    return stats;
  }

  function getHeroStats() {
    const base = DATA.formulas.heroStats(DATA.hero, state.hero.level);
    const relic = getRelicEffects();
    const passive = getHeroPassiveEffects();

    const damage = Math.round(base.damage * (1 + relic.heroDamagePct + passive.heroDamagePct));
    const range = Number((base.range + relic.heroRangeFlat + passive.heroRangeFlat).toFixed(2));
    const attackInterval = Number(Math.max(0.38, base.attackInterval * (1 - relic.heroAttackSpeedPct - passive.heroAttackSpeedPct)).toFixed(2));

    return { damage, range, attackInterval };
  }

  function getHeroSkillStats() {
    const heroStats = getHeroStats();
    const relic = getRelicEffects();
    const passive = getHeroPassiveEffects();

    const damage = Math.round(heroStats.damage * 3.4 * (1 + relic.skillDamagePct + passive.skillDamagePct));
    const radius = Number((DATA.hero.skillRadius + relic.skillRadiusFlat + passive.skillRadiusFlat).toFixed(2));
    const cooldown = Number(Math.max(7, DATA.hero.skillCooldown * (1 - relic.skillCooldownPct - passive.skillCooldownPct)).toFixed(2));

    return { damage, radius, cooldown };
  }

  function getHeroPassiveEffects() {
    const result = createEmptyEffects();

    DATA.heroPassives.forEach((passive) => {
      if (state.hero.level < passive.level) return;
      addEffects(result, passive.effects || {});
    });

    return result;
  }

  function getRelicEffects() {
    const result = createEmptyEffects();

    state.relics.forEach((id) => {
      const relic = DATA.relics.find((item) => item.id === id);
      if (!relic) return;
      addEffects(result, relic.effects || {});
    });

    return result;
  }

  function createEmptyEffects() {
    return {
      towerDamagePct: 0,
      archerAttackSpeedPct: 0,
      cannonSplashPct: 0,
      iceSlowDurationPct: 0,
      lightningChainFlat: 0,
      poisonDamagePct: 0,
      heroDamagePct: 0,
      heroRangeFlat: 0,
      heroAttackSpeedPct: 0,
      skillDamagePct: 0,
      skillCooldownPct: 0,
      skillRadiusFlat: 0,
      goldGainPct: 0,
      baseRepair: 0
    };
  }

  function addEffects(target, source) {
    Object.keys(source).forEach((key) => {
      if (typeof target[key] !== "number") target[key] = 0;
      target[key] += source[key];
    });
  }

  function getRelicCounts() {
    return state.relics.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {});
  }

  function collectWaveTraits(wave) {
    const set = new Set();

    wave.groups.forEach((group) => {
      const monster = DATA.monsters[group.type];
      if (!monster || !Array.isArray(monster.traits)) return;
      monster.traits.forEach((trait) => set.add(trait));
    });

    return Array.from(set);
  }

  function getMonsterTraitLabels(monster) {
    if (!monster || !Array.isArray(monster.traits)) return [];

    return monster.traits.map((traitId) => {
      const trait = DATA.monsterTraits[traitId];
      return trait ? trait.symbol : traitId;
    });
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
      const stats = getTowerStats(selected);
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
      const trait = getTraitById(tower.trait);

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

      if (trait) {
        ctx.beginPath();
        ctx.arc(x + r * 0.72, y - r * 0.72, tileSize * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = "#facc15";
        ctx.fill();
      }

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

      if (enemy.boss || enemy.traits.includes("darkAura")) {
        const pulse = 1 + Math.sin(performance.now() / 180) * 0.08;
        ctx.beginPath();
        ctx.arc(x, y, r * (enemy.boss ? 1.8 : 1.35) * pulse, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(enemy.aura, enemy.boss ? 0.18 : 0.11);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = enemy.color;
      ctx.fill();
      ctx.lineWidth = enemy.boss ? 3 : 2;
      ctx.strokeStyle = getEnemyStrokeColor(enemy);
      ctx.stroke();

      if (enemy.traits.includes("flying")) {
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

      if (enemy.traits.includes("armored")) {
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      }

      drawHpBar(x, y - r - tileSize * 0.16, r * 2.15, tileSize * 0.08, enemy.hp / enemy.maxHp, enemy.boss, "#22c55e");

      if (enemy.maxShield > 0 && enemy.shield > 0) {
        drawHpBar(x, y - r - tileSize * 0.27, r * 2.15, tileSize * 0.06, enemy.shield / enemy.maxShield, false, "#38bdf8");
      }

      drawEnemyTraitDots(enemy, x, y, r);

      ctx.restore();
    });
  }

  function getEnemyStrokeColor(enemy) {
    if (enemy.freezeTimer > 0) return "#67e8f9";
    if (enemy.slowTimer > 0) return "#67e8f9";
    if (enemy.poisonTimer > 0) return "#bef264";
    if (enemy.vulnerabilityTimer > 0) return "#fca5a5";
    return enemy.aura;
  }

  function drawEnemyTraitDots(enemy, x, y, r) {
    const traits = enemy.traits.filter((trait) => trait !== "boss").slice(0, 3);
    traits.forEach((trait, index) => {
      const color = trait === "shield" ? "#38bdf8"
        : trait === "armored" ? "#e5e7eb"
          : trait === "regen" ? "#22c55e"
            : trait === "toxicResist" ? "#84cc16"
              : trait === "darkAura" ? "#a855f7"
                : "#c4b5fd";

      ctx.beginPath();
      ctx.arc(x - r + index * r * 0.55, y + r * 0.92, Math.max(2.5, tileSize * 0.045), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
  }

  function drawHpBar(x, y, w, h, ratio, boss, color) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    roundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();

    ctx.fillStyle = boss ? "#f97316" : color;
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
      } else if (effect.type === "explosion" || effect.type === "poisonCloud" || effect.type === "heroSkill") {
        ctx.globalAlpha = t;
        ctx.beginPath();
        ctx.arc(effect.x * tileSize, effect.y * tileSize, effect.radius * tileSize * (1.2 - t * 0.2), 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(effect.color, effect.type === "heroSkill" ? 0.22 : 0.28);
        ctx.fill();
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = effect.type === "heroSkill" ? 4 : 2;
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
    if (state.bossWarningTimer > 0) {
      ctx.save();
      const alpha = 0.35 + Math.sin(performance.now() / 90) * 0.12;
      ctx.fillStyle = `rgba(127, 29, 29, ${alpha})`;
      ctx.fillRect(0, 0, boardWidth, boardHeight);

      ctx.fillStyle = "#fee2e2";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `900 ${tileSize * 0.55}px system-ui`;
      ctx.fillText("WARNING", boardWidth / 2, boardHeight / 2 - tileSize * 0.2);

      ctx.font = `800 ${tileSize * 0.26}px system-ui`;
      ctx.fillStyle = "#fecaca";
      ctx.fillText("Boss Wave Incoming", boardWidth / 2, boardHeight / 2 + tileSize * 0.35);
      ctx.restore();
      return;
    }

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

    if (isBlockingModal()) return;

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
    state.floaters.push({
      text,
      x,
      y,
      color,
      life: 0.9,
      maxLife: 0.9
    });
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

    if (normalized.length !== 6) {
      return `rgba(255,255,255,${alpha})`;
    }

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
