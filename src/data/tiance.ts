import type {
  GoldenCase,
  RotationCounts,
  SkillDefinitions,
  TargetConfigs,
} from "../core/tianceDps";

export const tianceTargetConfigs = {
  131: { level: 131, defenseScale: 44291.7, targetDefense: 11073 },
  132: { level: 132, defenseScale: 46582.65, targetDefense: 15528 },
  133: { level: 133, defenseScale: 48873.6, targetDefense: 26317 },
  134: { level: 134, defenseScale: 155408.88, targetDefense: 83679 },
} satisfies TargetConfigs;

export const aoxueTianceSkills = {
  chuan_yun_1: { attackPowerCof: 1.84, weaponDamageCof: 1 },
  chuan_yun_2: { attackPowerCof: 2.25, weaponDamageCof: 1 },
  pi_li: { attackPowerCof: 5.03, weaponDamageCof: 2 },
  long_yin: { attackPowerCof: 2.79, weaponDamageCof: 1 },
  mie: { attackPowerCof: 4.51, weaponDamageCof: 2 },
  long_ya: { attackPowerCof: 3, weaponDamageCof: 1, kB: 1.05 },
  li_po_wj: { attackPowerCof: 11.36, weaponDamageCof: 4, kB: 0.6, criticalStrike: 0.25 },
  liu_xue_tick: { attackPowerCof: 3.15 },
  chuan_yun_1_counter: { kind: "counter", counterCof: 1.1 },
  chuan_yun_2_counter: { kind: "counter", counterCof: 11.35 },
  long_ya_counter: { kind: "counter", counterCof: 1.8 },
} satisfies SkillDefinitions;

export const aoxueTianceSkillLabels = {
  chuan_yun_1: "穿云一",
  chuan_yun_2: "穿云二",
  pi_li: "霹雳",
  long_yin: "龙吟",
  mie: "灭",
  long_ya: "龙牙",
  li_po_wj: "力破万钧",
  liu_xue_tick: "流血每跳",
  chuan_yun_1_counter: "穿云一破招",
  chuan_yun_2_counter: "穿云二破招",
  long_ya_counter: "龙牙破招",
} as const;

export const defaultPanel = {
  strength: 12873,
  basePhysicalAttackPower: 47035,
  weaponDamage: 10616,
  critRating: 35850,
  critEffectRating: 8437,
  baseOvercomeRating: 57261,
  strainRating: 88736,
  counterValue: 31107,
  targetLevel: 134,
} as const;

export const defaultRotationCounts = {
  long_ya: 58,
  long_ya_counter: 58,
  liu_xue_tick: 112,
  li_po_wj: 6,
  mie: 19,
  pi_li: 20,
  chuan_yun_1: 15,
  chuan_yun_1_counter: 15,
  chuan_yun_2: 14,
  chuan_yun_2_counter: 14,
  long_yin: 30,
} satisfies RotationCounts;

export const defaultAoxueWuBuff = {
  vsNonPlayerKd: 0.65,
  ignoreDefPct: 0.6,
  strainGainAdd: 0,
  flatApAdd: 0,
  apGainAdd: 0,
} as const;

export const defaultGlobalEffects = {
  globalCritGain: 0.25,
  globalKbGain: 0.1,
  globalKcGain: 0.35,
  apGainAdd: 0.05,
} as const;

export const hasteTierRotationCounts = {
  haste_1: {
    label: "一段加速",
    available: true,
    counts: defaultRotationCounts,
  },
  haste_2: {
    label: "二段加速（待补）",
    available: false,
    counts: null,
  },
} as const;

export const unsupportedDataPlaceholders = {
  teamBuffs: "预留接口：团队增益将在后续阶段补齐。",
  skillLevels: "预留接口：完整技能等级数据将在后续阶段补齐。",
  manuals: "预留接口：秘籍数据将在后续阶段补齐。",
  talents: "预留接口：奇穴数据将在后续阶段补齐。",
  specialMechanics: "预留接口：特殊机制将在后续阶段补齐。",
} as const;

export const defaultCalculatorCase: GoldenCase = {
  name: "sample_134",
  panel: defaultPanel,
  counts: defaultRotationCounts,
  targets: tianceTargetConfigs,
  skills: aoxueTianceSkills,
  hasteTier: "haste_1",
  duration: 180,
  levelReduction: 0,
  aoxueWu: defaultAoxueWuBuff,
  globalEffects: defaultGlobalEffects,
};
