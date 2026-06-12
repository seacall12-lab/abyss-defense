/* Abyss Defense v0.4 - Data Tables */
(function () {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const DATA = {
    version: "0.4.0",
    saveKey: "abyssDefense_v04_save",
    board: {
      cols: 8,
      rows: 10,
      startGold: 260,
      startBaseHp: 20,
      path: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 3 },
        { x: 5, y: 3 },
        { x: 5, y: 5 },
        { x: 1, y: 5 },
        { x: 1, y: 8 },
        { x: 6, y: 8 },
        { x: 6, y: 6 },
        { x: 7, y: 6 }
      ]
    },

    towers: {
      archer: {
        id: "archer",
        name: "궁수탑",
        shortName: "궁수",
        symbol: "➹",
        color: "#73d13d",
        cost: 70,
        baseDamage: 18,
        baseRange: 2.6,
        baseAttackInterval: 0.72,
        maxLevel: 6,
        description: "빠른 단일 공격"
      },
      cannon: {
        id: "cannon",
        name: "대포탑",
        shortName: "대포",
        symbol: "●",
        color: "#ff9f43",
        cost: 115,
        baseDamage: 42,
        baseRange: 2.25,
        baseAttackInterval: 1.45,
        splashRadius: 0.82,
        maxLevel: 6,
        description: "느리지만 범위 피해"
      },
      ice: {
        id: "ice",
        name: "얼음탑",
        shortName: "얼음",
        symbol: "❄",
        color: "#4dd0e1",
        cost: 95,
        baseDamage: 9,
        baseRange: 2.35,
        baseAttackInterval: 1.05,
        slowFactor: 0.48,
        slowDuration: 1.55,
        maxLevel: 6,
        description: "피해와 둔화"
      },
      lightning: {
        id: "lightning",
        name: "번개탑",
        shortName: "번개",
        symbol: "ϟ",
        color: "#b37feb",
        cost: 135,
        baseDamage: 27,
        baseRange: 2.55,
        baseAttackInterval: 0.98,
        chainCount: 3,
        chainRange: 1.85,
        maxLevel: 6,
        description: "연쇄 번개 공격"
      }
    },

    monsters: {
      slime: {
        id: "slime",
        name: "슬라임",
        color: "#60d394",
        aura: "#b8f2cf",
        radius: 0.26,
        hp: 42,
        speed: 0.82,
        gold: 8,
        exp: 8
      },
      bat: {
        id: "bat",
        name: "박쥐",
        color: "#8e8cff",
        aura: "#c7c5ff",
        radius: 0.23,
        hp: 34,
        speed: 1.32,
        gold: 9,
        exp: 8
      },
      goblin: {
        id: "goblin",
        name: "고블린",
        color: "#a3e635",
        aura: "#d9f99d",
        radius: 0.27,
        hp: 68,
        speed: 1.03,
        gold: 11,
        exp: 11
      },
      wolf: {
        id: "wolf",
        name: "늑대",
        color: "#c0c6cf",
        aura: "#e5e7eb",
        radius: 0.29,
        hp: 88,
        speed: 1.18,
        gold: 13,
        exp: 13
      },
      golem: {
        id: "golem",
        name: "골렘",
        color: "#a67c52",
        aura: "#e0b084",
        radius: 0.34,
        hp: 180,
        speed: 0.62,
        gold: 20,
        exp: 22
      },
      darkPriest: {
        id: "darkPriest",
        name: "암흑 사제",
        color: "#a855f7",
        aura: "#d8b4fe",
        radius: 0.3,
        hp: 145,
        speed: 0.84,
        gold: 22,
        exp: 24
      },
      shadowKnight: {
        id: "shadowKnight",
        name: "그림자 기사",
        color: "#64748b",
        aura: "#cbd5e1",
        radius: 0.33,
        hp: 240,
        speed: 0.88,
        gold: 28,
        exp: 32
      },
      bossGolem: {
        id: "bossGolem",
        name: "보스 골렘",
        color: "#ef4444",
        aura: "#fca5a5",
        radius: 0.48,
        hp: 760,
        speed: 0.48,
        gold: 90,
        exp: 105,
        boss: true
      },
      abyssLord: {
        id: "abyssLord",
        name: "심연 군주",
        color: "#111827",
        aura: "#f59e0b",
        radius: 0.56,
        hp: 1450,
        speed: 0.42,
        gold: 180,
        exp: 220,
        boss: true
      }
    },

    waves: [
      { id: 1, name: "말랑한 침입", reward: 22, groups: [{ type: "slime", count: 8, gap: 0.82 }] },
      { id: 2, name: "동굴 박쥐", reward: 25, groups: [{ type: "slime", count: 7, gap: 0.75 }, { type: "bat", count: 5, gap: 0.62 }] },
      { id: 3, name: "고블린 정찰대", reward: 28, groups: [{ type: "goblin", count: 9, gap: 0.72 }, { type: "slime", count: 5, gap: 0.55 }] },
      { id: 4, name: "빠른 늑대", reward: 32, groups: [{ type: "bat", count: 7, gap: 0.55 }, { type: "wolf", count: 7, gap: 0.7 }] },
      { id: 5, name: "준보스: 바위 골렘", reward: 48, groups: [{ type: "golem", count: 5, gap: 0.9, hpScale: 1.08 }, { type: "bossGolem", count: 1, gap: 1.2, hpScale: 0.55 }] },
      { id: 6, name: "늪지 무리", reward: 38, groups: [{ type: "slime", count: 12, gap: 0.46, hpScale: 1.15 }, { type: "goblin", count: 8, gap: 0.62 }] },
      { id: 7, name: "밤의 습격", reward: 42, groups: [{ type: "bat", count: 12, gap: 0.42 }, { type: "wolf", count: 8, gap: 0.58 }] },
      { id: 8, name: "암흑 사제", reward: 45, groups: [{ type: "darkPriest", count: 8, gap: 0.75 }, { type: "goblin", count: 10, gap: 0.5 }] },
      { id: 9, name: "돌과 그림자", reward: 50, groups: [{ type: "golem", count: 7, gap: 0.78 }, { type: "shadowKnight", count: 5, gap: 0.82 }] },
      { id: 10, name: "보스: 붉은 골렘", reward: 75, groups: [{ type: "wolf", count: 10, gap: 0.48 }, { type: "bossGolem", count: 1, gap: 1.0, hpScale: 1.0 }] },
      { id: 11, name: "깊은 균열", reward: 58, groups: [{ type: "slime", count: 14, gap: 0.36, hpScale: 1.35 }, { type: "darkPriest", count: 8, gap: 0.62 }] },
      { id: 12, name: "그림자 기동대", reward: 62, groups: [{ type: "bat", count: 14, gap: 0.34, hpScale: 1.25 }, { type: "shadowKnight", count: 7, gap: 0.7 }] },
      { id: 13, name: "골렘 행진", reward: 66, groups: [{ type: "golem", count: 10, gap: 0.68, hpScale: 1.18 }, { type: "goblin", count: 10, gap: 0.42, hpScale: 1.28 }] },
      { id: 14, name: "사제의 의식", reward: 72, groups: [{ type: "darkPriest", count: 12, gap: 0.56, hpScale: 1.15 }, { type: "wolf", count: 10, gap: 0.42, hpScale: 1.2 }] },
      { id: 15, name: "준보스: 심연의 쌍둥이", reward: 105, groups: [{ type: "shadowKnight", count: 9, gap: 0.58, hpScale: 1.18 }, { type: "bossGolem", count: 2, gap: 1.25, hpScale: 0.92 }] },
      { id: 16, name: "검은 파도", reward: 82, groups: [{ type: "slime", count: 18, gap: 0.3, hpScale: 1.5 }, { type: "bat", count: 16, gap: 0.3, hpScale: 1.35 }] },
      { id: 17, name: "강철 그림자", reward: 88, groups: [{ type: "shadowKnight", count: 12, gap: 0.55, hpScale: 1.32 }, { type: "golem", count: 8, gap: 0.68, hpScale: 1.32 }] },
      { id: 18, name: "타락한 성직자", reward: 96, groups: [{ type: "darkPriest", count: 14, gap: 0.48, hpScale: 1.35 }, { type: "wolf", count: 14, gap: 0.36, hpScale: 1.35 }] },
      { id: 19, name: "마지막 방어선", reward: 110, groups: [{ type: "golem", count: 12, gap: 0.52, hpScale: 1.45 }, { type: "shadowKnight", count: 12, gap: 0.52, hpScale: 1.45 }] },
      { id: 20, name: "최종 보스: 심연 군주", reward: 250, groups: [{ type: "darkPriest", count: 10, gap: 0.42, hpScale: 1.5 }, { type: "bossGolem", count: 2, gap: 1.0, hpScale: 1.15 }, { type: "abyssLord", count: 1, gap: 1.2, hpScale: 1.0 }] }
    ],

    hero: {
      name: "아리아",
      title: "심연 수호자",
      x: 3.5,
      y: 6.55,
      baseDamage: 16,
      baseRange: 2.15,
      baseAttackInterval: 0.86,
      projectileColor: "#fde047"
    },

    formulas: {
      towerStats(tower, level) {
        const lv = Math.max(1, level || 1);
        return {
          damage: Math.round(tower.baseDamage * (1 + (lv - 1) * 0.34)),
          range: Number((tower.baseRange + (lv - 1) * 0.08).toFixed(2)),
          attackInterval: Number(Math.max(0.28, tower.baseAttackInterval * (1 - (lv - 1) * 0.055)).toFixed(2)),
          splashRadius: tower.splashRadius ? Number((tower.splashRadius + (lv - 1) * 0.04).toFixed(2)) : 0,
          slowFactor: tower.slowFactor ? clamp(tower.slowFactor - (lv - 1) * 0.025, 0.3, 0.9) : 0,
          slowDuration: tower.slowDuration ? Number((tower.slowDuration + (lv - 1) * 0.08).toFixed(2)) : 0,
          chainCount: tower.chainCount ? Math.min(5, tower.chainCount + Math.floor((lv - 1) / 2)) : 0,
          chainRange: tower.chainRange ? Number((tower.chainRange + (lv - 1) * 0.05).toFixed(2)) : 0
        };
      },
      towerUpgradeCost(tower, level) {
        if (level >= tower.maxLevel) return null;
        return Math.round(tower.cost * (0.72 + level * 0.42));
      },
      towerInvestedGold(tower, level) {
        let total = tower.cost;
        for (let lv = 1; lv < level; lv += 1) {
          total += Math.round(tower.cost * (0.72 + lv * 0.42));
        }
        return total;
      },
      towerSellValue(tower, level) {
        return Math.floor(DATA.formulas.towerInvestedGold(tower, level) * 0.65);
      },
      monsterStats(monster, waveId, hpScale) {
        const waveFactor = 1 + Math.max(0, waveId - 1) * 0.115;
        return {
          hp: Math.round(monster.hp * waveFactor * (hpScale || 1)),
          speed: Number((monster.speed * (1 + Math.max(0, waveId - 1) * 0.006)).toFixed(3)),
          gold: Math.round(monster.gold * (1 + Math.max(0, waveId - 1) * 0.035)),
          exp: Math.round(monster.exp * (1 + Math.max(0, waveId - 1) * 0.04))
        };
      },
      heroStats(hero, level) {
        const lv = Math.max(1, level || 1);
        return {
          damage: Math.round(hero.baseDamage + (lv - 1) * 4.2),
          range: Number((hero.baseRange + Math.floor((lv - 1) / 3) * 0.12).toFixed(2)),
          attackInterval: Number(Math.max(0.48, hero.baseAttackInterval - (lv - 1) * 0.022).toFixed(2))
        };
      },
      heroNextExp(level) {
        const lv = Math.max(1, level || 1);
        return Math.round(36 + lv * 24 + lv * lv * 5);
      }
    }
  };

  window.ABYSS_DATA = DATA;
})();
