export const CRITICAL_STRIKE_SCALE = 225946.1;
export const CRITICAL_EFFECT_SCALE = 72846.14;
export const OVERCOME_SCALE = 225946.1;
export const STRAIN_SCALE = 133328.82;

export const DEFAULT_TARGET_LEVEL = 134;
export const DEFAULT_DURATION = 180;
export const DEFAULT_LEVEL_REDUCTION = 0;
export const BASE_STRENGTH_TO_PHYSICAL_AP = 0.15;
export const TIANCE_EXTRA_STRENGTH_TO_PHYSICAL_AP = 1.8;
export const BASE_STRENGTH_TO_PHYSICAL_OVERCOME = 0.28;
export const TIANCE_EXTRA_STRENGTH_TO_PHYSICAL_OVERCOME = 0.28;

export interface TargetConfig {
  level: number;
  defenseScale: number;
  targetDefense: number;
}

export type TargetConfigs = Record<number, TargetConfig>;
export type SkillId = string;
export type RotationCounts = Partial<Record<SkillId, number>>;

export interface PanelInput {
  strength: number;
  basePhysicalAttackPower: number;
  weaponDamage: number;
  critRate?: number;
  critEffectTotal?: number;
  overcomeRate?: number;
  strainRate?: number;
  critRating?: number;
  critEffectRating?: number;
  baseOvercomeRating?: number;
  strainRating?: number;
  counterValue?: number;
  targetLevel?: number;
}

export interface AoxueWuBuff {
  vsNonPlayerKd?: number;
  ignoreDefPct?: number;
  strainGainAdd?: number;
  flatApAdd?: number;
  apGainAdd?: number;
}

export interface GlobalEffects {
  globalCritGain?: number;
  globalKbGain?: number;
  globalKcGain?: number;
  apGainAdd?: number;
}

export interface TeamBuffEffects {
  flatApAdd?: number;
  apGainAdd?: number;
  critGainAdd?: number;
  overcomeGainAdd?: number;
  strainGainAdd?: number;
  ignoreDefPct?: number;
  skillKbGain?: number;
  skillKcGain?: number;
  skillKdGain?: number;
}

export interface TeamBuffDefinition {
  id: string;
  label: string;
  description: string;
  maxStacks: number;
  effects: TeamBuffEffects;
}

export interface TeamBuffConfig {
  enabled: boolean;
  coverage: number;
  stacks: number;
  effects?: TeamBuffEffects;
}

export type TeamBuffDefinitions = Record<string, TeamBuffDefinition>;
export type TeamBuffConfigs = Record<string, TeamBuffConfig>;

export interface GoldenCase {
  name: string;
  panel: PanelInput;
  counts: RotationCounts;
  targets: TargetConfigs;
  skills: SkillDefinitions;
  hasteTier?: string;
  duration?: number;
  levelReduction?: number;
  aoxueWu?: AoxueWuBuff;
  globalEffects?: GlobalEffects;
  teamBuffDefinitions?: TeamBuffDefinitions;
  teamBuffs?: TeamBuffConfigs;
}

export interface FinalPanelSummary {
  level: number;
  strength: number;
  basePhysicalAp: number;
  apGain: number;
  attackPowerTotal: number;
  weaponDamage: number;
  critRate: number;
  critRatingEquiv: number;
  critEffectTotal: number;
  critEffectRatingEquiv: number;
  overcomeRate: number;
  overcomeRatingEquiv: number;
  strainRate: number;
  strainRatingEquiv: number;
  ignoreDefense: number;
  targetDefense: number;
  defenseScale: number;
  defenseRateAfterIgnore: number;
}

export interface RotationBreakdownRow {
  skill: SkillId;
  count: number;
  noncrit: number;
  crit: number;
  total: number;
  ratio: number;
}

export interface AppliedTeamBuff {
  id: string;
  label: string;
  coverage: number;
  stacks: number;
  multiplier: number;
}

export interface EvaluationResult {
  name: string;
  hasteTier?: string;
  duration: number;
  levelReduction: number;
  panel: FinalPanelSummary;
  totalDamage: number;
  dps: number;
  skillTotals: Partial<Record<SkillId, number>>;
  skillRatios: Partial<Record<SkillId, number>>;
  breakdown: RotationBreakdownRow[];
  activeTeamBuffs: AppliedTeamBuff[];
}

