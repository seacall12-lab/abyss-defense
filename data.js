/* Abyss Defense v0.7.1 - Data Tables */
(function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const DATA = {
    version: "0.7.1",
    saveKey: "abyssDefense_v071_save",

    board: {
      cols: 8,
      rows: 10
    },

    maps: {
      abyssGate: {
        id: "abyssGate",
        name: "심연 입구",
        difficulty: "쉬움",
        description: "경로가 길고 설치 공간이 넓은 기본 맵",
        startGold: 290,
        startBaseHp: 24,
        bgTop: "#0f172a",
        bgBottom: "#111827",
        pathOuter: "rgba(88, 69, 45, 0.94)",
        pathInner: "rgba(191, 132, 69, 0.96)",
        decor: "stone",
        monsterHpPct: 0,
        regenBonusPct: 0,
        path: [
          { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 3 },
          { x: 5, y: 3 }, { x: 5, y: 5 }, { x: 1, y: 5 }, { x: 1, y: 8 },
          { x: 6, y: 8 }, { x: 6, y: 6 }, { x: 7, y: 6 }
        ],
        blocked: []
      },

      riftCanyon: {
        id: "riftCanyon",
        name: "균열 협곡",
        difficulty: "보통",
        description: "경로가 짧고 중앙 화력 집중이 중요한 맵",
        startGold: 305,
        startBaseHp: 21,
        bgTop: "#111133",
        bgBottom: "#160f2f",
        pathOuter: "rgba(59, 7, 100, 0.94)",
        pathInner: "rgba(147, 51, 234, 0.72)",
        decor: "rift",
        monsterHpPct: 0.03,
        regenBonusPct: 0,
        path: [
          { x: 0, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 6 }, { x: 4, y: 6 },
          { x: 4, y: 1 }, { x: 6, y: 1 }, { x: 6, y: 7 }, { x: 7, y: 7 }
        ],
        blocked: [
          { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }
        ]
      },

      toxicSwamp: {
        id: "toxicSwamp",
        name: "오염된 늪",
        difficulty: "어려움",
        description: "설치 공간이 좁고 재생/독저항 적이 강화되는 맵",
        startGold: 320,
        startBaseHp: 20,
        bgTop: "#102114",
        bgBottom: "#17200f",
        pathOuter: "rgba(55, 65, 81, 0.95)",
        pathInner: "rgba(101, 163, 13, 0.62)",
        decor: "swamp",
        monsterHpPct: 0.06,
        regenBonusPct: 0.25,
        path: [
          { x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 2 }, { x: 1, y: 2 },
          { x: 1, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 4 }, { x: 6, y: 4 },
          { x: 6, y: 9 }, { x: 7, y: 9 }
        ],
        blocked: [
          { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 5, y: 6 }, { x: 5, y: 7 }, { x: 2, y: 8 }
        ]
      }
    },

    monsterTraits: {
      flying: { name: "비행", symbol: "비행", description: "대포 피해를 덜 받습니다." },
      armored: { name: "중장갑", symbol: "장갑", description: "일반 피해를 덜 받지만 독과 대포에 약합니다." },
      regen: { name: "재생", symbol: "재생", description: "시간이 지나면 HP를 조금 회복합니다." },
      shield: { name: "보호막", symbol: "방어막", description: "추가 보호막을 가지고 등장합니다." },
      darkAura: { name: "암흑 오라", symbol: "오라", description: "주변 몬스터의 이동 속도를 올립니다." },
      toxicResist: { name: "독 저항", symbol: "독저항", description: "독 피해를 덜 받습니다." },
      boss: { name: "보스", symbol: "보스", description: "상태이상 효과를 일부 저항합니다." }
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
        traitUnlockLevel: 3,
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
        traitUnlockLevel: 3,
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
        traitUnlockLevel: 3,
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
        traitUnlockLevel: 3,
        description: "연쇄 번개 공격"
      },
      poison: {
        id: "poison",
        name: "독성탑",
        shortName: "독성",
        symbol: "☠",
        color: "#84cc16",
        cost: 125,
        baseDamage: 10,
        baseRange: 2.28,
        baseAttackInterval: 1.05,
        dotDamagePerSecond: 11,
        dotDuration: 3.2,
        maxLevel: 6,
        traitUnlockLevel: 3,
        description: "지속 독 피해"
      }
    },

    towerTraits: {
      archer: [
        { id: "archer_sniper", name: "저격형", summary: "공격력과 사거리가 증가하지만 공격속도가 조금 느려집니다.", effectText: "공격력 +35%, 사거리 +0.2" },
        { id: "archer_rapid", name: "연사형", summary: "공격속도가 크게 증가하지만 한 발 피해가 조금 낮아집니다.", effectText: "공격속도 +28%, 공격력 -12%" }
      ],
      cannon: [
        { id: "cannon_blast", name: "광역형", summary: "폭발 범위가 증가합니다. 다수의 적에게 강합니다.", effectText: "폭발 범위 +0.32" },
        { id: "cannon_siege", name: "중포형", summary: "보스에게 큰 추가 피해를 줍니다.", effectText: "보스 피해 +50%" }
      ],
      ice: [
        { id: "ice_freeze", name: "빙결형", summary: "낮은 확률로 적을 짧게 얼립니다.", effectText: "빙결 확률 추가" },
        { id: "ice_chill", name: "냉기형", summary: "주변 적에게도 둔화를 퍼뜨립니다.", effectText: "둔화 범위 효과 추가" }
      ],
      lightning: [
        { id: "lightning_chain", name: "연쇄형", summary: "번개가 더 많은 적에게 튕깁니다.", effectText: "연쇄 수 +2" },
        { id: "lightning_shock", name: "감전형", summary: "피격 대상이 잠시 더 많은 피해를 받습니다.", effectText: "취약 효과 부여" }
      ],
      poison: [
        { id: "poison_venom", name: "맹독형", summary: "지속 피해가 크게 증가합니다.", effectText: "독 지속 피해 +55%" },
        { id: "poison_cloud", name: "독구름형", summary: "대상 주변에 약한 독 피해를 퍼뜨립니다.", effectText: "주변 독 확산" }
      ]
    },

    monsters: {
      slime: { id: "slime", name: "슬라임", color: "#60d394", aura: "#b8f2cf", radius: 0.27, hp: 42, speed: 0.82, gold: 8, exp: 8, traits: [] },
      bat: { id: "bat", name: "박쥐", color: "#8e8cff", aura: "#c7c5ff", radius: 0.23, hp: 34, speed: 1.32, gold: 9, exp: 8, traits: ["flying"] },
      goblin: { id: "goblin", name: "고블린", color: "#a3e635", aura: "#d9f99d", radius: 0.28, hp: 68, speed: 1.03, gold: 11, exp: 11, traits: [] },
      wolf: { id: "wolf", name: "늑대", color: "#c0c6cf", aura: "#e5e7eb", radius: 0.3, hp: 88, speed: 1.18, gold: 13, exp: 13, traits: [] },
      plagueCrawler: { id: "plagueCrawler", name: "역병 크롤러", color: "#4ade80", aura: "#bbf7d0", radius: 0.31, hp: 110, speed: 0.88, gold: 16, exp: 17, traits: ["toxicResist", "regen"] },
      golem: { id: "golem", name: "골렘", color: "#a67c52", aura: "#e0b084", radius: 0.35, hp: 180, speed: 0.62, gold: 20, exp: 22, traits: ["armored"] },
      darkPriest: { id: "darkPriest", name: "암흑 사제", color: "#a855f7", aura: "#d8b4fe", radius: 0.31, hp: 145, speed: 0.84, gold: 22, exp: 24, traits: ["darkAura"] },
      shieldImp: { id: "shieldImp", name: "방패 임프", color: "#38bdf8", aura: "#bae6fd", radius: 0.3, hp: 125, speed: 0.94, gold: 19, exp: 21, traits: ["shield"] },
      shadowKnight: { id: "shadowKnight", name: "그림자 기사", color: "#64748b", aura: "#cbd5e1", radius: 0.34, hp: 240, speed: 0.88, gold: 28, exp: 32, traits: ["armored", "shield"] },
      bossGolem: { id: "bossGolem", name: "보스 골렘", color: "#ef4444", aura: "#fca5a5", radius: 0.5, hp: 760, speed: 0.48, gold: 90, exp: 105, traits: ["boss", "armored", "shield"], boss: true },
      abyssLord: { id: "abyssLord", name: "심연 군주", color: "#111827", aura: "#f59e0b", radius: 0.58, hp: 1450, speed: 0.42, gold: 180, exp: 220, traits: ["boss", "darkAura", "shield"], boss: true }
    },

    waves: [
      { id: 1, name: "말랑한 침입", reward: 22, recommendation: "기본 궁수탑으로 충분합니다.", groups: [{ type: "slime", count: 8, gap: 0.82 }] },
      { id: 2, name: "동굴 박쥐", reward: 25, recommendation: "비행 몬스터가 등장합니다. 궁수와 번개가 유리합니다.", groups: [{ type: "slime", count: 7, gap: 0.75 }, { type: "bat", count: 5, gap: 0.62 }] },
      { id: 3, name: "고블린 정찰대", reward: 28, recommendation: "적 수가 늘어납니다. 타워 수를 확보하세요.", groups: [{ type: "goblin", count: 9, gap: 0.72 }, { type: "slime", count: 5, gap: 0.55 }] },
      { id: 4, name: "빠른 늑대", reward: 32, recommendation: "빠른 적이 많습니다. 얼음탑이 효과적입니다.", groups: [{ type: "bat", count: 7, gap: 0.55 }, { type: "wolf", count: 7, gap: 0.7 }] },
      { id: 5, name: "준보스: 바위 골렘", reward: 48, boss: true, recommendation: "중장갑 보스입니다. 대포와 독성탑이 유리합니다.", groups: [{ type: "golem", count: 5, gap: 0.9, hpScale: 1.08 }, { type: "bossGolem", count: 1, gap: 1.2, hpScale: 0.55 }] },
      { id: 6, name: "늪지 무리", reward: 38, recommendation: "적이 많이 몰려옵니다. 대포 광역 피해가 좋습니다.", groups: [{ type: "slime", count: 12, gap: 0.46, hpScale: 1.15 }, { type: "goblin", count: 8, gap: 0.62 }] },
      { id: 7, name: "하늘과 늑대", reward: 42, recommendation: "비행과 빠른 적이 섞입니다. 궁수/얼음 조합이 안정적입니다.", groups: [{ type: "bat", count: 12, gap: 0.42 }, { type: "wolf", count: 8, gap: 0.58 }] },
      { id: 8, name: "역병의 발소리", reward: 46, recommendation: "독 저항과 재생 특성이 있습니다. 번개와 대포로 빠르게 처리하세요.", groups: [{ type: "plagueCrawler", count: 9, gap: 0.58 }, { type: "goblin", count: 9, gap: 0.48 }] },
      { id: 9, name: "암흑 사제", reward: 50, recommendation: "암흑 오라는 주변 적을 빠르게 합니다. 사제를 우선 처치하세요.", groups: [{ type: "darkPriest", count: 8, gap: 0.75 }, { type: "shieldImp", count: 6, gap: 0.62 }] },
      { id: 10, name: "보스: 붉은 골렘", reward: 78, boss: true, recommendation: "보호막과 중장갑을 가진 보스입니다. 대포 중포형이 강합니다.", groups: [{ type: "wolf", count: 10, gap: 0.48 }, { type: "bossGolem", count: 1, gap: 1.0, hpScale: 1.0 }] },
      { id: 11, name: "깊은 균열", reward: 60, recommendation: "재생 적과 일반 적이 섞입니다. 지속 피해만 믿기보다는 화력을 보강하세요.", groups: [{ type: "slime", count: 14, gap: 0.36, hpScale: 1.35 }, { type: "plagueCrawler", count: 8, gap: 0.62 }] },
      { id: 12, name: "그림자 기동대", reward: 64, recommendation: "방패와 장갑을 가진 적이 등장합니다. 독성/대포가 유리합니다.", groups: [{ type: "bat", count: 12, gap: 0.34, hpScale: 1.25 }, { type: "shadowKnight", count: 6, gap: 0.72 }] },
      { id: 13, name: "골렘 행진", reward: 70, recommendation: "중장갑 적이 많습니다. 대포와 독성탑을 강화하세요.", groups: [{ type: "golem", count: 10, gap: 0.68, hpScale: 1.18 }, { type: "shieldImp", count: 8, gap: 0.5, hpScale: 1.2 }] },
      { id: 14, name: "사제의 의식", reward: 76, recommendation: "암흑 오라가 위험합니다. 번개 연쇄나 히어로 스킬로 정리하세요.", groups: [{ type: "darkPriest", count: 12, gap: 0.56, hpScale: 1.15 }, { type: "wolf", count: 10, gap: 0.42, hpScale: 1.2 }] },
      { id: 15, name: "준보스: 심연의 쌍둥이", reward: 108, boss: true, recommendation: "보스 2마리가 등장합니다. 보스 특화 대포와 히어로 스킬을 준비하세요.", groups: [{ type: "shadowKnight", count: 9, gap: 0.58, hpScale: 1.18 }, { type: "bossGolem", count: 2, gap: 1.25, hpScale: 0.92 }] },
      { id: 16, name: "검은 파도", reward: 86, recommendation: "수량이 많고 비행도 섞입니다. 광역과 연쇄가 중요합니다.", groups: [{ type: "slime", count: 18, gap: 0.3, hpScale: 1.5 }, { type: "bat", count: 16, gap: 0.3, hpScale: 1.35 }] },
      { id: 17, name: "오염된 강철", reward: 92, recommendation: "재생과 중장갑이 섞입니다. 딜 부족이면 히어로 스킬을 아끼지 마세요.", groups: [{ type: "plagueCrawler", count: 12, gap: 0.44, hpScale: 1.42 }, { type: "golem", count: 8, gap: 0.68, hpScale: 1.32 }] },
      { id: 18, name: "타락한 성직자", reward: 100, recommendation: "암흑 오라와 빠른 적 조합입니다. 얼음 냉기형과 번개가 좋습니다.", groups: [{ type: "darkPriest", count: 14, gap: 0.48, hpScale: 1.35 }, { type: "wolf", count: 14, gap: 0.36, hpScale: 1.35 }] },
      { id: 19, name: "마지막 방어선", reward: 115, recommendation: "장갑과 보호막 적이 많습니다. 대포/독성/히어로 화력이 필요합니다.", groups: [{ type: "golem", count: 12, gap: 0.52, hpScale: 1.45 }, { type: "shadowKnight", count: 12, gap: 0.52, hpScale: 1.45 }] },
      { id: 20, name: "최종 보스: 심연 군주", reward: 260, boss: true, recommendation: "최종 보스입니다. 보스 특화, 유물 효과, 히어로 스킬을 모두 활용하세요.", groups: [{ type: "darkPriest", count: 10, gap: 0.42, hpScale: 1.5 }, { type: "bossGolem", count: 2, gap: 1.0, hpScale: 1.15 }, { type: "abyssLord", count: 1, gap: 1.2, hpScale: 1.0 }] }
    ],

    hero: {
      name: "아리아",
      title: "심연 수호자",
      x: 3.5,
      y: 6.55,
      baseDamage: 16,
      baseRange: 2.15,
      baseAttackInterval: 0.86,
      skillName: "성광 폭발",
      skillCooldown: 18,
      skillRadius: 2.45,
      projectileColor: "#fde047"
    },

    heroPassives: [
      { level: 3, name: "전투 집중", description: "히어로 공격력 +8%", effects: { heroDamagePct: 0.08 } },
      { level: 5, name: "성광 숙련", description: "스킬 피해 +15%", effects: { skillDamagePct: 0.15 } },
      { level: 7, name: "수호자의 시야", description: "히어로 사거리 +0.15", effects: { heroRangeFlat: 0.15 } },
      { level: 10, name: "전장의 호흡", description: "스킬 쿨타임 -12%", effects: { skillCooldownPct: 0.12 } }
    ],

    relics: [
      { id: "hawkFeather", name: "매의 깃털", description: "궁수탑 공격속도 +10%", effects: { archerAttackSpeedPct: 0.1 } },
      { id: "abyssPowder", name: "심연의 화약", description: "대포탑 폭발 범위 +12%", effects: { cannonSplashPct: 0.12 } },
      { id: "frozenCore", name: "얼어붙은 핵", description: "얼음탑 둔화 지속시간 +12%", effects: { iceSlowDurationPct: 0.12 } },
      { id: "stormCoil", name: "폭풍 코일", description: "번개탑 연쇄 수 +1", effects: { lightningChainFlat: 1 } },
      { id: "venomVial", name: "맹독 약병", description: "독성탑 독 피해 +15%", effects: { poisonDamagePct: 0.15 } },
      { id: "heroEmblem", name: "영웅의 문장", description: "히어로 공격력 +12%", effects: { heroDamagePct: 0.12 } },
      { id: "goldenFang", name: "황금 송곳니", description: "몬스터 처치 골드 +10%", effects: { goldGainPct: 0.1 } },
      { id: "towerSigil", name: "방어의 인장", description: "모든 타워 공격력 +8%", effects: { towerDamagePct: 0.08 } },
      { id: "sunShard", name: "태양 파편", description: "성광 폭발 피해 +20%", effects: { skillDamagePct: 0.2 } },
      { id: "repairRune", name: "수복 룬", description: "선택 즉시 Base HP +2 회복", effects: { baseRepair: 2 } }
    ],

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
          chainRange: tower.chainRange ? Number((tower.chainRange + (lv - 1) * 0.05).toFixed(2)) : 0,
          dotDamagePerSecond: tower.dotDamagePerSecond ? Math.round(tower.dotDamagePerSecond * (1 + (lv - 1) * 0.28)) : 0,
          dotDuration: tower.dotDuration ? Number((tower.dotDuration + (lv - 1) * 0.12).toFixed(2)) : 0
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

      monsterStats(monster, waveId, hpScale, map) {
        const waveFactor = 1 + Math.max(0, waveId - 1) * 0.115;
        const mapHpFactor = map && map.monsterHpPct ? 1 + map.monsterHpPct : 1;
        return {
          hp: Math.round(monster.hp * waveFactor * (hpScale || 1) * mapHpFactor),
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
}());
