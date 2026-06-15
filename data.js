(function () {
  "use strict";

  window.Abyss = window.Abyss || {};

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function group(type, count, gap, hpScale) {
    return {
      type: type,
      count: count,
      gap: gap,
      hpScale: hpScale || 1
    };
  }

  function wave(id, name, reward, recommendation, groups, boss) {
    return {
      id: id,
      name: name,
      reward: reward,
      recommendation: recommendation,
      groups: groups,
      boss: !!boss
    };
  }

  var Data = {
    version: "0.8.1",
    saveKey: "abyssDefense_v081_save",

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
        hero: { x: 3.5, y: 6.55 },
        bgTop: "#0f172a",
        bgBottom: "#111827",
        pathOuter: "rgba(88,69,45,0.94)",
        pathInner: "rgba(191,132,69,0.96)",
        decor: "stone",
        monsterHpPct: 0,
        regenBonusPct: 0,
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
        ],
        blocked: []
      },

      riftCanyon: {
        id: "riftCanyon",
        name: "균열 협곡",
        difficulty: "보통",
        description: "중앙 화력 집중이 중요한 굴곡형 맵",
        startGold: 305,
        startBaseHp: 21,
        hero: { x: 3.5, y: 8.4 },
        bgTop: "#111133",
        bgBottom: "#160f2f",
        pathOuter: "rgba(59,7,100,0.94)",
        pathInner: "rgba(147,51,234,0.72)",
        decor: "rift",
        monsterHpPct: 0.03,
        regenBonusPct: 0,
        path: [
          { x: 0, y: 2 },
          { x: 2, y: 2 },
          { x: 2, y: 6 },
          { x: 4, y: 6 },
          { x: 4, y: 1 },
          { x: 6, y: 1 },
          { x: 6, y: 7 },
          { x: 7, y: 7 }
        ],
        blocked: [
          { x: 3, y: 3 },
          { x: 3, y: 4 },
          { x: 4, y: 4 },
          { x: 5, y: 4 }
        ]
      },

      toxicSwamp: {
        id: "toxicSwamp",
        name: "오염된 늪",
        difficulty: "어려움",
        description: "설치 공간이 좁고 재생 몬스터가 강화되는 맵",
        startGold: 320,
        startBaseHp: 20,
        hero: { x: 3.2, y: 8.15 },
        bgTop: "#102114",
        bgBottom: "#17200f",
        pathOuter: "rgba(55,65,81,0.95)",
        pathInner: "rgba(101,163,13,0.62)",
        decor: "swamp",
        monsterHpPct: 0.06,
        regenBonusPct: 0.25,
        path: [
          { x: 0, y: 0 },
          { x: 3, y: 0 },
          { x: 3, y: 2 },
          { x: 1, y: 2 },
          { x: 1, y: 6 },
          { x: 4, y: 6 },
          { x: 4, y: 4 },
          { x: 6, y: 4 },
          { x: 6, y: 9 },
          { x: 7, y: 9 }
        ],
        blocked: [
          { x: 2, y: 4 },
          { x: 3, y: 4 },
          { x: 5, y: 6 },
          { x: 5, y: 7 },
          { x: 2, y: 8 }
        ]
      }
    },

    monsterTraits: {
      flying: { name: "비행", symbol: "비행" },
      armored: { name: "중장갑", symbol: "장갑" },
      regen: { name: "재생", symbol: "재생" },
      shield: { name: "보호막", symbol: "방어막" },
      darkAura: { name: "암흑 오라", symbol: "오라" },
      toxicResist: { name: "독 저항", symbol: "독저항" },
      boss: { name: "보스", symbol: "보스" }
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
        description: "범위 폭발 공격"
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
        description: "연쇄 번개"
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
        {
          id: "archer_sniper",
          name: "저격형",
          summary: "공격력과 사거리 증가",
          effectText: "공격력 +35%, 사거리 +0.2"
        },
        {
          id: "archer_rapid",
          name: "연사형",
          summary: "공격속도 증가",
          effectText: "공격속도 +28%, 공격력 -12%"
        }
      ],

      cannon: [
        {
          id: "cannon_blast",
          name: "광역형",
          summary: "폭발 범위 증가",
          effectText: "폭발 범위 +0.32"
        },
        {
          id: "cannon_siege",
          name: "중포형",
          summary: "보스 추가 피해",
          effectText: "보스 피해 +50%"
        }
      ],

      ice: [
        {
          id: "ice_freeze",
          name: "빙결형",
          summary: "확률적으로 짧게 빙결",
          effectText: "빙결 확률 추가"
        },
        {
          id: "ice_chill",
          name: "냉기형",
          summary: "주변 적에게 둔화 확산",
          effectText: "범위 둔화 추가"
        }
      ],

      lightning: [
        {
          id: "lightning_chain",
          name: "연쇄형",
          summary: "더 많은 적에게 전이",
          effectText: "연쇄 수 +2"
        },
        {
          id: "lightning_shock",
          name: "감전형",
          summary: "피격 대상 취약",
          effectText: "받는 피해 +15%"
        }
      ],

      poison: [
        {
          id: "poison_venom",
          name: "맹독형",
          summary: "독 지속 피해 강화",
          effectText: "독 피해 +55%"
        },
        {
          id: "poison_cloud",
          name: "독구름형",
          summary: "주변 적에게 독 확산",
          effectText: "범위 독 추가"
        }
      ]
    },

    monsters: {
      slime: {
        id: "slime",
        name: "슬라임",
        color: "#60d394",
        aura: "#b8f2cf",
        radius: 0.27,
        hp: 42,
        speed: 0.82,
        gold: 8,
        exp: 8,
        traits: []
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
        exp: 8,
        traits: ["flying"]
      },

      goblin: {
        id: "goblin",
        name: "고블린",
        color: "#a3e635",
        aura: "#d9f99d",
        radius: 0.28,
        hp: 68,
        speed: 1.03,
        gold: 11,
        exp: 11,
        traits: []
      },

      wolf: {
        id: "wolf",
        name: "늑대",
        color: "#c0c6cf",
        aura: "#e5e7eb",
        radius: 0.3,
        hp: 88,
        speed: 1.18,
        gold: 13,
        exp: 13,
        traits: []
      },

      plagueCrawler: {
        id: "plagueCrawler",
        name: "역병 크롤러",
        color: "#4ade80",
        aura: "#bbf7d0",
        radius: 0.31,
        hp: 110,
        speed: 0.88,
        gold: 16,
        exp: 17,
        traits: ["toxicResist", "regen"]
      },

      golem: {
        id: "golem",
        name: "골렘",
        color: "#a67c52",
        aura: "#e0b084",
        radius: 0.35,
        hp: 180,
        speed: 0.62,
        gold: 20,
        exp: 22,
        traits: ["armored"]
      },

      darkPriest: {
        id: "darkPriest",
        name: "암흑 사제",
        color: "#a855f7",
        aura: "#d8b4fe",
        radius: 0.31,
        hp: 145,
        speed: 0.84,
        gold: 22,
        exp: 24,
        traits: ["darkAura"]
      },

      shieldImp: {
        id: "shieldImp",
        name: "방패 임프",
        color: "#38bdf8",
        aura: "#bae6fd",
        radius: 0.3,
        hp: 125,
        speed: 0.94,
        gold: 19,
        exp: 21,
        traits: ["shield"]
      },

      shadowKnight: {
        id: "shadowKnight",
        name: "그림자 기사",
        color: "#64748b",
        aura: "#cbd5e1",
        radius: 0.34,
        hp: 240,
        speed: 0.88,
        gold: 28,
        exp: 32,
        traits: ["armored", "shield"]
      },

      bossGolem: {
        id: "bossGolem",
        name: "보스 골렘",
        color: "#ef4444",
        aura: "#fca5a5",
        radius: 0.5,
        hp: 760,
        speed: 0.48,
        gold: 90,
        exp: 105,
        traits: ["boss", "armored", "shield"],
        boss: true
      },

      abyssLord: {
        id: "abyssLord",
        name: "심연 군주",
        color: "#111827",
        aura: "#f59e0b",
        radius: 0.58,
        hp: 1450,
        speed: 0.42,
        gold: 180,
        exp: 220,
        traits: ["boss", "darkAura", "shield"],
        boss: true
      }
    },

    hero: {
      name: "아리아",
      title: "심연 수호자",
      baseDamage: 16,
      baseRange: 2.15,
      baseAttackInterval: 0.86,
      skillName: "성광 폭발",
      skillCooldown: 18,
      skillRadius: 2.45,
      projectileColor: "#fde047"
    },

    heroPassives: [
      {
        level: 3,
        name: "전투 집중",
        description: "히어로 공격력 +8%",
        effects: { heroDamagePct: 0.08 }
      },
      {
        level: 5,
        name: "성광 숙련",
        description: "스킬 피해 +15%",
        effects: { skillDamagePct: 0.15 }
      },
      {
        level: 7,
        name: "수호자의 시야",
        description: "히어로 사거리 +0.15",
        effects: { heroRangeFlat: 0.15 }
      },
      {
        level: 10,
        name: "전장의 호흡",
        description: "스킬 쿨타임 -12%",
        effects: { skillCooldownPct: 0.12 }
      }
    ],

    relics: [
      {
        id: "hawkFeather",
        name: "매의 깃털",
        description: "궁수탑 공격속도 +10%",
        effects: { archerAttackSpeedPct: 0.1 }
      },
      {
        id: "abyssPowder",
        name: "심연의 화약",
        description: "대포탑 폭발 범위 +12%",
        effects: { cannonSplashPct: 0.12 }
      },
      {
        id: "frozenCore",
        name: "얼어붙은 핵",
        description: "얼음탑 둔화 지속시간 +12%",
        effects: { iceSlowDurationPct: 0.12 }
      },
      {
        id: "stormCoil",
        name: "폭풍 코일",
        description: "번개탑 연쇄 수 +1",
        effects: { lightningChainFlat: 1 }
      },
      {
        id: "venomVial",
        name: "맹독 약병",
        description: "독성탑 독 피해 +15%",
        effects: { poisonDamagePct: 0.15 }
      },
      {
        id: "heroEmblem",
        name: "영웅의 문장",
        description: "히어로 공격력 +12%",
        effects: { heroDamagePct: 0.12 }
      },
      {
        id: "goldenFang",
        name: "황금 송곳니",
        description: "처치 골드 +10%",
        effects: { goldGainPct: 0.1 }
      },
      {
        id: "towerSigil",
        name: "방어의 인장",
        description: "모든 타워 공격력 +8%",
        effects: { towerDamagePct: 0.08 }
      },
      {
        id: "sunShard",
        name: "태양 파편",
        description: "성광 폭발 피해 +20%",
        effects: { skillDamagePct: 0.2 }
      },
      {
        id: "repairRune",
        name: "수복 룬",
        description: "Base HP +2 회복",
        effects: { baseRepair: 2 }
      }
    ]
  };

  Data.waves = [
    wave(1, "말랑한 침입", 22, "기본 궁수탑으로 충분합니다.", [
      group("slime", 8, 0.82)
    ]),

    wave(2, "동굴 박쥐", 25, "비행 적은 궁수와 번개가 유리합니다.", [
      group("slime", 7, 0.75),
      group("bat", 5, 0.62)
    ]),

    wave(3, "고블린 정찰대", 28, "타워 수를 먼저 확보하세요.", [
      group("goblin", 9, 0.72),
      group("slime", 5, 0.55)
    ]),

    wave(4, "빠른 늑대", 32, "얼음탑으로 이동을 늦추세요.", [
      group("bat", 7, 0.55),
      group("wolf", 7, 0.7)
    ]),

    wave(5, "준보스: 바위 골렘", 48, "대포와 독성탑이 유리합니다.", [
      group("golem", 5, 0.9, 1.08),
      group("bossGolem", 1, 1.2, 0.55)
    ], true),

    wave(6, "늪지 무리", 38, "대포 광역 피해가 효과적입니다.", [
      group("slime", 12, 0.46, 1.15),
      group("goblin", 8, 0.62)
    ]),

    wave(7, "하늘과 늑대", 42, "궁수와 얼음 조합이 안정적입니다.", [
      group("bat", 12, 0.42),
      group("wolf", 8, 0.58)
    ]),

    wave(8, "역병의 발소리", 46, "번개와 대포로 빠르게 처리하세요.", [
      group("plagueCrawler", 9, 0.58),
      group("goblin", 9, 0.48)
    ]),

    wave(9, "암흑 사제", 50, "암흑 사제를 우선 처치하세요.", [
      group("darkPriest", 8, 0.75),
      group("shieldImp", 6, 0.62)
    ]),

    wave(10, "보스: 붉은 골렘", 78, "대포 중포형이 강합니다.", [
      group("wolf", 10, 0.48),
      group("bossGolem", 1, 1, 1)
    ], true),

    wave(11, "깊은 균열", 60, "재생 적을 빠르게 제거하세요.", [
      group("slime", 14, 0.36, 1.35),
      group("plagueCrawler", 8, 0.62)
    ]),

    wave(12, "그림자 기동대", 64, "독성 또는 대포가 유리합니다.", [
      group("bat", 12, 0.34, 1.25),
      group("shadowKnight", 6, 0.72)
    ]),

    wave(13, "골렘 행진", 70, "중장갑 대응 화력을 준비하세요.", [
      group("golem", 10, 0.68, 1.18),
      group("shieldImp", 8, 0.5, 1.2)
    ]),

    wave(14, "사제의 의식", 76, "번개 연쇄와 히어로 스킬이 좋습니다.", [
      group("darkPriest", 12, 0.56, 1.15),
      group("wolf", 10, 0.42, 1.2)
    ]),

    wave(15, "준보스: 심연의 쌍둥이", 108, "보스 특화 대포를 준비하세요.", [
      group("shadowKnight", 9, 0.58, 1.18),
      group("bossGolem", 2, 1.25, 0.92)
    ], true),

    wave(16, "검은 파도", 86, "광역과 연쇄 공격이 중요합니다.", [
      group("slime", 18, 0.3, 1.5),
      group("bat", 16, 0.3, 1.35)
    ]),

    wave(17, "오염된 강철", 92, "히어로 스킬을 적극 사용하세요.", [
      group("plagueCrawler", 12, 0.44, 1.42),
      group("golem", 8, 0.68, 1.32)
    ]),

    wave(18, "타락한 성직자", 100, "얼음 냉기형과 번개가 좋습니다.", [
      group("darkPriest", 14, 0.48, 1.35),
      group("wolf", 14, 0.36, 1.35)
    ]),

    wave(19, "마지막 방어선", 115, "대포·독성·히어로 화력이 필요합니다.", [
      group("golem", 12, 0.52, 1.45),
      group("shadowKnight", 12, 0.52, 1.45)
    ]),

    wave(20, "최종 보스: 심연 군주", 260, "유물과 모든 스킬을 활용하세요.", [
      group("darkPriest", 10, 0.42, 1.5),
      group("bossGolem", 2, 1, 1.15),
      group("abyssLord", 1, 1.2, 1)
    ], true)
  ];

  Data.formulas = {
    towerStats: function (tower, level) {
      var lv = Math.max(1, level || 1);

      return {
        damage: Math.round(
          tower.baseDamage * (1 + (lv - 1) * 0.34)
        ),

        range: Number(
          (tower.baseRange + (lv - 1) * 0.08).toFixed(2)
        ),

        attackInterval: Number(
          Math.max(
            0.28,
            tower.baseAttackInterval * (1 - (lv - 1) * 0.055)
          ).toFixed(2)
        ),

        splashRadius: tower.splashRadius
          ? Number(
              (tower.splashRadius + (lv - 1) * 0.04).toFixed(2)
            )
          : 0,

        slowFactor: tower.slowFactor
          ? clamp(
              tower.slowFactor - (lv - 1) * 0.025,
              0.3,
              0.9
            )
          : 0,

        slowDuration: tower.slowDuration
          ? Number(
              (tower.slowDuration + (lv - 1) * 0.08).toFixed(2)
            )
          : 0,

        chainCount: tower.chainCount
          ? Math.min(
              5,
              tower.chainCount + Math.floor((lv - 1) / 2)
            )
          : 0,

        chainRange: tower.chainRange
          ? Number(
              (tower.chainRange + (lv - 1) * 0.05).toFixed(2)
            )
          : 0,

        dotDamagePerSecond: tower.dotDamagePerSecond
          ? Math.round(
              tower.dotDamagePerSecond * (1 + (lv - 1) * 0.28)
            )
          : 0,

        dotDuration: tower.dotDuration
          ? Number(
              (tower.dotDuration + (lv - 1) * 0.12).toFixed(2)
            )
          : 0
      };
    },

    towerUpgradeCost: function (tower, level) {
      if (level >= tower.maxLevel) {
        return null;
      }

      return Math.round(
        tower.cost * (0.72 + level * 0.42)
      );
    },

    towerInvestedGold: function (tower, level) {
      var total = tower.cost;
      var lv;

      for (lv = 1; lv < level; lv += 1) {
        total += Math.round(
          tower.cost * (0.72 + lv * 0.42)
        );
      }

      return total;
    },

    towerSellValue: function (tower, level) {
      return Math.floor(
        Data.formulas.towerInvestedGold(tower, level) * 0.65
      );
    },

    monsterStats: function (monster, waveId, hpScale, map) {
      var waveFactor =
        1 + Math.max(0, waveId - 1) * 0.115;

      var mapHpFactor =
        map && map.monsterHpPct
          ? 1 + map.monsterHpPct
          : 1;

      return {
        hp: Math.round(
          monster.hp *
          waveFactor *
          (hpScale || 1) *
          mapHpFactor
        ),

        speed: Number(
          (
            monster.speed *
            (1 + Math.max(0, waveId - 1) * 0.006)
          ).toFixed(3)
        ),

        gold: Math.round(
          monster.gold *
          (1 + Math.max(0, waveId - 1) * 0.035)
        ),

        exp: Math.round(
          monster.exp *
          (1 + Math.max(0, waveId - 1) * 0.04)
        )
      };
    },

    heroStats: function (hero, level) {
      var lv = Math.max(1, level || 1);

      return {
        damage: Math.round(
          hero.baseDamage + (lv - 1) * 4.2
        ),

        range: Number(
          (
            hero.baseRange +
            Math.floor((lv - 1) / 3) * 0.12
          ).toFixed(2)
        ),

        attackInterval: Number(
          Math.max(
            0.48,
            hero.baseAttackInterval - (lv - 1) * 0.022
          ).toFixed(2)
        )
      };
    },

    heroNextExp: function (level) {
      var lv = Math.max(1, level || 1);

      return Math.round(
        36 + lv * 24 + lv * lv * 5
      );
    }
  };

window.Abyss.Data = Data;

/* 이전 버전 캐시 대응용 */
window.ABYSS_DATA = Data;

}());
}());
