(function () {
  "use strict";

  window.Abyss = window.Abyss || {};

  var Data = window.Abyss.Data;
  var State = window.Abyss.State;
  var autosaveTimer = 0;

  if (!Data || !State) {
    throw new Error("combat.js: data.js와 state.js가 먼저 로드되어야 합니다.");
  }

  function game() {
    return State.get();
  }

  function refresh() {
    if (window.Abyss.UI && window.Abyss.UI.updateAll) {
      window.Abyss.UI.updateAll();
    }
  }

  function toast(message) {
    if (window.Abyss.UI && window.Abyss.UI.showToast) {
      window.Abyss.UI.showToast(message);
    }
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
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
    Object.keys(source || {}).forEach(function (key) {
      if (typeof target[key] !== "number") {
        target[key] = 0;
      }

      target[key] += source[key];
    });
  }

  function getRelicEffects() {
    var result = createEmptyEffects();

    game().relics.forEach(function (id) {
      var relic = Data.relics.find(function (item) {
        return item.id === id;
      });

      if (relic) {
        addEffects(result, relic.effects);
      }
    });

    return result;
  }

  function getHeroPassiveEffects() {
    var result = createEmptyEffects();
    var current = game();

    Data.heroPassives.forEach(function (passive) {
      if (current.hero.level >= passive.level) {
        addEffects(result, passive.effects);
      }
    });

    return result;
  }

  function getTowerStats(tower) {
    var table = Data.towers[tower.type];
    var stats = Data.formulas.towerStats(table, tower.level);
    var relic = getRelicEffects();

    stats = Object.assign({}, stats, {
      bossDamageMultiplier: 1,
      freezeChance: 0,
      slowRadius: 0,
      poisonRadius: 0,
      vulnerabilityFactor: 1,
      vulnerabilityDuration: 0
    });

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
    stats.attackInterval = Number(
      Math.max(0.22, stats.attackInterval).toFixed(2)
    );
    stats.splashRadius = Number((stats.splashRadius || 0).toFixed(2));
    stats.slowDuration = Number((stats.slowDuration || 0).toFixed(2));
    stats.chainCount = Math.max(0, Math.round(stats.chainCount || 0));
    stats.dotDamagePerSecond = Math.max(
      0,
      Math.round(stats.dotDamagePerSecond || 0)
    );

    return stats;
  }

  function getHeroStats() {
    var current = game();
    var base = Data.formulas.heroStats(Data.hero, current.hero.level);
    var relic = getRelicEffects();
    var passive = getHeroPassiveEffects();

    return {
      damage: Math.round(
        base.damage *
        (1 + relic.heroDamagePct + passive.heroDamagePct)
      ),

      range: Number(
        (
          base.range +
          relic.heroRangeFlat +
          passive.heroRangeFlat
        ).toFixed(2)
      ),

      attackInterval: Number(
        Math.max(
          0.38,
          base.attackInterval *
          (
            1 -
            relic.heroAttackSpeedPct -
            passive.heroAttackSpeedPct
          )
        ).toFixed(2)
      )
    };
  }

  function getHeroSkillStats() {
    var hero = getHeroStats();
    var relic = getRelicEffects();
    var passive = getHeroPassiveEffects();

    return {
      damage: Math.round(
        hero.damage *
        3.4 *
        (
          1 +
          relic.skillDamagePct +
          passive.skillDamagePct
        )
      ),

      radius: Number(
        (
          Data.hero.skillRadius +
          relic.skillRadiusFlat +
          passive.skillRadiusFlat
        ).toFixed(2)
      ),

      cooldown: Number(
        Math.max(
          7,
          Data.hero.skillCooldown *
          (
            1 -
            relic.skillCooldownPct -
            passive.skillCooldownPct
          )
        ).toFixed(2)
      )
    };
  }

  function getTraitById(traitId) {
    var keys = Object.keys(Data.towerTraits);
    var found = null;

    keys.some(function (key) {
      found = Data.towerTraits[key].find(function (trait) {
        return trait.id === traitId;
      });

      return !!found;
    });

    return found;
  }

  function getRelicCounts() {
    return game().relics.reduce(function (counts, id) {
      counts[id] = (counts[id] || 0) + 1;
      return counts;
    }, {});
  }

  function collectWaveTraits(wave) {
    var result = new Set();

    wave.groups.forEach(function (group) {
      var monster = Data.monsters[group.type];

      (monster.traits || []).forEach(function (traitId) {
        result.add(traitId);
      });
    });

    return Array.from(result);
  }

  function getMonsterTraitLabels(monster) {
    return (monster.traits || []).map(function (traitId) {
      return Data.monsterTraits[traitId]
        ? Data.monsterTraits[traitId].symbol
        : traitId;
    });
  }

  function canStartWave() {
    var current = game();

    return (
      current.started &&
      current.status === "playing" &&
      !current.waveRunning &&
      !current.paused &&
      !current.sheetOpen &&
      !State.isBlockingModal() &&
      !!Data.waves[current.currentWave - 1]
    );
  }

  function toggleBuildType(type) {
    var current = game();

    if (
      !current.started ||
      current.status !== "playing" ||
      !Data.towers[type]
    ) {
      return;
    }

    if (
      current.selectedBuildType === type &&
      !current.selectedTowerId
    ) {
      current.selectedBuildType = null;
      toast("타워 선택 해제");
    } else {
      current.selectedBuildType = type;
      current.selectedTowerId = null;
      toast(Data.towers[type].name + " 배치");
    }

    refresh();
  }

  function cancelSelection() {
    var current = game();

    current.selectedBuildType = null;
    current.selectedTowerId = null;

    refresh();
  }

  function selectTower(towerId) {
    var current = game();

    current.selectedTowerId = towerId;
    current.selectedBuildType = null;

    refresh();
  }

  function placeTower(col, row) {
    var current = game();
    var table = Data.towers[current.selectedBuildType];
    var key = col + "," + row;
    var tower;

    if (!table || current.status !== "playing") {
      return false;
    }

    if (State.getPathSet().has(key)) {
      toast("경로에는 설치할 수 없습니다.");
      return false;
    }

    if (State.getBlockedSet().has(key)) {
      toast("장애물에는 설치할 수 없습니다.");
      return false;
    }

    if (State.isHeroTile(col, row)) {
      toast("히어로 위치에는 설치할 수 없습니다.");
      return false;
    }

    if (State.getTowerAt(col, row)) {
      toast("이미 타워가 있습니다.");
      return false;
    }

    if (current.gold < table.cost) {
      toast("골드가 부족합니다.");
      return false;
    }

    tower = {
      id: State.makeId("tower"),
      type: table.id,
      col: col,
      row: row,
      level: 1,
      trait: null,
      cooldown: 0
    };

    current.gold -= table.cost;
    current.towers.push(tower);
    current.selectedTowerId = tower.id;
    current.selectedBuildType = null;

    State.addEffect({
      type: "upgrade",
      x: col + 0.5,
      y: row + 0.5,
      life: 0.45,
      maxLife: 0.45,
      color: table.color
    });

    toast(table.name + " 설치 -" + table.cost + "G");

    State.save();
    refresh();

    return true;
  }

  function upgradeSelectedTower() {
    var current = game();
    var tower = State.getSelectedTower();
    var table;
    var cost;

    if (!tower) {
      return;
    }

    table = Data.towers[tower.type];
    cost = Data.formulas.towerUpgradeCost(table, tower.level);

    if (cost === null) {
      toast("이미 최대 레벨입니다.");
      return;
    }

    if (current.gold < cost) {
      toast("골드가 부족합니다.");
      return;
    }

    current.gold -= cost;
    tower.level += 1;

    State.addEffect({
      type: "upgrade",
      x: tower.col + 0.5,
      y: tower.row + 0.5,
      life: 0.55,
      maxLife: 0.55,
      color: table.color
    });

    toast(table.name + " Lv." + tower.level);

    maybeOpenTraitModal(tower);

    State.save();
    refresh();
  }

  function sellSelectedTower() {
    var current = game();
    var tower = State.getSelectedTower();
    var table;
    var value;

    if (!tower) {
      return;
    }

    table = Data.towers[tower.type];
    value = Data.formulas.towerSellValue(table, tower.level);

    current.gold += value;

    current.towers = current.towers.filter(function (item) {
      return item.id !== tower.id;
    });

    current.selectedTowerId = null;

    toast(table.name + " 판매 +" + value + "G");

    State.save();
    refresh();
  }

  function maybeOpenTraitModal(tower) {
    var current = game();
    var table = Data.towers[tower.type];
    var options = Data.towerTraits[tower.type] || [];

    if (
      !options.length ||
      tower.trait ||
      tower.level < table.traitUnlockLevel
    ) {
      return;
    }

    current.traitModalTowerId = tower.id;

    if (
      window.Abyss.UI &&
      window.Abyss.UI.openTraitModal
    ) {
      window.Abyss.UI.openTraitModal(tower, options);
    }
  }

  function selectTowerTrait(traitId) {
    var current = game();

    var tower = current.towers.find(function (item) {
      return item.id === current.traitModalTowerId;
    });

    var trait = getTraitById(traitId);

    if (tower && trait) {
      tower.trait = traitId;

      State.addEffect({
        type: "upgrade",
        x: tower.col + 0.5,
        y: tower.row + 0.5,
        life: 0.8,
        maxLife: 0.8,
        color: Data.towers[tower.type].color
      });

      toast(trait.name + " 적용");
    }

    current.traitModalTowerId = null;

    if (
      window.Abyss.UI &&
      window.Abyss.UI.closeTraitModal
    ) {
      window.Abyss.UI.closeTraitModal();
    }

    State.save();
    refresh();
  }

  function startWave() {
    var current = game();
    var wave;

    if (!canStartWave()) {
      return;
    }

    wave = Data.waves[current.currentWave - 1];

    current.waveRunning = true;
    current.spawnQueue = createSpawnQueue(wave);
    current.spawnTimer = wave.boss ? 2 : 0.18;
    current.bossWarningTimer = wave.boss ? 1.9 : 0;
    current.autoStartTimer = 0;
    current.selectedTowerId = null;

    toast("Wave " + wave.id + ": " + wave.name);

    State.save();
    refresh();
  }

  function createSpawnQueue(wave) {
    var queue = [];

    wave.groups.forEach(function (group, groupIndex) {
      var index;

      for (index = 0; index < group.count; index += 1) {
        queue.push({
          type: group.type,
          waveId: wave.id,
          hpScale: group.hpScale || 1,

          delay:
            index === 0 && groupIndex > 0
              ? Math.max(0.8, group.gap)
              : group.gap
        });
      }
    });

    return queue;
  }

  function spawnEnemy(spawn) {
    var current = game();
    var table = Data.monsters[spawn.type];

    var stats = Data.formulas.monsterStats(
      table,
      spawn.waveId,
      spawn.hpScale,
      State.getMap()
    );

    var first = State.getPathPoints()[0];
    var traits = (table.traits || []).slice();

    var shield =
      traits.indexOf("shield") >= 0
        ? Math.round(
            stats.hp *
            (table.boss ? 0.28 : 0.22)
          )
        : 0;

    current.enemies.push({
      id: State.makeId("enemy"),
      type: table.id,
      name: table.name,
      waveId: spawn.waveId,

      x: first.x,
      y: first.y,
      pathIndex: 1,

      hp: stats.hp,
      maxHp: stats.hp,

      shield: shield,
      maxShield: shield,

      speed: stats.speed,
      gold: stats.gold,
      exp: stats.exp,

      radius: table.radius,
      color: table.color,
      aura: table.aura,
      traits: traits,
      boss: !!table.boss,

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

      animSeed: Math.random() * 1000
    });
  }

  function update(dt) {
    var current = game();

    updateEffects(dt);

    if (current.screenShake > 0) {
      current.screenShake = Math.max(
        0,
        current.screenShake - dt * 2.8
      );
    }

    if (
      !current.started ||
      current.sheetOpen ||
      State.isBlockingModal() ||
      current.paused ||
      current.status !== "playing"
    ) {
      return;
    }

    if (current.bossWarningTimer > 0) {
      current.bossWarningTimer = Math.max(
        0,
        current.bossWarningTimer - dt
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

    if (autosaveTimer >= 3) {
      autosaveTimer = 0;
      State.save();
    }
  }

  function updateAutoWave(dt) {
    var current = game();

    if (
      !current.autoWave ||
      current.waveRunning ||
      current.status !== "playing"
    ) {
      return;
    }

    if (current.autoStartTimer > 0) {
      current.autoStartTimer -= dt;

      if (current.autoStartTimer <= 0) {
        startWave();
      }
    }
  }

  function updateHeroCooldowns(dt) {
    var current = game();

    if (current.hero.skillCooldown > 0) {
      current.hero.skillCooldown = Math.max(
        0,
        current.hero.skillCooldown - dt
      );
    }
  }

  function updateSpawning(dt) {
    var current = game();
    var spawn;

    if (
      !current.waveRunning ||
      current.spawnQueue.length === 0
    ) {
      return;
    }

    current.spawnTimer -= dt;

    while (
      current.spawnTimer <= 0 &&
      current.spawnQueue.length > 0
    ) {
      spawn = current.spawnQueue.shift();

      spawnEnemy(spawn);

      current.spawnTimer += current.spawnQueue[0]
        ? current.spawnQueue[0].delay
        : 0.5;
    }
  }

  function updateEnemies(dt) {
    var current = game();
    var pathPoints = State.getPathPoints();
    var map = State.getMap();

    current.enemies.forEach(function (enemy) {
      var auraFactor;
      var remaining;
      var target;
      var dx;
      var dy;
      var dist;

      if (enemy.dead || enemy.escaped) {
        return;
      }

      updateEnemyStatuses(enemy, dt, map);

      if (
        enemy.dead ||
        enemy.escaped ||
        enemy.freezeTimer > 0
      ) {
        return;
      }

      auraFactor = hasHasteAura(enemy)
        ? 1.18
        : 1;

      remaining =
        enemy.speed *
        enemy.slowFactor *
        auraFactor *
        dt;

      while (
        remaining > 0 &&
        !enemy.escaped
      ) {
        target = pathPoints[enemy.pathIndex];

        if (!target) {
          enemy.escaped = true;

          current.baseHp -= enemy.boss
            ? 3
            : 1;

          State.addFloater(
            enemy.boss ? "-3 HP" : "-1 HP",
            enemy.x,
            enemy.y,
            "#ff7875"
          );

          current.screenShake = Math.max(
            current.screenShake,
            enemy.boss ? 0.55 : 0.22
          );

          if (current.baseHp <= 0) {
            current.baseHp = 0;
            current.status = "gameOver";
            current.waveRunning = false;
            current.autoStartTimer = 0;

            toast("Base가 파괴되었습니다.");

            State.save();
            refresh();
          }

          return;
        }

        dx = target.x - enemy.x;
        dy = target.y - enemy.y;
        dist = Math.hypot(dx, dy);

        if (dist <= 0.0001) {
          enemy.pathIndex += 1;
        } else if (dist <= remaining) {
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

  function updateEnemyStatuses(enemy, dt, map) {
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;

      if (enemy.slowTimer <= 0) {
        enemy.slowFactor = 1;
      }
    }

    if (enemy.freezeTimer > 0) {
      enemy.freezeTimer = Math.max(
        0,
        enemy.freezeTimer - dt
      );
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

        damageEnemy(
          enemy,
          enemy.poisonDps * 0.5,
          "poisonDot"
        );
      }

      if (enemy.poisonTimer <= 0) {
        enemy.poisonDps = 0;
      }
    }

    if (
      !enemy.dead &&
      enemy.traits.indexOf("regen") >= 0
    ) {
      enemy.hp = Math.min(
        enemy.maxHp,

        enemy.hp +
        enemy.maxHp *
        0.014 *
        (
          1 +
          (map.regenBonusPct || 0)
        ) *
        dt
      );
    }
  }

  function hasHasteAura(enemy) {
    return game().enemies.some(function (other) {
      return (
        other.id !== enemy.id &&
        !other.dead &&
        !other.escaped &&
        other.traits.indexOf("darkAura") >= 0 &&
        distance(
          enemy.x,
          enemy.y,
          other.x,
          other.y
        ) <= 2.05
      );
    });
  }

  function updateTowers(dt) {
    game().towers.forEach(function (tower) {
      var stats = getTowerStats(tower);
      var target;

      tower.cooldown -= dt;

      if (tower.cooldown > 0) {
        return;
      }

      target = findTarget(
        tower.col + 0.5,
        tower.row + 0.5,
        stats.range
      );

      if (!target) {
        return;
      }

      tower.cooldown = stats.attackInterval;

      attackWithTower(
        tower,
        Data.towers[tower.type],
        stats,
        target
      );
    });
  }

  function updateHero(dt) {
    var current = game();
    var position = State.getHeroPosition();
    var stats;
    var target;

    current.hero.cooldown -= dt;

    if (current.hero.cooldown > 0) {
      return;
    }

    stats = getHeroStats();

    target = findTarget(
      position.x,
      position.y,
      stats.range
    );

    if (!target) {
      return;
    }

    current.hero.cooldown = stats.attackInterval;

    current.projectiles.push({
      id: State.makeId("projectile"),
      type: "hero",

      x: position.x,
      y: position.y,
      prevX: position.x,
      prevY: position.y,

      targetId: target.id,
      damage: stats.damage,
      speed: 5.4,

      color: Data.hero.projectileColor,
      radius: 0.07
    });
  }

  function attackWithTower(
    tower,
    table,
    stats,
    target
  ) {
    var current = game();
    var x = tower.col + 0.5;
    var y = tower.row + 0.5;

    if (tower.type === "lightning") {
      fireLightning(
        x,
        y,
        table,
        stats,
        target
      );

      return;
    }

    current.projectiles.push({
      id: State.makeId("projectile"),
      type: tower.type,

      x: x,
      y: y,
      prevX: x,
      prevY: y,

      targetId: target.id,
      damage: stats.damage,

      speed:
        tower.type === "cannon"
          ? 3.6
          : 4.8,

      color: table.color,

      radius:
        tower.type === "cannon"
          ? 0.1
          : 0.065,

      splashRadius:
        stats.splashRadius || 0,

      slowFactor:
        stats.slowFactor || 0,

      slowDuration:
        stats.slowDuration || 0,

      slowRadius:
        stats.slowRadius || 0,

      freezeChance:
        stats.freezeChance || 0,

      dotDamagePerSecond:
        stats.dotDamagePerSecond || 0,

      dotDuration:
        stats.dotDuration || 0,

      poisonRadius:
        stats.poisonRadius || 0,

      bossDamageMultiplier:
        stats.bossDamageMultiplier || 1
    });
  }

  function fireLightning(
    x,
    y,
    table,
    stats,
    firstTarget
  ) {
    var currentGame = game();
    var hitIds = new Set();
    var points = [{ x: x, y: y }];
    var current = firstTarget;
    var currentDamage = stats.damage;
    var index;

    for (
      index = 0;
      index < stats.chainCount && current;
      index += 1
    ) {
      hitIds.add(current.id);

      points.push({
        x: current.x,
        y: current.y
      });

      damageEnemy(
        current,
        currentDamage,
        "lightning"
      );

      if (stats.vulnerabilityFactor > 1) {
        applyVulnerability(
          current,
          stats.vulnerabilityFactor,
          stats.vulnerabilityDuration
        );
      }

      current = findNearestChainTarget(
        current,
        hitIds,
        stats.chainRange
      );

      currentDamage = Math.max(
        5,
        Math.round(currentDamage * 0.72)
      );
    }

    currentGame.effects.push({
      type: "lightning",
      points: points,
      life: 0.16,
      maxLife: 0.16,
      color: table.color
    });
  }

  function findNearestChainTarget(
    source,
    hitIds,
    chainRange
  ) {
    var result = null;
    var nearest = Infinity;

    game().enemies.forEach(function (enemy) {
      var dist;

      if (
        enemy.dead ||
        enemy.escaped ||
        hitIds.has(enemy.id)
      ) {
        return;
      }

      dist = distance(
        source.x,
        source.y,
        enemy.x,
        enemy.y
      );

      if (
        dist <= chainRange &&
        dist < nearest
      ) {
        result = enemy;
        nearest = dist;
      }
    });

    return result;
  }

  function updateProjectiles(dt) {
    var current = game();

    current.projectiles.forEach(function (projectile) {
      var target;
      var dx;
      var dy;
      var dist;
      var movement;

      if (projectile.done) {
        return;
      }

      target = current.enemies.find(function (enemy) {
        return (
          enemy.id === projectile.targetId &&
          !enemy.dead &&
          !enemy.escaped
        );
      });

      if (!target) {
        projectile.done = true;
        return;
      }

      projectile.prevX = projectile.x;
      projectile.prevY = projectile.y;

      dx = target.x - projectile.x;
      dy = target.y - projectile.y;
      dist = Math.hypot(dx, dy);
      movement = projectile.speed * dt;

      if (
        dist <= movement ||
        dist < 0.05
      ) {
        projectile.x = target.x;
        projectile.y = target.y;

        projectileHit(
          projectile,
          target
        );

        projectile.done = true;
      } else {
        projectile.x +=
          (dx / dist) *
          movement;

        projectile.y +=
          (dy / dist) *
          movement;
      }
    });
  }

  function projectileHit(projectile, target) {
    var current = game();

    if (projectile.type === "cannon") {
      damageEnemy(
        target,

        target.boss
          ? projectile.damage *
            projectile.bossDamageMultiplier
          : projectile.damage,

        "cannon"
      );

      current.enemies.forEach(function (enemy) {
        if (
          enemy.id !== target.id &&
          !enemy.dead &&
          !enemy.escaped &&
          distance(
            target.x,
            target.y,
            enemy.x,
            enemy.y
          ) <= projectile.splashRadius
        ) {
          damageEnemy(
            enemy,
            projectile.damage * 0.58,
            "cannonSplash"
          );
        }
      });

      current.screenShake = Math.max(
        current.screenShake,
        0.32
      );

      State.addEffect({
        type: "explosion",
        x: target.x,
        y: target.y,
        radius: projectile.splashRadius,
        life: 0.3,
        maxLife: 0.3,
        color: projectile.color
      });

      return;
    }

    if (projectile.type === "ice") {
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

      if (projectile.slowRadius > 0) {
        current.enemies.forEach(function (enemy) {
          if (
            enemy.id !== target.id &&
            !enemy.dead &&
            !enemy.escaped &&
            distance(
              target.x,
              target.y,
              enemy.x,
              enemy.y
            ) <= projectile.slowRadius
          ) {
            applySlow(
              enemy,
              projectile.slowFactor,
              projectile.slowDuration * 0.8
            );
          }
        });
      }

      State.addEffect({
        type: "iceBurst",
        x: target.x,
        y: target.y,
        life: 0.28,
        maxLife: 0.28,
        color: projectile.color
      });

      return;
    }

    if (projectile.type === "poison") {
      damageEnemy(
        target,
        projectile.damage,
        "poison"
      );

      applyPoison(
        target,
        projectile.dotDamagePerSecond,
        projectile.dotDuration
      );

      if (projectile.poisonRadius > 0) {
        current.enemies.forEach(function (enemy) {
          if (
            enemy.id !== target.id &&
            !enemy.dead &&
            !enemy.escaped &&
            distance(
              target.x,
              target.y,
              enemy.x,
              enemy.y
            ) <= projectile.poisonRadius
          ) {
            damageEnemy(
              enemy,
              projectile.damage * 0.45,
              "poison"
            );

            applyPoison(
              enemy,
              projectile.dotDamagePerSecond * 0.55,
              projectile.dotDuration * 0.75
            );
          }
        });
      }

      State.addEffect({
        type: "poisonCloud",
        x: target.x,
        y: target.y,
        radius: Math.max(
          0.35,
          projectile.poisonRadius
        ),
        life: 0.34,
        maxLife: 0.34,
        color: projectile.color
      });

      return;
    }

    damageEnemy(
      target,
      projectile.damage,
      projectile.type
    );

    State.addEffect({
      type: "hit",
      x: target.x,
      y: target.y,
      life: 0.16,
      maxLife: 0.16,
      color: projectile.color
    });
  }

  function applySlow(
    enemy,
    factor,
    duration
  ) {
    var finalFactor = factor;
    var finalDuration = duration;

    if (
      !enemy ||
      enemy.dead ||
      enemy.escaped ||
      !factor ||
      !duration
    ) {
      return;
    }

    if (enemy.traits.indexOf("boss") >= 0) {
      finalFactor = Math.max(
        finalFactor,
        0.72
      );

      finalDuration *= 0.55;
    }

    enemy.slowFactor = Math.min(
      enemy.slowFactor,
      finalFactor
    );

    enemy.slowTimer = Math.max(
      enemy.slowTimer,
      finalDuration
    );
  }

  function applyFreeze(enemy, chance) {
    var finalChance;

    if (
      !enemy ||
      enemy.dead ||
      enemy.escaped ||
      !chance
    ) {
      return;
    }

    finalChance =
      enemy.traits.indexOf("boss") >= 0
        ? chance * 0.35
        : chance;

    if (Math.random() < finalChance) {
      enemy.freezeTimer = Math.max(
        enemy.freezeTimer,

        enemy.traits.indexOf("boss") >= 0
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

    enemy.poisonDps = Math.max(
      enemy.poisonDps,
      dps
    );

    enemy.poisonTimer = Math.max(
      enemy.poisonTimer,
      duration
    );

    enemy.poisonTick = Math.min(
      enemy.poisonTick || 0.5,
      0.5
    );
  }

  function applyVulnerability(
    enemy,
    factor,
    duration
  ) {
    var finalDuration;

    if (
      !enemy ||
      enemy.dead ||
      enemy.escaped
    ) {
      return;
    }

    finalDuration =
      enemy.traits.indexOf("boss") >= 0
        ? duration * 0.55
        : duration;

    enemy.vulnerabilityFactor = Math.max(
      enemy.vulnerabilityFactor,
      factor
    );

    enemy.vulnerabilityTimer = Math.max(
      enemy.vulnerabilityTimer,
      finalDuration
    );
  }

  function damageEnemy(
    enemy,
    amount,
    source
  ) {
    var damage;
    var absorbed;

    if (
      !enemy ||
      enemy.dead ||
      enemy.escaped
    ) {
      return;
    }

    damage = Math.max(
      1,

      Math.round(
        amount *
        getDamageMultiplier(
          enemy,
          source
        )
      )
    );

    if (enemy.shield > 0) {
      absorbed = Math.min(
        enemy.shield,
        damage
      );

      enemy.shield -= absorbed;
      damage -= absorbed;

      if (damage <= 0) {
        return;
      }
    }

    enemy.hp -= damage;

    if (enemy.hp <= 0) {
      killEnemy(enemy);
    }
  }

  function getDamageMultiplier(
    enemy,
    source
  ) {
    var multiplier = 1;

    if (
      enemy.traits.indexOf("flying") >= 0 &&
      (
        source === "cannon" ||
        source === "cannonSplash"
      )
    ) {
      multiplier *= 0.55;
    }

    if (enemy.traits.indexOf("armored") >= 0) {
      if (
        source === "cannon" ||
        source === "cannonSplash"
      ) {
        multiplier *= 1.1;
      } else if (
        source === "poison" ||
        source === "poisonDot"
      ) {
        multiplier *= 1.2;
      } else {
        multiplier *= 0.82;
      }
    }

    if (
      enemy.traits.indexOf("toxicResist") >= 0 &&
      (
        source === "poison" ||
        source === "poisonDot"
      )
    ) {
      multiplier *= 0.55;
    }

    if (enemy.vulnerabilityTimer > 0) {
      multiplier *= enemy.vulnerabilityFactor;
    }

    return multiplier;
  }

  function killEnemy(enemy) {
    var current = game();
    var relicEffects;
    var gold;

    if (enemy.dead) {
      return;
    }

    enemy.dead = true;

    relicEffects = getRelicEffects();

    gold = Math.round(
      enemy.gold *
      (1 + relicEffects.goldGainPct)
    );

    current.gold += gold;

    addHeroExp(enemy.exp);

    State.addFloater(
      "+" + gold + "G",
      enemy.x,
      enemy.y - 0.1,
      "#facc15"
    );

    State.addEffect({
      type:
        enemy.boss
          ? "bossDeath"
          : "death",

      x: enemy.x,
      y: enemy.y,

      life:
        enemy.boss
          ? 0.58
          : 0.32,

      maxLife:
        enemy.boss
          ? 0.58
          : 0.32,

      color: enemy.aura
    });

    if (enemy.boss) {
      current.screenShake = Math.max(
        current.screenShake,
        0.72
      );

      if (
        current.relicWavesClaimed.indexOf(
          enemy.waveId
        ) < 0
      ) {
        current.relicWavesClaimed.push(
          enemy.waveId
        );

        openRelicModal();
      }
    }

    State.save();
  }

  function addHeroExp(amount) {
    var current = game();
    var required;
    var leveledUp = false;
    var heroPosition;

    current.hero.exp += amount;

    required = Data.formulas.heroNextExp(
      current.hero.level
    );

    while (current.hero.exp >= required) {
      current.hero.exp -= required;
      current.hero.level += 1;

      required = Data.formulas.heroNextExp(
        current.hero.level
      );

      leveledUp = true;
    }

    if (leveledUp) {
      heroPosition = State.getHeroPosition();

      State.addEffect({
        type: "heroLevel",
        x: heroPosition.x,
        y: heroPosition.y,
        life: 0.85,
        maxLife: 0.85,
        color: "#fde047"
      });

      toast(
        Data.hero.name +
        " Lv." +
        current.hero.level
      );
    }
  }

  function useHeroSkill() {
    var current = game();
    var position;
    var stats;
    var hitCount = 0;

    if (
      !current.started ||
      current.status !== "playing" ||
      current.paused ||
      current.sheetOpen ||
      State.isBlockingModal() ||
      current.hero.skillCooldown > 0
    ) {
      return;
    }

    position = State.getHeroPosition();
    stats = getHeroSkillStats();

    current.enemies.forEach(function (enemy) {
      if (
        !enemy.dead &&
        !enemy.escaped &&
        distance(
          position.x,
          position.y,
          enemy.x,
          enemy.y
        ) <= stats.radius
      ) {
        damageEnemy(
          enemy,

          enemy.boss
            ? stats.damage * 1.25
            : stats.damage,

          "skill"
        );

        hitCount += 1;
      }
    });

    current.hero.skillCooldown =
      stats.cooldown;

    current.screenShake = Math.max(
      current.screenShake,
      0.45
    );

    State.addEffect({
      type: "heroSkill",
      x: position.x,
      y: position.y,
      radius: stats.radius,
      life: 0.55,
      maxLife: 0.55,
      color: "#fde047"
    });

    toast(
      hitCount
        ? "성광 폭발 " + hitCount + "명 타격"
        : "성광 폭발"
    );

    State.save();
    refresh();
  }

  function cleanupEntities() {
    var current = game();

    current.enemies = current.enemies.filter(
      function (enemy) {
        return (
          !enemy.dead &&
          !enemy.escaped
        );
      }
    );

    current.projectiles = current.projectiles.filter(
      function (projectile) {
        return !projectile.done;
      }
    );
  }

  function checkWaveEnd() {
    var current = game();
    var completedWave;
    var wave;

    if (
      !current.waveRunning ||
      current.relicChoices.length > 0 ||
      current.spawnQueue.length > 0 ||
      current.enemies.length > 0
    ) {
      return;
    }

    completedWave = current.currentWave;
    wave = Data.waves[completedWave - 1];

    current.waveRunning = false;
    current.gold += wave.reward;

    State.addFloater(
      "+" + wave.reward + "G",
      4,
      4.8,
      "#facc15"
    );

    if (completedWave >= Data.waves.length) {
      current.status = "clear";
      current.currentWave = Data.waves.length;

      toast("v0.8.1 클리어");
    } else {
      current.currentWave += 1;

      toast(
        "Wave " +
        completedWave +
        " 완료"
      );

      if (current.autoWave) {
        current.autoStartTimer = 1.4;
      }
    }

    State.save();
    refresh();
  }

  function openRelicModal() {
    var current = game();

    current.relicChoices = pickRandomItems(
      Data.relics,
      3
    );

    if (
      window.Abyss.UI &&
      window.Abyss.UI.openRelicModal
    ) {
      window.Abyss.UI.openRelicModal(
        current.relicChoices
      );
    }

    refresh();
  }

  function selectRelic(relicId) {
    var current = game();

    var relic = Data.relics.find(function (item) {
      return item.id === relicId;
    });

    if (!relic) {
      return;
    }

    current.relics.push(relicId);

    if (relic.effects.baseRepair) {
      current.baseHp = Math.min(
        State.getMap().startBaseHp,

        current.baseHp +
        relic.effects.baseRepair
      );
    }

    current.relicChoices = [];

    if (
      window.Abyss.UI &&
      window.Abyss.UI.closeRelicModal
    ) {
      window.Abyss.UI.closeRelicModal();
    }

    toast(relic.name + " 획득");

    State.save();
    refresh();
  }

  function pickRandomItems(items, count) {
    var pool = items.slice();
    var index;
    var randomIndex;
    var temporary;

    for (
      index = pool.length - 1;
      index > 0;
      index -= 1
    ) {
      randomIndex = Math.floor(
        Math.random() *
        (index + 1)
      );

      temporary = pool[index];
      pool[index] = pool[randomIndex];
      pool[randomIndex] = temporary;
    }

    return pool.slice(0, count);
  }

  function updateEffects(dt) {
    var current = game();

    current.effects.forEach(function (effect) {
      effect.life -= dt;
    });

    current.effects = current.effects.filter(
      function (effect) {
        return effect.life > 0;
      }
    );

    current.floaters.forEach(function (floater) {
      floater.life -= dt;
      floater.y -= dt * 0.55;
    });

    current.floaters = current.floaters.filter(
      function (floater) {
        return floater.life > 0;
      }
    );
  }

  function findTarget(x, y, range) {
    var target = null;
    var bestProgress = -Infinity;

    game().enemies.forEach(function (enemy) {
      var progress;

      if (
        enemy.dead ||
        enemy.escaped ||
        distance(
          x,
          y,
          enemy.x,
          enemy.y
        ) > range
      ) {
        return;
      }

      progress =
        enemy.pathIndex * 100 -
        distanceToNextPoint(enemy);

      if (progress > bestProgress) {
        bestProgress = progress;
        target = enemy;
      }
    });

    return target;
  }

  function distanceToNextPoint(enemy) {
    var target =
      State.getPathPoints()[enemy.pathIndex];

    return target
      ? distance(
          enemy.x,
          enemy.y,
          target.x,
          target.y
        )
      : 0;
  }

  function toggleSpeed() {
    var current = game();

    current.speed =
      current.speed === 1
        ? 2
        : current.speed === 2
          ? 3
          : 1;

    State.save();
    refresh();
  }

  function togglePause() {
    var current = game();

    if (
      !current.started ||
      current.status !== "playing" ||
      State.isBlockingModal()
    ) {
      return;
    }

    current.paused = !current.paused;

    refresh();
  }

  function toggleAutoWave() {
    var current = game();

    current.autoWave =
      !current.autoWave;

    current.autoStartTimer = 0;

    State.save();
    refresh();
  }

  window.Abyss.Combat = {
    update: update,

    canStartWave: canStartWave,
    startWave: startWave,
    useHeroSkill: useHeroSkill,

    toggleBuildType: toggleBuildType,
    cancelSelection: cancelSelection,
    selectTower: selectTower,
    placeTower: placeTower,

    upgradeSelectedTower:
      upgradeSelectedTower,

    sellSelectedTower:
      sellSelectedTower,

    selectTowerTrait:
      selectTowerTrait,

    selectRelic: selectRelic,

    toggleSpeed: toggleSpeed,
    togglePause: togglePause,
    toggleAutoWave: toggleAutoWave,

    getTowerStats: getTowerStats,
    getHeroStats: getHeroStats,
    getHeroSkillStats: getHeroSkillStats,

    getTraitById: getTraitById,
    getRelicEffects: getRelicEffects,
    getRelicCounts: getRelicCounts,

    collectWaveTraits:
      collectWaveTraits,

    getMonsterTraitLabels:
      getMonsterTraitLabels,

    distance: distance
  };
}());
