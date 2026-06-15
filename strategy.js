(function () {
  "use strict";

  window.Abyss = window.Abyss || {};

  var Data = window.Abyss.Data;
  var State = window.Abyss.State;
  var STORAGE_KEY = "abyssDefense_v095_strategy";
  var SWITCH_COOLDOWN = 8;
  var initialized = false;
  var frameId = 0;
  var lastTime = 0;
  var switchCooldown = 0;
  var bannerTimer = 0;
  var lastCooldownLabel = "";
  var el = {};

  var doctrines = [
    {
      id: "balanced",
      name: "균형 전술",
      shortName: "균형",
      icon: "◎",
      description: "능력치 변화 없이 안정적으로 운용합니다.",
      damage: 1,
      interval: 1,
      range: 1
    },
    {
      id: "focus",
      name: "집중 화력",
      shortName: "화력",
      icon: "◆",
      description: "공격력 +15%, 공격속도 -9%, 사거리 -4%.",
      damage: 1.15,
      interval: 1.1,
      range: 0.96
    },
    {
      id: "barrage",
      name: "속사 탄막",
      shortName: "속사",
      icon: "≫",
      description: "공격속도 +22%, 공격력 -10%.",
      damage: 0.9,
      interval: 0.82,
      range: 1
    },
    {
      id: "reach",
      name: "장거리 지원",
      shortName: "장거리",
      icon: "⌖",
      description: "사거리 +16%, 공격력 -8%, 공격속도 -4%.",
      damage: 0.92,
      interval: 1.04,
      range: 1.16
    }
  ];

  if (!Data || !State) {
    throw new Error(
      "strategy.js: data.js와 state.js가 먼저 로드되어야 합니다."
    );
  }

  var config = loadConfig();

  Data.version = "0.9.5";

  patchTowerStats();

  function defaultConfig() {
    return {
      version: 1,
      doctrine: "balanced",
      totalSwitches: 0
    };
  }

  function loadConfig() {
    var result = defaultConfig();

    try {
      var raw = localStorage.getItem(
        STORAGE_KEY
      );

      var saved = raw
        ? JSON.parse(raw)
        : null;

      if (
        saved &&
        doctrineById(saved.doctrine)
      ) {
        result.doctrine =
          saved.doctrine;
      }

      if (
        saved &&
        Number.isFinite(
          Number(saved.totalSwitches)
        )
      ) {
        result.totalSwitches =
          Math.max(
            0,
            Math.floor(
              Number(
                saved.totalSwitches
              )
            )
          );
      }
    } catch (error) {
      console.error(
        "전투 교리 설정 로드 실패:",
        error
      );
    }

    return result;
  }

  function saveConfig() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(config)
      );
    } catch (error) {
      console.error(
        "전투 교리 설정 저장 실패:",
        error
      );
    }
  }

  function doctrineById(id) {
    return (
      doctrines.find(
        function (item) {
          return item.id === id;
        }
      ) || null
    );
  }

  function currentDoctrine() {
    return (
      doctrineById(
        config.doctrine
      ) || doctrines[0]
    );
  }

  function patchTowerStats() {
    var formulas = Data.formulas;

    if (
      !formulas ||
      formulas.__strategyPatched
    ) {
      return;
    }

    var original =
      formulas.towerStats;

    if (
      typeof original !==
      "function"
    ) {
      throw new Error(
        "strategy.js: towerStats 공식을 찾을 수 없습니다."
      );
    }

    formulas.towerStats = function (
      tower,
      towerLevel
    ) {
      var stats = original(
        tower,
        towerLevel
      );

      var doctrine =
        currentDoctrine();

      if (
        !stats ||
        typeof stats !== "object"
      ) {
        return stats;
      }

      if (
        Number.isFinite(
          Number(stats.damage)
        )
      ) {
        stats.damage = Math.max(
          1,
          Math.round(
            Number(stats.damage) *
              doctrine.damage
          )
        );
      }

      if (
        Number.isFinite(
          Number(stats.range)
        )
      ) {
        stats.range = roundTo(
          Math.max(
            1,
            Number(stats.range) *
              doctrine.range
          ),
          2
        );
      }

      if (
        Number.isFinite(
          Number(
            stats.attackInterval
          )
        )
      ) {
        stats.attackInterval =
          roundTo(
            Math.max(
              0.2,
              Number(
                stats.attackInterval
              ) *
                doctrine.interval
            ),
            3
          );
      }

      return stats;
    };

    formulas.__strategyPatched = true;
  }

  function roundTo(
    value,
    digits
  ) {
    var scale = Math.pow(
      10,
      digits
    );

    return (
      Math.round(value * scale) /
      scale
    );
  }

  function init() {
    if (initialized) {
      refreshUI();
      return;
    }

    initialized = true;

    createInterface();
    cacheElements();
    bindEvents();
    renderDoctrineOptions();
    refreshUI();

    frameId =
      window.requestAnimationFrame(
        monitor
      );
  }

  function createInterface() {
    var layer =
      document.createElement(
        "div"
      );

    layer.id = "strategyLayer";
    layer.className =
      "strategy-layer";

    layer.innerHTML =
      '<button id="strategyToggleBtn" class="strategy-toggle" type="button" aria-label="전투 교리 열기">' +
        "<span>전투 교리</span>" +
        '<strong id="strategyToggleText">균형</strong>' +
      "</button>" +

      '<div id="strategyDoctrineModal" class="strategy-doctrine-modal" role="dialog" aria-modal="true" aria-hidden="true">' +
        '<section class="strategy-doctrine-card">' +
          '<div class="strategy-doctrine-head">' +
            "<div>" +
              '<p class="strategy-eyebrow">BATTLE DOCTRINE</p>' +
              "<h2>전투 교리</h2>" +
            "</div>" +

            '<button id="strategyCloseBtn" class="strategy-close" type="button" aria-label="닫기">×</button>' +
          "</div>" +

          '<p class="strategy-guide">' +
            "모든 타워에 즉시 적용됩니다. 전투 중 변경 후 8초 동안 다시 변경할 수 없습니다." +
          "</p>" +

          '<div id="strategyDoctrineOptions" class="strategy-doctrine-options"></div>' +

          '<p id="strategyCooldownText" class="strategy-cooldown-text"></p>' +
        "</section>" +
      "</div>" +

      '<div id="bossSkillBanner" class="boss-skill-banner" role="status" aria-live="polite">' +
        '<span id="bossSkillTitle">보스 패턴</span>' +
        '<strong id="bossSkillDetail"></strong>' +
      "</div>";

    document.body.appendChild(
      layer
    );
  }

  function cacheElements() {
    [
      "strategyToggleBtn",
      "strategyToggleText",
      "strategyDoctrineModal",
      "strategyCloseBtn",
      "strategyDoctrineOptions",
      "strategyCooldownText",
      "bossSkillBanner",
      "bossSkillTitle",
      "bossSkillDetail"
    ].forEach(function (id) {
      el[id] =
        document.getElementById(id);
    });
  }

  function bindEvents() {
    el.strategyToggleBtn
      .addEventListener(
        "click",
        openDoctrineModal
      );

    el.strategyCloseBtn
      .addEventListener(
        "click",
        closeDoctrineModal
      );

    el.strategyDoctrineModal
      .addEventListener(
        "click",
        function (event) {
          if (
            event.target ===
            el.strategyDoctrineModal
          ) {
            closeDoctrineModal();
          }
        }
      );

    document.addEventListener(
      "keydown",
      function (event) {
        if (
          event.key === "Escape" &&
          isDoctrineModalOpen()
        ) {
          closeDoctrineModal();
        }
      }
    );
  }

  function renderDoctrineOptions() {
    el.strategyDoctrineOptions
      .innerHTML = "";

    doctrines.forEach(
      function (item) {
        var button =
          document.createElement(
            "button"
          );

        button.type = "button";
        button.className =
          "strategy-doctrine-option";

        button.dataset.doctrine =
          item.id;

        button.innerHTML =
          '<span class="strategy-doctrine-icon">' +
            escapeHtml(item.icon) +
          "</span>" +

          '<span class="strategy-doctrine-copy">' +
            "<strong>" +
              escapeHtml(item.name) +
            "</strong>" +

            "<small>" +
              escapeHtml(
                item.description
              ) +
            "</small>" +
          "</span>" +

          '<span class="strategy-doctrine-check">✓</span>';

        button.addEventListener(
          "click",
          function () {
            selectDoctrine(
              item.id
            );
          }
        );

        el.strategyDoctrineOptions
          .appendChild(button);
      }
    );
  }

  function selectDoctrine(id) {
    var doctrine =
      doctrineById(id);

    var current =
      State.get();

    if (!doctrine) {
      return;
    }

    if (
      id === config.doctrine
    ) {
      closeDoctrineModal();
      return;
    }

    if (
      switchCooldown > 0
    ) {
      notify(
        "교리 재정비까지 " +
          Math.ceil(
            switchCooldown
          ) +
          "초 남았습니다."
      );

      refreshUI();
      return;
    }

    config.doctrine = id;
    config.totalSwitches += 1;

    saveConfig();

    if (
      current &&
      current.started &&
      current.status === "playing"
    ) {
      switchCooldown =
        SWITCH_COOLDOWN;
    }

    notify(
      "전투 교리 변경: " +
        doctrine.name
    );

    showBanner(
      "전투 교리 변경",
      doctrine.name,
      1.4
    );

    refreshUI();
    refreshGameUI();
    closeDoctrineModal();
  }

  function openDoctrineModal() {
    refreshUI();

    el.strategyDoctrineModal
      .classList.add(
        "is-visible"
      );

    el.strategyDoctrineModal
      .setAttribute(
        "aria-hidden",
        "false"
      );
  }

  function closeDoctrineModal() {
    if (
      !el.strategyDoctrineModal
    ) {
      return;
    }

    el.strategyDoctrineModal
      .classList.remove(
        "is-visible"
      );

    el.strategyDoctrineModal
      .setAttribute(
        "aria-hidden",
        "true"
      );
  }

  function isDoctrineModalOpen() {
    return !!(
      el.strategyDoctrineModal &&
      el.strategyDoctrineModal
        .classList.contains(
          "is-visible"
        )
    );
  }

  function refreshUI() {
    if (!initialized) {
      return;
    }

    var doctrine =
      currentDoctrine();

    var buttons =
      Array.from(
        el.strategyDoctrineOptions
          .querySelectorAll(
            ".strategy-doctrine-option"
          )
      );

    el.strategyToggleText
      .textContent =
        doctrine.shortName;

    el.strategyToggleBtn
      .dataset.doctrine =
        doctrine.id;

    buttons.forEach(
      function (button) {
        var active =
          button.dataset.doctrine ===
          doctrine.id;

        button.classList.toggle(
          "is-active",
          active
        );

        button.disabled =
          !active &&
          switchCooldown > 0;
      }
    );

    updateCooldownLabel();
  }

  function updateCooldownLabel() {
    if (!initialized) {
      return;
    }

    var label =
      switchCooldown > 0
        ? "교리 재정비 " +
          Math.ceil(
            switchCooldown
          ) +
          "초"
        : "교리 변경 가능";

    if (
      label ===
      lastCooldownLabel
    ) {
      return;
    }

    lastCooldownLabel = label;

    el.strategyCooldownText
      .textContent = label;

    el.strategyCooldownText
      .classList.toggle(
        "is-ready",
        switchCooldown <= 0
      );
  }

  function refreshGameUI() {
    if (
      window.Abyss.UI &&
      typeof window.Abyss.UI
        .updateAll === "function"
    ) {
      window.Abyss.UI.updateAll();
    }
  }

  function notify(message) {
    if (
      window.Abyss.UI &&
      typeof window.Abyss.UI
        .showToast === "function"
    ) {
      window.Abyss.UI
        .showToast(message);
    } else {
      console.log(
        "[Abyss] " + message
      );
    }
  }

  function monitor(time) {
    if (!lastTime) {
      lastTime = time;
    }

    var dt = Math.min(
      0.08,
      Math.max(
        0,
        (
          time - lastTime
        ) / 1000
      )
    );

    var current =
      State.get();

    var activeDt = 0;

    lastTime = time;

    if (
      current &&
      current.started &&
      current.status ===
        "playing" &&
      !current.paused &&
      !State.isBlockingModal()
    ) {
      activeDt =
        dt *
        Math.max(
          1,
          Number(
            current.speed
          ) || 1
        );

      updateBossPatterns(
        current,
        activeDt
      );
    }

    if (
      activeDt > 0 &&
      switchCooldown > 0
    ) {
      switchCooldown =
        Math.max(
          0,
          switchCooldown -
            activeDt
        );

      updateCooldownLabel();

      if (
        switchCooldown === 0
      ) {
        refreshUI();
      }
    }

    updateBanner(dt);

    frameId =
      window.requestAnimationFrame(
        monitor
      );
  }

  function updateBossPatterns(
    current,
    dt
  ) {
    current.enemies.forEach(
      function (enemy) {
        if (
          !enemy ||
          enemy.dead ||
          enemy.escaped ||
          !enemy.boss
        ) {
          return;
        }

        if (
          !enemy._strategyPattern
        ) {
          initializeBossPattern(
            current,
            enemy
          );
        }

        if (
          enemy.type ===
          "bossGolem"
        ) {
          updateGolemPattern(
            current,
            enemy,
            dt
          );
        } else if (
          enemy.type ===
          "abyssLord"
        ) {
          updateAbyssLordPattern(
            current,
            enemy,
            dt
          );
        }
      }
    );
  }

  function initializeBossPattern(
    current,
    enemy
  ) {
    var isLord =
      enemy.type ===
      "abyssLord";

    enemy._strategyPattern = {
      timer: isLord
        ? 5.5
        : 6.5,

      phase: 0,
      enraged: false
    };

    showBanner(
      isLord
        ? "심연 군주 출현"
        : "수문장 골렘 출현",

      isLord
        ? "암흑 의식을 저지하십시오."
        : "주기적으로 석갑 방벽을 재생합니다.",

      isLord
        ? 2.1
        : 1.9
    );

    current.screenShake =
      Math.max(
        Number(
          current.screenShake
        ) || 0,
        0.22
      );
  }

  function updateGolemPattern(
    current,
    enemy,
    dt
  ) {
    var pattern =
      enemy._strategyPattern;

    var hpRatio =
      enemy.maxHp > 0
        ? enemy.hp /
          enemy.maxHp
        : 0;

    if (
      !pattern.enraged &&
      hpRatio <= 0.5
    ) {
      pattern.enraged = true;
      enemy.speed *= 1.25;

      showBanner(
        "골렘 격노",
        "이동속도가 크게 증가합니다.",
        1.6
      );
    }

    pattern.timer -= dt;

    if (
      pattern.timer <= 0
    ) {
      pattern.timer = 8.5;

      castStoneBarrier(
        current,
        enemy
      );
    }
  }

  function castStoneBarrier(
    current,
    enemy
  ) {
    var gain =
      Math.max(
        1,
        Math.round(
          enemy.maxHp * 0.07
        )
      );

    var cap =
      Math.max(
        gain,
        Math.round(
          enemy.maxHp * 0.35
        )
      );

    enemy.shield =
      Math.min(
        cap,
        Math.max(
          0,
          Number(
            enemy.shield
          ) || 0
        ) + gain
      );

    enemy.maxShield =
      Math.max(
        Number(
          enemy.maxShield
        ) || 0,
        enemy.shield
      );

    current.screenShake =
      Math.max(
        Number(
          current.screenShake
        ) || 0,
        0.16
      );

    showBanner(
      "석갑 방벽",
      "수문장 골렘이 보호막을 회복했습니다.",
      1.5
    );
  }

  function updateAbyssLordPattern(
    current,
    enemy,
    dt
  ) {
    var pattern =
      enemy._strategyPattern;

    var hpRatio =
      enemy.maxHp > 0
        ? enemy.hp /
          enemy.maxHp
        : 0;

    if (
      !pattern.enraged &&
      hpRatio <= 0.3
    ) {
      pattern.enraged = true;
      enemy.speed *= 1.2;

      addShield(
        enemy,
        Math.round(
          enemy.maxHp * 0.12
        ),
        0.42
      );

      showBanner(
        "심연 해방",
        "군주가 가속하고 대형 보호막을 전개합니다.",
        1.9
      );
    }

    pattern.timer -= dt;

    if (
      pattern.timer <= 0
    ) {
      pattern.timer = 8;

      if (
        pattern.phase % 2 === 0
      ) {
        castDarkRitual(
          current,
          enemy
        );
      } else {
        castTowerSeal(
          current
        );
      }

      pattern.phase += 1;
    }
  }

  function castDarkRitual(
    current,
    boss
  ) {
    current.enemies.forEach(
      function (enemy) {
        if (
          !enemy ||
          enemy.dead ||
          enemy.escaped
        ) {
          return;
        }

        var heal =
          Math.max(
            1,
            Math.round(
              enemy.maxHp *
                0.035
            )
          );

        enemy.hp =
          Math.min(
            enemy.maxHp,
            enemy.hp + heal
          );
      }
    );

    addShield(
      boss,
      Math.round(
        boss.maxHp * 0.06
      ),
      0.4
    );

    showBanner(
      "암흑 의식",
      "모든 적이 체력을 회복했습니다.",
      1.65
    );
  }

  function castTowerSeal(
    current
  ) {
    var affected = 0;

    current.towers.forEach(
      function (tower) {
        if (!tower) {
          return;
        }

        tower.cooldown =
          Math.max(
            Number(
              tower.cooldown
            ) || 0,
            1.45
          );

        affected += 1;
      }
    );

    current.screenShake =
      Math.max(
        Number(
          current.screenShake
        ) || 0,
        0.28
      );

    showBanner(
      "타워 봉인",

      affected > 0
        ? "모든 타워의 공격이 잠시 지연됩니다."
        : "봉인할 타워가 없습니다.",

      1.65
    );
  }

  function addShield(
    enemy,
    amount,
    capRatio
  ) {
    var cap =
      Math.max(
        1,
        Math.round(
          enemy.maxHp *
            capRatio
        )
      );

    enemy.shield =
      Math.min(
        cap,
        Math.max(
          0,
          Number(
            enemy.shield
          ) || 0
        ) +
          Math.max(
            0,
            amount
          )
      );

    enemy.maxShield =
      Math.max(
        Number(
          enemy.maxShield
        ) || 0,
        enemy.shield
      );
  }

  function showBanner(
    title,
    detail,
    durationSeconds
  ) {
    if (!initialized) {
      return;
    }

    el.bossSkillTitle
      .textContent = title;

    el.bossSkillDetail
      .textContent = detail;

    bannerTimer =
      Math.max(
        0.6,
        Number(
          durationSeconds
        ) || 1.5
      );

    el.bossSkillBanner
      .classList.remove(
        "is-visible"
      );

    void el.bossSkillBanner
      .offsetWidth;

    el.bossSkillBanner
      .classList.add(
        "is-visible"
      );
  }

  function updateBanner(dt) {
    if (
      bannerTimer <= 0
    ) {
      return;
    }

    bannerTimer =
      Math.max(
        0,
        bannerTimer - dt
      );

    if (
      bannerTimer === 0 &&
      el.bossSkillBanner
    ) {
      el.bossSkillBanner
        .classList.remove(
          "is-visible"
        );
    }
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

  function destroy() {
    var layer =
      document.getElementById(
        "strategyLayer"
      );

    if (frameId) {
      window.cancelAnimationFrame(
        frameId
      );
    }

    if (layer) {
      layer.remove();
    }

    initialized = false;
    frameId = 0;
    lastTime = 0;
  }

  window.Abyss.Strategy = {
    init: init,
    destroy: destroy,
    refreshUI: refreshUI,
    openDoctrineModal:
      openDoctrineModal,

    getDoctrine:
      currentDoctrine,

    getConfig: function () {
      return config;
    }
  };
}());
