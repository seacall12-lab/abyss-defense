(function () {
  "use strict";

  window.Abyss = window.Abyss || {};

  var Data = window.Abyss.Data;

  if (!Data) {
    throw new Error("state.js: data.js가 먼저 로드되어야 합니다.");
  }

  var nextEntityId = 1;

  var game = createInitialState(
    "abyssGate",
    false
  );

  function createInitialState(mapId, started) {
    var map =
      Data.maps[mapId] ||
      Data.maps.abyssGate;

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
      screenShake: 0,

      mapDecor: buildMapDecor(map)
    };
  }

  function replaceGame(fresh) {
    Object.keys(game).forEach(function (key) {
      delete game[key];
    });

    Object.keys(fresh).forEach(function (key) {
      game[key] = fresh[key];
    });
  }

  function getGame() {
    return game;
  }

  function getMap() {
    return (
      Data.maps[game.mapId] ||
      Data.maps.abyssGate
    );
  }

  function getHeroPosition() {
    return getMap().hero;
  }

  function getPathCells() {
    return getMap().path;
  }

  function getPathPoints() {
    return getPathCells().map(function (point) {
      return {
        x: point.x + 0.5,
        y: point.y + 0.5
      };
    });
  }

  function getPathSet() {
    return new Set(
      getPathCells().map(function (point) {
        return point.x + "," + point.y;
      })
    );
  }

  function getBlockedSet() {
    return new Set(
      (getMap().blocked || []).map(function (point) {
        return point.x + "," + point.y;
      })
    );
  }

  function makeId(prefix) {
    var id =
      prefix + "_" + nextEntityId;

    nextEntityId += 1;

    return id;
  }

  function normalizeNextId() {
    var maxId = 1;

    game.towers.forEach(function (tower) {
      var number =
        Number(
          String(tower.id).replace(/\D/g, "")
        );

      if (Number.isFinite(number)) {
        maxId = Math.max(
          maxId,
          number + 1
        );
      }
    });

    nextEntityId = Math.max(
      nextEntityId,
      maxId
    );
  }

  function newGame(mapId) {
    var fresh =
      createInitialState(
        mapId,
        true
      );

    replaceGame(fresh);

    nextEntityId = 1;

    save();

    return game;
  }

  function returnToMenu() {
    localStorage.removeItem(
      Data.saveKey
    );

    replaceGame(
      createInitialState(
        "abyssGate",
        false
      )
    );

    nextEntityId = 1;

    return game;
  }

  function save() {
    var payload;

    if (!game.started) {
      return;
    }

    payload = {
      version: Data.version,
      started: true,

      mapId: game.mapId,

      gold: game.gold,
      baseHp: game.baseHp,
      currentWave: game.currentWave,

      towers: game.towers.map(function (tower) {
        return {
          id: tower.id,
          type: tower.type,
          col: tower.col,
          row: tower.row,
          level: tower.level,
          trait: tower.trait || null
        };
      }),

      hero: {
        level: game.hero.level,
        exp: game.hero.exp
      },

      relics: game.relics.slice(),

      relicWavesClaimed:
        game.relicWavesClaimed.slice(),

      speed: game.speed,
      autoWave: game.autoWave,
      status: game.status
    };

    localStorage.setItem(
      Data.saveKey,
      JSON.stringify(payload)
    );
  }

  function load() {
    var raw =
      localStorage.getItem(
        Data.saveKey
      );

    var saved;
    var fresh;
    var map;

    if (!raw) {
      return false;
    }

    try {
      saved = JSON.parse(raw);

      if (
        !saved ||
        !saved.started ||
        !Data.maps[saved.mapId]
      ) {
        return false;
      }

      fresh =
        createInitialState(
          saved.mapId,
          true
        );

      replaceGame(fresh);

      map = getMap();

      game.gold =
        Number.isFinite(saved.gold)
          ? saved.gold
          : map.startGold;

      game.baseHp =
        Number.isFinite(saved.baseHp)
          ? saved.baseHp
          : map.startBaseHp;

      game.currentWave =
        clamp(
          parseInt(saved.currentWave, 10) || 1,
          1,
          Data.waves.length
        );

      game.speed =
        [1, 2, 3].indexOf(saved.speed) >= 0
          ? saved.speed
          : 1;

      game.autoWave =
        !!saved.autoWave;

      game.status =
        saved.status === "gameOver" ||
        saved.status === "clear"
          ? saved.status
          : "playing";

      game.hero.level =
        Math.max(
          1,
          parseInt(
            saved.hero && saved.hero.level,
            10
          ) || 1
        );

      game.hero.exp =
        Math.max(
          0,
          parseInt(
            saved.hero && saved.hero.exp,
            10
          ) || 0
        );

      game.relics =
        Array.isArray(saved.relics)
          ? saved.relics.filter(function (id) {
              return Data.relics.some(function (relic) {
                return relic.id === id;
              });
            })
          : [];

      game.relicWavesClaimed =
        Array.isArray(saved.relicWavesClaimed)
          ? saved.relicWavesClaimed.filter(function (waveId) {
              return Number.isFinite(waveId);
            })
          : [];

      game.towers =
        Array.isArray(saved.towers)
          ? saved.towers
              .filter(function (tower) {
                return !!Data.towers[tower.type];
              })
              .map(function (tower) {
                var table =
                  Data.towers[tower.type];

                return {
                  id:
                    tower.id ||
                    makeId("tower"),

                  type:
                    tower.type,

                  col:
                    clamp(
                      parseInt(tower.col, 10) || 0,
                      0,
                      Data.board.cols - 1
                    ),

                  row:
                    clamp(
                      parseInt(tower.row, 10) || 0,
                      0,
                      Data.board.rows - 1
                    ),

                  level:
                    clamp(
                      parseInt(tower.level, 10) || 1,
                      1,
                      table.maxLevel
                    ),

                  trait:
                    typeof tower.trait === "string"
                      ? tower.trait
                      : null,

                  cooldown: 0
                };
              })
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

  function clearSave() {
    localStorage.removeItem(
      Data.saveKey
    );
  }

  function getTowerAt(col, row) {
    return (
      game.towers.find(function (tower) {
        return (
          tower.col === col &&
          tower.row === row
        );
      }) || null
    );
  }

  function getSelectedTower() {
    if (!game.selectedTowerId) {
      return null;
    }

    return (
      game.towers.find(function (tower) {
        return (
          tower.id ===
          game.selectedTowerId
        );
      }) || null
    );
  }

  function isHeroTile(col, row) {
    var hero =
      getHeroPosition();

    return (
      Math.floor(hero.x) === col &&
      Math.floor(hero.y) === row
    );
  }

  function isBlockingModal() {
    return (
      !!game.traitModalTowerId ||
      game.relicChoices.length > 0
    );
  }

  function addEffect(effect) {
    game.effects.push(effect);
  }

  function addFloater(text, x, y, color) {
    game.floaters.push({
      text: text,
      x: x,
      y: y,
      color: color,
      life: 0.9,
      maxLife: 0.9
    });
  }

  function buildMapDecor(map) {
    var result = [];

    var pathSet =
      new Set(
        map.path.map(function (point) {
          return point.x + "," + point.y;
        })
      );

    var blockedSet =
      new Set(
        (map.blocked || []).map(function (point) {
          return point.x + "," + point.y;
        })
      );

    var seed =
      map.id.length * 997;

    var colors;

    function random() {
      seed =
        (
          seed * 1664525 +
          1013904223
        ) % 4294967296;

      return seed / 4294967296;
    }

    if (map.decor === "rift") {
      colors = [
        "#a855f7",
        "#7c3aed",
        "#c084fc"
      ];
    } else if (map.decor === "swamp") {
      colors = [
        "#365314",
        "#4d7c0f",
        "#65a30d"
      ];
    } else {
      colors = [
        "#475569",
        "#64748b",
        "#334155"
      ];
    }

    for (var index = 0; index < 18; index += 1) {
      var x =
        Math.floor(
          random() * Data.board.cols
        );

      var y =
        Math.floor(
          random() * Data.board.rows
        );

      var attempts = 0;

      while (
        (
          pathSet.has(x + "," + y) ||
          blockedSet.has(x + "," + y)
        ) &&
        attempts < 20
      ) {
        x =
          Math.floor(
            random() * Data.board.cols
          );

        y =
          Math.floor(
            random() * Data.board.rows
          );

        attempts += 1;
      }

      result.push({
        x: x,
        y: y,

        size:
          0.08 +
          random() * 0.14,

        rotation:
          random() * Math.PI,

        alpha:
          0.18 +
          random() * 0.22,

        color:
          colors[
            Math.floor(
              random() * colors.length
            )
          ]
      });
    }

    return result;
  }

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }

  window.Abyss.State = {
    get: getGame,

    createInitialState:
      createInitialState,

    newGame: newGame,
    returnToMenu: returnToMenu,

    save: save,
    load: load,
    clearSave: clearSave,

    makeId: makeId,

    getMap: getMap,
    getHeroPosition: getHeroPosition,

    getPathCells: getPathCells,
    getPathPoints: getPathPoints,
    getPathSet: getPathSet,
    getBlockedSet: getBlockedSet,

    getTowerAt: getTowerAt,
    getSelectedTower: getSelectedTower,

    isHeroTile: isHeroTile,
    isBlockingModal: isBlockingModal,

    addEffect: addEffect,
    addFloater: addFloater,

    buildMapDecor: buildMapDecor
  };
}());
