(function () {
  "use strict";

  window.Abyss = window.Abyss || {};

  var Data = window.Abyss.Data;
  var State = window.Abyss.State;
  var Combat = window.Abyss.Combat;
  var Render = window.Abyss.Render;

  var el = {};
  var sheetAutoPaused = false;

  if (!Data || !State || !Combat || !Render) {
    throw new Error(
      "ui.js: 앞선 JavaScript 파일이 모두 로드되어야 합니다."
    );
  }

  function init() {
    cacheElements();
    buildMapCards();
    buildTowerQuickBar();
    bindEvents();

    if (State.get().started) {
      hideStartScreen();
    } else {
      showStartScreen();
    }

    updateAll();
  }

  function cacheElements() {
    el.startScreen =
      document.getElementById("startScreen");

    el.mapCards =
      document.getElementById("mapCards");

    el.mapName =
      document.getElementById("mapNameText");

    el.gold =
      document.getElementById("goldText");

    el.baseHp =
      document.getElementById("baseHpText");

    el.wave =
      document.getElementById("waveText");

    el.status =
      document.getElementById("statusText");

    el.canvas =
      document.getElementById("gameCanvas");

    el.actionMenu =
      document.getElementById("towerActionMenu");

    el.waveOverlay =
      document.getElementById("waveOverlayButton");

    el.waveOverlayTitle =
      document.getElementById("waveOverlayTitle");

    el.waveOverlayName =
      document.getElementById("waveOverlayName");

    el.waveOverlayHint =
      document.getElementById("waveOverlayHint");

    el.toast =
      document.getElementById("toast");

    el.towerQuickBar =
      document.getElementById("towerQuickBar");

    el.cancelBuild =
      document.getElementById("cancelBuildBtn");

    el.startWave =
      document.getElementById("startWaveBtn");

    el.heroSkill =
      document.getElementById("heroSkillBtn");

    el.speed =
      document.getElementById("speedBtn");

    el.pause =
      document.getElementById("pauseBtn");

    el.info =
      document.getElementById("infoBtn");

    el.sheetBackdrop =
      document.getElementById("sheetBackdrop");

    el.bottomSheet =
      document.getElementById("bottomSheet");

    el.sheetContent =
      document.getElementById("sheetContent");

    el.sheetTabs =
      Array.from(
        document.querySelectorAll(".sheet-tab")
      );

    el.traitModal =
      document.getElementById("traitModal");

    el.traitModalTitle =
      document.getElementById("traitModalTitle");

    el.traitModalDesc =
      document.getElementById("traitModalDesc");

    el.traitOptions =
      document.getElementById("traitOptions");

    el.relicModal =
      document.getElementById("relicModal");

    el.relicOptions =
      document.getElementById("relicOptions");
  }

  function buildMapCards() {
    el.mapCards.innerHTML = "";

    Object.keys(Data.maps).forEach(
      function (mapId) {
        var map =
          Data.maps[mapId];

        var button =
          document.createElement("button");

        button.className =
          "map-select-card";

        button.type =
          "button";

        button.innerHTML =
          "<strong>" +
          map.name +
          "</strong>" +

          "<em>" +
          map.difficulty +
          "</em>" +

          "<span>" +
          map.description +
          "<br>" +

          "시작 골드 " +
          map.startGold +

          " · Base HP " +
          map.startBaseHp +
          "</span>";

        button.addEventListener(
          "click",
          function () {
            beginNewGame(map.id);
          }
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

    Object.keys(Data.towers).forEach(
      function (type) {
        var tower =
          Data.towers[type];

        var button =
          document.createElement("button");

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
          tower.name +
          ": " +
          tower.description;

        button.innerHTML =
          '<span class="tower-quick-symbol">' +
          tower.symbol +
          "</span>" +

          '<span class="tower-quick-price">' +
          tower.cost +
          "G</span>";

        button.addEventListener(
          "click",
          function () {
            Combat.toggleBuildType(
              tower.id
            );
          }
        );

        el.towerQuickBar.appendChild(
          button
        );
      }
    );
  }

  function bindEvents() {
    window.addEventListener(
      "resize",
      Render.resize
    );

    window.addEventListener(
      "orientationchange",
      function () {
        window.setTimeout(
          Render.resize,
          120
        );
      }
    );

    document.addEventListener(
      "visibilitychange",
      function () {
        var current =
          State.get();

        if (
          document.hidden &&
          current.started &&
          current.status === "playing"
        ) {
          current.paused = true;

          State.save();
          updateAll();
        }
      }
    );

    el.canvas.addEventListener(
      "pointerdown",
      onCanvasPointerDown
    );

    el.waveOverlay.addEventListener(
      "click",
      Combat.startWave
    );

    el.startWave.addEventListener(
      "click",
      Combat.startWave
    );

    el.heroSkill.addEventListener(
      "click",
      Combat.useHeroSkill
    );

    el.cancelBuild.addEventListener(
      "click",
      Combat.cancelSelection
    );

    el.speed.addEventListener(
      "click",
      Combat.toggleSpeed
    );

    el.pause.addEventListener(
      "click",
      Combat.togglePause
    );

    el.info.addEventListener(
      "click",
      function () {
        if (State.get().sheetOpen) {
          closeBottomSheet();
        } else {
          openBottomSheet(
            State.get().sheetTab ||
            "wave"
          );
        }
      }
    );

    el.sheetBackdrop.addEventListener(
      "click",
      function () {
        closeBottomSheet();
      }
    );

    el.sheetTabs.forEach(
      function (tab) {
        tab.addEventListener(
          "click",
          function () {
            State.get().sheetTab =
              tab.dataset.tab;

            renderSheet();
          }
        );
      }
    );
  }

  function beginNewGame(mapId) {
    State.newGame(mapId);

    closeBottomSheet(false);
    closeAllModals();
    hideStartScreen();

    Render.resize();
    updateAll();

    showToast(
      State.getMap().name +
      " 시작"
    );
  }

  function returnToMapSelect() {
    State.returnToMenu();

    closeBottomSheet(false);
    closeAllModals();
    showStartScreen();

    Render.resize();
    updateAll();
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

  function onCanvasPointerDown(event) {
    var current =
      State.get();

    var cell;
    var tower;

    event.preventDefault();

    if (
      !current.started ||
      current.sheetOpen ||
      State.isBlockingModal()
    ) {
      return;
    }

    cell = Render.screenToCell(
      event.clientX,
      event.clientY
    );

    if (!cell) {
      Combat.cancelSelection();
      return;
    }

    tower = State.getTowerAt(
      cell.col,
      cell.row
    );

    if (tower) {
      Combat.selectTower(
        tower.id
      );

      return;
    }

    if (current.selectedBuildType) {
      Combat.placeTower(
        cell.col,
        cell.row
      );

      return;
    }

    current.selectedTowerId =
      null;

    updateAll();
  }

  function openBottomSheet(tabName) {
    var current =
      State.get();

    if (
      !current.started ||
      State.isBlockingModal()
    ) {
      return;
    }

    current.sheetTab =
      tabName ||
      "wave";

    current.sheetOpen =
      true;

    if (
      !current.paused &&
      current.status === "playing"
    ) {
      current.paused = true;
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
    updateAll();
  }

  function closeBottomSheet(restorePause) {
    var current =
      State.get();

    var shouldRestore =
      restorePause !== false;

    current.sheetOpen =
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
      current.status === "playing"
    ) {
      current.paused = false;
    }

    sheetAutoPaused =
      false;

    updateAll();
  }

  function renderSheet() {
    var tabName =
      State.get().sheetTab;

    el.sheetTabs.forEach(
      function (tab) {
        tab.classList.toggle(
          "is-active",
          tab.dataset.tab === tabName
        );
      }
    );

    if (tabName === "hero") {
      renderHeroSheet();
    } else if (
      tabName === "relic"
    ) {
      renderRelicSheet();
    } else if (
      tabName === "settings"
    ) {
      renderSettingsSheet();
    } else {
      renderWaveSheet();
    }
  }

  function renderWaveSheet() {
    var current =
      State.get();

    var wave =
      Data.waves[
        current.currentWave - 1
      ];

    var groups;
    var tags;

    if (
      !wave ||
      current.status === "clear"
    ) {
      el.sheetContent.innerHTML =
        '<div class="info-card">' +
        "<h3>웨이브</h3>" +
        '<div class="info-list">' +
        "모든 웨이브를 완료했습니다." +
        "</div></div>";

      return;
    }

    groups = wave.groups.map(
      function (group) {
        var monster =
          Data.monsters[
            group.type
          ];

        var labels =
          Combat.getMonsterTraitLabels(
            monster
          );

        return (
          "<div><b>" +
          monster.name +
          "</b> × " +
          group.count +

          (
            labels.length
              ? " · " +
                labels.join(", ")
              : ""
          ) +

          "</div>"
        );
      }
    ).join("");

    tags =
      Combat.collectWaveTraits(
        wave
      ).map(
        function (traitId) {
          var trait =
            Data.monsterTraits[
              traitId
            ];

          return (
            '<span class="tag">' +
            (
              trait
                ? trait.symbol
                : traitId
            ) +
            "</span>"
          );
        }
      ).join("");

    el.sheetContent.innerHTML =
      '<div class="info-card">' +
      "<h3>다음 웨이브</h3>" +

      '<div class="info-grid">' +

      "<span>맵</span>" +
      "<strong>" +
      State.getMap().name +
      "</strong>" +

      "<span>Wave</span>" +
      "<strong>" +
      wave.id +
      " / " +
      Data.waves.length +
      "</strong>" +

      "<span>이름</span>" +
      "<strong>" +
      wave.name +
      "</strong>" +

      "<span>보상</span>" +
      "<strong>" +
      wave.reward +
      "G</strong>" +

      "</div></div>" +

      '<div class="info-card">' +
      "<h3>등장 몬스터</h3>" +

      '<div class="info-list">' +
      groups +
      "</div>" +

      '<div class="tag-row">' +
      (
        tags ||
        '<span class="tag">기본</span>'
      ) +
      "</div></div>" +

      '<div class="info-card">' +
      "<h3>추천 대응</h3>" +

      '<div class="info-list">' +
      wave.recommendation +
      "</div></div>";
  }

  function renderHeroSheet() {
    var current =
      State.get();

    var stats =
      Combat.getHeroStats();

    var skill =
      Combat.getHeroSkillStats();

    var nextExp =
      Data.formulas.heroNextExp(
        current.hero.level
      );

    var expPercent =
      clamp(
        (
          current.hero.exp /
          nextExp
        ) *
        100,

        0,
        100
      );

    var passives =
      Data.heroPassives.map(
        function (passive) {
          var unlocked =
            current.hero.level >=
            passive.level;

          return (
            "<div><b>" +
            (
              unlocked
                ? "해금"
                : "Lv." +
                  passive.level
            ) +
            "</b> " +
            passive.name +
            " · " +
            passive.description +
            "</div>"
          );
        }
      ).join("");

    el.sheetContent.innerHTML =
      '<div class="info-card">' +

      "<h3>" +
      Data.hero.name +
      " · Lv." +
      current.hero.level +
      "</h3>" +

      '<div class="info-grid">' +

      "<span>경험치</span>" +
      "<strong>" +
      current.hero.exp +
      " / " +
      nextExp +
      "</strong>" +

      "<span>공격력</span>" +
      "<strong>" +
      stats.damage +
      "</strong>" +

      "<span>사거리</span>" +
      "<strong>" +
      stats.range +
      "</strong>" +

      "<span>공격 간격</span>" +
      "<strong>" +
      stats.attackInterval +
      "초</strong>" +

      "<span>스킬 피해</span>" +
      "<strong>" +
      skill.damage +
      "</strong>" +

      "<span>스킬 쿨타임</span>" +
      "<strong>" +
      skill.cooldown +
      "초</strong>" +

      "</div>" +

      '<div class="exp-bar">' +
      '<span style="width:' +
      expPercent +
      '%"></span>' +
      "</div></div>" +

      '<div class="info-card">' +
      "<h3>패시브</h3>" +

      '<div class="info-list">' +
      passives +
      "</div></div>";
  }

  function renderRelicSheet() {
    var counts =
      Combat.getRelicCounts();

    var rows =
      Object.keys(counts).length
        ? Object.keys(counts).map(
            function (id) {
              var relic =
                Data.relics.find(
                  function (item) {
                    return item.id === id;
                  }
                );

              var count =
                counts[id];

              return relic
                ? (
                    "<div><b>" +
                    relic.name +

                    (
                      count > 1
                        ? " ×" + count
                        : ""
                    ) +

                    "</b><br>" +
                    relic.description +
                    "</div>"
                  )
                : "";
            }
          ).join("")
        : "보스 처치 후 유물을 획득합니다.";

    el.sheetContent.innerHTML =
      '<div class="info-card">' +

      "<h3>보유 유물 " +
      State.get().relics.length +
      "개</h3>" +

      '<div class="info-list">' +
      rows +
      "</div></div>";
  }

  function renderSettingsSheet() {
    var current =
      State.get();

    el.sheetContent.innerHTML =
      '<div class="info-card">' +
      "<h3>게임 설정</h3>" +

      '<div class="info-grid">' +

      "<span>현재 맵</span>" +
      "<strong>" +
      State.getMap().name +
      "</strong>" +

      "<span>배속</span>" +
      "<strong>" +
      current.speed +
      "x</strong>" +

      "<span>자동 웨이브</span>" +
      "<strong>" +
      (
        current.autoWave
          ? "ON"
          : "OFF"
      ) +
      "</strong>" +

      "<span>버전</span>" +
      "<strong>" +
      Data.version +
      "</strong>" +

      "</div></div>" +

      '<div class="setting-actions">' +

      '<button id="sheetAutoWaveBtn" type="button">' +
      "자동 웨이브 " +
      (
        current.autoWave
          ? "끄기"
          : "켜기"
      ) +
      "</button>" +

      '<button id="sheetSaveBtn" type="button">' +
      "현재 진행 저장" +
      "</button>" +

      '<button id="sheetNewGameBtn" class="danger" type="button">' +
      "새 게임 / 맵 다시 선택" +
      "</button>" +

      "</div>";

    document
      .getElementById(
        "sheetAutoWaveBtn"
      )
      .addEventListener(
        "click",
        function () {
          Combat.toggleAutoWave();
          renderSettingsSheet();
        }
      );

    document
      .getElementById(
        "sheetSaveBtn"
      )
      .addEventListener(
        "click",
        function () {
          State.save();

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
        function () {
          returnToMapSelect();
        }
      );
  }

  function updateAll() {
    updateHud();
    updateTowerQuickBar();
    updateWaveOverlay();
    updateActionMenu();

    if (State.get().sheetOpen) {
      renderSheet();
    }
  }

  function updateRuntime() {
    updateHud();
    updateWaveOverlay();
  }

  function updateHud() {
    var current =
      State.get();

    var skillReady =
      current.hero.skillCooldown <= 0;

    var waveNumber =
      Math.min(
        current.currentWave,
        Data.waves.length
      );

    el.mapName.textContent =
      State.getMap().name;

    el.gold.textContent =
      Math.floor(
        current.gold
      );

    el.baseHp.textContent =
      Math.max(
        0,
        current.baseHp
      );

    el.wave.textContent =
      waveNumber +
      "/" +
      Data.waves.length;

    el.speed.textContent =
      current.speed + "x";

    el.pause.textContent =
      current.paused
        ? "재개"
        : "정지";

    el.heroSkill.textContent =
      skillReady
        ? "성광"
        : Math.ceil(
            current.hero.skillCooldown
          ) +
          "초";

    el.heroSkill.disabled =
      !current.started ||
      current.status !== "playing" ||
      current.paused ||
      State.isBlockingModal() ||
      !skillReady;

    el.startWave.disabled =
      !Combat.canStartWave();

    if (!current.started) {
      el.status.textContent =
        "맵 선택";
    } else if (
      State.isBlockingModal()
    ) {
      el.status.textContent =
        "선택";
    } else if (
      current.status === "gameOver"
    ) {
      el.status.textContent =
        "패배";
    } else if (
      current.status === "clear"
    ) {
      el.status.textContent =
        "클리어";
    } else if (
      current.paused
    ) {
      el.status.textContent =
        "정지";
    } else if (
      current.bossWarningTimer > 0
    ) {
      el.status.textContent =
        "보스";
    } else if (
      current.waveRunning
    ) {
      el.status.textContent =
        "전투";
    } else if (
      current.autoWave &&
      current.autoStartTimer > 0
    ) {
      el.status.textContent =
        "자동";
    } else {
      el.status.textContent =
        "대기";
    }
  }

  function updateTowerQuickBar() {
    var current =
      State.get();

    document
      .querySelectorAll(
        ".tower-quick[data-type]"
      )
      .forEach(
        function (button) {
          button.classList.toggle(
            "is-active",

            current.selectedBuildType ===
              button.dataset.type &&
            !current.selectedTowerId
          );

          button.disabled =
            !current.started ||
            current.status !== "playing";
        }
      );

    el.cancelBuild.disabled =
      !current.selectedBuildType &&
      !current.selectedTowerId;
  }

  function updateWaveOverlay() {
    var current =
      State.get();

    var wave =
      Data.waves[
        current.currentWave - 1
      ];

    var visible =
      !!wave &&
      Combat.canStartWave() &&
      !current.sheetOpen;

    el.waveOverlay.hidden =
      !visible;

    if (!wave) {
      return;
    }

    el.waveOverlayTitle.textContent =
      "Wave " + wave.id;

    el.waveOverlayName.textContent =
      wave.name;

    el.waveOverlayHint.textContent =
      current.autoWave
        ? "자동 시작 대기"
        : "눌러서 시작";
  }

  function updateActionMenu() {
    var current =
      State.get();

    var tower =
      State.getSelectedTower();

    var table;
    var stats;
    var upgradeCost;
    var sellValue;
    var trait;
    var traitText;
    var metrics;

    var menuWidth = 218;

    var towerScreenX;
    var towerScreenY;
    var left;
    var aboveY;
    var belowY;
    var top;

    var upgradeButton;
    var sellButton;

    if (
      !tower ||
      current.sheetOpen ||
      State.isBlockingModal()
    ) {
      el.actionMenu.classList.remove(
        "is-visible"
      );

      el.actionMenu.innerHTML =
        "";

      return;
    }

    table =
      Data.towers[
        tower.type
      ];

    stats =
      Combat.getTowerStats(
        tower
      );

    upgradeCost =
      Data.formulas.towerUpgradeCost(
        table,
        tower.level
      );

    sellValue =
      Data.formulas.towerSellValue(
        table,
        tower.level
      );

    trait =
      Combat.getTraitById(
        tower.trait
      );

    traitText =
      trait
        ? trait.name + " 적용 중"
        : tower.level >=
            table.traitUnlockLevel
          ? "특성 선택 가능"
          : "Lv." +
            table.traitUnlockLevel +
            " 특성 해금";

    metrics =
      Render.getMetrics();

    towerScreenX =
      metrics.boardOffsetX +
      (
        tower.col +
        0.5
      ) *
      metrics.tileSize;

    towerScreenY =
      metrics.boardOffsetY +
      (
        tower.row +
        0.5
      ) *
      metrics.tileSize;

    left = clamp(
      towerScreenX,
      menuWidth / 2 + 5,

      metrics.viewportWidth -
      menuWidth / 2 -
      5
    );

    aboveY =
      towerScreenY -
      126;

    belowY =
      towerScreenY +
      metrics.tileSize *
      0.55;

    top =
      aboveY > 5
        ? aboveY
        : clamp(
            belowY,
            5,
            metrics.viewportHeight - 126
          );

    el.actionMenu.style.left =
      left + "px";

    el.actionMenu.style.top =
      top + "px";

    el.actionMenu.classList.add(
      "is-visible"
    );

    el.actionMenu.innerHTML =
      '<div class="action-title">' +

      table.symbol +
      " " +
      table.name +

      "<span>Lv." +
      tower.level +
      "/" +
      table.maxLevel +
      "</span></div>" +

      '<div class="action-info">' +

      "<span>공격력</span>" +
      "<strong>" +
      stats.damage +
      "</strong>" +

      "<span>사거리</span>" +
      "<strong>" +
      stats.range +
      "</strong>" +

      "<span>강화</span>" +
      "<strong>" +
      (
        upgradeCost === null
          ? "MAX"
          : upgradeCost + "G"
      ) +
      "</strong>" +

      "<span>판매</span>" +
      "<strong>" +
      sellValue +
      "G</strong>" +

      "</div>" +

      '<div class="action-trait">' +
      traitText +
      "</div>" +

      '<div class="action-buttons">' +

      '<button id="quickUpgradeBtn" type="button" ' +
      (
        upgradeCost === null
          ? "disabled"
          : ""
      ) +
      ">강화</button>" +

      '<button id="quickSellBtn" class="danger" type="button">' +
      "판매" +
      "</button>" +

      "</div>";

    upgradeButton =
      document.getElementById(
        "quickUpgradeBtn"
      );

    sellButton =
      document.getElementById(
        "quickSellBtn"
      );

    if (upgradeButton) {
      upgradeButton.addEventListener(
        "click",
        Combat.upgradeSelectedTower
      );
    }

    if (sellButton) {
      sellButton.addEventListener(
        "click",
        Combat.sellSelectedTower
      );
    }
  }

  function openTraitModal(
    tower,
    options
  ) {
    var table =
      Data.towers[
        tower.type
      ];

    el.traitModalTitle.textContent =
      table.name +
      " 특성 선택";

    el.traitModalDesc.textContent =
      "선택한 특성은 현재 게임에서 변경할 수 없습니다.";

    el.traitOptions.innerHTML =
      "";

    options.forEach(
      function (trait) {
        var button =
          document.createElement("button");

        button.className =
          "choice-btn";

        button.type =
          "button";

        button.innerHTML =
          "<strong>" +
          trait.name +
          "</strong>" +

          "<span>" +
          trait.summary +
          "</span>" +

          "<span>" +
          trait.effectText +
          "</span>";

        button.addEventListener(
          "click",
          function () {
            Combat.selectTowerTrait(
              trait.id
            );
          }
        );

        el.traitOptions.appendChild(
          button
        );
      }
    );

    el.traitModal.classList.add(
      "is-visible"
    );

    updateAll();
  }

  function closeTraitModal() {
    el.traitModal.classList.remove(
      "is-visible"
    );
  }

  function openRelicModal(choices) {
    el.relicOptions.innerHTML =
      "";

    choices.forEach(
      function (relic) {
        var button =
          document.createElement("button");

        button.className =
          "choice-btn";

        button.type =
          "button";

        button.innerHTML =
          "<strong>" +
          relic.name +
          "</strong>" +

          "<span>" +
          relic.description +
          "</span>";

        button.addEventListener(
          "click",
          function () {
            Combat.selectRelic(
              relic.id
            );
          }
        );

        el.relicOptions.appendChild(
          button
        );
      }
    );

    el.relicModal.classList.add(
      "is-visible"
    );

    updateAll();
  }

  function closeRelicModal() {
    el.relicModal.classList.remove(
      "is-visible"
    );
  }

  function closeAllModals() {
    var current =
      State.get();

    current.traitModalTowerId =
      null;

    current.relicChoices =
      [];

    closeTraitModal();
    closeRelicModal();
  }

  function showToast(message) {
    el.toast.textContent =
      message;

    el.toast.classList.add(
      "is-visible"
    );

    window.clearTimeout(
      showToast.timer
    );

    showToast.timer =
      window.setTimeout(
        function () {
          el.toast.classList.remove(
            "is-visible"
          );
        },
        1450
      );
  }

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }

  window.Abyss.UI = {
    init: init,

    updateAll: updateAll,
    updateRuntime: updateRuntime,
    updateActionMenu: updateActionMenu,

    openTraitModal: openTraitModal,
    closeTraitModal: closeTraitModal,

    openRelicModal: openRelicModal,
    closeRelicModal: closeRelicModal,

    openBottomSheet: openBottomSheet,
    closeBottomSheet: closeBottomSheet,

    showToast: showToast,

    beginNewGame: beginNewGame,
    returnToMapSelect: returnToMapSelect
  };
}());
