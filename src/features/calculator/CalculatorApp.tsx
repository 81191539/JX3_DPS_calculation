import { useMemo, useState } from "react";
import {
  aoxueTianceSkillLabels,
  defaultCalculatorCase,
  hasteTierRotationCounts,
} from "../../data/tiance";
import {
  estimateStatWeights,
  evaluateCase,
  type AoxueWuBuff,
  type GlobalEffects,
  type GoldenCase,
  type PanelInput,
  type RotationCounts,
  type SkillId,
} from "../../core/tianceDps";

const panelFields: Array<[keyof PanelInput, string]> = [
  ["strength", "力道"],
  ["basePhysicalAttackPower", "基础外功攻击"],
  ["weaponDamage", "武器伤害"],
  ["critRating", "会心评级"],
  ["critEffectRating", "会效评级"],
  ["baseOvercomeRating", "基础破防评级"],
  ["strainRating", "无双评级"],
  ["counterValue", "破招值"],
];

const aoxueFields: Array<[keyof AoxueWuBuff, string]> = [
  ["vsNonPlayerKd", "对非侠士伤害"],
  ["ignoreDefPct", "无视防御"],
  ["strainGainAdd", "姿态无双"],
  ["flatApAdd", "固定外功攻击"],
  ["apGainAdd", "姿态攻击增益"],
];

const globalFields: Array<[keyof GlobalEffects, string]> = [
  ["globalCritGain", "全局会心"],
  ["globalKbGain", "B 乘区"],
  ["globalKcGain", "C 乘区"],
  ["apGainAdd", "全局攻击增益"],
];

function cloneCase(): GoldenCase {
  return {
    ...defaultCalculatorCase,
    panel: { ...defaultCalculatorCase.panel },
    counts: { ...defaultCalculatorCase.counts },
    aoxueWu: { ...defaultCalculatorCase.aoxueWu },
    globalEffects: { ...defaultCalculatorCase.globalEffects },
  };
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value: number) {
  return `${formatNumber(value * 100, 2)}%`;
}

function formatWan(value: number) {
  return `${formatNumber(value / 10000, 2)}万`;
}

function skillLabel(skill: SkillId) {
  return aoxueTianceSkillLabels[skill as keyof typeof aoxueTianceSkillLabels] ?? skill;
}

