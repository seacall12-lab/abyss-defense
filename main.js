/* Abyss Defense v0.8 - Main */
(function () {
  "use strict";

  const DATA = window.ABYSS_DATA;

  if (!DATA) {
    throw new Error(
      "ABYSS_DATA를 찾을 수 없습니다. " +
      "data.js가 main.js보다 먼저 로드되어야 합니다."
    );
  }

  const SAVE_KEY = DATA.saveKey;
  const COLS = DATA.board.cols;
  const ROWS = DATA.board.rows;

  const canvas =
    document.getElementById("gameCanvas");

  const ctx =
    canvas.getContext("2d");

  const el = {
    app:
      document.getElementById("app"),

    startScreen:
      document.getElementById("startScreen"),

    mapCards:
      document.getElementById("mapCards"),

    mapName:
      document.getElementById("mapNameText"),

    gold:
      document.getElementById("goldText"),

    baseHp:
      document.getElementById("baseHpText"),

    wave:
      document.getElementById("waveText"),

    status:
      document.getElementById("statusText"),

    stage:
      document.getElementById("gameStage"),

    actionMenu:
      document.getElementById("towerActionMenu"),

    waveOverlay:
      document.getElementById("waveOverlayButton"),

    waveOverlayTitle:
      document.getElementById("waveOverlayTitle"),

    waveOverlayName:
      document.getElementById("waveOverlayName"),

    waveOverlayHint:
      document.getElementById("waveOverlayHint"),

    toast:
      document.getElementById("toast"),

    towerQuickBar:
      document.getElementById("towerQuickBar"),

    cancelBuild:
      document.getElementById("cancelBuildBtn"),

    startWave:
      document.getElementById("startWaveBtn"),

    heroSkill:
      document.getElementById("heroSkillBtn"),

    speed:
      document.getElementById("speedBtn"),

    pause:
      document.getElementById("pauseBtn"),

    info:
      document.getElementById("infoBtn"),

    sheetBackdrop:
      document.getElementById("sheetBackdrop"),

    bottomSheet:
      document.getElementById("bottomSheet"),

    sheetContent:
      document.getElementById("sheetContent"),

    sheetTabs:
      Array.from(
        document.querySelectorAll(".sheet-tab")
      ),

    traitModal:
      document.getElementById("traitModal"),

    traitModalTitle:
      document.getElementById("traitModalTitle"),

    traitModalDesc:
      document.getElementById("traitModalDesc"),

    traitOptions:
      document.getElementById("traitOptions"),

    relicModal:
      document.getElementById("relicModal"),

    relicOptions:
      document.getElementById("relicOptions")
  };

  let viewportWidth = 360;
  let viewportHeight = 450;

  let tileSize = 44;
  let boardWidth = 352;
  let boardHeight = 440;

  let boardOffsetX = 0;
  let boardOffsetY = 0;

  let lastTime = 0;
  let nextEntityId = 1;
  let autosaveTimer = 0;
  let screenShake = 0;
  let sheetAutoPaused = false;

  const state =
    createInitialState(
      "abyssGate",
      false
    );

  function createInitialState(
    mapId,
    started
  ) {
    const map =
      DATA.maps[mapId] ||
      DATA.maps.abyssGate;

    return {
      started: !!started,
      mapId: map.id,

      gold: map.startGold,
      baseHp: map.startBaseHp,
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

      selectedBuildType: null,
      selectedTowerId: null,

      traitModalTowerId: null,
      relicChoices: [],

      sheetOpen: false,
      sheetTab: "wave",

      enemies: [],
      projectiles: [],
      effects: [],
      floaters: [],

      waveRunning: false,
      spawnQueue: [],
      spawnTimer: 0,

      bossWarningTimer: 0,

      mapDecor:
        buildMapDecor(map)
    };
  }

  function getMap() {
    return (
      DATA.maps[state.mapId] ||
      DATA.maps.abyssGate
    );
  }

  function getHeroPosition() {
    return getMap().hero;
  }

  function getPathCells() {
    return getMap().path;
  }

  function getPathPoints() {
    return getPathCells().map(
      (point) => ({
        x: point.x + 0.5,
        y: point.y + 0.5
      })
    );
  }

  function getPathSet() {
    return new Set(
      getPathCells().map(
        (point) =>
          `${point.x},${point.y}`
      )
    );
  }

  function getBlockedSet() {
    return new Set(
      (getMap().blocked || []).map(
        (point) =>
          `${point.x},${point.y}`
      )
    );
  }

  function makeId(prefix) {
    const id =
      `${prefix}_${nextEntityId}`;

    nextEntityId += 1;

    return id;
  }

  function saveGame() {
    if (!state.started) {
      return;
    }

    const payload = {
      version: DATA.version,
      started: true,

      mapId: state.mapId,

      gold: state.gold,
      baseHp: state.baseHp,
      currentWave: state.currentWave,

      towers:
        state.towers.map(
          (tower) => ({
            id: tower.id,
            type: tower.type,
            col: tower.col,
            row: tower.row,
            level: tower.level,
            trait: tower.trait || null
          })
        ),

      hero: {
        level: state.hero.level,
        exp: state.hero.exp
      },

      relics: state.relics,

      relicWavesClaimed:
        state.relicWavesClaimed,

      speed: state.speed,
      autoWave: state.autoWave,
      status: state.status
    };

    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify(payload)
    );
  }

  function loadGame() {
    const raw =
      localStorage.getItem(SAVE_KEY);

    if (!raw) {
      return false;
    }

    try {
      const saved =
        JSON.parse(raw);

      if (
        !saved ||
        !saved.started ||
        !DATA.maps[saved.mapId]
      ) {
        return false;
      }

      const fresh =
        createInitialState(
          saved.mapId,
          true
        );

      Object.keys(fresh).forEach(
        (key) => {
          state[key] = fresh[key];
        }
      );

      const map = getMap();

      state.gold =
        Number.isFinite(saved.gold)
          ? saved.gold
          : map.startGold;

      state.baseHp =
        Number.isFinite(saved.baseHp)
          ? saved.baseHp
          : map.startBaseHp;

      state.currentWave =
        clamp(
          parseInt(
            saved.currentWave,
            10
          ) || 1,
          1,
          DATA.waves.length
        );

      state.speed =
        [1, 2, 3].includes(
          saved.speed
        )
          ? saved.speed
          : 1;

      state.autoWave =
        !!saved.autoWave;

      state.status =
        saved.status === "gameOver" ||
        saved.status === "clear"
          ? saved.status
          : "playing";

      state.hero.level =
        Math.max(
          1,
          parseInt(
            saved.hero &&
            saved.hero.level,
            10
          ) || 1
        );

      state.hero.exp =
        Math.max(
          0,
          parseInt(
            saved.hero &&
            saved.hero.exp,
            10
          ) || 0
        );

      state.relics =
        Array.isArray(saved.relics)
          ? saved.relics.filter(
              (id) =>
                DATA.relics.some(
                  (relic) =>
                    relic.id === id
                )
            )
          : [];

      state.relicWavesClaimed =
        Array.isArray(
          saved.relicWavesClaimed
        )
          ? saved.relicWavesClaimed.filter(
              (waveId) =>
                Number.isFinite(waveId)
            )
          : [];

      state.towers =
        Array.isArray(saved.towers)
          ? saved.towers
              .filter(
                (tower) =>
                  DATA.towers[
                    tower.type
                  ]
              )
              .map(
                (tower) => ({
                  id:
                    tower.id ||
                    makeId("tower"),

                  type:
                    tower.type,

                  col:
                    clamp(
                      parseInt(
                        tower.col,
                        10
                      ) || 0,
                      0,
                      COLS - 1
                    ),

                  row:
                    clamp(
                      parseInt(
                        tower.row,
                        10
                      ) || 0,
                      0,
                      ROWS - 1
                    ),

                  level:
                    clamp(
                      parseInt(
                        tower.level,
                        10
                      ) || 1,
                      1,
                      DATA.towers[
                        tower.type
                      ].maxLevel
                    ),

                  trait:
                    typeof tower.trait ===
                    "string"
                      ? tower.trait
                      : null,

                  cooldown: 0
                })
              )
          : [];

      normalizeNextId();

      return true;
    } catch (error) {
      console.error(
        "저장 데이터 로드 실패:",
        error
      );

      return false;
    }
  }

  function normalizeNextId() {
    let maxId = 1;

    state.towers.forEach(
      (tower) => {
        const number =
          Number(
            String(tower.id).replace(
              /\D/g,
              ""
            )
          );

        if (
          Number.isFinite(number)
        ) {
          maxId =
            Math.max(
              maxId,
              number + 1
            );
        }
      }
    );

    nextEntityId =
      Math.max(
        nextEntityId,
        maxId
      );
  }

  function beginNewGame(mapId) {
    const fresh =
      createInitialState(
        mapId,
        true
      );

    Object.keys(fresh).forEach(
      (key) => {
        state[key] = fresh[key];
      }
    );

    nextEntityId = 1;
    autosaveTimer = 0;
    screenShake = 0;

    closeBottomSheet(false);
    closeAllModals();
    hideStartScreen();

    saveGame();
    resizeCanvas();
    updateAllUI();

    showToast(
      `${getMap().name} 시작`
    );
  }

  function returnToMapSelect() {
    localStorage.removeItem(
      SAVE_KEY
    );

    const fresh =
      createInitialState(
        "abyssGate",
        false
      );

    Object.keys(fresh).forEach(
      (key) => {
        state[key] = fresh[key];
      }
    );

    nextEntityId = 1;
    autosaveTimer = 0;
    screenShake = 0;

    closeBottomSheet(false);
    closeAllModals();

    showStartScreen();
    updateAllUI();
  }

  function showStartScreen() {
    el.startScreen.classList.remove(
      "is-hidden"
    );
  }

  function hideStartScreen() {
    el.startScreen.classList.add(
      "is-hidden"
    );
  }

  function buildMapCards() {
    el.mapCards.innerHTML = "";

    Object.values(
      DATA.maps
    ).forEach(
      (map) => {
        const button =
          document.createElement(
            "button"
          );

        button.className =
          "map-select-card";

        button.type =
          "button";

        button.innerHTML = `
          <strong>${map.name}</strong>
          <em>${map.difficulty}</em>
          <span>
            ${map.description}<br>
            시작 골드 ${map.startGold}
            · Base HP ${map.startBaseHp}
          </span>
        `;

        button.addEventListener(
          "click",
          () =>
            beginNewGame(map.id)
        );

        el.mapCards.appendChild(
          button
        );
      }
    );
  }

  function buildTowerQuickBar() {
    el.towerQuickBar.innerHTML =
      "";

    Object.values(
      DATA.towers
    ).forEach(
      (tower) => {
        const button =
          document.createElement(
            "button"
          );

        button.className =
          "tower-quick";

        button.type =
          "button";

        button.dataset.type =
          tower.id;

        button.style.setProperty(
          "--tower-color",
          tower.color
        );

        button.title =
          `${tower.name}: ` +
          tower.description;

        button.innerHTML = `
          <span class="tower-quick-symbol">
            ${tower.symbol}
          </span>
          <span class="tower-quick-price">
            ${tower.cost}G
          </span>
        `;

        button.addEventListener(
          "click",
          () =>
            toggleBuildType(
              tower.id
            )
        );

        el.towerQuickBar.appendChild(
          button
        );
      }
    );
  }

  function toggleBuildType(type) {
    if (
      !state.started ||
      state.status !== "playing"
    ) {
      return;
    }

    if (
      state.selectedBuildType ===
        type &&
      !state.selectedTowerId
    ) {
      state.selectedBuildType =
        null;

      showToast(
        "타워 선택 해제"
      );
    } else {
      state.selectedBuildType =
        type;

      state.selectedTowerId =
        null;

      showToast(
        `${DATA.towers[type].name} 배치`
      );
    }

    updateAllUI();
  }

  function cancelSelection() {
    state.selectedBuildType =
      null;

    state.selectedTowerId =
      null;

    updateAllUI();
  }

  function resizeCanvas() {
    const rect =
      el.stage.getBoundingClientRect();

    viewportWidth =
      Math.max(
        1,
        Math.floor(rect.width)
      );

    viewportHeight =
      Math.max(
        1,
        Math.floor(rect.height)
      );

    tileSize =
      Math.min(
        viewportWidth / COLS,
        viewportHeight / ROWS
      );

    boardWidth =
      tileSize * COLS;

    boardHeight =
      tileSize * ROWS;

    boardOffsetX =
      (
        viewportWidth -
        boardWidth
      ) / 2;

    boardOffsetY =
      (
        viewportHeight -
        boardHeight
      ) / 2;

    const dpr =
      window.devicePixelRatio ||
      1;

    canvas.width =
      Math.floor(
        viewportWidth * dpr
      );

    canvas.height =
      Math.floor(
        viewportHeight * dpr
      );

    canvas.style.width =
      `${viewportWidth}px`;

    canvas.style.height =
      `${viewportHeight}px`;

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    updateActionMenu();
  }

  function bindEvents() {
    window.addEventListener(
      "resize",
      resizeCanvas
    );

    window.addEventListener(
      "orientationchange",
      () =>
        setTimeout(
          resizeCanvas,
          120
        )
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.hidden &&
          state.started &&
          state.status ===
            "playing"
        ) {
          state.paused = true;
          updateAllUI();
          saveGame();
        }
      }
    );

    canvas.addEventListener(
      "pointerdown",
      onCanvasPointerDown
    );

    el.waveOverlay.addEventListener(
      "click",
      startWave
    );

    el.startWave.addEventListener(
      "click",
      startWave
    );

    el.heroSkill.addEventListener(
      "click",
      useHeroSkill
    );

    el.cancelBuild.addEventListener(
      "click",
      cancelSelection
    );

    el.speed.addEventListener(
      "click",
      () => {
        state.speed =
          state.speed === 1
            ? 2
            : state.speed === 2
              ? 3
              : 1;

        saveGame();
        updateAllUI();
      }
    );

    el.pause.addEventListener(
      "click",
      () => {
        if (
          !state.started ||
          state.status !==
            "playing" ||
          isBlockingModal()
        ) {
          return;
        }

        state.paused =
          !state.paused;

        updateAllUI();
      }
    );

    el.info.addEventListener(
      "click",
      () => {
        if (state.sheetOpen) {
          closeBottomSheet();
        } else {
          openBottomSheet(
            state.sheetTab ||
            "wave"
          );
        }
      }
    );

    el.sheetBackdrop.addEventListener(
      "click",
      () =>
        closeBottomSheet()
    );

    el.sheetTabs.forEach(
      (tab) => {
        tab.addEventListener(
          "click",
          () => {
            state.sheetTab =
              tab.dataset.tab;

            renderSheet();
          }
        );
      }
    );
  }

  function openBottomSheet(
    tabName
  ) {
    if (
      !state.started ||
      isBlockingModal()
    ) {
      return;
    }

    state.sheetTab =
      tabName || "wave";

    state.sheetOpen =
      true;

    if (
      !state.paused &&
      state.status === "playing"
    ) {
      state.paused = true;
      sheetAutoPaused = true;
    } else {
      sheetAutoPaused = false;
    }

    el.bottomSheet.classList.add(
      "is-open"
    );

    el.sheetBackdrop.classList.add(
      "is-visible"
    );

    renderSheet();
    updateAllUI();
  }

  function closeBottomSheet(
    restorePause
  ) {
    const shouldRestore =
      restorePause !== false;

    state.sheetOpen =
      false;

    el.bottomSheet.classList.remove(
      "is-open"
    );

    el.sheetBackdrop.classList.remove(
      "is-visible"
    );

    if (
      shouldRestore &&
      sheetAutoPaused &&
      state.status === "playing"
    ) {
      state.paused = false;
    }

    sheetAutoPaused = false;

    updateAllUI();
  }

  function renderSheet() {
    el.sheetTabs.forEach(
      (tab) => {
        tab.classList.toggle(
          "is-active",
          tab.dataset.tab ===
            state.sheetTab
        );
      }
    );

    if (
      state.sheetTab === "hero"
    ) {
      renderHeroSheet();
    } else if (
      state.sheetTab === "relic"
    ) {
      renderRelicSheet();
    } else if (
      state.sheetTab ===
      "settings"
    ) {
      renderSettingsSheet();
    } else {
      renderWaveSheet();
    }
  }

  function renderWaveSheet() {
    const wave =
      DATA.waves[
        state.currentWave - 1
      ];

    if (
      !wave ||
      state.status === "clear"
    ) {
      el.sheetContent.innerHTML = `
        <div class="info-card">
          <h3>웨이브</h3>
          <div class="info-list">
            모든 웨이브를 완료했습니다.
          </div>
        </div>
      `;

      return;
    }

    const groups =
      wave.groups.map(
        (group) => {
          const monster =
            DATA.monsters[
              group.type
            ];

          const labels =
            getMonsterTraitLabels(
              monster
            );

          return `
            <div>
              <b>${monster.name}</b>
              × ${group.count}
              ${
                labels.length
                  ? ` · ${labels.join(", ")}`
                  : ""
              }
            </div>
          `;
        }
      ).join("");

    const tags =
      collectWaveTraits(
        wave
      ).map(
        (traitId) => {
          const trait =
            DATA.monsterTraits[
              traitId
            ];

          return `
            <span class="tag">
              ${
                trait
                  ? trait.symbol
                  : traitId
              }
            </span>
          `;
        }
      ).join("");

    el.sheetContent.innerHTML = `
      <div class="info-card">
        <h3>다음 웨이브</h3>

        <div class="info-grid">
          <span>맵</span>
          <strong>${getMap().name}</strong>

          <span>Wave</span>
          <strong>
            ${wave.id} /
            ${DATA.waves.length}
          </strong>

          <span>이름</span>
          <strong>${wave.name}</strong>

          <span>보상</span>
          <strong>${wave.reward}G</strong>
        </div>
      </div>

      <div class="info-card">
        <h3>등장 몬스터</h3>

        <div class="info-list">
          ${groups}
        </div>

        <div class="tag-row">
          ${
            tags ||
            '<span class="tag">기본</span>'
          }
        </div>
      </div>

      <div class="info-card">
        <h3>추천 대응</h3>

        <div class="info-list">
          ${wave.recommendation}
        </div>
      </div>
    `;
  }

  function renderHeroSheet() {
    const stats =
      getHeroStats();

    const skill =
      getHeroSkillStats();

    const nextExp =
      DATA.formulas.heroNextExp(
        state.hero.level
      );

    const expPercent =
      clamp(
        (
          state.hero.exp /
          nextExp
        ) * 100,
        0,
        100
      );

    const passives =
      DATA.heroPassives.map(
        (passive) => {
          const unlocked =
            state.hero.level >=
            passive.level;

          return `
            <div>
              <b>
                ${
                  unlocked
                    ? "해금"
                    : `Lv.${passive.level}`
                }
              </b>
              ${passive.name}
              · ${passive.description}
            </div>
          `;
        }
      ).join("");

    el.sheetContent.innerHTML = `
      <div class="info-card">
        <h3>
          ${DATA.hero.name}
          · Lv.${state.hero.level}
        </h3>

        <div class="info-grid">
          <span>경험치</span>
          <strong>
            ${state.hero.exp}
            / ${nextExp}
          </strong>

          <span>공격력</span>
          <strong>${stats.damage}</strong>

          <span>사거리</span>
          <strong>${stats.range}</strong>

          <span>공격 간격</span>
          <strong>
            ${stats.attackInterval}초
          </strong>

          <span>스킬 피해</span>
          <strong>${skill.damage}</strong>

          <span>스킬 쿨타임</span>
          <strong>
            ${skill.cooldown}초
          </strong>
        </div>

        <div class="exp-bar">
          <span
            style="width:${expPercent}%"
          ></span>
        </div>
      </div>

      <div class="info-card">
        <h3>패시브</h3>

        <div class="info-list">
          ${passives}
        </div>
      </div>
    `;
  }

  function renderRelicSheet() {
    const counts =
      getRelicCounts();

    const rows =
      Object.keys(counts).length
        ? Object.entries(
            counts
          ).map(
            ([id, count]) => {
              const relic =
                DATA.relics.find(
                  (item) =>
                    item.id === id
                );

              if (!relic) {
                return "";
              }

              return `
                <div>
                  <b>
                    ${relic.name}
                    ${
                      count > 1
                        ? ` ×${count}`
                        : ""
                    }
                  </b>
                  <br>
                  ${relic.description}
                </div>
              `;
            }
          ).join("")
        : "보스 처치 후 유물을 획득합니다.";

    el.sheetContent.innerHTML = `
      <div class="info-card">
        <h3>
          보유 유물
          ${state.relics.length}개
        </h3>

        <div class="info-list">
          ${rows}
        </div>
      </div>
    `;
  }

  function renderSettingsSheet() {
    el.sheetContent.innerHTML = `
      <div class="info-card">
        <h3>게임 설정</h3>

        <div class="info-grid">
          <span>현재 맵</span>
          <strong>${getMap().name}</strong>

          <span>배속</span>
          <strong>${state.speed}x</strong>

          <span>자동 웨이브</span>
          <strong>
            ${
              state.autoWave
                ? "ON"
                : "OFF"
            }
          </strong>

          <span>버전</span>
          <strong>${DATA.version}</strong>
        </div>
      </div>

      <div class="setting-actions">
        <button
          id="sheetAutoWaveBtn"
          type="button"
        >
          자동 웨이브
          ${
            state.autoWave
              ? "끄기"
              : "켜기"
          }
        </button>

        <button
          id="sheetSaveBtn"
          type="button"
        >
          현재 진행 저장
        </button>

        <button
          id="sheetNewGameBtn"
          class="danger"
          type="button"
        >
          새 게임 / 맵 다시 선택
        </button>
      </div>
    `;

    document
      .getElementById(
        "sheetAutoWaveBtn"
      )
      .addEventListener(
        "click",
        () => {
          state.autoWave =
            !state.autoWave;

          state.autoStartTimer =
            0;

          saveGame();
          renderSettingsSheet();
          updateAllUI();
        }
      );

    document
      .getElementById(
        "sheetSaveBtn"
      )
      .addEventListener(
        "click",
        () => {
          saveGame();

          showToast(
            "현재 진행을 저장했습니다."
          );
        }
      );

    document
      .getElementById(
        "sheetNewGameBtn"
      )
      .addEventListener(
        "click",
        () => {
          returnToMapSelect();
        }
      );
  }

  function updateAllUI() {
    updateHud();
    updateTowerQuickBar();
    updateWaveOverlay();
    updateActionMenu();

    if (state.sheetOpen) {
      renderSheet();
    }
  }

  function updateHud() {
    const waveNumber =
      Math.min(
        state.currentWave,
        DATA.waves.length
      );

    el.mapName.textContent =
      getMap().name;

    el.gold.textContent =
      Math.floor(state.gold);

    el.baseHp.textContent =
      Math.max(
        0,
        state.baseHp
      );

    el.wave.textContent =
      `${waveNumber}/${DATA.waves.length}`;

    el.speed.textContent =
      `${state.speed}x`;

    el.pause.textContent =
      state.paused
        ? "재개"
        : "정지";

    const skillReady =
      state.hero.skillCooldown <= 0;

    el.heroSkill.textContent =
      skillReady
        ? "성광"
        : `${Math.ceil(
            state.hero.skillCooldown
          )}초`;

    el.heroSkill.disabled =
      !state.started ||
      state.status !== "playing" ||
      state.paused ||
      isBlockingModal() ||
      !skillReady;

    el.startWave.disabled =
      !canStartWave();

    if (!state.started) {
      el.status.textContent =
        "맵 선택";
    } else if (
      isBlockingModal()
    ) {
      el.status.textContent =
        "선택";
    } else if (
      state.status === "gameOver"
    ) {
      el.status.textContent =
        "패배";
    } else if (
      state.status === "clear"
    ) {
      el.status.textContent =
        "클리어";
    } else if (
      state.paused
    ) {
      el.status.textContent =
        "정지";
    } else if (
      state.bossWarningTimer > 0
    ) {
      el.status.textContent =
        "보스";
    } else if (
      state.waveRunning
    ) {
      el.status.textContent =
        "전투";
    } else if (
      state.autoWave &&
      state.autoStartTimer > 0
    ) {
      el.status.textContent =
        "자동";
    } else {
      el.status.textContent =
        "대기";
    }
  }

  function updateTowerQuickBar() {
    document
      .querySelectorAll(
        ".tower-quick[data-type]"
      )
      .forEach(
        (button) => {
          button.classList.toggle(
            "is-active",
            state.selectedBuildType ===
              button.dataset.type &&
            !state.selectedTowerId
          );

          button.disabled =
            !state.started ||
            state.status !==
              "playing";
        }
      );

    el.cancelBuild.disabled =
      !state.selectedBuildType &&
      !state.selectedTowerId;
  }

  function updateWaveOverlay() {
    const wave =
      DATA.waves[
        state.currentWave - 1
      ];

    const visible =
      !!wave &&
      canStartWave() &&
      !state.sheetOpen;

    el.waveOverlay.hidden =
      !visible;

    if (!wave) {
      return;
    }

    el.waveOverlayTitle.textContent =
      `Wave ${wave.id}`;

    el.waveOverlayName.textContent =
      wave.name;

    el.waveOverlayHint.textContent =
      state.autoWave
        ? "자동 시작 대기"
        : "눌러서 시작";
  }

  function canStartWave() {
    return (
      state.started &&
      state.status === "playing" &&
      !state.waveRunning &&
      !state.paused &&
      !state.sheetOpen &&
      !isBlockingModal() &&
      !!DATA.waves[
        state.currentWave - 1
      ]
    );
  }

  function getSelectedTower() {
    if (!state.selectedTowerId) {
      return null;
    }

    return (
      state.towers.find(
        (tower) =>
          tower.id ===
          state.selectedTowerId
      ) || null
    );
  }

  function updateActionMenu() {
    const tower =
      getSelectedTower();

    if (
      !tower ||
      state.sheetOpen ||
      isBlockingModal()
    ) {
      el.actionMenu.classList.remove(
        "is-visible"
      );

      el.actionMenu.innerHTML =
        "";

      return;
    }

    const table =
      DATA.towers[tower.type];

    const stats =
      getTowerStats(tower);

    const upgradeCost =
      DATA.formulas
        .towerUpgradeCost(
          table,
          tower.level
        );

    const sellValue =
      DATA.formulas
        .towerSellValue(
          table,
          tower.level
        );

    const trait =
      getTraitById(
        tower.trait
      );

    const traitText =
      trait
        ? `${trait.name} 적용 중`
        : tower.level >=
            table.traitUnlockLevel
          ? "특성 선택 가능"
          : `Lv.${table.traitUnlockLevel} 특성 해금`;

    const menuWidth = 218;

    const towerScreenX =
      boardOffsetX +
      (tower.col + 0.5) *
      tileSize;

    const towerScreenY =
      boardOffsetY +
      (tower.row + 0.5) *
      tileSize;

    const left =
      clamp(
        towerScreenX,
        menuWidth / 2 + 5,
        viewportWidth -
          menuWidth / 2 -
          5
      );

    const aboveY =
      towerScreenY - 126;

    const belowY =
      towerScreenY +
      tileSize * 0.55;

    const top =
      aboveY > 5
        ? aboveY
        : clamp(
            belowY,
            5,
            viewportHeight - 126
          );

    el.actionMenu.style.left =
      `${left}px`;

    el.actionMenu.style.top =
      `${top}px`;

    el.actionMenu.classList.add(
      "is-visible"
    );

    el.actionMenu.innerHTML = `
      <div class="action-title">
        ${table.symbol}
        ${table.name}

        <span>
          Lv.${tower.level}
          /${table.maxLevel}
        </span>
      </div>

      <div class="action-info">
        <span>공격력</span>
        <strong>${stats.damage}</strong>

        <span>사거리</span>
        <strong>${stats.range}</strong>

        <span>강화</span>
        <strong>
          ${
            upgradeCost === null
              ? "MAX"
              : `${upgradeCost}G`
          }
        </strong>

        <span>판매</span>
        <strong>${sellValue}G</strong>
      </div>

      <div class="action-trait">
        ${traitText}
      </div>

      <div class="action-buttons">
        <button
          id="quickUpgradeBtn"
          type="button"
          ${
            upgradeCost === null
              ? "disabled"
              : ""
          }
        >
          강화
        </button>

        <button
          id="quickSellBtn"
          class="danger"
          type="button"
        >
          판매
        </button>
      </div>
    `;

    const upgradeButton =
      document.getElementById(
        "quickUpgradeBtn"
      );

    const sellButton =
      document.getElementById(
        "quickSellBtn"
      );

    if (upgradeButton) {
      upgradeButton.addEventListener(
        "click",
        upgradeSelectedTower
      );
    }

    if (sellButton) {
      sellButton.addEventListener(
        "click",
        sellSelectedTower
      );
    }
  }

  function upgradeSelectedTower() {
    const tower =
      getSelectedTower();

    if (!tower) {
      return;
    }

    const table =
      DATA.towers[tower.type];

    const cost =
      DATA.formulas
        .towerUpgradeCost(
          table,
          tower.level
        );

    if (cost === null) {
      showToast(
        "이미 최대 레벨입니다."
      );

      return;
    }

    if (state.gold < cost) {
      showToast(
        "골드가 부족합니다."
      );

      return;
    }

    state.gold -= cost;
    tower.level += 1;

    addEffect({
      type: "upgrade",

      x:
        tower.col + 0.5,

      y:
        tower.row + 0.5,

      life: 0.55,
      maxLife: 0.55,

      color:
        table.color
    });

    showToast(
      `${table.name} Lv.${tower.level}`
    );

    maybeOpenTraitModal(
      tower
    );

    saveGame();
    updateAllUI();
  }

  function sellSelectedTower() {
    const tower =
      getSelectedTower();

    if (!tower) {
      return;
    }

    const table =
      DATA.towers[tower.type];

    const value =
      DATA.formulas
        .towerSellValue(
          table,
          tower.level
        );

    state.gold += value;

    state.towers =
      state.towers.filter(
        (item) =>
          item.id !== tower.id
      );

    state.selectedTowerId =
      null;

    showToast(
      `${table.name} 판매 +${value}G`
    );

    saveGame();
    updateAllUI();
  }

  function maybeOpenTraitModal(
    tower
  ) {
    const table =
      DATA.towers[tower.type];

    const options =
      DATA.towerTraits[
        tower.type
      ] || [];

    if (
      !options.length ||
      tower.trait ||
      tower.level <
        table.traitUnlockLevel
    ) {
      return;
    }

    state.traitModalTowerId =
      tower.id;

    el.traitModalTitle.textContent =
      `${table.name} 특성 선택`;

    el.traitModalDesc.textContent =
      "선택한 특성은 현재 게임에서 변경할 수 없습니다.";

    el.traitOptions.innerHTML =
      "";

    options.forEach(
      (trait) => {
        const button =
          document.createElement(
            "button"
          );

        button.className =
          "choice-btn";

        button.type =
          "button";

        button.innerHTML = `
          <strong>${trait.name}</strong>
          <span>${trait.summary}</span>
          <span>${trait.effectText}</span>
        `;

        button.addEventListener(
          "click",
          () =>
            selectTowerTrait(
              trait.id
            )
        );

        el.traitOptions.appendChild(
          button
        );
      }
    );

    el.traitModal.classList.add(
      "is-visible"
    );

    updateAllUI();
  }

  function selectTowerTrait(
    traitId
  ) {
    const tower =
      state.towers.find(
        (item) =>
          item.id ===
          state.traitModalTowerId
      );

    const trait =
      getTraitById(
        traitId
      );

    if (
      tower &&
      trait
    ) {
      tower.trait =
        traitId;

      addEffect({
        type: "upgrade",

        x:
          tower.col + 0.5,

        y:
          tower.row + 0.5,

        life: 0.8,
        maxLife: 0.8,

        color:
          DATA.towers[
            tower.type
          ].color
      });

      showToast(
        `${trait.name} 적용`
      );
    }

    state.traitModalTowerId =
      null;

    el.traitModal.classList.remove(
      "is-visible"
    );

    saveGame();
    updateAllUI();
  }

  function getTraitById(
    traitId
  ) {
    if (!traitId) {
      return null;
    }

    for (
      const list of
      Object.values(
        DATA.towerTraits
      )
    ) {
      const found =
        list.find(
          (trait) =>
            trait.id ===
            traitId
        );

      if (found) {
        return found;
      }
    }

    return null;
  }

  function onCanvasPointerDown(
    event
  ) {
    event.preventDefault();

    if (
      !state.started ||
      state.sheetOpen ||
      isBlockingModal()
    ) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const screenX =
      (
        (
          event.clientX -
          rect.left
        ) /
        rect.width
      ) *
      viewportWidth;

    const screenY =
      (
        (
          event.clientY -
          rect.top
        ) /
        rect.height
      ) *
      viewportHeight;

    const localX =
      screenX -
      boardOffsetX;

    const localY =
      screenY -
      boardOffsetY;

    if (
      localX < 0 ||
      localY < 0 ||
      localX >= boardWidth ||
      localY >= boardHeight
    ) {
      cancelSelection();
      return;
    }

    const col =
      clamp(
        Math.floor(
          localX /
          tileSize
        ),
        0,
        COLS - 1
      );

    const row =
      clamp(
        Math.floor(
          localY /
          tileSize
        ),
        0,
        ROWS - 1
      );

    const tower =
      getTowerAt(
        col,
        row
      );

    if (tower) {
      state.selectedTowerId =
        tower.id;

      state.selectedBuildType =
        null;

      updateAllUI();
      return;
    }

    if (
      state.selectedBuildType
    ) {
      placeTower(
        col,
        row
      );

      return;
    }

    state.selectedTowerId =
      null;

    updateAllUI();
  }

  function placeTower(
    col,
    row
  ) {
    const table =
      DATA.towers[
        state.selectedBuildType
      ];

    if (!table) {
      return;
    }

    if (
      state.status !==
      "playing"
    ) {
      return;
    }

    if (
      getPathSet().has(
        `${col},${row}`
      )
    ) {
      showToast(
        "경로에는 설치할 수 없습니다."
      );

      return;
    }

    if (
      getBlockedSet().has(
        `${col},${row}`
      )
    ) {
      showToast(
        "장애물에는 설치할 수 없습니다."
      );

      return;
    }

    if (
      isHeroTile(
        col,
        row
      )
    ) {
      showToast(
        "히어로 위치에는 설치할 수 없습니다."
      );

      return;
    }

    if (
      getTowerAt(
        col,
        row
      )
    ) {
      showToast(
        "이미 타워가 있습니다."
      );

      return;
    }

    if (
      state.gold <
      table.cost
    ) {
      showToast(
        "골드가 부족합니다."
      );

      return;
    }

    const tower = {
      id:
        makeId("tower"),

      type:
        table.id,

      col,
      row,

      level: 1,
      trait: null,
      cooldown: 0
    };

    state.gold -=
      table.cost;

    state.towers.push(
      tower
    );

    state.selectedTowerId =
      tower.id;

    state.selectedBuildType =
      null;

    addEffect({
      type: "upgrade",

      x:
        col + 0.5,

      y:
        row + 0.5,

      life: 0.45,
      maxLife: 0.45,

      color:
        table.color
    });

    showToast(
      `${table.name} 설치 -${table.cost}G`
    );

    saveGame();
    updateAllUI();
  }

  function getTowerAt(
    col,
    row
  ) {
    return (
      state.towers.find(
        (tower) =>
          tower.col === col &&
          tower.row === row
      ) || null
    );
  }

  function isHeroTile(
    col,
    row
  ) {
    const hero =
      getHeroPosition();

    return (
      Math.floor(hero.x) ===
        col &&
      Math.floor(hero.y) ===
        row
    );
  }

  function startWave() {
    if (!canStartWave()) {
      return;
    }

    const wave =
      DATA.waves[
        state.currentWave - 1
      ];

    state.waveRunning =
      true;

    state.spawnQueue =
      createSpawnQueue(
        wave
      );

    state.spawnTimer =
      wave.boss
        ? 2
        : 0.18;

    state.bossWarningTimer =
      wave.boss
        ? 1.9
        : 0;

    state.autoStartTimer =
      0;

    state.selectedTowerId =
      null;

    showToast(
      `Wave ${wave.id}: ${wave.name}`
    );

    saveGame();
    updateAllUI();
  }

  function createSpawnQueue(
    wave
  ) {
    const queue = [];

    wave.groups.forEach(
      (
        group,
        groupIndex
      ) => {
        for (
          let index = 0;
          index < group.count;
          index += 1
        ) {
          queue.push({
            type:
              group.type,

            waveId:
              wave.id,

            hpScale:
              group.hpScale ||
              1,

            delay:
              index === 0 &&
              groupIndex > 0
                ? Math.max(
                    0.8,
                    group.gap
                  )
                : group.gap
          });
        }
      }
    );

    return queue;
  }

  function spawnEnemy(
    spawn
  ) {
    const table =
      DATA.monsters[
        spawn.type
      ];

    const stats =
      DATA.formulas
        .monsterStats(
          table,
          spawn.waveId,
          spawn.hpScale,
          getMap()
        );

    const first =
      getPathPoints()[0];

    const traits =
      Array.isArray(
        table.traits
      )
        ? table.traits.slice()
        : [];

    const shield =
      traits.includes(
        "shield"
      )
        ? Math.round(
            stats.hp *
            (
              table.boss
                ? 0.28
                : 0.22
            )
          )
        : 0;

    state.enemies.push({
      id:
        makeId("enemy"),

      type:
        table.id,

      name:
        table.name,

      waveId:
        spawn.waveId,

      x:
        first.x,

      y:
        first.y,

      pathIndex: 1,

      hp:
        stats.hp,

      maxHp:
        stats.hp,

      shield,
      maxShield: shield,

      speed:
        stats.speed,

      gold:
        stats.gold,

      exp:
        stats.exp,

      radius:
        table.radius,

      color:
        table.color,

      aura:
        table.aura,

      traits,

      boss:
        !!table.boss,

      slowTimer: 0,
      slowFactor: 1,

      freezeTimer: 0,

      poisonTimer: 0,
      poisonDps: 0,
      poisonTick: 0.5,

      vulnerabilityTimer: 0,
      vulnerabilityFactor: 1,

      dead: false,
      escaped: false,

      animSeed:
        Math.random() *
        1000
    });
  }

  function update(dt) {
    updateEffects(dt);

    if (
      screenShake > 0
    ) {
      screenShake =
        Math.max(
          0,
          screenShake -
          dt * 2.8
        );
    }

    if (
      !state.started ||
      state.sheetOpen ||
      isBlockingModal()
    ) {
      return;
    }

    if (
      state.paused ||
      state.status !==
        "playing"
    ) {
      return;
    }

    if (
      state.bossWarningTimer >
      0
    ) {
      state.bossWarningTimer =
        Math.max(
          0,
          state.bossWarningTimer -
          dt
        );
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

    if (
      autosaveTimer >= 3
    ) {
      autosaveTimer = 0;
      saveGame();
    }
  }

  function updateAutoWave(
    dt
  ) {
    if (
      !state.autoWave ||
      state.waveRunning ||
      state.status !==
        "playing"
    ) {
      return;
    }

    if (
      state.autoStartTimer >
      0
    ) {
      state.autoStartTimer -=
        dt;

      if (
        state.autoStartTimer <=
        0
      ) {
        startWave();
      }
    }
  }

  function updateHeroCooldowns(
    dt
  ) {
    if (
      state.hero.skillCooldown >
      0
    ) {
      state.hero.skillCooldown =
        Math.max(
          0,
          state.hero.skillCooldown -
          dt
        );
    }
  }

  function updateSpawning(
    dt
  ) {
    if (
      !state.waveRunning ||
      state.spawnQueue.length ===
        0
    ) {
      return;
    }

    state.spawnTimer -= dt;

    while (
      state.spawnTimer <= 0 &&
      state.spawnQueue.length >
        0
    ) {
      const spawn =
        state.spawnQueue.shift();

      spawnEnemy(spawn);

      state.spawnTimer +=
        state.spawnQueue[0]
          ? state.spawnQueue[0]
              .delay
          : 0.5;
    }
  }

  function updateEnemies(dt) {
    const pathPoints =
      getPathPoints();

    const map =
      getMap();

    state.enemies.forEach(
      (enemy) => {
        if (
          enemy.dead ||
          enemy.escaped
        ) {
          return;
        }

        updateEnemyStatuses(
          enemy,
          dt,
          map
        );

        if (
          enemy.dead ||
          enemy.escaped ||
          enemy.freezeTimer > 0
        ) {
          return;
        }

        const auraFactor =
          hasHasteAura(enemy)
            ? 1.18
            : 1;

        let remaining =
          enemy.speed *
          enemy.slowFactor *
          auraFactor *
          dt;

        while (
          remaining > 0 &&
          !enemy.escaped
        ) {
          const target =
            pathPoints[
              enemy.pathIndex
            ];

          if (!target) {
            enemy.escaped =
              true;

            state.baseHp -=
              enemy.boss
                ? 3
                : 1;

            addFloater(
              enemy.boss
                ? "-3 HP"
                : "-1 HP",
              enemy.x,
              enemy.y,
              "#ff7875"
            );

            screenShake =
              Math.max(
                screenShake,
                enemy.boss
                  ? 0.55
                  : 0.22
              );

            if (
              state.baseHp <= 0
            ) {
              state.baseHp = 0;

              state.status =
                "gameOver";

              state.waveRunning =
                false;

              state.autoStartTimer =
                0;

              showToast(
                "Base가 파괴되었습니다."
              );

              saveGame();
            }

            return;
          }

          const dx =
            target.x -
            enemy.x;

          const dy =
            target.y -
            enemy.y;

          const distanceToTarget =
            Math.hypot(
              dx,
              dy
            );

          if (
            distanceToTarget <=
            0.0001
          ) {
            enemy.pathIndex +=
              1;
          } else if (
            distanceToTarget <=
            remaining
          ) {
            enemy.x =
              target.x;

            enemy.y =
              target.y;

            enemy.pathIndex +=
              1;

            remaining -=
              distanceToTarget;
          } else {
            enemy.x +=
              (
                dx /
                distanceToTarget
              ) *
              remaining;

            enemy.y +=
              (
                dy /
                distanceToTarget
              ) *
              remaining;

            remaining = 0;
          }
        }
      }
    );
  }

  function updateEnemyStatuses(
    enemy,
    dt,
    map
  ) {
    if (
      enemy.slowTimer > 0
    ) {
      enemy.slowTimer -= dt;

      if (
        enemy.slowTimer <= 0
      ) {
        enemy.slowFactor =
          1;
      }
    }

    if (
      enemy.freezeTimer > 0
    ) {
      enemy.freezeTimer =
        Math.max(
          0,
          enemy.freezeTimer -
          dt
        );
    }

    if (
      enemy.vulnerabilityTimer >
      0
    ) {
      enemy.vulnerabilityTimer -=
        dt;

      if (
        enemy.vulnerabilityTimer <=
        0
      ) {
        enemy.vulnerabilityFactor =
          1;
      }
    }

    if (
      enemy.poisonTimer > 0
    ) {
      enemy.poisonTimer -= dt;
      enemy.poisonTick -= dt;

      if (
        enemy.poisonTick <= 0
      ) {
        enemy.poisonTick +=
          0.5;

        damageEnemy(
          enemy,
          enemy.poisonDps *
            0.5,
          "poisonDot"
        );
      }

      if (
        enemy.poisonTimer <= 0
      ) {
        enemy.poisonDps = 0;
      }
    }

    if (
      !enemy.dead &&
      enemy.traits.includes(
        "regen"
      )
    ) {
      const bonus =
        map.regenBonusPct ||
        0;

      enemy.hp =
        Math.min(
          enemy.maxHp,

          enemy.hp +
          enemy.maxHp *
          0.014 *
          (1 + bonus) *
          dt
        );
    }
  }

  function hasHasteAura(
    enemy
  ) {
    return state.enemies.some(
      (other) => {
        if (
          other.id === enemy.id ||
          other.dead ||
          other.escaped
        ) {
          return false;
        }

        return (
          other.traits.includes(
            "darkAura"
          ) &&
          distance(
            enemy.x,
            enemy.y,
            other.x,
            other.y
          ) <= 2.05
        );
      }
    );
  }

  function updateTowers(dt) {
    state.towers.forEach(
      (tower) => {
        const stats =
          getTowerStats(
            tower
          );

        tower.cooldown -= dt;

        if (
          tower.cooldown > 0
        ) {
          return;
        }

        const target =
          findTarget(
            tower.col + 0.5,
            tower.row + 0.5,
            stats.range
          );

        if (!target) {
          return;
        }

        tower.cooldown =
          stats.attackInterval;

        attackWithTower(
          tower,
          DATA.towers[
            tower.type
          ],
          stats,
          target
        );
      }
    );
  }

  function updateHero(dt) {
    state.hero.cooldown -=
      dt;

    if (
      state.hero.cooldown > 0
    ) {
      return;
    }

    const heroPosition =
      getHeroPosition();

    const stats =
      getHeroStats();

    const target =
      findTarget(
        heroPosition.x,
        heroPosition.y,
        stats.range
      );

    if (!target) {
      return;
    }

    state.hero.cooldown =
      stats.attackInterval;

    state.projectiles.push({
      id:
        makeId(
          "projectile"
        ),

      type:
        "hero",

      x:
        heroPosition.x,

      y:
        heroPosition.y,

      prevX:
        heroPosition.x,

      prevY:
        heroPosition.y,

      targetId:
        target.id,

      damage:
        stats.damage,

      speed:
        5.4,

      color:
        DATA.hero
          .projectileColor,

      radius:
        0.07
    });
  }

  function attackWithTower(
    tower,
    table,
    stats,
    target
  ) {
    const x =
      tower.col + 0.5;

    const y =
      tower.row + 0.5;

    if (
      tower.type ===
      "lightning"
    ) {
      fireLightning(
        x,
        y,
        table,
        stats,
        target
      );

      return;
    }

    state.projectiles.push({
      id:
        makeId(
          "projectile"
        ),

      type:
        tower.type,

      x,
      y,

      prevX: x,
      prevY: y,

      targetId:
        target.id,

      damage:
        stats.damage,

      speed:
        tower.type ===
        "cannon"
          ? 3.6
          : 4.8,

      color:
        table.color,

      radius:
        tower.type ===
        "cannon"
          ? 0.1
          : 0.065,

      splashRadius:
        stats.splashRadius ||
        0,

      slowFactor:
        stats.slowFactor ||
        0,

      slowDuration:
        stats.slowDuration ||
        0,

      slowRadius:
        stats.slowRadius ||
        0,

      freezeChance:
        stats.freezeChance ||
        0,

      dotDamagePerSecond:
        stats.dotDamagePerSecond ||
        0,

      dotDuration:
        stats.dotDuration ||
        0,

      poisonRadius:
        stats.poisonRadius ||
        0,

      bossDamageMultiplier:
        stats.bossDamageMultiplier ||
        1
    });
  }

  function fireLightning(
    x,
    y,
    table,
    stats,
    firstTarget
  ) {
    const hitIds =
      new Set();

    const points = [
      { x, y }
    ];

    let current =
      firstTarget;

    let currentDamage =
      stats.damage;

    for (
      let index = 0;
      index <
        stats.chainCount &&
      current;
      index += 1
    ) {
      hitIds.add(
        current.id
      );

      points.push({
        x: current.x,
        y: current.y
      });

      damageEnemy(
        current,
        currentDamage,
        "lightning"
      );

      if (
        stats.vulnerabilityFactor >
        1
      ) {
        applyVulnerability(
          current,
          stats.vulnerabilityFactor,
          stats.vulnerabilityDuration
        );
      }

      let next = null;
      let nearest = Infinity;

      state.enemies.forEach(
        (enemy) => {
          if (
            enemy.dead ||
            enemy.escaped ||
            hitIds.has(enemy.id)
          ) {
            return;
          }

          const dist =
            distance(
              current.x,
              current.y,
              enemy.x,
              enemy.y
            );

          if (
            dist <=
              stats.chainRange &&
            dist < nearest
          ) {
            next = enemy;
            nearest = dist;
          }
        }
      );

      current = next;

      currentDamage =
        Math.max(
          5,
          Math.round(
            currentDamage *
            0.72
          )
        );
    }

    addEffect({
      type: "lightning",
      points,

      life: 0.16,
      maxLife: 0.16,

      color:
        table.color
    });
  }

  function updateProjectiles(
    dt
  ) {
    state.projectiles.forEach(
      (projectile) => {
        if (
          projectile.done
        ) {
          return;
        }

        const target =
          state.enemies.find(
            (enemy) =>
              enemy.id ===
                projectile.targetId &&
              !enemy.dead &&
              !enemy.escaped
          );

        if (!target) {
          projectile.done =
            true;

          return;
        }

        projectile.prevX =
          projectile.x;

        projectile.prevY =
          projectile.y;

        const dx =
          target.x -
          projectile.x;

        const dy =
          target.y -
          projectile.y;

        const dist =
          Math.hypot(
            dx,
            dy
          );

        const movement =
          projectile.speed *
          dt;

        if (
          dist <= movement ||
          dist < 0.05
        ) {
          projectile.x =
            target.x;

          projectile.y =
            target.y;

          projectileHit(
            projectile,
            target
          );

          projectile.done =
            true;
        } else {
          projectile.x +=
            (
              dx /
              dist
            ) *
            movement;

          projectile.y +=
            (
              dy /
              dist
            ) *
            movement;
        }
      }
    );
  }

  function projectileHit(
    projectile,
    target
  ) {
    if (
      projectile.type ===
      "cannon"
    ) {
      const directDamage =
        target.boss
          ? projectile.damage *
            projectile
              .bossDamageMultiplier
          : projectile.damage;

      damageEnemy(
        target,
        directDamage,
        "cannon"
      );

      state.enemies.forEach(
        (enemy) => {
          if (
            enemy.id ===
              target.id ||
            enemy.dead ||
            enemy.escaped
          ) {
            return;
          }

          if (
            distance(
              target.x,
              target.y,
              enemy.x,
              enemy.y
            ) <=
            projectile.splashRadius
          ) {
            damageEnemy(
              enemy,
              projectile.damage *
                0.58,
              "cannonSplash"
            );
          }
        }
      );

      screenShake =
        Math.max(
          screenShake,
          0.32
        );

      addEffect({
        type: "explosion",

        x:
          target.x,

        y:
          target.y,

        radius:
          projectile
            .splashRadius,

        life: 0.3,
        maxLife: 0.3,

        color:
          projectile.color
      });

      return;
    }

    if (
      projectile.type ===
      "ice"
    ) {
      damageEnemy(
        target,
        projectile.damage,
        "ice"
      );

      applySlow(
        target,
        projectile.slowFactor,
        projectile.slowDuration
      );

      applyFreeze(
        target,
        projectile.freezeChance
      );

      if (
        projectile.slowRadius >
        0
      ) {
        state.enemies.forEach(
          (enemy) => {
            if (
              enemy.id ===
                target.id ||
              enemy.dead ||
              enemy.escaped
            ) {
              return;
            }

            if (
              distance(
                target.x,
                target.y,
                enemy.x,
                enemy.y
              ) <=
              projectile.slowRadius
            ) {
              applySlow(
                enemy,
                projectile.slowFactor,
                projectile.slowDuration *
                  0.8
              );
            }
          }
        );
      }

      addEffect({
        type: "iceBurst",

        x:
          target.x,

        y:
          target.y,

        life: 0.28,
        maxLife: 0.28,

        color:
          projectile.color
      });

      return;
    }

    if (
      projectile.type ===
      "poison"
    ) {
      damageEnemy(
        target,
        projectile.damage,
        "poison"
      );

      applyPoison(
        target,
        projectile
          .dotDamagePerSecond,
        projectile.dotDuration
      );

      if (
        projectile.poisonRadius >
        0
      ) {
        state.enemies.forEach(
          (enemy) => {
            if (
              enemy.id ===
                target.id ||
              enemy.dead ||
              enemy.escaped
            ) {
              return;
            }

            if (
              distance(
                target.x,
                target.y,
                enemy.x,
                enemy.y
              ) <=
              projectile.poisonRadius
            ) {
              damageEnemy(
                enemy,
                projectile.damage *
                  0.45,
                "poison"
              );

              applyPoison(
                enemy,
                projectile
                  .dotDamagePerSecond *
                  0.55,
                projectile.dotDuration *
                  0.75
              );
            }
          }
        );
      }

      addEffect({
        type: "poisonCloud",

        x:
          target.x,

        y:
          target.y,

        radius:
          Math.max(
            0.35,
            projectile.poisonRadius
          ),

        life: 0.34,
        maxLife: 0.34,

        color:
          projectile.color
      });

      return;
    }

    damageEnemy(
      target,
      projectile.damage,
      projectile.type
    );

    addEffect({
      type: "hit",

      x:
        target.x,

      y:
        target.y,

      life: 0.16,
      maxLife: 0.16,

      color:
        projectile.color
    });
  }

  function applySlow(
    enemy,
    factor,
    duration
  ) {
    if (
      !enemy ||
      enemy.dead ||
      enemy.escaped ||
      !factor ||
      !duration
    ) {
      return;
    }

    let finalFactor =
      factor;

    let finalDuration =
      duration;

    if (
      enemy.traits.includes(
        "boss"
      )
    ) {
      finalFactor =
        Math.max(
          finalFactor,
          0.72
        );

      finalDuration *=
        0.55;
    }

    enemy.slowFactor =
      Math.min(
        enemy.slowFactor,
        finalFactor
      );

    enemy.slowTimer =
      Math.max(
        enemy.slowTimer,
        finalDuration
      );
  }

  function applyFreeze(
    enemy,
    chance
  ) {
    if (
      !enemy ||
      !chance ||
      enemy.dead ||
      enemy.escaped
    ) {
      return;
    }

    const finalChance =
      enemy.traits.includes(
        "boss"
      )
        ? chance * 0.35
        : chance;

    if (
      Math.random() <
      finalChance
    ) {
      enemy.freezeTimer =
        Math.max(
          enemy.freezeTimer,

          enemy.traits.includes(
            "boss"
          )
            ? 0.18
            : 0.45
        );
    }
  }

  function applyPoison(
    enemy,
    dps,
    duration
  ) {
    if (
      !enemy ||
      enemy.dead ||
      enemy.escaped ||
      !dps ||
      !duration
    ) {
      return;
    }

    enemy.poisonDps =
      Math.max(
        enemy.poisonDps,
        dps
      );

    enemy.poisonTimer =
      Math.max(
        enemy.poisonTimer,
        duration
      );

    enemy.poisonTick =
      Math.min(
        enemy.poisonTick ||
          0.5,
        0.5
      );
  }

  function applyVulnerability(
    enemy,
    factor,
    duration
  ) {
    if (
      !enemy ||
      enemy.dead ||
      enemy.escaped
    ) {
      return;
    }

    const finalDuration =
      enemy.traits.includes(
        "boss"
      )
        ? duration * 0.55
        : duration;

    enemy.vulnerabilityFactor =
      Math.max(
        enemy.vulnerabilityFactor,
        factor
      );

    enemy.vulnerabilityTimer =
      Math.max(
        enemy.vulnerabilityTimer,
        finalDuration
      );
  }

  function damageEnemy(
    enemy,
    amount,
    source
  ) {
    if (
      !enemy ||
      enemy.dead ||
      enemy.escaped
    ) {
      return;
    }

    let damage =
      Math.max(
        1,

        Math.round(
          amount *
          getDamageMultiplier(
            enemy,
            source
          )
        )
      );

    if (
      enemy.shield > 0
    ) {
      const absorbed =
        Math.min(
          enemy.shield,
          damage
        );

      enemy.shield -=
        absorbed;

      damage -=
        absorbed;

      if (
        damage <= 0
      ) {
        return;
      }
    }

    enemy.hp -=
      damage;

    if (
      enemy.hp <= 0
    ) {
      killEnemy(enemy);
    }
  }

  function getDamageMultiplier(
    enemy,
    source
  ) {
    let multiplier = 1;

    if (
      enemy.traits.includes(
        "flying"
      ) &&
      (
        source === "cannon" ||
        source ===
          "cannonSplash"
      )
    ) {
      multiplier *= 0.55;
    }

    if (
      enemy.traits.includes(
        "armored"
      )
    ) {
      if (
        source === "cannon" ||
        source ===
          "cannonSplash"
      ) {
        multiplier *= 1.1;
      } else if (
        source === "poison" ||
        source ===
          "poisonDot"
      ) {
        multiplier *= 1.2;
      } else {
        multiplier *= 0.82;
      }
    }

    if (
      enemy.traits.includes(
        "toxicResist"
      ) &&
      (
        source === "poison" ||
        source ===
          "poisonDot"
      )
    ) {
      multiplier *= 0.55;
    }

    if (
      enemy.vulnerabilityTimer >
      0
    ) {
      multiplier *=
        enemy.vulnerabilityFactor;
    }

    return multiplier;
  }

  function killEnemy(enemy) {
    if (enemy.dead) {
      return;
    }

    enemy.dead = true;

    const relicEffects =
      getRelicEffects();

    const gold =
      Math.round(
        enemy.gold *
        (
          1 +
          relicEffects
            .goldGainPct
        )
      );

    state.gold += gold;

    addHeroExp(
      enemy.exp
    );

    addFloater(
      `+${gold}G`,
      enemy.x,
      enemy.y - 0.1,
      "#facc15"
    );

    addEffect({
      type:
        enemy.boss
          ? "bossDeath"
          : "death",

      x:
        enemy.x,

      y:
        enemy.y,

      life:
        enemy.boss
          ? 0.58
          : 0.32,

      maxLife:
        enemy.boss
          ? 0.58
          : 0.32,

      color:
        enemy.aura
    });

    if (enemy.boss) {
      screenShake =
        Math.max(
          screenShake,
          0.72
        );

      if (
        !state
          .relicWavesClaimed
          .includes(
            enemy.waveId
          )
      ) {
        state
          .relicWavesClaimed
          .push(
            enemy.waveId
          );

        openRelicModal();
      }
    }

    saveGame();
  }

  function addHeroExp(
    amount
  ) {
    state.hero.exp +=
      amount;

    let required =
      DATA.formulas
        .heroNextExp(
          state.hero.level
        );

    let leveledUp =
      false;

    while (
      state.hero.exp >=
      required
    ) {
      state.hero.exp -=
        required;

      state.hero.level +=
        1;

      required =
        DATA.formulas
          .heroNextExp(
            state.hero.level
          );

      leveledUp = true;
    }

    if (leveledUp) {
      const hero =
        getHeroPosition();

      addEffect({
        type: "heroLevel",

        x:
          hero.x,

        y:
          hero.y,

        life: 0.85,
        maxLife: 0.85,

        color:
          "#fde047"
      });

      showToast(
        `${DATA.hero.name} Lv.${state.hero.level}`
      );
    }
  }

  function useHeroSkill() {
    if (
      !state.started ||
      state.status !==
        "playing" ||
      state.paused ||
      state.sheetOpen ||
      isBlockingModal()
    ) {
      return;
    }

    if (
      state.hero.skillCooldown >
      0
    ) {
      return;
    }

    const hero =
      getHeroPosition();

    const stats =
      getHeroSkillStats();

    let hitCount = 0;

    state.enemies.forEach(
      (enemy) => {
        if (
          enemy.dead ||
          enemy.escaped
        ) {
          return;
        }

        if (
          distance(
            hero.x,
            hero.y,
            enemy.x,
            enemy.y
          ) <= stats.radius
        ) {
          damageEnemy(
            enemy,

            enemy.boss
              ? stats.damage *
                1.25
              : stats.damage,

            "skill"
          );

          hitCount += 1;
        }
      }
    );

    state.hero.skillCooldown =
      stats.cooldown;

    screenShake =
      Math.max(
        screenShake,
        0.45
      );

    addEffect({
      type: "heroSkill",

      x:
        hero.x,

      y:
        hero.y,

      radius:
        stats.radius,

      life: 0.55,
      maxLife: 0.55,

      color:
        "#fde047"
    });

    showToast(
      hitCount
        ? `성광 폭발 ${hitCount}명 타격`
        : "성광 폭발"
    );

    saveGame();
    updateAllUI();
  }

  function cleanupEntities() {
    state.enemies =
      state.enemies.filter(
        (enemy) =>
          !enemy.dead &&
          !enemy.escaped
      );

    state.projectiles =
      state.projectiles.filter(
        (projectile) =>
          !projectile.done
      );
  }

  function checkWaveEnd() {
    if (
      !state.waveRunning ||
      state.relicChoices.length >
        0
    ) {
      return;
    }

    if (
      state.spawnQueue.length >
        0 ||
      state.enemies.length >
        0
    ) {
      return;
    }

    const completedWave =
      state.currentWave;

    const wave =
      DATA.waves[
        completedWave - 1
      ];

    state.waveRunning =
      false;

    state.gold +=
      wave.reward;

    addFloater(
      `+${wave.reward}G`,
      4,
      4.8,
      "#facc15"
    );

    if (
      completedWave >=
      DATA.waves.length
    ) {
      state.status =
        "clear";

      state.currentWave =
        DATA.waves.length;

      showToast(
        "v0.8 클리어"
      );
    } else {
      state.currentWave +=
        1;

      showToast(
        `Wave ${completedWave} 완료`
      );

      if (
        state.autoWave
      ) {
        state.autoStartTimer =
          1.4;
      }
    }

    saveGame();
    updateAllUI();
  }

  function openRelicModal() {
    state.relicChoices =
      pickRandomItems(
        DATA.relics,
        3
      );

    el.relicOptions.innerHTML =
      "";

    state.relicChoices.forEach(
      (relic) => {
        const button =
          document.createElement(
            "button"
          );

        button.className =
          "choice-btn";

        button.type =
          "button";

        button.innerHTML = `
          <strong>${relic.name}</strong>
          <span>${relic.description}</span>
        `;

        button.addEventListener(
          "click",
          () =>
            selectRelic(
              relic.id
            )
        );

        el.relicOptions.appendChild(
          button
        );
      }
    );

    el.relicModal.classList.add(
      "is-visible"
    );

    updateAllUI();
  }

  function selectRelic(
    relicId
  ) {
    const relic =
      DATA.relics.find(
        (item) =>
          item.id ===
          relicId
      );

    if (!relic) {
      return;
    }

    state.relics.push(
      relicId
    );

    if (
      relic.effects.baseRepair
    ) {
      state.baseHp =
        Math.min(
          getMap().startBaseHp,

          state.baseHp +
          relic.effects
            .baseRepair
        );
    }

    state.relicChoices =
      [];

    el.relicModal.classList.remove(
      "is-visible"
    );

    showToast(
      `${relic.name} 획득`
    );

    saveGame();
    updateAllUI();
  }

  function pickRandomItems(
    items,
    count
  ) {
    const pool =
      items.slice();

    for (
      let index =
        pool.length - 1;
      index > 0;
      index -= 1
    ) {
      const randomIndex =
        Math.floor(
          Math.random() *
          (index + 1)
        );

      const temp =
        pool[index];

      pool[index] =
        pool[randomIndex];

      pool[randomIndex] =
        temp;
    }

    return pool.slice(
      0,
      count
    );
  }

  function closeAllModals() {
    state.traitModalTowerId =
      null;

    state.relicChoices =
      [];

    el.traitModal.classList.remove(
      "is-visible"
    );

    el.relicModal.classList.remove(
      "is-visible"
    );
  }

  function isBlockingModal() {
    return (
      !!state.traitModalTowerId ||
      state.relicChoices.length >
        0
    );
  }

  function updateEffects(dt) {
    state.effects.forEach(
      (effect) => {
        effect.life -= dt;
      }
    );

    state.effects =
      state.effects.filter(
        (effect) =>
          effect.life > 0
      );

    state.floaters.forEach(
      (floater) => {
        floater.life -= dt;
        floater.y -= dt * 0.55;
      }
    );

    state.floaters =
      state.floaters.filter(
        (floater) =>
          floater.life > 0
      );
  }

  function findTarget(
    x,
    y,
    range
  ) {
    let target = null;
    let bestProgress =
      -Infinity;

    state.enemies.forEach(
      (enemy) => {
        if (
          enemy.dead ||
          enemy.escaped
        ) {
          return;
        }

        if (
          distance(
            x,
            y,
            enemy.x,
            enemy.y
          ) > range
        ) {
          return;
        }

        const progress =
          enemy.pathIndex *
          100 -
          distanceToNextPoint(
            enemy
          );

        if (
          progress >
          bestProgress
        ) {
          bestProgress =
            progress;

          target = enemy;
        }
      }
    );

    return target;
  }

  function distanceToNextPoint(
    enemy
  ) {
    const target =
      getPathPoints()[
        enemy.pathIndex
      ];

    return target
      ? distance(
          enemy.x,
          enemy.y,
          target.x,
          target.y
        )
      : 0;
  }

  function getTowerStats(
    tower
  ) {
    const table =
      DATA.towers[
        tower.type
      ];

    const base =
      DATA.formulas
        .towerStats(
          table,
          tower.level
        );

    const relic =
      getRelicEffects();

    const stats = {
      ...base,

      bossDamageMultiplier: 1,
      freezeChance: 0,
      slowRadius: 0,
      poisonRadius: 0,

      vulnerabilityFactor: 1,
      vulnerabilityDuration: 0
    };

    stats.damage *=
      1 +
      relic.towerDamagePct;

    if (
      tower.type ===
      "archer"
    ) {
      stats.attackInterval *=
        1 -
        relic
          .archerAttackSpeedPct;
    }

    if (
      tower.type ===
      "cannon"
    ) {
      stats.splashRadius *=
        1 +
        relic
          .cannonSplashPct;
    }

    if (
      tower.type ===
      "ice"
    ) {
      stats.slowDuration *=
        1 +
        relic
          .iceSlowDurationPct;
    }

    if (
      tower.type ===
      "lightning"
    ) {
      stats.chainCount +=
        relic
          .lightningChainFlat;
    }

    if (
      tower.type ===
      "poison"
    ) {
      stats.damage *=
        1 +
        relic.poisonDamagePct;

      stats.dotDamagePerSecond *=
        1 +
        relic.poisonDamagePct;
    }

    switch (
      tower.trait
    ) {
      case "archer_sniper":
        stats.damage *=
          1.35;

        stats.range +=
          0.2;

        stats.attackInterval *=
          1.12;
        break;

      case "archer_rapid":
        stats.damage *=
          0.88;

        stats.attackInterval *=
          0.72;
        break;

      case "cannon_blast":
        stats.damage *=
          0.94;

        stats.splashRadius +=
          0.32;
        break;

      case "cannon_siege":
        stats.attackInterval *=
          1.08;

        stats.bossDamageMultiplier =
          1.5;
        break;

      case "ice_freeze":
        stats.freezeChance =
          0.14 +
          tower.level *
          0.012;
        break;

      case "ice_chill":
        stats.slowDuration +=
          0.5;

        stats.slowRadius =
          0.75;
        break;

      case "lightning_chain":
        stats.damage *=
          0.9;

        stats.chainCount +=
          2;
        break;

      case "lightning_shock":
        stats.vulnerabilityFactor =
          1.15;

        stats.vulnerabilityDuration =
          2.2;
        break;

      case "poison_venom":
        stats.dotDamagePerSecond *=
          1.55;
        break;

      case "poison_cloud":
        stats.poisonRadius =
          0.75;
        break;

      default:
        break;
    }

    stats.damage =
      Math.max(
        1,
        Math.round(
          stats.damage
        )
      );

    stats.range =
      Number(
        stats.range.toFixed(2)
      );

    stats.attackInterval =
      Number(
        Math.max(
          0.22,
          stats.attackInterval
        ).toFixed(2)
      );

    stats.splashRadius =
      Number(
        (
          stats.splashRadius ||
          0
        ).toFixed(2)
      );

    stats.slowDuration =
      Number(
        (
          stats.slowDuration ||
          0
        ).toFixed(2)
      );

    stats.chainCount =
      Math.max(
        0,
        Math.round(
          stats.chainCount ||
          0
        )
      );

    stats.dotDamagePerSecond =
      Math.max(
        0,
        Math.round(
          stats.dotDamagePerSecond ||
          0
        )
      );

    return stats;
  }

  function getHeroStats() {
    const base =
      DATA.formulas
        .heroStats(
          DATA.hero,
          state.hero.level
        );

    const relic =
      getRelicEffects();

    const passive =
      getHeroPassiveEffects();

    return {
      damage:
        Math.round(
          base.damage *
          (
            1 +
            relic.heroDamagePct +
            passive.heroDamagePct
          )
        ),

      range:
        Number(
          (
            base.range +
            relic.heroRangeFlat +
            passive.heroRangeFlat
          ).toFixed(2)
        ),

      attackInterval:
        Number(
          Math.max(
            0.38,

            base.attackInterval *
            (
              1 -
              relic
                .heroAttackSpeedPct -
              passive
                .heroAttackSpeedPct
            )
          ).toFixed(2)
        )
    };
  }

  function getHeroSkillStats() {
    const hero =
      getHeroStats();

    const relic =
      getRelicEffects();

    const passive =
      getHeroPassiveEffects();

    return {
      damage:
        Math.round(
          hero.damage *
          3.4 *
          (
            1 +
            relic.skillDamagePct +
            passive.skillDamagePct
          )
        ),

      radius:
        Number(
          (
            DATA.hero
              .skillRadius +
            relic.skillRadiusFlat +
            passive.skillRadiusFlat
          ).toFixed(2)
        ),

      cooldown:
        Number(
          Math.max(
            7,

            DATA.hero
              .skillCooldown *
            (
              1 -
              relic.skillCooldownPct -
              passive.skillCooldownPct
            )
          ).toFixed(2)
        )
    };
  }

  function getHeroPassiveEffects() {
    const result =
      createEmptyEffects();

    DATA.heroPassives.forEach(
      (passive) => {
        if (
          state.hero.level >=
          passive.level
        ) {
          addEffects(
            result,
            passive.effects ||
            {}
          );
        }
      }
    );

    return result;
  }

  function getRelicEffects() {
    const result =
      createEmptyEffects();

    state.relics.forEach(
      (id) => {
        const relic =
          DATA.relics.find(
            (item) =>
              item.id === id
          );

        if (relic) {
          addEffects(
            result,
            relic.effects ||
            {}
          );
        }
      }
    );

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

  function addEffects(
    target,
    source
  ) {
    Object.keys(source).forEach(
      (key) => {
        if (
          typeof target[key] !==
          "number"
        ) {
          target[key] = 0;
        }

        target[key] +=
          source[key];
      }
    );
  }

  function getRelicCounts() {
    return state.relics.reduce(
      (
        counts,
        id
      ) => {
        counts[id] =
          (
            counts[id] ||
            0
          ) + 1;

        return counts;
      },
      {}
    );
  }

  function collectWaveTraits(
    wave
  ) {
    const traits =
      new Set();

    wave.groups.forEach(
      (group) => {
        const monster =
          DATA.monsters[
            group.type
          ];

        (
          monster.traits ||
          []
        ).forEach(
          (trait) =>
            traits.add(trait)
        );
      }
    );

    return Array.from(
      traits
    );
  }

  function getMonsterTraitLabels(
    monster
  ) {
    return (
      monster.traits ||
      []
    ).map(
      (traitId) => {
        const trait =
          DATA.monsterTraits[
            traitId
          ];

        return trait
          ? trait.symbol
          : traitId;
      }
    );
  }

  function render() {
    ctx.clearRect(
      0,
      0,
      viewportWidth,
      viewportHeight
    );

    ctx.fillStyle =
      "#020617";

    ctx.fillRect(
      0,
      0,
      viewportWidth,
      viewportHeight
    );

    const shakeX =
      screenShake > 0
        ? (
            Math.random() -
            0.5
          ) *
          tileSize *
          0.12 *
          screenShake
        : 0;

    const shakeY =
      screenShake > 0
        ? (
            Math.random() -
            0.5
          ) *
          tileSize *
          0.12 *
          screenShake
        : 0;

    ctx.save();

    ctx.translate(
      boardOffsetX +
      shakeX,

      boardOffsetY +
      shakeY
    );

    drawBackground();
    drawPath();
    drawBlockedTiles();
    drawBuildHighlights();
    drawTowers();
    drawHero();
    drawEnemies();
    drawProjectiles();
    drawEffects();
    drawFloaters();

    ctx.restore();

    drawOverlayText();
  }

  function drawBackground() {
    const map =
      getMap();

    const gradient =
      ctx.createLinearGradient(
        0,
        0,
        0,
        boardHeight
      );

    gradient.addColorStop(
      0,
      map.bgTop
    );

    gradient.addColorStop(
      1,
      map.bgBottom
    );

    ctx.fillStyle =
      gradient;

    ctx.fillRect(
      0,
      0,
      boardWidth,
      boardHeight
    );

    for (
      let row = 0;
      row < ROWS;
      row += 1
    ) {
      for (
        let col = 0;
        col < COLS;
        col += 1
      ) {
        ctx.fillStyle =
          (row + col) % 2 ===
          0
            ? "rgba(255,255,255,0.022)"
            : "rgba(255,255,255,0.038)";

        ctx.fillRect(
          col * tileSize,
          row * tileSize,
          tileSize,
          tileSize
        );

        ctx.strokeStyle =
          "rgba(148,163,184,0.08)";

        ctx.strokeRect(
          col * tileSize +
          0.5,

          row * tileSize +
          0.5,

          tileSize - 1,
          tileSize - 1
        );
      }
    }

    drawMapDecor();
  }

  function drawMapDecor() {
    const map =
      getMap();

    state.mapDecor.forEach(
      (item) => {
        const x =
          (
            item.x +
            0.5
          ) *
          tileSize;

        const y =
          (
            item.y +
            0.5
          ) *
          tileSize;

        ctx.save();
        ctx.globalAlpha =
          item.alpha;

        if (
          map.decor === "rift"
        ) {
          ctx.strokeStyle =
            item.color;

          ctx.lineWidth =
            1.5;

          ctx.beginPath();

          ctx.moveTo(
            x -
            item.size *
            tileSize,

            y -
            item.size *
            0.2 *
            tileSize
          );

          ctx.lineTo(
            x +
            item.size *
            0.35 *
            tileSize,

            y +
            item.size *
            0.25 *
            tileSize
          );

          ctx.lineTo(
            x -
            item.size *
            0.1 *
            tileSize,

            y +
            item.size *
            0.7 *
            tileSize
          );

          ctx.stroke();
        } else {
          ctx.fillStyle =
            item.color;

          ctx.beginPath();

          ctx.ellipse(
            x,
            y,

            item.size *
            tileSize,

            item.size *
            (
              map.decor ===
              "swamp"
                ? 0.52
                : 0.72
            ) *
            tileSize,

            item.rotation,

            0,
            Math.PI * 2
          );

          ctx.fill();
        }

        ctx.restore();
      }
    );
  }

  function drawPath() {
    const map =
      getMap();

    const points =
      getPathPoints();

    ctx.lineCap =
      "round";

    ctx.lineJoin =
      "round";

    drawPolyline(
      points,
      map.pathOuter,
      tileSize * 0.68
    );

    drawPolyline(
      points,
      map.pathInner,
      tileSize * 0.48
    );

    if (
      map.decor === "rift"
    ) {
      drawRiftDetails(
        points
      );
    }

    if (
      map.decor === "swamp"
    ) {
      drawSwampDetails(
        points
      );
    }

    const start =
      getPathCells()[0];

    const end =
      getPathCells()[
        getPathCells().length -
        1
      ];

    drawPortal(
      start.x,
      start.y,
      "#22c55e",
      false
    );

    drawPortal(
      end.x,
      end.y,
      "#ef4444",
      true
    );
  }

  function drawPolyline(
    points,
    color,
    width
  ) {
    ctx.beginPath();

    points.forEach(
      (
        point,
        index
      ) => {
        const x =
          point.x *
          tileSize;

        const y =
          point.y *
          tileSize;

        if (
          index === 0
        ) {
          ctx.moveTo(
            x,
            y
          );
        } else {
          ctx.lineTo(
            x,
            y
          );
        }
      }
    );

    ctx.strokeStyle =
      color;

    ctx.lineWidth =
      width;

    ctx.stroke();
  }

  function drawRiftDetails(
    points
  ) {
    ctx.save();

    ctx.strokeStyle =
      "rgba(216,180,254,0.36)";

    ctx.lineWidth =
      1.4;

    points.forEach(
      (
        point,
        index
      ) => {
        if (
          index % 2
        ) {
          return;
        }

        const x =
          point.x *
          tileSize;

        const y =
          point.y *
          tileSize;

        ctx.beginPath();

        ctx.moveTo(
          x -
          tileSize * 0.18,

          y -
          tileSize * 0.1
        );

        ctx.lineTo(
          x +
          tileSize * 0.16,

          y +
          tileSize * 0.12
        );

        ctx.stroke();
      }
    );

    ctx.restore();
  }

  function drawSwampDetails(
    points
  ) {
    const time =
      performance.now() /
      600;

    ctx.save();

    ctx.fillStyle =
      "rgba(190,242,100,0.24)";

    points.forEach(
      (
        point,
        index
      ) => {
        if (
          index % 2
        ) {
          return;
        }

        const radius =
          tileSize *
          (
            0.04 +
            Math.abs(
              Math.sin(
                time +
                index
              )
            ) *
            0.025
          );

        ctx.beginPath();

        ctx.arc(
          (
            point.x +
            0.16
          ) *
          tileSize,

          (
            point.y -
            0.1
          ) *
          tileSize,

          radius,

          0,
          Math.PI * 2
        );

        ctx.fill();
      }
    );

    ctx.restore();
  }

  function drawPortal(
    col,
    row,
    color,
    isBase
  ) {
    const x =
      (
        col +
        0.5
      ) *
      tileSize;

    const y =
      (
        row +
        0.5
      ) *
      tileSize;

    const pulse =
      1 +
      Math.sin(
        performance.now() /
        240
      ) *
      0.08;

    ctx.save();

    ctx.shadowColor =
      color;

    ctx.shadowBlur =
      14;

    ctx.strokeStyle =
      color;

    ctx.lineWidth =
      3;

    ctx.beginPath();

    ctx.arc(
      x,
      y,

      tileSize *
      0.25 *
      pulse,

      0,
      Math.PI * 2
    );

    ctx.stroke();

    if (isBase) {
      ctx.fillStyle =
        color;

      crystalPath(
        x,
        y,
        tileSize * 0.22,
        tileSize * 0.38
      );

      ctx.fill();
    } else {
      ctx.fillStyle =
        hexToRgba(
          color,
          0.28
        );

      ctx.beginPath();

      ctx.arc(
        x,
        y,

        tileSize *
        0.18,

        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    ctx.restore();
  }

  function drawBlockedTiles() {
    (
      getMap().blocked ||
      []
    ).forEach(
      (point) => {
        const x =
          point.x *
          tileSize;

        const y =
          point.y *
          tileSize;

        ctx.fillStyle =
          "rgba(15,23,42,0.72)";

        roundedRectPath(
          x +
          tileSize *
          0.16,

          y +
          tileSize *
          0.16,

          tileSize *
          0.68,

          tileSize *
          0.68,

          8
        );

        ctx.fill();

        ctx.strokeStyle =
          "rgba(148,163,184,0.24)";

        ctx.stroke();

        ctx.fillStyle =
          "rgba(148,163,184,0.22)";

        ctx.beginPath();

        ctx.moveTo(
          x +
          tileSize *
          0.25,

          y +
          tileSize *
          0.68
        );

        ctx.lineTo(
          x +
          tileSize *
          0.46,

          y +
          tileSize *
          0.25
        );

        ctx.lineTo(
          x +
          tileSize *
          0.75,

          y +
          tileSize *
          0.67
        );

        ctx.closePath();
        ctx.fill();
      }
    );
  }

  function drawBuildHighlights() {
    const selected =
      getSelectedTower();

    if (selected) {
      drawRangeCircle(
        selected.col +
        0.5,

        selected.row +
        0.5,

        getTowerStats(
          selected
        ).range,

        DATA.towers[
          selected.type
        ].color
      );

      return;
    }

    if (
      !state.selectedBuildType ||
      state.status !==
        "playing"
    ) {
      return;
    }

    const pathSet =
      getPathSet();

    const blockedSet =
      getBlockedSet();

    ctx.save();
    ctx.globalAlpha =
      0.17;

    for (
      let row = 0;
      row < ROWS;
      row += 1
    ) {
      for (
        let col = 0;
        col < COLS;
        col += 1
      ) {
        if (
          pathSet.has(
            `${col},${row}`
          ) ||
          blockedSet.has(
            `${col},${row}`
          ) ||
          getTowerAt(
            col,
            row
          ) ||
          isHeroTile(
            col,
            row
          )
        ) {
          continue;
        }

        ctx.fillStyle =
          DATA.towers[
            state
              .selectedBuildType
          ].color;

        roundedRectPath(
          col * tileSize +
          tileSize *
          0.3,

          row * tileSize +
          tileSize *
          0.3,

          tileSize *
          0.4,

          tileSize *
          0.4,

          5
        );

        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawRangeCircle(
    x,
    y,
    range,
    color
  ) {
    ctx.beginPath();

    ctx.arc(
      x * tileSize,
      y * tileSize,
      range * tileSize,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      hexToRgba(
        color,
        0.07
      );

    ctx.strokeStyle =
      hexToRgba(
        color,
        0.4
      );

    ctx.lineWidth =
      2;

    ctx.fill();
    ctx.stroke();
  }

  function drawTowers() {
    state.towers.forEach(
      (tower) => {
        const table =
          DATA.towers[
            tower.type
          ];

        const x =
          (
            tower.col +
            0.5
          ) *
          tileSize;

        const y =
          (
            tower.row +
            0.5
          ) *
          tileSize;

        const selected =
          tower.id ===
          state.selectedTowerId;

        ctx.save();

        if (selected) {
          ctx.shadowColor =
            table.color;

          ctx.shadowBlur =
            18;
        }

        drawTowerSprite(
          tower,
          x,
          y
        );

        if (selected) {
          ctx.strokeStyle =
            "rgba(255,255,255,0.9)";

          ctx.lineWidth =
            2;

          ctx.beginPath();

          ctx.arc(
            x,
            y,

            tileSize *
            0.39,

            0,
            Math.PI * 2
          );

          ctx.stroke();
        }

        ctx.fillStyle =
          "#e5e7eb";

        ctx.font =
          `800 ${Math.max(
            8,
            tileSize * 0.16
          )}px system-ui`;

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "middle";

        ctx.fillText(
          `Lv.${tower.level}`,

          x,

          y +
          tileSize *
          0.32
        );

        if (tower.trait) {
          ctx.fillStyle =
            "#facc15";

          ctx.beginPath();

          ctx.arc(
            x +
            tileSize *
            0.23,

            y -
            tileSize *
            0.27,

            tileSize *
            0.075,

            0,
            Math.PI * 2
          );

          ctx.fill();
        }

        ctx.restore();
      }
    );
  }

  function drawTowerSprite(
    tower,
    x,
    y
  ) {
    const table =
      DATA.towers[
        tower.type
      ];

    const color =
      table.color;

    const size =
      tileSize *
      (
        0.25 +
        tower.level *
        0.01
      );

    ctx.fillStyle =
      "rgba(15,23,42,0.94)";

    roundedRectPath(
      x - size,

      y -
      size *
      0.42,

      size * 2,

      size *
      1.32,

      8
    );

    ctx.fill();

    ctx.strokeStyle =
      color;

    ctx.lineWidth =
      2;

    ctx.stroke();

    if (
      tower.type ===
      "archer"
    ) {
      ctx.strokeStyle =
        color;

      ctx.lineWidth =
        3;

      ctx.beginPath();

      ctx.arc(
        x,

        y -
        size *
        0.42,

        size *
        0.62,

        -Math.PI *
        0.7,

        Math.PI *
        0.7
      );

      ctx.stroke();

      ctx.beginPath();

      ctx.moveTo(
        x -
        size *
        0.08,

        y -
        size *
        0.95
      );

      ctx.lineTo(
        x +
        size *
        0.56,

        y -
        size *
        0.42
      );

      ctx.stroke();
    } else if (
      tower.type ===
      "cannon"
    ) {
      ctx.save();

      ctx.translate(
        x,
        y -
        size *
        0.32
      );

      ctx.rotate(
        -0.32
      );

      ctx.fillStyle =
        color;

      roundedRectPath(
        0,

        -size *
        0.18,

        size,

        size *
        0.36,

        4
      );

      ctx.fill();

      ctx.restore();

      ctx.fillStyle =
        "#334155";

      ctx.beginPath();

      ctx.arc(
        x,

        y -
        size *
        0.2,

        size *
        0.42,

        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.strokeStyle =
        color;

      ctx.stroke();
    } else if (
      tower.type ===
      "ice"
    ) {
      ctx.fillStyle =
        color;

      crystalPath(
        x,

        y -
        size *
        0.22,

        size *
        0.62,

        size *
        0.95
      );

      ctx.fill();

      ctx.fillStyle =
        "rgba(255,255,255,0.48)";

      crystalPath(
        x +
        size *
        0.24,

        y -
        size *
        0.12,

        size *
        0.28,

        size *
        0.5
      );

      ctx.fill();
    } else if (
      tower.type ===
      "lightning"
    ) {
      ctx.strokeStyle =
        color;

      ctx.lineWidth =
        3;

      ctx.beginPath();

      ctx.moveTo(
        x -
        size *
        0.34,

        y +
        size *
        0.2
      );

      ctx.lineTo(
        x +
        size *
        0.12,

        y -
        size *
        0.2
      );

      ctx.lineTo(
        x -
        size *
        0.04,

        y -
        size *
        0.2
      );

      ctx.lineTo(
        x +
        size *
        0.38,

        y -
        size *
        0.84
      );

      ctx.stroke();

      ctx.fillStyle =
        hexToRgba(
          color,
          0.75
        );

      ctx.beginPath();

      ctx.arc(
        x,

        y -
        size *
        0.72,

        size *
        0.28,

        0,
        Math.PI * 2
      );

      ctx.fill();
    } else if (
      tower.type ===
      "poison"
    ) {
      ctx.fillStyle =
        "#1f2937";

      ctx.beginPath();

      ctx.ellipse(
        x,

        y -
        size *
        0.12,

        size *
        0.65,

        size *
        0.42,

        0,

        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.strokeStyle =
        color;

      ctx.stroke();

      ctx.fillStyle =
        color;

      for (
        let index = 0;
        index < 3;
        index += 1
      ) {
        ctx.beginPath();

        ctx.arc(
          x -
          size *
          0.32 +
          index *
          size *
          0.32,

          y -
          size *
          (
            0.44 +
            0.1 *
            Math.sin(
              performance.now() /
              300 +
              index
            )
          ),

          size *
          0.11,

          0,
          Math.PI * 2
        );

        ctx.fill();
      }
    }
  }

  function drawHero() {
    const hero =
      getHeroPosition();

    const x =
      hero.x *
      tileSize;

    const y =
      hero.y *
      tileSize;

    const pulse =
      1 +
      Math.sin(
        performance.now() /
        260
      ) *
      0.04;

    ctx.save();

    ctx.beginPath();

    ctx.arc(
      x,
      y,

      tileSize *
      0.35 *
      pulse,

      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "rgba(250,204,21,0.14)";

    ctx.fill();

    ctx.strokeStyle =
      "rgba(250,204,21,0.82)";

    ctx.lineWidth =
      2;

    ctx.stroke();

    ctx.fillStyle =
      "#1e293b";

    roundedRectPath(
      x -
      tileSize *
      0.14,

      y -
      tileSize *
      0.02,

      tileSize *
      0.28,

      tileSize *
      0.27,

      6
    );

    ctx.fill();

    ctx.fillStyle =
      "#fbbf24";

    ctx.beginPath();

    ctx.arc(
      x,

      y -
      tileSize *
      0.16,

      tileSize *
      0.15,

      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.strokeStyle =
      "#fde047";

    ctx.lineWidth =
      3;

    ctx.beginPath();

    ctx.moveTo(
      x +
      tileSize *
      0.12,

      y +
      tileSize *
      0.02
    );

    ctx.lineTo(
      x +
      tileSize *
      0.34,

      y -
      tileSize *
      0.18
    );

    ctx.stroke();

    ctx.restore();
  }

  function drawEnemies() {
    state.enemies.forEach(
      (enemy) => {
        const x =
          enemy.x *
          tileSize;

        const y =
          enemy.y *
          tileSize;

        const radius =
          enemy.radius *
          tileSize;

        ctx.save();

        if (
          enemy.boss ||
          enemy.traits.includes(
            "darkAura"
          )
        ) {
          const pulse =
            1 +
            Math.sin(
              performance.now() /
              180
            ) *
            0.08;

          ctx.fillStyle =
            hexToRgba(
              enemy.aura,

              enemy.boss
                ? 0.18
                : 0.1
            );

          ctx.beginPath();

          ctx.arc(
            x,
            y,

            radius *
            (
              enemy.boss
                ? 1.9
                : 1.4
            ) *
            pulse,

            0,
            Math.PI * 2
          );

          ctx.fill();
        }

        drawMonsterSprite(
          enemy,
          x,
          y,
          radius
        );

        drawHpBar(
          x,

          y -
          radius -
          tileSize *
          0.17,

          radius *
          2.15,

          tileSize *
          0.08,

          enemy.hp /
          enemy.maxHp,

          enemy.boss
            ? "#f97316"
            : "#22c55e"
        );

        if (
          enemy.maxShield > 0 &&
          enemy.shield > 0
        ) {
          drawHpBar(
            x,

            y -
            radius -
            tileSize *
            0.28,

            radius *
            2.15,

            tileSize *
            0.055,

            enemy.shield /
            enemy.maxShield,

            "#38bdf8"
          );
        }

        ctx.restore();
      }
    );
  }

  function drawMonsterSprite(
    enemy,
    x,
    y,
    radius
  ) {
    const time =
      performance.now() /
      350 +
      enemy.animSeed;

    y +=
      Math.sin(time) *
      tileSize *
      0.025;

    ctx.fillStyle =
      enemy.color;

    ctx.strokeStyle =
      getEnemyStrokeColor(
        enemy
      );

    ctx.lineWidth =
      enemy.boss
        ? 3
        : 2;

    switch (
      enemy.type
    ) {
      case "slime":
        ctx.beginPath();

        ctx.ellipse(
          x,

          y +
          radius *
          0.08,

          radius *
          (
            1.05 +
            Math.sin(time) *
            0.06
          ),

          radius *
          0.78,

          0,

          Math.PI,
          0
        );

        ctx.lineTo(
          x +
          radius *
          0.9,

          y +
          radius *
          0.38
        );

        ctx.quadraticCurveTo(
          x,

          y +
          radius *
          0.7,

          x -
          radius *
          0.9,

          y +
          radius *
          0.38
        );

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        drawEye(
          x -
          radius *
          0.28,

          y +
          radius *
          0.05,

          radius *
          0.08
        );

        drawEye(
          x +
          radius *
          0.28,

          y +
          radius *
          0.05,

          radius *
          0.08
        );
        break;

      case "bat":
        drawWing(
          x -
          radius *
          0.22,

          y,

          -1,

          radius,

          enemy.color
        );

        drawWing(
          x +
          radius *
          0.22,

          y,

          1,

          radius,

          enemy.color
        );

        ctx.beginPath();

        ctx.ellipse(
          x,
          y,

          radius *
          0.52,

          radius *
          0.75,

          0,

          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();

        drawEye(
          x -
          radius *
          0.15,

          y -
          radius *
          0.08,

          radius *
          0.06
        );

        drawEye(
          x +
          radius *
          0.15,

          y -
          radius *
          0.08,

          radius *
          0.06
        );
        break;

      case "goblin":
        drawEar(
          x -
          radius *
          0.5,

          y -
          radius *
          0.06,

          -1,

          radius
        );

        drawEar(
          x +
          radius *
          0.5,

          y -
          radius *
          0.06,

          1,

          radius
        );

        ctx.beginPath();

        ctx.arc(
          x,
          y,

          radius *
          0.78,

          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();

        drawEye(
          x -
          radius *
          0.22,

          y -
          radius *
          0.08,

          radius *
          0.06
        );

        drawEye(
          x +
          radius *
          0.22,

          y -
          radius *
          0.08,

          radius *
          0.06
        );
        break;

      case "wolf":
        ctx.beginPath();

        ctx.moveTo(
          x -
          radius *
          0.86,

          y +
          radius *
          0.2
        );

        ctx.lineTo(
          x -
          radius *
          0.2,

          y -
          radius *
          0.6
        );

        ctx.lineTo(
          x +
          radius *
          0.75,

          y -
          radius *
          0.25
        );

        ctx.lineTo(
          x +
          radius *
          0.55,

          y +
          radius *
          0.5
        );

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(
          x -
          radius *
          0.12,

          y -
          radius *
          0.58
        );

        ctx.lineTo(
          x +
          radius *
          0.04,

          y -
          radius *
          0.98
        );

        ctx.lineTo(
          x +
          radius *
          0.22,

          y -
          radius *
          0.52
        );

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        drawEye(
          x +
          radius *
          0.34,

          y -
          radius *
          0.22,

          radius *
          0.055
        );
        break;

      case "plagueCrawler":
        ctx.beginPath();

        ctx.ellipse(
          x,
          y,

          radius,

          radius *
          0.62,

          0,

          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle =
          "rgba(190,242,100,0.8)";

        for (
          let index = -2;
          index <= 2;
          index += 1
        ) {
          ctx.beginPath();

          ctx.moveTo(
            x +
            index *
            radius *
            0.28,

            y +
            radius *
            0.28
          );

          ctx.lineTo(
            x +
            index *
            radius *
            0.38,

            y +
            radius *
            0.72
          );

          ctx.stroke();
        }
        break;

      case "golem":
      case "bossGolem":
        drawBlock(
          x,

          y -
          radius *
          0.3,

          radius *
          1.1,

          radius *
          0.85,

          enemy.color
        );

        drawBlock(
          x -
          radius *
          0.55,

          y +
          radius *
          0.35,

          radius *
          0.55,

          radius *
          0.48,

          enemy.color
        );

        drawBlock(
          x +
          radius *
          0.55,

          y +
          radius *
          0.35,

          radius *
          0.55,

          radius *
          0.48,

          enemy.color
        );

        drawEye(
          x -
          radius *
          0.2,

          y -
          radius *
          0.35,

          radius *
          0.055
        );

        drawEye(
          x +
          radius *
          0.2,

          y -
          radius *
          0.35,

          radius *
          0.055
        );
        break;

      case "darkPriest":
        ctx.beginPath();

        ctx.moveTo(
          x,

          y -
          radius *
          0.95
        );

        ctx.quadraticCurveTo(
          x +
          radius *
          0.85,

          y -
          radius *
          0.3,

          x +
          radius *
          0.55,

          y +
          radius *
          0.75
        );

        ctx.lineTo(
          x -
          radius *
          0.55,

          y +
          radius *
          0.75
        );

        ctx.quadraticCurveTo(
          x -
          radius *
          0.85,

          y -
          radius *
          0.3,

          x,

          y -
          radius *
          0.95
        );

        ctx.fill();
        ctx.stroke();

        drawEye(
          x -
          radius *
          0.15,

          y -
          radius *
          0.22,

          radius *
          0.06,

          "#fef08a"
        );

        drawEye(
          x +
          radius *
          0.15,

          y -
          radius *
          0.22,

          radius *
          0.06,

          "#fef08a"
        );
        break;

      case "shieldImp":
        ctx.beginPath();

        ctx.arc(
          x,
          y,

          radius *
          0.75,

          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();

        ctx.fillStyle =
          "rgba(125,211,252,0.65)";

        shieldPath(
          x,

          y +
          radius *
          0.05,

          radius *
          0.55
        );

        ctx.fill();
        ctx.stroke();
        break;

      case "shadowKnight":
        shieldPath(
          x,
          y,
          radius *
          0.88
        );

        ctx.fill();
        ctx.stroke();

        ctx.fillStyle =
          "#111827";

        ctx.fillRect(
          x -
          radius *
          0.4,

          y -
          radius *
          0.35,

          radius *
          0.8,

          radius *
          0.22
        );

        ctx.fillStyle =
          "#f8fafc";

        ctx.fillRect(
          x -
          radius *
          0.28,

          y -
          radius *
          0.28,

          radius *
          0.18,

          radius *
          0.05
        );

        ctx.fillRect(
          x +
          radius *
          0.1,

          y -
          radius *
          0.28,

          radius *
          0.18,

          radius *
          0.05
        );
        break;

      case "abyssLord":
        ctx.fillStyle =
          "#020617";

        ctx.beginPath();

        ctx.moveTo(
          x,
          y - radius
        );

        ctx.lineTo(
          x +
          radius *
          0.85,

          y +
          radius *
          0.75
        );

        ctx.lineTo(
          x -
          radius *
          0.85,

          y +
          radius *
          0.75
        );

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle =
          "#f59e0b";

        ctx.lineWidth =
          3;

        ctx.beginPath();

        ctx.moveTo(
          x -
          radius *
          0.35,

          y -
          radius *
          0.8
        );

        ctx.lineTo(
          x -
          radius *
          0.75,

          y -
          radius *
          1.2
        );

        ctx.moveTo(
          x +
          radius *
          0.35,

          y -
          radius *
          0.8
        );

        ctx.lineTo(
          x +
          radius *
          0.75,

          y -
          radius *
          1.2
        );

        ctx.stroke();

        drawEye(
          x -
          radius *
          0.18,

          y -
          radius *
          0.32,

          radius *
          0.06,

          "#f59e0b"
        );

        drawEye(
          x +
          radius *
          0.18,

          y -
          radius *
          0.32,

          radius *
          0.06,

          "#f59e0b"
        );
        break;

      default:
        ctx.beginPath();

        ctx.arc(
          x,
          y,
          radius,
          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();
    }
  }

  function getEnemyStrokeColor(
    enemy
  ) {
    if (
      enemy.freezeTimer > 0 ||
      enemy.slowTimer > 0
    ) {
      return "#67e8f9";
    }

    if (
      enemy.poisonTimer > 0
    ) {
      return "#bef264";
    }

    if (
      enemy.vulnerabilityTimer >
      0
    ) {
      return "#fca5a5";
    }

    return enemy.aura;
  }

  function drawHpBar(
    x,
    y,
    width,
    height,
    ratio,
    color
  ) {
    roundedRectPath(
      x -
      width / 2,

      y -
      height / 2,

      width,
      height,

      height / 2
    );

    ctx.fillStyle =
      "rgba(15,23,42,0.9)";

    ctx.fill();

    const fillWidth =
      Math.max(
        0,
        width *
        clamp(
          ratio,
          0,
          1
        )
      );

    if (
      fillWidth > 0
    ) {
      roundedRectPath(
        x -
        width / 2,

        y -
        height / 2,

        fillWidth,
        height,

        height / 2
      );

      ctx.fillStyle =
        color;

      ctx.fill();
    }
  }

  function drawProjectiles() {
    state.projectiles.forEach(
      (projectile) => {
        const x =
          projectile.x *
          tileSize;

        const y =
          projectile.y *
          tileSize;

        const previousX =
          projectile.prevX *
          tileSize;

        const previousY =
          projectile.prevY *
          tileSize;

        const radius =
          Math.max(
            2.5,
            projectile.radius *
            tileSize
          );

        ctx.save();

        ctx.strokeStyle =
          hexToRgba(
            projectile.color,
            0.45
          );

        ctx.lineWidth =
          Math.max(
            1.5,
            radius *
            0.7
          );

        ctx.beginPath();

        ctx.moveTo(
          previousX,
          previousY
        );

        ctx.lineTo(
          x,
          y
        );

        ctx.stroke();

        ctx.shadowColor =
          projectile.color;

        ctx.shadowBlur =
          10;

        ctx.fillStyle =
          projectile.color;

        ctx.beginPath();

        ctx.arc(
          x,
          y,
          radius,
          0,
          Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
      }
    );
  }

  function drawEffects() {
    state.effects.forEach(
      (effect) => {
        const progress =
          clamp(
            effect.life /
            effect.maxLife,
            0,
            1
          );

        ctx.save();

        if (
          effect.type ===
          "lightning"
        ) {
          ctx.globalAlpha =
            progress;

          ctx.strokeStyle =
            effect.color;

          ctx.lineWidth =
            3;

          ctx.shadowColor =
            effect.color;

          ctx.shadowBlur =
            12;

          ctx.beginPath();

          effect.points.forEach(
            (
              point,
              index
            ) => {
              const x =
                point.x *
                tileSize +
                (
                  Math.random() -
                  0.5
                ) *
                tileSize *
                0.08;

              const y =
                point.y *
                tileSize +
                (
                  Math.random() -
                  0.5
                ) *
                tileSize *
                0.08;

              if (
                index === 0
              ) {
                ctx.moveTo(
                  x,
                  y
                );
              } else {
                ctx.lineTo(
                  x,
                  y
                );
              }
            }
          );

          ctx.stroke();
        } else if (
          effect.type ===
            "explosion" ||
          effect.type ===
            "poisonCloud" ||
          effect.type ===
            "heroSkill"
        ) {
          ctx.globalAlpha =
            progress;

          ctx.beginPath();

          ctx.arc(
            effect.x *
            tileSize,

            effect.y *
            tileSize,

            effect.radius *
            tileSize *
            (
              1.2 -
              progress *
              0.2
            ),

            0,
            Math.PI * 2
          );

          ctx.fillStyle =
            hexToRgba(
              effect.color,

              effect.type ===
              "heroSkill"
                ? 0.22
                : 0.28
            );

          ctx.fill();

          ctx.strokeStyle =
            effect.color;

          ctx.lineWidth =
            effect.type ===
            "heroSkill"
              ? 4
              : 2;

          ctx.stroke();
        } else if (
          effect.type ===
            "upgrade" ||
          effect.type ===
            "heroLevel" ||
          effect.type ===
            "iceBurst"
        ) {
          ctx.globalAlpha =
            progress;

          ctx.strokeStyle =
            effect.color;

          ctx.lineWidth =
            3;

          ctx.beginPath();

          ctx.arc(
            effect.x *
            tileSize,

            effect.y *
            tileSize,

            tileSize *
            (
              0.18 +
              (
                1 -
                progress
              ) *
              0.55
            ),

            0,
            Math.PI * 2
          );

          ctx.stroke();
        } else if (
          effect.type ===
            "bossDeath" ||
          effect.type ===
            "death"
        ) {
          ctx.globalAlpha =
            progress *
            0.8;

          ctx.fillStyle =
            hexToRgba(
              effect.color,
              0.32
            );

          ctx.beginPath();

          ctx.arc(
            effect.x *
            tileSize,

            effect.y *
            tileSize,

            tileSize *
            (
              0.18 +
              (
                1 -
                progress
              ) *
              (
                effect.type ===
                "bossDeath"
                  ? 0.9
                  : 0.45
              )
            ),

            0,
            Math.PI * 2
          );

          ctx.fill();
        } else {
          ctx.globalAlpha =
            progress;

          ctx.fillStyle =
            effect.color;

          ctx.beginPath();

          ctx.arc(
            effect.x *
            tileSize,

            effect.y *
            tileSize,

            tileSize *
            0.17,

            0,
            Math.PI * 2
          );

          ctx.fill();
        }

        ctx.restore();
      }
    );
  }

  function drawFloaters() {
    state.floaters.forEach(
      (floater) => {
        const progress =
          clamp(
            floater.life /
            floater.maxLife,
            0,
            1
          );

        ctx.save();

        ctx.globalAlpha =
          progress;

        ctx.fillStyle =
          floater.color;

        ctx.font =
          `800 ${Math.max(
            10,
            tileSize * 0.21
          )}px system-ui`;

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "middle";

        ctx.shadowColor =
          "rgba(0,0,0,0.75)";

        ctx.shadowBlur =
          4;

        ctx.fillText(
          floater.text,

          floater.x *
          tileSize,

          floater.y *
          tileSize
        );

        ctx.restore();
      }
    );
  }

  function drawOverlayText() {
    if (!state.started) {
      return;
    }

    if (
      state.bossWarningTimer >
      0
    ) {
      const alpha =
        0.32 +
        Math.sin(
          performance.now() /
          90
        ) *
        0.1;

      ctx.fillStyle =
        `rgba(127,29,29,${alpha})`;

      ctx.fillRect(
        0,
        0,
        viewportWidth,
        viewportHeight
      );

      ctx.fillStyle =
        "#fee2e2";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.font =
        `900 ${Math.max(
          24,
          tileSize * 0.55
        )}px system-ui`;

      ctx.fillText(
        "WARNING",
        viewportWidth / 2,
        viewportHeight / 2 -
        12
      );

      ctx.fillStyle =
        "#fecaca";

      ctx.font =
        `800 ${Math.max(
          12,
          tileSize * 0.24
        )}px system-ui`;

      ctx.fillText(
        "Boss Wave Incoming",
        viewportWidth / 2,
        viewportHeight / 2 +
        22
      );

      return;
    }

    if (
      !state.paused &&
      state.status ===
        "playing"
    ) {
      return;
    }

    ctx.fillStyle =
      "rgba(2,6,23,0.56)";

    ctx.fillRect(
      0,
      0,
      viewportWidth,
      viewportHeight
    );

    ctx.fillStyle =
      "#fff";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.font =
      `900 ${Math.max(
        24,
        tileSize * 0.5
      )}px system-ui`;

    const title =
      state.status ===
      "gameOver"
        ? "GAME OVER"
        : state.status ===
          "clear"
          ? "CLEAR"
          : "PAUSED";

    ctx.fillText(
      title,
      viewportWidth / 2,
      viewportHeight / 2
    );
  }

  function addEffect(effect) {
    state.effects.push(
      effect
    );
  }

  function addFloater(
    text,
    x,
    y,
    color
  ) {
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
    el.toast.textContent =
      message;

    el.toast.classList.add(
      "is-visible"
    );

    clearTimeout(
      showToast.timer
    );

    showToast.timer =
      setTimeout(
        () => {
          el.toast.classList.remove(
            "is-visible"
          );
        },
        1450
      );
  }

  function gameLoop(time) {
    if (!lastTime) {
      lastTime = time;
    }

    const rawDt =
      Math.min(
        0.06,
        (
          time -
          lastTime
        ) /
        1000
      );

    lastTime = time;

    update(
      rawDt *
      state.speed
    );

    render();
    updateHud();
    updateWaveOverlay();

    requestAnimationFrame(
      gameLoop
    );
  }

  function buildMapDecor(map) {
    const result = [];

    const pathSet =
      new Set(
        map.path.map(
          (point) =>
            `${point.x},${point.y}`
        )
      );

    const blockedSet =
      new Set(
        (
          map.blocked ||
          []
        ).map(
          (point) =>
            `${point.x},${point.y}`
        )
      );

    let seed =
      map.id.length *
      997;

    function random() {
      seed =
        (
          seed *
          1664525 +
          1013904223
        ) %
        4294967296;

      return (
        seed /
        4294967296
      );
    }

    const colors =
      map.decor === "rift"
        ? [
            "#a855f7",
            "#7c3aed",
            "#c084fc"
          ]
        : map.decor ===
          "swamp"
          ? [
              "#365314",
              "#4d7c0f",
              "#65a30d"
            ]
          : [
              "#475569",
              "#64748b",
              "#334155"
            ];

    for (
      let index = 0;
      index < 18;
      index += 1
    ) {
      let x =
        Math.floor(
          random() *
          COLS
        );

      let y =
        Math.floor(
          random() *
          ROWS
        );

      let attempts = 0;

      while (
        (
          pathSet.has(
            `${x},${y}`
          ) ||
          blockedSet.has(
            `${x},${y}`
          )
        ) &&
        attempts < 20
      ) {
        x =
          Math.floor(
            random() *
            COLS
          );

        y =
          Math.floor(
            random() *
            ROWS
          );

        attempts += 1;
      }

      result.push({
        x,
        y,

        size:
          0.08 +
          random() *
          0.14,

        rotation:
          random() *
          Math.PI,

        alpha:
          0.18 +
          random() *
          0.22,

        color:
          colors[
            Math.floor(
              random() *
              colors.length
            )
          ]
      });
    }

    return result;
  }

  function distance(
    x1,
    y1,
    x2,
    y2
  ) {
    return Math.hypot(
      x1 - x2,
      y1 - y2
    );
  }

  function clamp(
    value,
    min,
    max
  ) {
    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }

  function roundedRectPath(
    x,
    y,
    width,
    height,
    radius
  ) {
    const r =
      Math.min(
        radius,
        width / 2,
        height / 2
      );

    ctx.beginPath();

    ctx.moveTo(
      x + r,
      y
    );

    ctx.lineTo(
      x +
      width -
      r,

      y
    );

    ctx.quadraticCurveTo(
      x + width,
      y,

      x + width,
      y + r
    );

    ctx.lineTo(
      x + width,

      y +
      height -
      r
    );

    ctx.quadraticCurveTo(
      x + width,
      y + height,

      x +
      width -
      r,

      y + height
    );

    ctx.lineTo(
      x + r,
      y + height
    );

    ctx.quadraticCurveTo(
      x,
      y + height,

      x,

      y +
      height -
      r
    );

    ctx.lineTo(
      x,
      y + r
    );

    ctx.quadraticCurveTo(
      x,
      y,

      x + r,
      y
    );

    ctx.closePath();
  }

  function crystalPath(
    x,
    y,
    width,
    height
  ) {
    ctx.beginPath();

    ctx.moveTo(
      x,
      y -
      height *
      0.55
    );

    ctx.lineTo(
      x +
      width *
      0.48,

      y -
      height *
      0.05
    );

    ctx.lineTo(
      x +
      width *
      0.28,

      y +
      height *
      0.5
    );

    ctx.lineTo(
      x -
      width *
      0.28,

      y +
      height *
      0.5
    );

    ctx.lineTo(
      x -
      width *
      0.48,

      y -
      height *
      0.05
    );

    ctx.closePath();
  }

  function shieldPath(
    x,
    y,
    radius
  ) {
    ctx.beginPath();

    ctx.moveTo(
      x,
      y - radius
    );

    ctx.quadraticCurveTo(
      x +
      radius *
      0.8,

      y -
      radius *
      0.62,

      x +
      radius *
      0.68,

      y +
      radius *
      0.25
    );

    ctx.quadraticCurveTo(
      x +
      radius *
      0.5,

      y +
      radius *
      0.82,

      x,

      y + radius
    );

    ctx.quadraticCurveTo(
      x -
      radius *
      0.5,

      y +
      radius *
      0.82,

      x -
      radius *
      0.68,

      y +
      radius *
      0.25
    );

    ctx.quadraticCurveTo(
      x -
      radius *
      0.8,

      y -
      radius *
      0.62,

      x,

      y - radius
    );

    ctx.closePath();
  }

  function drawEye(
    x,
    y,
    radius,
    color
  ) {
    ctx.fillStyle =
      color ||
      "#111827";

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  function drawWing(
    x,
    y,
    direction,
    radius,
    color
  ) {
    ctx.fillStyle =
      color;

    ctx.beginPath();

    ctx.moveTo(
      x,
      y
    );

    ctx.lineTo(
      x +
      direction *
      radius *
      1.25,

      y -
      radius *
      0.62
    );

    ctx.lineTo(
      x +
      direction *
      radius *
      0.98,

      y +
      radius *
      0.45
    );

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawEar(
    x,
    y,
    direction,
    radius
  ) {
    ctx.beginPath();

    ctx.moveTo(
      x,
      y
    );

    ctx.lineTo(
      x +
      direction *
      radius *
      0.62,

      y -
      radius *
      0.38
    );

    ctx.lineTo(
      x +
      direction *
      radius *
      0.28,

      y +
      radius *
      0.38
    );

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawBlock(
    x,
    y,
    width,
    height,
    color
  ) {
    ctx.fillStyle =
      color;

    roundedRectPath(
      x -
      width / 2,

      y -
      height / 2,

      width,
      height,

      5
    );

    ctx.fill();
    ctx.stroke();
  }

  function hexToRgba(
    hex,
    alpha
  ) {
    const value =
      String(
        hex ||
        ""
      ).replace(
        "#",
        ""
      );

    if (
      value.length !== 6
    ) {
      return (
        `rgba(255,255,255,${alpha})`
      );
    }

    const red =
      parseInt(
        value.slice(
          0,
          2
        ),
        16
      );

    const green =
      parseInt(
        value.slice(
          2,
          4
        ),
        16
      );

    const blue =
      parseInt(
        value.slice(
          4,
          6
        ),
        16
      );

    return (
      `rgba(${red},${green},${blue},${alpha})`
    );
  }

  function init() {
    buildMapCards();
    buildTowerQuickBar();
    bindEvents();

    const loaded =
      loadGame();

    if (loaded) {
      hideStartScreen();
    } else {
      showStartScreen();
    }

    resizeCanvas();
    updateAllUI();

    requestAnimationFrame(
      gameLoop
    );
  }

  init();
}());
