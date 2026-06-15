(function () {
  "use strict";

  window.Abyss = window.Abyss || {};

  var Data = window.Abyss.Data;
  var State = window.Abyss.State;
  var PROFILE_KEY = "abyssDefense_v090_profile";
  var RUN_KEY = "abyssDefense_v090_activeRun";
  var SAVE_INTERVAL = 2000;
  var el = {};
  var initialized = false;
  var frameId = 0;
  var lastRunSave = 0;

  var upgrades = [
    {
      id: "towerDamage",
      name: "심연 탄두",
      desc: "모든 타워 공격력 +3%",
      value: "+3% / Lv.",
      max: 5,
      costs: [45, 70, 100, 135, 175]
    },
    {
      id: "heroDamage",
      name: "수호자의 맹세",
      desc: "히어로 공격력 +4%",
      value: "+4% / Lv.",
      max: 5,
      costs: [35, 55, 80, 110, 145]
    },
    {
      id: "startGold",
      name: "원정 보급",
      desc: "새 게임 시작 골드 +12",
      value: "+12G / Lv.",
      max: 5,
      costs: [30, 45, 65, 90, 120]
    },
    {
      id: "baseHp",
      name: "심연 방벽",
      desc: "새 게임 Base HP +1",
      value: "+1 HP / Lv.",
      max: 5,
      costs: [40, 60, 85, 115, 150]
    },
    {
      id: "goldGain",
      name: "황금 계약",
      desc: "몬스터 처치 골드 +2%",
      value: "+2% / Lv.",
      max: 5,
      costs: [50, 80, 115, 155, 200]
    },
    {
      id: "sellBonus",
      name: "회수 기술",
      desc: "타워 판매 금액 +3%",
      value: "+3% / Lv.",
      max: 5,
      costs: [30, 50, 75, 105, 140]
    }
  ];

  if (!Data || !State) {
    throw new Error(
      "progression.js: data.js와 state.js가 먼저 로드되어야 합니다."
    );
  }

  var profile = loadProfile();
  var activeRun = loadRun();

  Data.version = "0.9.0";

  patchFormulas();
  patchState();

  function defaultProfile() {
    return {
      version: 1,
      abyssStone: 0,
      totalClears: 0,

      upgrades: {
        towerDamage: 0,
        heroDamage: 0,
        startGold: 0,
        baseHp: 0,
        goldGain: 0,
        sellBonus: 0
      },

      maps: {}
    };
  }

  function readJson(key) {
    var raw = localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error(
        key + " 로드 실패:",
        error
      );

      return null;
    }
  }

  function loadProfile() {
    var result = defaultProfile();
    var saved = readJson(PROFILE_KEY);

    if (
      !saved ||
      typeof saved !== "object"
    ) {
      return result;
    }

    result.abyssStone = safeInt(
      saved.abyssStone,
      0
    );

    result.totalClears = safeInt(
      saved.totalClears,
      0
    );

    upgrades.forEach(function (item) {
      result.upgrades[item.id] = clamp(
        safeInt(
          saved.upgrades &&
            saved.upgrades[item.id],
          0
        ),
        0,
        item.max
      );
    });

    if (
      saved.maps &&
      typeof saved.maps === "object"
    ) {
      Object.keys(Data.maps).forEach(
        function (mapId) {
          var source = saved.maps[mapId];

          if (
            !source ||
            typeof source !== "object"
          ) {
            return;
          }

          result.maps[mapId] = {
            bestStars: clamp(
              safeInt(
                source.bestStars,
                0
              ),
              0,
              3
            ),

            clears: safeInt(
              source.clears,
              0
            ),

            bestHp: safeInt(
              source.bestHp,
              0
            ),

            bestTime: safeInt(
              source.bestTime,
              0
            ),

            bestWave: clamp(
              safeInt(
                source.bestWave,
                0
              ),
              0,
              Data.waves.length
            )
          };
        }
      );
    }

    return result;
  }

  function loadRun() {
    var saved = readJson(RUN_KEY);

    if (
      !saved ||
      !Data.maps[saved.mapId]
    ) {
      return null;
    }

    return {
      id: String(
        saved.id || ""
      ),

      mapId: saved.mapId,

      startedAt: safeInt(
        saved.startedAt,
        Date.now()
      ),

      startBaseHp: Math.max(
        1,
        safeInt(
          saved.startBaseHp,
          1
        )
      ),

      minBaseHp: safeInt(
        saved.minBaseHp,
        0
      ),

      awarded: !!saved.awarded,
      resultShown: !!saved.resultShown,

      eligibleForBestTime:
        saved.eligibleForBestTime !== false
    };
  }

  function saveProfile() {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify(profile)
    );
  }

  function saveRun() {
    if (!activeRun) {
      localStorage.removeItem(
        RUN_KEY
      );

      return;
    }

    localStorage.setItem(
      RUN_KEY,
      JSON.stringify(activeRun)
    );

    lastRunSave = Date.now();
  }

  function clearRun() {
    activeRun = null;

    localStorage.removeItem(
      RUN_KEY
    );
  }

  function level(id) {
    return safeInt(
      profile.upgrades[id],
      0
    );
  }

  function upgradeById(id) {
    return (
      upgrades.find(
        function (item) {
          return item.id === id;
        }
      ) || null
    );
  }

  function mapProgress(mapId) {
    if (!profile.maps[mapId]) {
      profile.maps[mapId] = {
        bestStars: 0,
        clears: 0,
        bestHp: 0,
        bestTime: 0,
        bestWave: 0
      };
    }

    return profile.maps[mapId];
  }

  function patchFormulas() {
    var formulas = Data.formulas;
    var towerStats;
    var heroStats;
    var monsterStats;
    var sellValue;

    if (
      !formulas ||
      formulas.__progressionPatched
    ) {
      return;
    }

    towerStats =
      formulas.towerStats;

    heroStats =
      formulas.heroStats;

    monsterStats =
      formulas.monsterStats;

    sellValue =
      formulas.towerSellValue;

    formulas.towerStats = function (
      tower,
      towerLevel
    ) {
      var stats = towerStats(
        tower,
        towerLevel
      );

      stats.damage = Math.round(
        stats.damage *
          (
            1 +
            level("towerDamage") *
              0.03
          )
      );

      return stats;
    };

    formulas.heroStats = function (
      hero,
      heroLevel
    ) {
      var stats = heroStats(
        hero,
        heroLevel
      );

      stats.damage = Math.round(
        stats.damage *
          (
            1 +
            level("heroDamage") *
              0.04
          )
      );

      return stats;
    };

    formulas.monsterStats = function (
      monster,
      waveId,
      hpScale,
      map
    ) {
      var stats = monsterStats(
        monster,
        waveId,
        hpScale,
        map
      );

      stats.gold = Math.round(
        stats.gold *
          (
            1 +
            level("goldGain") *
              0.02
          )
      );

      return stats;
    };

    formulas.towerSellValue = function (
      tower,
      towerLevel
    ) {
      return Math.floor(
        sellValue(
          tower,
          towerLevel
        ) *
          (
            1 +
            level("sellBonus") *
              0.03
          )
      );
    };

    formulas.__progressionPatched = true;
  }

  function patchState() {
    var newGame;
    var load;
    var save;
    var returnToMenu;
    var clearSave;

    if (State.__progressionPatched) {
      return;
    }

    newGame =
      State.newGame;

    load =
      State.load;

    save =
      State.save;

    returnToMenu =
      State.returnToMenu;

    clearSave =
      State.clearSave;

    State.newGame = function (mapId) {
      var current = newGame(mapId);

      current.gold +=
        level("startGold") * 12;

      current.baseHp +=
        level("baseHp");

      startRun(current);
      save();
      refreshUI();

      return current;
    };

    State.load = function () {
      var loaded = load();

      if (loaded) {
        restoreRun(
          State.get()
        );
      }

      return loaded;
    };

    State.save = function () {
      save();

      if (
        State.get().started &&
        activeRun
      ) {
        updateRun(
          State.get()
        );

        saveRun();
      }
    };

    State.returnToMenu = function () {
      clearRun();

      return returnToMenu();
    };

    State.clearSave = function () {
      clearRun();

      return clearSave();
    };

    State.__progressionPatched = true;
  }

  function startRun(current) {
    activeRun = {
      id:
        current.mapId +
        "_" +
        Date.now() +
        "_" +
        Math.floor(
          Math.random() * 100000
        ),

      mapId: current.mapId,
      startedAt: Date.now(),
      startBaseHp: current.baseHp,
      minBaseHp: current.baseHp,
      awarded: false,
      resultShown: false,
      eligibleForBestTime: true
    };

    saveRun();
  }

  function restoreRun(current) {
    var expectedHp;

    activeRun = loadRun();

    if (
      activeRun &&
      activeRun.mapId ===
        current.mapId
    ) {
      updateRun(current);
      return;
    }

    activeRun = null;

    if (
      current.status !== "playing"
    ) {
      return;
    }

    expectedHp =
      State.getMap().startBaseHp +
      level("baseHp");

    activeRun = {
      id:
        current.mapId +
        "_resume_" +
        Date.now(),

      mapId: current.mapId,
      startedAt: Date.now(),

      startBaseHp: Math.max(
        current.baseHp,
        expectedHp
      ),

      minBaseHp: current.baseHp,
      awarded: false,
      resultShown: false,
      eligibleForBestTime: false
    };

    saveRun();
  }

  function ensureRun(current) {
    if (
      current.started &&
      current.status === "playing" &&
      (
        !activeRun ||
        activeRun.mapId !==
          current.mapId
      )
    ) {
      restoreRun(current);
    }
  }

  function updateRun(current) {
    if (
      !activeRun ||
      activeRun.mapId !==
        current.mapId
    ) {
      return;
    }

    activeRun.minBaseHp = Math.min(
      activeRun.minBaseHp,
      Math.max(
        0,
        current.baseHp
      )
    );
  }

  function starsFor(current) {
    if (
      current.status !== "clear" ||
      !activeRun
    ) {
      return 0;
    }

    if (
      current.baseHp >=
      activeRun.startBaseHp
    ) {
      return 3;
    }

    if (
      current.baseHp >=
      Math.ceil(
        activeRun.startBaseHp *
          0.5
      )
    ) {
      return 2;
    }

    return 1;
  }

  function rewardFor(
    mapId,
    stars,
    previousStars,
    previousClears
  ) {
    var index = Math.max(
      0,
      Object.keys(
        Data.maps
      ).indexOf(mapId)
    );

    return (
      18 +
      index * 10 +
      stars * 9 +
      Math.max(
        0,
        stars - previousStars
      ) *
        12 +
      (
        previousClears === 0
          ? 20
          : 0
      )
    );
  }

  function finishRun(current) {
    var progress;
    var previousStars;
    var previousClears;
    var stars;
    var duration;
    var reward = 0;

    if (
      !activeRun ||
      activeRun.resultShown
    ) {
      return;
    }

    updateRun(current);

    progress = mapProgress(
      current.mapId
    );

    previousStars =
      progress.bestStars;

    previousClears =
      progress.clears;

    stars = starsFor(current);

    duration = Math.max(
      1,
      Math.floor(
        (
          Date.now() -
          activeRun.startedAt
        ) /
          1000
      )
    );

    progress.bestWave = Math.max(
      progress.bestWave,
      Math.min(
        current.currentWave,
        Data.waves.length
      )
    );

    if (
      current.status === "clear" &&
      !activeRun.awarded
    ) {
      reward = rewardFor(
        current.mapId,
        stars,
        previousStars,
        previousClears
      );

      profile.abyssStone += reward;
      profile.totalClears += 1;
      progress.clears += 1;

      progress.bestStars = Math.max(
        progress.bestStars,
        stars
      );

      progress.bestHp = Math.max(
        progress.bestHp,
        current.baseHp
      );

      if (
        activeRun.eligibleForBestTime &&
        (
          !progress.bestTime ||
          duration <
            progress.bestTime
        )
      ) {
        progress.bestTime =
          duration;
      }

      activeRun.awarded = true;

      saveProfile();
    }

    activeRun.resultShown = true;

    saveRun();

    showResult({
      status: current.status,
      mapId: current.mapId,
      mapName: State.getMap().name,
      stars: stars,
      reward: reward,
      duration: duration,
      baseHp: current.baseHp,

      startBaseHp:
        activeRun.startBaseHp,

      heroLevel:
        current.hero.level,

      wave: Math.min(
        current.currentWave,
        Data.waves.length
      ),

      relicCount:
        current.relics.length
    });

    refreshUI();
  }

  function init() {
    if (initialized) {
      return;
    }

    initialized = true;

    [
      "abyssStoneText",
      "openUpgradeBtn",
      "upgradeModal",
      "upgradeCurrencyText",
      "upgradeList",
      "upgradeMessage",
      "closeUpgradeBtn",
      "resultModal",
      "resultEyebrow",
      "resultTitle",
      "resultContent",
      "resultRetryBtn",
      "resultMapBtn"
    ].forEach(function (id) {
      el[id] =
        document.getElementById(id);
    });

    bindEvents();
    renderUpgrades();
    refreshUI();
    monitor();
  }

  function bindEvents() {
    el.openUpgradeBtn.addEventListener(
      "click",
      openUpgrades
    );

    el.closeUpgradeBtn.addEventListener(
      "click",
      closeUpgrades
    );

    el.resultRetryBtn.addEventListener(
      "click",
      retryMap
    );

    el.resultMapBtn.addEventListener(
      "click",
      returnToMaps
    );

    el.upgradeModal.addEventListener(
      "click",
      function (event) {
        if (
          event.target ===
          el.upgradeModal
        ) {
          closeUpgrades();
        }
      }
    );

    document.addEventListener(
      "keydown",
      function (event) {
        if (
          event.key === "Escape"
        ) {
          closeUpgrades();
        }
      }
    );
  }

  function openUpgrades() {
    renderUpgrades();
    setMessage("");

    el.upgradeModal.classList.add(
      "is-visible"
    );
  }

  function closeUpgrades() {
    if (el.upgradeModal) {
      el.upgradeModal.classList.remove(
        "is-visible"
      );
    }
  }

  function renderUpgrades() {
    if (!el.upgradeList) {
      return;
    }

    el.upgradeList.innerHTML = "";

    upgrades.forEach(
      function (item) {
        var currentLevel =
          level(item.id);

        var maxed =
          currentLevel >= item.max;

        var cost =
          maxed
            ? 0
            : item.costs[
                currentLevel
              ];

        var card =
          document.createElement(
            "article"
          );

        var dots = "";
        var index;

        for (
          index = 0;
          index < item.max;
          index += 1
        ) {
          dots +=
            '<i class="' +
            (
              index < currentLevel
                ? "is-filled"
                : ""
            ) +
            '"></i>';
        }

        card.className =
          "upgrade-item";

        card.innerHTML =
          '<div class="upgrade-copy">' +
          "<strong>" +
          escapeHtml(item.name) +
          "</strong>" +
          "<span>" +
          escapeHtml(item.desc) +
          "</span>" +
          "<small>" +
          escapeHtml(item.value) +
          "</small>" +
          "</div>" +
          '<div class="upgrade-level">' +
          dots +
          "</div>" +
          '<button class="upgrade-buy-btn" type="button" data-id="' +
          item.id +
          '"' +
          (
            maxed ||
            profile.abyssStone < cost
              ? " disabled"
              : ""
          ) +
          ">" +
          (
            maxed
              ? "MAX"
              : cost + " ◆"
          ) +
          "</button>";

        el.upgradeList.appendChild(
          card
        );
      }
    );

    Array.from(
      el.upgradeList.querySelectorAll(
        ".upgrade-buy-btn"
      )
    ).forEach(
      function (button) {
        button.addEventListener(
          "click",
          function () {
            buyUpgrade(
              button.dataset.id
            );
          }
        );
      }
    );

    updateCurrency();
  }

  function buyUpgrade(id) {
    var item =
      upgradeById(id);

    var currentLevel;
    var cost;

    if (!item) {
      return;
    }

    currentLevel =
      level(id);

    if (
      currentLevel >=
      item.max
    ) {
      return;
    }

    cost =
      item.costs[currentLevel];

    if (
      profile.abyssStone < cost
    ) {
      setMessage(
        "심연석이 부족합니다."
      );

      return;
    }

    profile.abyssStone -= cost;

    profile.upgrades[id] =
      currentLevel + 1;

    saveProfile();

    setMessage(
      item.name +
        " Lv." +
        (
          currentLevel + 1
        ) +
        " 강화 완료"
    );

    renderUpgrades();
    refreshUI();
  }

  function setMessage(message) {
    if (el.upgradeMessage) {
      el.upgradeMessage.textContent =
        message;
    }
  }

  function updateCurrency() {
    if (el.abyssStoneText) {
      el.abyssStoneText.textContent =
        profile.abyssStone;
    }

    if (el.upgradeCurrencyText) {
      el.upgradeCurrencyText.textContent =
        profile.abyssStone;
    }
  }

  function refreshMapCards() {
    var cards = Array.from(
      document.querySelectorAll(
        ".map-select-card"
      )
    );

    var mapIds =
      Object.keys(Data.maps);

    cards.forEach(
      function (card, index) {
        var mapId =
          mapIds[index];

        var progress;
        var meta;

        if (!mapId) {
          return;
        }

        progress =
          mapProgress(mapId);

        card.dataset.mapId =
          mapId;

        meta =
          card.querySelector(
            ".progress-map-meta"
          );

        if (!meta) {
          meta =
            document.createElement(
              "div"
            );

          meta.className =
            "progress-map-meta";

          card.appendChild(meta);
        }

        meta.innerHTML =
          '<span class="progress-stars">' +
          renderStars(
            progress.bestStars
          ) +
          "</span>" +
          '<span class="progress-map-record">' +
          (
            progress.clears
              ? "클리어 " +
                progress.clears +
                "회"
              : "미클리어"
          ) +
          " · 최고 Wave " +
          progress.bestWave +
          "</span>";
      }
    );
  }

  function refreshUI() {
    updateCurrency();
    refreshMapCards();
  }

  function showResult(result) {
    var cleared =
      result.status === "clear";

    el.resultEyebrow.textContent =
      cleared
        ? "STAGE CLEAR"
        : "DEFENSE FAILED";

    el.resultTitle.textContent =
      result.mapName +
      (
        cleared
          ? " 방어 성공"
          : " 방어 실패"
      );

    el.resultContent.innerHTML =
      '<div class="result-stars">' +
      renderStars(result.stars) +
      "</div>" +
      '<div class="result-grid">' +
      "<span>도달 웨이브</span>" +
      "<strong>" +
      result.wave +
      " / " +
      Data.waves.length +
      "</strong>" +
      "<span>남은 Base HP</span>" +
      "<strong>" +
      result.baseHp +
      " / " +
      result.startBaseHp +
      "</strong>" +
      "<span>히어로 레벨</span>" +
      "<strong>Lv." +
      result.heroLevel +
      "</strong>" +
      "<span>보유 유물</span>" +
      "<strong>" +
      result.relicCount +
      "개</strong>" +
      "<span>플레이 시간</span>" +
      "<strong>" +
      formatTime(
        result.duration
      ) +
      "</strong>" +
      "</div>" +
      '<div class="result-reward ' +
      (
        cleared
          ? "is-clear"
          : ""
      ) +
      '">' +
      (
        cleared
          ? "심연석 <strong>+" +
            result.reward +
            " ◆</strong>"
          : "클리어 보상이 없습니다."
      ) +
      "</div>";

    el.resultRetryBtn.dataset.mapId =
      result.mapId;

    el.resultModal.classList.add(
      "is-visible"
    );
  }

  function hideResult() {
    if (el.resultModal) {
      el.resultModal.classList.remove(
        "is-visible"
      );
    }
  }

  function retryMap() {
    var mapId =
      el.resultRetryBtn.dataset.mapId;

    var startScreen =
      document.getElementById(
        "startScreen"
      );

    hideResult();
    State.newGame(mapId);

    if (startScreen) {
      startScreen.classList.add(
        "is-hidden"
      );
    }

    refreshGameScreen();
  }

  function returnToMaps() {
    var startScreen =
      document.getElementById(
        "startScreen"
      );

    hideResult();
    State.returnToMenu();

    if (startScreen) {
      startScreen.classList.remove(
        "is-hidden"
      );
    }

    refreshGameScreen();
    refreshUI();
  }

  function refreshGameScreen() {
    if (
      window.Abyss.Render &&
      window.Abyss.Render.resize
    ) {
      window.Abyss.Render.resize();
    }

    if (
      window.Abyss.UI &&
      window.Abyss.UI.updateAll
    ) {
      window.Abyss.UI.updateAll();
    }
  }

  function monitor() {
    var current =
      State.get();

    var now =
      Date.now();

    if (
      current &&
      current.started
    ) {
      ensureRun(current);
      updateRun(current);

      if (
        activeRun &&
        current.status ===
          "playing" &&
        now - lastRunSave >=
          SAVE_INTERVAL
      ) {
        saveRun();
      }

      if (
        activeRun &&
        !activeRun.resultShown &&
        (
          current.status ===
            "clear" ||
          current.status ===
            "gameOver"
        ) &&
        !State.isBlockingModal()
      ) {
        finishRun(current);
      }
    }

    frameId =
      window.requestAnimationFrame(
        monitor
      );
  }

  function renderStars(count) {
    var result = "";
    var index;

    for (
      index = 1;
      index <= 3;
      index += 1
    ) {
      result +=
        index <= count
          ? "★"
          : "☆";
    }

    return result;
  }

  function formatTime(seconds) {
    return (
      Math.floor(
        seconds / 60
      ) +
      ":" +
      String(
        seconds % 60
      ).padStart(
        2,
        "0"
      )
    );
  }

  function escapeHtml(value) {
    return String(value)
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }

  function safeInt(
    value,
    fallback
  ) {
    var number =
      Number(value);

    return Number.isFinite(number)
      ? Math.max(
          0,
          Math.floor(number)
        )
      : fallback;
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

  window.Abyss.Progression = {
    init: init,
    refreshUI: refreshUI,

    getProfile: function () {
      return profile;
    },

    getUpgradeLevel: level,
    openUpgradeModal: openUpgrades,

    destroy: function () {
      if (frameId) {
        window.cancelAnimationFrame(
          frameId
        );
      }
    }
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    window.setTimeout(
      init,
      0
    );
  }
}());