export interface StatWeightRow {
  stat: keyof PanelInput;
  label: string;
  deltaDps: number;
  scaledDeltaDps: number;
}

interface AttributeState {
  baseStrength: number;
  strengthGain: number;
  basePhysicalAttackPower: number;
  physicalAttackPowerGain: number;
  basePhysicalCriticalStrike: number;
  physicalCriticalStrikeGain: number;
  basePhysicalCriticalEffect: number;
  physicalCriticalEffectGain: number;
  basePhysicalOvercome: number;
  physicalOvercomeGain: number;
  baseStrain: number;
  strainGain: number;
  weaponDamage: number;
  counter: number;
  ignoreDefense: number;
  targetLevel: number;
  targetDefense: number;
  defenseScale: number;
}

export interface SkillDefinition {
  kind?: "skill" | "counter";
  baseDamage?: number;
  weaponDamageCof?: number;
  attackPowerCof?: number;
  counterCof?: number;
  times?: number;
  kB?: number;
  kC?: number;
  kD?: number;
  increasingKB?: number;
  increasingKC?: number;
  increasingKD?: number;
  ignoreDefense?: number;
  criticalStrike?: number;
  criticalEffect?: number;
}

export type SkillDefinitions = Record<SkillId, SkillDefinition>;

interface SkillState extends Required<SkillDefinition> {
  kind: "skill" | "counter";
}

function getTargetConfig(level: number, targets: TargetConfigs): TargetConfig {
  const target = targets[level];
  if (target) {
    return target;
  }
  const supported = Object.keys(targets).sort().join(", ");
  throw new Error(`Unsupported target_level=${level}. Supported levels: ${supported}.`);
}

function strength(attr: AttributeState) {
  return attr.baseStrength * attr.strengthGain;
}

function physicalAttackPower(attr: AttributeState) {
  return (
    attr.basePhysicalAttackPower * attr.physicalAttackPowerGain +
    strength(attr) * BASE_STRENGTH_TO_PHYSICAL_AP +
    strength(attr) * TIANCE_EXTRA_STRENGTH_TO_PHYSICAL_AP
  );
}

function criticalStrike(attr: AttributeState) {
  return attr.basePhysicalCriticalStrike / CRITICAL_STRIKE_SCALE + attr.physicalCriticalStrikeGain;
}

function criticalEffect(attr: AttributeState) {
  return 1.75 + attr.basePhysicalCriticalEffect / CRITICAL_EFFECT_SCALE + attr.physicalCriticalEffectGain;
}

function overcome(attr: AttributeState) {
  return (
    (attr.basePhysicalOvercome + strength(attr) * BASE_STRENGTH_TO_PHYSICAL_OVERCOME) /
      OVERCOME_SCALE *
      attr.physicalOvercomeGain +
    (strength(attr) * TIANCE_EXTRA_STRENGTH_TO_PHYSICAL_OVERCOME) / OVERCOME_SCALE
  );
}

function strain(attr: AttributeState) {
  return attr.baseStrain / STRAIN_SCALE + attr.strainGain;
}

export function buildTianceFromPanel(panel: PanelInput, targets: TargetConfigs): AttributeState {
  const targetLevel = panel.targetLevel ?? DEFAULT_TARGET_LEVEL;
  const target = getTargetConfig(targetLevel, targets);
  const basePhysicalCriticalStrike =
    panel.critRating ?? (panel.critRate ?? 0) * CRITICAL_STRIKE_SCALE;
  const basePhysicalCriticalEffect =
    panel.critEffectRating ?? ((panel.critEffectTotal ?? 0) - 1.75) * CRITICAL_EFFECT_SCALE;
  const basePhysicalOvercome =
    panel.baseOvercomeRating ??
    (panel.overcomeRate ?? 0) * OVERCOME_SCALE -
      (BASE_STRENGTH_TO_PHYSICAL_OVERCOME + TIANCE_EXTRA_STRENGTH_TO_PHYSICAL_OVERCOME) *
        panel.strength;
  const baseStrain =
    panel.strainRating ?? ((panel.strainRate ?? 0) - 0.1) * STRAIN_SCALE;

  return {
    baseStrength: panel.strength,
    strengthGain: 1,
    basePhysicalAttackPower: panel.basePhysicalAttackPower,
    physicalAttackPowerGain: 1,
    basePhysicalCriticalStrike,
    physicalCriticalStrikeGain: 0,
    basePhysicalCriticalEffect,
    physicalCriticalEffectGain: 0,
    basePhysicalOvercome,
    physicalOvercomeGain: 1,
    baseStrain,
    strainGain: 0,
    weaponDamage: panel.weaponDamage,
    counter: panel.counterValue ?? 0,
    ignoreDefense: 0,
    targetLevel,
    targetDefense: target.targetDefense,
    defenseScale: target.defenseScale,
  };
}