function numberValue(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function CalculatorApp() {
  const [caseInput, setCaseInput] = useState<GoldenCase>(() => cloneCase());

  const result = useMemo(() => evaluateCase(caseInput), [caseInput]);
  const statWeights = useMemo(() => estimateStatWeights(caseInput), [caseInput]);

  const updatePanel = (key: keyof PanelInput, value: number) => {
    setCaseInput((current) => ({
      ...current,
      panel: {
        ...current.panel,
        [key]: value,
      },
    }));
  };

  const updateAoxue = (key: keyof AoxueWuBuff, value: number) => {
    setCaseInput((current) => ({
      ...current,
      aoxueWu: {
        ...current.aoxueWu,
        [key]: value,
      },
    }));
  };

  const updateGlobal = (key: keyof GlobalEffects, value: number) => {
    setCaseInput((current) => ({
      ...current,
      globalEffects: {
        ...current.globalEffects,
        [key]: value,
      },
    }));
  };

  const updateCount = (key: SkillId, value: number) => {
    setCaseInput((current) => ({
      ...current,
      counts: {
        ...current.counts,
        [key]: Math.max(0, Math.trunc(value)),
      },
    }));
  };

  const applyHasteTier = (hasteTier: string) => {
    const tier = hasteTierRotationCounts[hasteTier as keyof typeof hasteTierRotationCounts];
    if (!tier?.available || !tier.counts) return;
    setCaseInput((current) => ({
      ...current,
      hasteTier,
      counts: { ...tier.counts },
    }));
  };

  const panelSummary = [
    ["总外功", formatNumber(result.panel.attackPowerTotal, 2)],
    ["会心", formatPercent(result.panel.critRate)],
    ["会效", formatNumber(result.panel.critEffectTotal, 4)],
    ["破防", formatPercent(result.panel.overcomeRate)],
    ["无双", formatPercent(result.panel.strainRate)],
    ["无视防御", formatPercent(result.panel.ignoreDefense)],
    ["无视后防御减伤", formatPercent(result.panel.defenseRateAfterIgnore)],
    ["目标防御", formatNumber(result.panel.targetDefense, 2)],
  ];

  return (
    <main className="calculator-shell">
      <section className="summary-band" aria-label="计算结果概览">
        <div>
          <p className="eyebrow">傲血天策 / sample_134</p>
          <h1>天策 DPS 计算器</h1>
        </div>
        <div className="result-metrics">
          <div className="metric primary">
            <span>DPS</span>
            <strong>{formatWan(result.dps)}</strong>
          </div>
          <div className="metric">
            <span>总伤害</span>
            <strong>{formatWan(result.totalDamage)}</strong>
          </div>
          <div className="metric">
            <span>技能数</span>
            <strong>{result.breakdown.length}</strong>
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="inputs-column">
          <section className="panel">
            <div className="panel-title">
              <h2>基础面板</h2>
              <button type="button" onClick={() => setCaseInput(cloneCase())}>
                重置
              </button>
            </div>
            <div className="field-grid">
              {panelFields.map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    type="number"
                    value={numberValue(caseInput.panel[key])}
                    onChange={(event) => updatePanel(key, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>目标与循环</h2>
            <div className="field-grid compact">
              <label>
                <span>目标等级</span>
                <select
                  value={caseInput.panel.targetLevel}
                  onChange={(event) => updatePanel("targetLevel", Number(event.target.value))}
                >
                  {Object.keys(caseInput.targets).map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>战斗时长</span>
                <input
                  type="number"
                  min="1"
                  value={caseInput.duration}
                  onChange={(event) => {
                    setCaseInput((current) => ({
                      ...current,
                      duration: Math.max(1, Number(event.target.value)),
                    }));
                  }}
                />
              </label>
              <label>
                <span>等级减伤</span>
                <input
                  type="number"
                  step="0.01"
                  value={caseInput.levelReduction}
                  onChange={(event) => {
                    setCaseInput((current) => ({
                      ...current,
                      levelReduction: Math.min(0.99, Math.max(0, Number(event.target.value))),
                    }));
                  }}
                />
              </label>
              <label>
                <span>加速档位</span>
                <select value={caseInput.hasteTier} onChange={(event) => applyHasteTier(event.target.value)}>
                  {Object.entries(hasteTierRotationCounts).map(([key, tier]) => (
                    <option key={key} value={key} disabled={!tier.available}>
                      {tier.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="count-grid">
              {Object.entries(caseInput.counts).map(([key, value]) => (
                <label key={key}>
                  <span>{skillLabel(key)}</span>
                  <input
                    type="number"
                    min="0"
                    value={numberValue(value)}
                    onChange={(event) => updateCount(key, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>简化增益</h2>
            <div className="field-grid">
              {aoxueFields.map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={numberValue(caseInput.aoxueWu?.[key])}
                    onChange={(event) => updateAoxue(key, Number(event.target.value))}
                  />
                </label>
              ))}
              {globalFields.map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={numberValue(caseInput.globalEffects?.[key])}
                    onChange={(event) => updateGlobal(key, Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="outputs-column">
          <section className="panel">
            <h2>最终面板</h2>
            <div className="panel-grid">
              {panelSummary.map(([label, value]) => (
                <div className="kv" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>技能伤害占比</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>技能</th>
                    <th>次数</th>
                    <th>总伤害</th>
                    <th>占比</th>
                  </tr>
                </thead>
                <tbody>
                  {result.breakdown.map((row) => (
                    <tr key={row.skill}>
                      <td>{skillLabel(row.skill)}</td>
                      <td>{row.count}</td>
                      <td>{formatWan(row.total)}</td>
                      <td className="ratio-cell">
                        <span>{formatPercent(row.ratio)}</span>
                        <i style={{ width: `${Math.min(100, row.ratio * 100)}%` }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <h2>属性收益</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>属性</th>
                    <th>每点 DPS</th>
                    <th>预算后 DPS</th>
                  </tr>
                </thead>
                <tbody>
                  {statWeights.map((row) => (
                    <tr key={row.stat}>
                      <td>{row.label}</td>
                      <td>{formatNumber(row.deltaDps, 4)}</td>
                      <td>{formatNumber(row.scaledDeltaDps, 4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
