(function () {
  "use strict";

  window.Abyss = window.Abyss || {};

  var Data = window.Abyss.Data;
  var State = window.Abyss.State;
  var Progression = window.Abyss.Progression;
  var Strategy = window.Abyss.Strategy;

  var STORAGE_KEY = "abyssDefense_v100_missions";
  var PROFILE_KEY = "abyssDefense_v090_profile";
  var CHECK_INTERVAL = 250;

  var initialized = false;
  var frameId = 0;
  var lastCheck = 0;
  var previousStatus = "menu";
  var noticeTimer = 0;
  var el = {};

  if (!Data || !State || !Progression) {
    throw new Error(
      "missions.js: data.js, state.js, progression.js가 먼저 로드되어야 합니다."
    );
  }

  Data.version = "1.0.0";

  var achievements = [
    makeAchievement(
      "firstTower",
      "첫 방어선",
      "타워를 처음 설치하세요.",
      10,
      function (snapshot) {
        return snapshot.maxTowers >= 1;
      }
    ),

    makeAchievement(
      "towerSquad",
      "철벽 진형",
      "한 원정에서 타워 5개를 운용하세요.",
      15,
      function (snapshot) {
        return snapshot.maxTowers >= 5;
      }
    ),

    makeAchievement(
      "towerVeteran",
      "숙련된 기술자",
      "타워 하나를 Lv.5까지 강화하세요.",
      20,
      function (snapshot) {
        return snapshot.maxTowerLevel >= 5;
      }
    ),

    makeAchievement(
      "heroAwaken",
      "수호자 각성",
      "히어로 Lv.5를 달성하세요.",
      20,
      function (snapshot) {
        return snapshot.maxHeroLevel >= 5;
      }
    ),

    makeAchievement(
      "relicCollector",
      "유물 수집가",
      "한 원정에서 유물 3개를 획득하세요.",
      25,
      function (snapshot) {
        return snapshot.maxRelics >= 3;
      }
    ),

    makeAchievement(
      "deepWave",
      "심연 탐사자",
      "Wave 10에 도달하세요.",
      20,
      function (snapshot) {
        return snapshot.maxWave >= 10;
      }
    ),

    makeAchievement(
      "firstClear",
      "첫 승전보",
      "스테이지를 처음 클리어하세요.",
      30,
      function (snapshot) {
        return snapshot.totalClears >= 1;
      }
    ),

    makeAchievement(
      "perfectDefense",
      "완벽한 방어",
      "스테이지에서 별 3개를 획득하세요.",
      40,
      function (snapshot) {
        return snapshot.bestStars >= 3;
      }
    ),

    makeAchievement(
      "allMaps",
      "심연 정복자",
      "모든 맵을 1회 이상 클리어하세요.",
      60,
      function (snapshot) {
        return (
          snapshot.totalMaps > 0 &&
          snapshot.clearedMaps >= snapshot.totalMaps
        );
      }
    ),

    makeAchievement(
      "strategist",
      "전술 지휘관",
      "전투 교리를 누적 10회 변경하세요.",
      25,
      function (snapshot) {
        return snapshot.doctrineSwitches >= 10;
      }
    )
  ];

  var missionPool = [
    makeMission(
      "reachWave5",
      "전선 유지",
      "오늘 Wave 5에 도달",
      5,
      12,
      "maxWave"
    ),

    makeMission(
      "reachWave10",
      "심층 진입",
      "오늘 Wave 10에 도달",
      10,
      20,
      "maxWave"
    ),

    makeMission(
      "buildThree",
      "방어선 구축",
      "한 원정에서 타워 3개 운용",
      3,
      12,
      "maxTowers"
    ),

    makeMission(
      "buildFive",
      "요새화",
      "한 원정에서 타워 5개 운용",
      5,
      18,
      "maxTowers"
    ),

    makeMission(
      "towerLevel3",
      "전력 증강",
      "타워 하나를 Lv.3까지 강화",
      3,
      14,
      "maxTowerLevel"
    ),

    makeMission(
      "heroLevel3",
      "수호자 훈련",
      "히어로 Lv.3 달성",
      3,
      14,
      "maxHeroLevel"
    ),

    makeMission(
      "gainRelic",
      "유물 탐색",
      "한 원정에서 유물 1개 획득",
      1,
      16,
      "maxRelics"
    ),

    makeMission(
      "clearStage",
      "오늘의 승리",
      "스테이지 1회 클리어",
      1,
      25,
      "clears"
    ),

    makeMission(
      "healthyWave8",
      "안정된 방어",
      "Base HP 70% 이상으로 Wave 8 도달",
      8,
      22,
      "healthyWave"
    ),

    makeDoctrineMission(
      "focusWave4",
      "집중 화력 훈련",
      "집중 화력 교리로 Wave 4 도달",
      4,
      16,
      "focus"
    ),

    makeDoctrineMission(
      "barrageWave4",
      "속사 탄막 훈련",
      "속사 탄막 교리로 Wave 4 도달",
      4,
      16,
      "barrage"
    )
  ];

  var saveData = loadSave();
  var run = createRun();

  patchState();

  function makeAchievement(
    id,
    name,
    description,
    reward,
    test
  ) {
    return {
      id: id,
      name: name,
      description: description,
      reward: reward,
      test: test
    };
  }

  function makeMission(
    id,
    name,
    description,
    target,
    reward,
    metric
  ) {
    return {
      id: id,
      name: name,
      description: description,
      target: target,
      reward: reward,

      value: function (daily) {
        return (
          daily.metrics[metric] ||
          0
        );
      }
    };
  }

  function makeDoctrineMission(
    id,
    name,
    description,
    target,
    reward,
    doctrine
  ) {
    return {
      id: id,
      name: name,
      description: description,
      target: target,
      reward: reward,

      value: function (daily) {
        return (
          daily.metrics
            .doctrineWaves[
              doctrine
            ] ||
          0
        );
      }
    };
  }

  function defaultMetrics() {
    return {
      maxWave: 0,
      maxTowers: 0,
      maxTowerLevel: 0,
      maxHeroLevel: 0,
      maxRelics: 0,
      clears: 0,
      healthyWave: 0,

      doctrineWaves: {
        balanced: 0,
        focus: 0,
        barrage: 0,
        reach: 0
      }
    };
  }

  function createRun() {
    return {
      mapId: "",
      startBaseHp: 0,
      maxWave: 0,
      maxTowers: 0,
      maxTowerLevel: 0,
      maxHeroLevel: 0,
      maxRelics: 0
    };
  }

  function createDaily(date) {
    return {
      date: date,

      missionIds:
        selectMissionIds(date),

      claimed: {},
      metrics: defaultMetrics()
    };
  }

  function defaultSave() {
    return {
      version: 1,
      achievements: {},
      daily: createDaily(
        todayKey()
      )
    };
  }

  function loadSave() {
    var result =
      defaultSave();

    try {
      var raw =
        localStorage.getItem(
          STORAGE_KEY
        );

      var saved = raw
        ? JSON.parse(raw)
        : null;

      if (
        !saved ||
        typeof saved !==
          "object"
      ) {
        return result;
      }

      if (
        saved.achievements &&
        typeof saved.achievements ===
          "object"
      ) {
        result.achievements =
          saved.achievements;
      }

      if (
        saved.daily &&
        saved.daily.date ===
          todayKey()
      ) {
        result.daily = {
          date:
            saved.daily.date,

          missionIds:
            Array.isArray(
              saved.daily
                .missionIds
            )
              ? saved.daily
                  .missionIds
                  .filter(
                    function (id) {
                      return !!missionById(
                        id
                      );
                    }
                  )
                  .slice(0, 3)
              : [],

          claimed:
            saved.daily
              .claimed &&
            typeof saved.daily
              .claimed ===
              "object"
              ? saved.daily
                  .claimed
              : {},

          metrics:
            normalizeMetrics(
              saved.daily
                .metrics
            )
        };

        if (
          result.daily
            .missionIds
            .length < 3
        ) {
          result.daily =
            createDaily(
              todayKey()
            );
        }
      }
    } catch (error) {
      console.error(
        "임무 데이터 로드 실패:",
        error
      );
    }

    return result;
  }

  function normalizeMetrics(
    source
  ) {
    var result =
      defaultMetrics();

    var input =
      source &&
      typeof source ===
        "object"
        ? source
        : {};

    [
      "maxWave",
      "maxTowers",
      "maxTowerLevel",
      "maxHeroLevel",
      "maxRelics",
      "clears",
      "healthyWave"
    ].forEach(
      function (key) {
        result[key] =
          safeInt(
            input[key],
            0
          );
      }
    );

    if (
      input.doctrineWaves &&
      typeof input
        .doctrineWaves ===
        "object"
    ) {
      Object.keys(
        result.doctrineWaves
      ).forEach(
        function (key) {
          result.doctrineWaves[
            key
          ] = safeInt(
            input.doctrineWaves[
              key
            ],
            0
          );
        }
      );
    }

    return result;
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          saveData
        )
      );
    } catch (error) {
      console.error(
        "임무 데이터 저장 실패:",
        error
      );
    }
  }

  function todayKey() {
    var now =
      new Date();

    return [
      now.getFullYear(),

      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      ),

      String(
        now.getDate()
      ).padStart(
        2,
        "0"
      )
    ].join("-");
  }

  function selectMissionIds(
    date
  ) {
    var candidates =
      missionPool.map(
        function (mission) {
          return mission.id;
        }
      );

    var seed =
      hashString(date);

    var selected = [];

    while (
      selected.length < 3 &&
      candidates.length
    ) {
      seed =
        (
          Math.imul(
            seed,
            1664525
          ) +
          1013904223
        ) >>>
        0;

      selected.push(
        candidates.splice(
          seed %
            candidates.length,
          1
        )[0]
      );
    }

    return selected;
  }

  function hashString(value) {
    var hash =
      2166136261;

    var index;

    for (
      index = 0;
      index < value.length;
      index += 1
    ) {
      hash ^=
        value.charCodeAt(
          index
        );

      hash =
        Math.imul(
          hash,
          16777619
        );
    }

    return hash >>> 0;
  }

  function missionById(id) {
    return (
      missionPool.find(
        function (mission) {
          return (
            mission.id ===
            id
          );
        }
      ) || null
    );
  }

  function patchState() {
    if (
      State.__missionsPatched
    ) {
      return;
    }

    var originalNewGame =
      State.newGame;

    var originalReturnToMenu =
      State.returnToMenu;

    State.newGame = function (
      mapId
    ) {
      var current =
        originalNewGame(
          mapId
        );

      resetRun(current);

      previousStatus =
        current.status ||
        "playing";

      return current;
    };

    State.returnToMenu =
      function () {
        var result =
          originalReturnToMenu();

        run = createRun();

        previousStatus =
          "menu";

        return result;
      };

    State.__missionsPatched =
      true;
  }

  function init() {
    if (initialized) {
      refreshUI();
      return;
    }

    initialized = true;

    ensureToday();
    createInterface();
    cacheElements();
    bindEvents();

    var current =
      State.get();

    previousStatus =
      current.status ||
      "menu";

    if (current.started) {
      resetRun(current);
      collectRun(current);
    }

    refreshUI();

    frameId =
      window.requestAnimationFrame(
        monitor
      );
  }

  function createInterface() {
    var startCard =
      document.querySelector(
        ".start-card"
      );

    var summary =
      document.querySelector(
        ".progression-summary"
      );

    if (
      startCard &&
      !document.getElementById(
        "missionOpenBtn"
      )
    ) {
      var button =
        document.createElement(
          "button"
        );

      button.id =
        "missionOpenBtn";

      button.className =
        "mission-open-btn";

      button.type =
        "button";

      button.innerHTML =
        '<span>오늘의 임무</span>' +
        '<strong id="missionSummaryText">' +
        "0 / 3" +
        "</strong>";

      if (summary) {
        summary.insertAdjacentElement(
          "afterend",
          button
        );
      } else {
        startCard.appendChild(
          button
        );
      }
    }

    var layer =
      document.createElement(
        "div"
      );

    layer.id =
      "missionLayer";

    layer.innerHTML =
      '<div id="missionModal" class="mission-modal" role="dialog" aria-modal="true" aria-hidden="true">' +
        '<section class="mission-card">' +
          '<div class="mission-head">' +
            "<div>" +
              "<p>ABYSS OPERATIONS</p>" +
              "<h2>임무와 도전과제</h2>" +
            "</div>" +

            '<button id="missionCloseBtn" type="button" aria-label="닫기">×</button>' +
          "</div>" +

          '<div class="mission-tabs">' +
            '<button class="mission-tab is-active" data-tab="daily" type="button">' +
              "일일 임무" +
            "</button>" +

            '<button class="mission-tab" data-tab="achievement" type="button">' +
              "도전과제" +
            "</button>" +
          "</div>" +

          '<div id="missionDailyPanel" class="mission-panel is-active"></div>' +

          '<div id="missionAchievementPanel" class="mission-panel"></div>' +
        "</section>" +
      "</div>" +

      '<div id="missionNotice" class="mission-notice" role="status" aria-live="polite">' +
        '<span id="missionNoticeLabel"></span>' +
        '<strong id="missionNoticeTitle"></strong>' +
        '<small id="missionNoticeReward"></small>' +
      "</div>";

    document.body.appendChild(
      layer
    );
  }

  function cacheElements() {
    [
      "missionOpenBtn",
      "missionSummaryText",
      "missionModal",
      "missionCloseBtn",
      "missionDailyPanel",
      "missionAchievementPanel",
      "missionNotice",
      "missionNoticeLabel",
      "missionNoticeTitle",
      "missionNoticeReward"
    ].forEach(
      function (id) {
        el[id] =
          document.getElementById(
            id
          );
      }
    );
  }

  function bindEvents() {
    el.missionOpenBtn
      .addEventListener(
        "click",
        openModal
      );

    el.missionCloseBtn
      .addEventListener(
        "click",
        closeModal
      );

    el.missionModal
      .addEventListener(
        "click",
        function (event) {
          if (
            event.target ===
            el.missionModal
          ) {
            closeModal();
          }
        }
      );

    Array.from(
      document.querySelectorAll(
        ".mission-tab"
      )
    ).forEach(
      function (button) {
        button.addEventListener(
          "click",
          function () {
            selectTab(
              button.dataset.tab
            );
          }
        );
      }
    );

    document.addEventListener(
      "keydown",
      function (event) {
        if (
          event.key ===
          "Escape"
        ) {
          closeModal();
        }
      }
    );
  }

  function openModal() {
    refreshUI();

    el.missionModal
      .classList.add(
        "is-visible"
      );

    el.missionModal
      .setAttribute(
        "aria-hidden",
        "false"
      );
  }

  function closeModal() {
    if (!el.missionModal) {
      return;
    }

    el.missionModal
      .classList.remove(
        "is-visible"
      );

    el.missionModal
      .setAttribute(
        "aria-hidden",
        "true"
      );
  }

  function selectTab(tab) {
    Array.from(
      document.querySelectorAll(
        ".mission-tab"
      )
    ).forEach(
      function (button) {
        button.classList.toggle(
          "is-active",
          button.dataset.tab ===
            tab
        );
      }
    );

    el.missionDailyPanel
      .classList.toggle(
        "is-active",
        tab === "daily"
      );

    el.missionAchievementPanel
      .classList.toggle(
        "is-active",
        tab ===
          "achievement"
      );
  }

  function monitor(time) {
    var dt =
      (
        time -
        (
          monitor.lastTime ||
          time
        )
      ) /
      1000;

    monitor.lastTime =
      time;

    if (
      time - lastCheck >=
      CHECK_INTERVAL
    ) {
      lastCheck = time;
      updateProgress();
    }

    if (
      noticeTimer > 0
    ) {
      noticeTimer =
        Math.max(
          0,
          noticeTimer -
            Math.max(0, dt)
        );

      if (
        noticeTimer === 0
      ) {
        el.missionNotice
          .classList.remove(
            "is-visible"
          );
      }
    }

    frameId =
      window.requestAnimationFrame(
        monitor
      );
  }

  function updateProgress() {
    ensureToday();

    var current =
      State.get();

    var status =
      current.status ||
      "menu";

    if (current.started) {
      if (
        !run.mapId ||
        run.mapId !==
          current.mapId
      ) {
        resetRun(current);
      }

      collectRun(current);
      collectDaily(current);
    }

    if (
      current.started &&
      status === "clear" &&
      previousStatus !==
        "clear"
    ) {
      saveData.daily
        .metrics
        .clears += 1;

      save();
    }

    previousStatus =
      status;

    checkAchievements();
    refreshSummary();
  }

  function resetRun(current) {
    run = createRun();

    run.mapId =
      current.mapId ||
      "";

    run.startBaseHp =
      Math.max(
        1,
        safeInt(
          current.baseHp,
          1
        )
      );
  }

  function collectRun(current) {
    var highestTower =
      current.towers.reduce(
        function (
          max,
          tower
        ) {
          return Math.max(
            max,
            safeInt(
              tower.level,
              1
            )
          );
        },
        0
      );

    run.maxWave =
      Math.max(
        run.maxWave,
        currentWave(current)
      );

    run.maxTowers =
      Math.max(
        run.maxTowers,
        current.towers.length
      );

    run.maxTowerLevel =
      Math.max(
        run.maxTowerLevel,
        highestTower
      );

    run.maxHeroLevel =
      Math.max(
        run.maxHeroLevel,
        safeInt(
          current.hero &&
            current.hero.level,
          1
        )
      );

    run.maxRelics =
      Math.max(
        run.maxRelics,
        Array.isArray(
          current.relics
        )
          ? current.relics
              .length
          : 0
      );
  }

  function collectDaily(
    current
  ) {
    var metrics =
      saveData.daily.metrics;

    var doctrine =
      getDoctrineId();

    var wave =
      currentWave(current);

    var changed = false;

    changed =
      setMax(
        metrics,
        "maxWave",
        run.maxWave
      ) || changed;

    changed =
      setMax(
        metrics,
        "maxTowers",
        run.maxTowers
      ) || changed;

    changed =
      setMax(
        metrics,
        "maxTowerLevel",
        run.maxTowerLevel
      ) || changed;

    changed =
      setMax(
        metrics,
        "maxHeroLevel",
        run.maxHeroLevel
      ) || changed;

    changed =
      setMax(
        metrics,
        "maxRelics",
        run.maxRelics
      ) || changed;

    if (
      metrics.doctrineWaves[
        doctrine
      ] !== undefined &&
      wave >
        metrics.doctrineWaves[
          doctrine
        ]
    ) {
      metrics.doctrineWaves[
        doctrine
      ] = wave;

      changed = true;
    }

    if (
      run.startBaseHp > 0 &&
      current.baseHp /
        run.startBaseHp >=
        0.7 &&
      wave >
        metrics.healthyWave
    ) {
      metrics.healthyWave =
        wave;

      changed = true;
    }

    if (changed) {
      save();
    }
  }

  function currentWave(
    current
  ) {
    if (
      current.status ===
      "clear"
    ) {
      return Data.waves.length;
    }

    return Math.min(
      Data.waves.length,
      safeInt(
        current.currentWave,
        0
      )
    );
  }

  function getDoctrineId() {
    if (
      Strategy &&
      typeof Strategy
        .getDoctrine ===
        "function"
    ) {
      var doctrine =
        Strategy.getDoctrine();

      if (
        doctrine &&
        doctrine.id
      ) {
        return doctrine.id;
      }
    }

    return "balanced";
  }

  function setMax(
    target,
    key,
    value
  ) {
    if (
      value <= target[key]
    ) {
      return false;
    }

    target[key] = value;

    return true;
  }

  function achievementSnapshot() {
    var profile =
      Progression.getProfile();

    var maps =
      profile.maps ||
      {};

    var mapIds =
      Object.keys(
        Data.maps
      );

    var clearedMaps = 0;
    var bestStars = 0;

    mapIds.forEach(
      function (mapId) {
        var progress =
          maps[mapId] ||
          {};

        if (
          safeInt(
            progress.clears,
            0
          ) > 0
        ) {
          clearedMaps += 1;
        }

        bestStars =
          Math.max(
            bestStars,
            safeInt(
              progress.bestStars,
              0
            )
          );
      }
    );

    return {
      maxWave:
        Math.max(
          run.maxWave,
          saveData.daily
            .metrics.maxWave
        ),

      maxTowers:
        Math.max(
          run.maxTowers,
          saveData.daily
            .metrics.maxTowers
        ),

      maxTowerLevel:
        Math.max(
          run.maxTowerLevel,
          saveData.daily
            .metrics
            .maxTowerLevel
        ),

      maxHeroLevel:
        Math.max(
          run.maxHeroLevel,
          saveData.daily
            .metrics
            .maxHeroLevel
        ),

      maxRelics:
        Math.max(
          run.maxRelics,
          saveData.daily
            .metrics.maxRelics
        ),

      totalClears:
        safeInt(
          profile.totalClears,
          0
        ),

      bestStars:
        bestStars,

      clearedMaps:
        clearedMaps,

      totalMaps:
        mapIds.length,

      doctrineSwitches:
        Strategy &&
        typeof Strategy
          .getConfig ===
          "function"
          ? safeInt(
              Strategy
                .getConfig()
                .totalSwitches,
              0
            )
          : 0
    };
  }

  function checkAchievements() {
    var snapshot =
      achievementSnapshot();

    var changed = false;

    achievements.forEach(
      function (
        achievement
      ) {
        if (
          !saveData
            .achievements[
              achievement.id
            ] &&
          achievement.test(
            snapshot
          )
        ) {
          saveData.achievements[
            achievement.id
          ] = {
            unlockedAt:
              Date.now()
          };

          grantStones(
            achievement.reward
          );

          showNotice(
            "ACHIEVEMENT UNLOCKED",
            achievement.name,
            "+" +
              achievement.reward +
              " ◆"
          );

          changed = true;
        }
      }
    );

    if (changed) {
      save();
      refreshUI();
    }
  }

  function claimMission(id) {
    var mission =
      missionById(id);

    if (
      !mission ||
      saveData.daily
        .claimed[id]
    ) {
      return;
    }

    if (
      mission.value(
        saveData.daily
      ) <
      mission.target
    ) {
      return;
    }

    saveData.daily
      .claimed[id] = true;

    grantStones(
      mission.reward
    );

    save();

    showNotice(
      "MISSION COMPLETE",
      mission.name,
      "+" +
        mission.reward +
        " ◆"
    );

    refreshUI();
  }

  function grantStones(
    amount
  ) {
    var profile =
      Progression.getProfile();

    profile.abyssStone =
      safeInt(
        profile.abyssStone,
        0
      ) + amount;

    try {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(
          profile
        )
      );
    } catch (error) {
      console.error(
        "심연석 보상 저장 실패:",
        error
      );
    }

    Progression.refreshUI();
  }

  function refreshUI() {
    if (!initialized) {
      return;
    }

    renderDaily();
    renderAchievements();
    refreshSummary();
  }

  function refreshSummary() {
    if (
      !el.missionSummaryText
    ) {
      return;
    }

    var completed = 0;
    var claimable = false;

    saveData.daily
      .missionIds
      .forEach(
        function (id) {
          var mission =
            missionById(id);

          var done =
            mission &&
            mission.value(
              saveData.daily
            ) >=
              mission.target;

          if (done) {
            completed += 1;
          }

          if (
            done &&
            !saveData.daily
              .claimed[id]
          ) {
            claimable = true;
          }
        }
      );

    el.missionSummaryText
      .textContent =
        completed +
        " / 3";

    el.missionOpenBtn
      .classList.toggle(
        "has-reward",
        claimable
      );
  }

  function renderDaily() {
    el.missionDailyPanel
      .innerHTML =
        '<div class="mission-date">' +
          "<span>" +
            saveData.daily.date
              .replace(
                /-/g,
                "."
              ) +
          "</span>" +

          "<small>" +
            "자정에 임무가 변경됩니다." +
          "</small>" +
        "</div>" +

        '<div id="missionDailyList"></div>';

    var list =
      document.getElementById(
        "missionDailyList"
      );

    saveData.daily
      .missionIds
      .forEach(
        function (id) {
          var mission =
            missionById(id);

          if (!mission) {
            return;
          }

          var value =
            Math.min(
              mission.target,
              safeInt(
                mission.value(
                  saveData.daily
                ),
                0
              )
            );

          var complete =
            value >=
            mission.target;

          var claimed =
            !!saveData.daily
              .claimed[id];

          var card =
            document.createElement(
              "article"
            );

          card.className =
            "mission-item" +
            (
              complete
                ? " is-complete"
                : ""
            ) +
            (
              claimed
                ? " is-claimed"
                : ""
            );

          card.innerHTML =
            '<div class="mission-copy">' +
              "<strong>" +
                escapeHtml(
                  mission.name
                ) +
              "</strong>" +

              "<span>" +
                escapeHtml(
                  mission.description
                ) +
              "</span>" +
            "</div>" +

            '<div class="mission-bar">' +
              '<i style="width:' +
                (
                  value /
                  mission.target
                ) *
                  100 +
                '%"></i>' +
            "</div>" +

            '<small class="mission-count">' +
              value +
              " / " +
              mission.target +
            "</small>" +

            '<button class="mission-claim" data-id="' +
              mission.id +
              '" type="button"' +
              (
                !complete ||
                claimed
                  ? " disabled"
                  : ""
              ) +
            ">" +
              (
                claimed
                  ? "수령 완료"
                  : complete
                    ? mission.reward +
                      " ◆ 수령"
                    : mission.reward +
                      " ◆"
              ) +
            "</button>";

          list.appendChild(
            card
          );
        }
      );

    Array.from(
      list.querySelectorAll(
        ".mission-claim"
      )
    ).forEach(
      function (button) {
        button.addEventListener(
          "click",
          function () {
            claimMission(
              button.dataset.id
            );
          }
        );
      }
    );
  }

  function renderAchievements() {
    var unlocked =
      achievements.reduce(
        function (
          count,
          achievement
        ) {
          return (
            count +
            (
              saveData
                .achievements[
                  achievement.id
                ]
                ? 1
                : 0
            )
          );
        },
        0
      );

    el.missionAchievementPanel
      .innerHTML =
        '<div class="achievement-summary">' +
          "<span>달성도</span>" +

          "<strong>" +
            unlocked +
            " / " +
            achievements.length +
          "</strong>" +
        "</div>" +

        '<div id="achievementList"></div>';

    var list =
      document.getElementById(
        "achievementList"
      );

    achievements.forEach(
      function (
        achievement
      ) {
        var done =
          !!saveData
            .achievements[
              achievement.id
            ];

        var card =
          document.createElement(
            "article"
          );

        card.className =
          "achievement-item" +
          (
            done
              ? " is-unlocked"
              : ""
          );

        card.innerHTML =
          '<span class="achievement-icon">' +
            (
              done
                ? "✓"
                : "◇"
            ) +
          "</span>" +

          "<div>" +
            "<strong>" +
              escapeHtml(
                achievement.name
              ) +
            "</strong>" +

            "<span>" +
              escapeHtml(
                achievement.description
              ) +
            "</span>" +
          "</div>" +

          "<small>" +
            (
              done
                ? "달성"
                : achievement.reward +
                  " ◆"
            ) +
          "</small>";

        list.appendChild(
          card
        );
      }
    );
  }

  function showNotice(
    label,
    title,
    reward
  ) {
    el.missionNoticeLabel
      .textContent =
        label;

    el.missionNoticeTitle
      .textContent =
        title;

    el.missionNoticeReward
      .textContent =
        reward;

    noticeTimer = 2.5;

    el.missionNotice
      .classList.remove(
        "is-visible"
      );

    void el.missionNotice
      .offsetWidth;

    el.missionNotice
      .classList.add(
        "is-visible"
      );
  }

  function ensureToday() {
    var date =
      todayKey();

    if (
      saveData.daily &&
      saveData.daily.date ===
        date
    ) {
      return;
    }

    saveData.daily =
      createDaily(date);

    save();

    if (initialized) {
      refreshUI();
    }
  }

  function safeInt(
    value,
    fallback
  ) {
    var number =
      Number(value);

    return Number.isFinite(
      number
    )
      ? Math.max(
          0,
          Math.floor(number)
        )
      : fallback;
  }

  function escapeHtml(
    value
  ) {
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
    if (frameId) {
      window.cancelAnimationFrame(
        frameId
      );
    }

    var layer =
      document.getElementById(
        "missionLayer"
      );

    var button =
      document.getElementById(
        "missionOpenBtn"
      );

    if (layer) {
      layer.remove();
    }

    if (button) {
      button.remove();
    }

    initialized = false;
    frameId = 0;
  }

  window.Abyss.Missions = {
    init: init,
    destroy: destroy,
    refreshUI: refreshUI,
    open: openModal,

    getData: function () {
      return saveData;
    }
  };
}());