export function buildTianceSkills(definitions: SkillDefinitions): Record<SkillId, SkillState> {
  const entries = Object.entries(definitions).map(([id, spec]) => {
    const normalized = {
      kind: "skill",
      baseDamage: 0,
      weaponDamageCof: 0,
      attackPowerCof: 0,
      counterCof: 0,
      times: 1,
      kB: 0,
      kC: 0,
      kD: 0,
      increasingKB: 0,
      increasingKC: 0,
      increasingKD: 0,
      ignoreDefense: 0,
      criticalStrike: 0,
      criticalEffect: 0,
      ...spec,
    } satisfies SkillState;
    return [id, normalized];
  });
  return Object.fromEntries(entries) as Record<SkillId, SkillState>;
}

export function applyAoxueWu(
  attr: AttributeState,
  skills: Iterable<SkillState>,
  buff: AoxueWuBuff = {},
) {
  attr.basePhysicalAttackPower += buff.flatApAdd ?? 0;
  attr.strainGain += buff.strainGainAdd ?? 0;
  attr.ignoreDefense += buff.ignoreDefPct ?? 0.6;
  attr.physicalAttackPowerGain += buff.apGainAdd ?? 0;
  for (const skill of skills) {
    skill.kD += buff.vsNonPlayerKd ?? 0.65;
  }
}

export function applyGlobalEffects(
  attr: AttributeState,
  skills: Iterable<SkillState>,
  effects: GlobalEffects = {},
) {
  attr.physicalCriticalStrikeGain += effects.globalCritGain ?? 0.25;
  attr.physicalAttackPowerGain += effects.apGainAdd ?? 0.05;
  for (const skill of skills) {
    skill.kB += effects.globalKbGain ?? 0.1;
    skill.kC += effects.globalKcGain ?? 0.35;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function effectValue(value: number | undefined, multiplier: number) {
  return (value ?? 0) * multiplier;
}

export function applyTeamBuffs(
  attr: AttributeState,
  skills: Iterable<SkillState>,
  definitions: TeamBuffDefinitions = {},
  configs: TeamBuffConfigs = {},
): AppliedTeamBuff[] {
  const skillList = Array.from(skills);
  const applied: AppliedTeamBuff[] = [];

  for (const [id, config] of Object.entries(configs)) {
    const definition = definitions[id];
    if (!definition || !config.enabled) continue;

    const coverage = clamp(config.coverage, 0, 1);
    const stacks = clamp(Math.trunc(config.stacks), 0, definition.maxStacks);
    const multiplier = coverage * stacks;
    if (multiplier <= 0) continue;

    const effects = config.effects ?? definition.effects;
    attr.basePhysicalAttackPower += effectValue(effects.flatApAdd, multiplier);
    attr.physicalAttackPowerGain += effectValue(effects.apGainAdd, multiplier);
    attr.physicalCriticalStrikeGain += effectValue(effects.critGainAdd, multiplier);
    attr.physicalOvercomeGain += effectValue(effects.overcomeGainAdd, multiplier);
    attr.strainGain += effectValue(effects.strainGainAdd, multiplier);
    attr.ignoreDefense += effectValue(effects.ignoreDefPct, multiplier);
    for (const skill of skillList) {
      skill.kB += effectValue(effects.skillKbGain, multiplier);
      skill.kC += effectValue(effects.skillKcGain, multiplier);
      skill.kD += effectValue(effects.skillKdGain, multiplier);
    }

    applied.push({
      id,
      label: definition.label,
      coverage,
      stacks,
      multiplier,
    });
  }

  return applied;
}

function skillBaseDamage(attr: AttributeState, skill: SkillState) {
  if (skill.kind === "counter") {
    return attr.counter * skill.counterCof;
  }
  return (
    skill.baseDamage +
    physicalAttackPower(attr) * skill.attackPowerCof +
    attr.weaponDamage * skill.weaponDamageCof
  );
}

function skillSingleBreakdown(
  attr: AttributeState,
  skill: SkillState,
  incB: number,
  incC: number,
  incD: number,
) {
  const crit = criticalStrike(attr) + skill.criticalStrike;
  const critEffectTotal = criticalEffect(attr) + skill.criticalEffect;
  const effectiveDefense = Math.max(
    0,
    attr.targetDefense * (1 - skill.ignoreDefense - attr.ignoreDefense),
  );
  const defenseRate = effectiveDefense / (attr.defenseScale + effectiveDefense);
  const base =
    skillBaseDamage(attr, skill) *
    (1 + skill.kB + incB) *
    (1 + skill.kC + incC) *
    (1 + skill.kD + incD) *
    (1 + overcome(attr)) *
    (1 + strain(attr));
  const hit = base * (1 - defenseRate);

  return {
    noncrit: hit * (1 - crit),
    crit: hit * critEffectTotal * crit,
  };
}

export function skillBreakdown(attr: AttributeState, skill: SkillState) {
  let noncrit = 0;
  let crit = 0;
  let incB = 0;
  let incC = 0;
  let incD = 0;
  for (let i = 0; i < skill.times; i += 1) {
    const single = skillSingleBreakdown(attr, skill, incB, incC, incD);
    noncrit += single.noncrit;
    crit += single.crit;
    incB += skill.increasingKB;
    incC += skill.increasingKC;
    incD += skill.increasingKD;
  }
  return { noncrit, crit, total: noncrit + crit };
}

export function sumRotationDamage(
  attr: AttributeState,
  skills: Record<SkillId, SkillState>,
  counts: RotationCounts,
) {
  return Object.entries(counts).reduce((total, [id, count]) => {
    const n = Math.trunc(count ?? 0);
    if (n <= 0) return total;
    return total + skillBreakdown(attr, skills[id as SkillId]).total * n;
  }, 0);
}

export function dpsFromTotal(
  total: number,
  duration = DEFAULT_DURATION,
  levelReduction = DEFAULT_LEVEL_REDUCTION,
) {
  return (total / duration) * (1 - levelReduction);
}

export function summarizeFinalPanel(attr: AttributeState): FinalPanelSummary {
  const critRate = criticalStrike(attr);
  const critEffectTotal = criticalEffect(attr);
  const overcomeRate = overcome(attr);
  const strainRate = strain(attr);
  const effectiveTargetDefense = Math.max(0, attr.targetDefense * (1 - attr.ignoreDefense));
  const defenseRateAfterIgnore =
    effectiveTargetDefense / (attr.defenseScale + effectiveTargetDefense);

  return {
    level: attr.targetLevel,
    strength: strength(attr),
    basePhysicalAp: attr.basePhysicalAttackPower,
    apGain: attr.physicalAttackPowerGain,
    attackPowerTotal: physicalAttackPower(attr),
    weaponDamage: attr.weaponDamage,
    critRate,
    critRatingEquiv: critRate * CRITICAL_STRIKE_SCALE,
    critEffectTotal,
    critEffectRatingEquiv: (critEffectTotal - 1.75) * CRITICAL_EFFECT_SCALE,
    overcomeRate,
    overcomeRatingEquiv: overcomeRate * OVERCOME_SCALE,
    strainRate,
    strainRatingEquiv: strainRate * STRAIN_SCALE,
    ignoreDefense: attr.ignoreDefense,
    targetDefense: attr.targetDefense,
    defenseScale: attr.defenseScale,
    defenseRateAfterIgnore,
  };
}

export function rotationBreakdown(
  attr: AttributeState,
  skills: Record<SkillId, SkillState>,
  counts: RotationCounts,
): RotationBreakdownRow[] {
  const rows = Object.entries(counts).flatMap(([id, count]) => {
    const n = Math.trunc(count ?? 0);
    if (n <= 0) return [];
    const breakdown = skillBreakdown(attr, skills[id as SkillId]);
    return [{
      skill: id as SkillId,
      count: n,
      noncrit: breakdown.noncrit * n,
      crit: breakdown.crit * n,
      total: breakdown.total * n,
      ratio: 0,
    }];
  });
  const grand = rows.reduce((total, row) => total + row.total, 0);
  return rows
    .map((row) => ({ ...row, ratio: grand === 0 ? 0 : row.total / grand }))
    .sort((a, b) => b.total - a.total);
}

export function buildCaseContext(currentCase: GoldenCase) {
  const attr = buildTianceFromPanel(currentCase.panel, currentCase.targets);
  const skills = buildTianceSkills(currentCase.skills);
  if (currentCase.aoxueWu) {
    applyAoxueWu(attr, Object.values(skills), currentCase.aoxueWu);
  }
  if (currentCase.globalEffects) {
    applyGlobalEffects(attr, Object.values(skills), currentCase.globalEffects);
  }
  const activeTeamBuffs = applyTeamBuffs(
    attr,
    Object.values(skills),
    currentCase.teamBuffDefinitions,
    currentCase.teamBuffs,
  );
  return { attr, skills, activeTeamBuffs };
}

export function evaluateCase(currentCase: GoldenCase): EvaluationResult {
  const { attr, skills, activeTeamBuffs } = buildCaseContext(currentCase);
  const breakdown = rotationBreakdown(attr, skills, currentCase.counts);
  const totalDamage = breakdown.reduce((total, row) => total + row.total, 0);
  const duration = currentCase.duration ?? DEFAULT_DURATION;
  const levelReduction = currentCase.levelReduction ?? DEFAULT_LEVEL_REDUCTION;

  return {
    name: currentCase.name,
    hasteTier: currentCase.hasteTier,
    duration,
    levelReduction,
    panel: summarizeFinalPanel(attr),
    totalDamage,
    dps: dpsFromTotal(totalDamage, duration, levelReduction),
    skillTotals: Object.fromEntries(breakdown.map((row) => [row.skill, row.total])),
    skillRatios: Object.fromEntries(breakdown.map((row) => [row.skill, row.ratio])),
    breakdown,
    activeTeamBuffs,
  };
}

const statWeightConfigs: Array<{
  stat: keyof PanelInput;
  label: string;
  weight: number;
}> = [
  { stat: "strength", label: "力道", weight: 1 },
  { stat: "basePhysicalAttackPower", label: "基础外功攻击", weight: 2 },
  { stat: "baseOvercomeRating", label: "基础破防评级", weight: 4.45 },
  { stat: "critRating", label: "会心评级", weight: 4.45 },
  { stat: "critEffectRating", label: "会效评级", weight: 4.45 },
  { stat: "strainRating", label: "无双评级", weight: 4.45 },
  { stat: "weaponDamage", label: "武器伤害", weight: 220 / 73 },
  { stat: "counterValue", label: "破招值", weight: 4.45 },
];

export function estimateStatWeights(currentCase: GoldenCase, step = 1): StatWeightRow[] {
  return statWeightConfigs.map(({ stat, label, weight }) => {
    const baseValue = Number(currentCase.panel[stat] ?? 0);
    const plus = evaluateCase({
      ...currentCase,
      panel: {
        ...currentCase.panel,
        [stat]: baseValue + step,
      },
    });
    const minus = evaluateCase({
      ...currentCase,
      panel: {
        ...currentCase.panel,
        [stat]: baseValue - step,
      },
    });
    const deltaDps = (plus.dps - minus.dps) / (2 * step);

    return {
      stat,
      label,
      deltaDps,
      scaledDeltaDps: deltaDps * weight,
    };
  }).sort((a, b) => b.scaledDeltaDps - a.scaledDeltaDps);
}
