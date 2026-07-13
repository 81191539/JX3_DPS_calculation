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
  type TeamBuffConfig,
  type TeamBuffEffects,
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

const teamBuffEffectLabels: Record<keyof TeamBuffEffects, string> = {
  flatApAdd: "固定攻击",
  apGainAdd: "攻击增益",
  critGainAdd: "会心",
  overcomeGainAdd: "破防增益",
  strainGainAdd: "无双",
  ignoreDefPct: "无视防御",
  skillKbGain: "B 乘区",
  skillKcGain: "C 乘区",
  skillKdGain: "目标易伤",
};

type ResultView = "panel" | "damage" | "details" | "weights";

const resultViews: Array<[ResultView, string]> = [
  ["panel", "最终面板"],
  ["damage", "伤害占比"],
  ["details", "技能明细"],
  ["weights", "属性收益"],
];

function cloneCase(): GoldenCase {
  return {
    ...defaultCalculatorCase,
    panel: { ...defaultCalculatorCase.panel },
    counts: { ...defaultCalculatorCase.counts },
    aoxueWu: { ...defaultCalculatorCase.aoxueWu },
    globalEffects: { ...defaultCalculatorCase.globalEffects },
    teamBuffDefinitions: { ...defaultCalculatorCase.teamBuffDefinitions },
    teamBuffs: Object.fromEntries(
      Object.entries(defaultCalculatorCase.teamBuffs ?? {}).map(([id, config]) => [
        id,
        {
          ...config,
          effects: { ...config.effects },
        },
      ]),
    ),
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeImportedCase(value: unknown): GoldenCase {
  if (!isRecord(value)) {
    throw new Error("方案 JSON 必须是对象。");
  }

  const base = cloneCase();
  return {
    ...base,
    ...value,
    panel: isRecord(value.panel) ? { ...base.panel, ...value.panel } : base.panel,
    counts: isRecord(value.counts) ? { ...base.counts, ...value.counts } : base.counts,
    targets: isRecord(value.targets) ? { ...base.targets, ...value.targets } : base.targets,
    skills: isRecord(value.skills) ? { ...base.skills, ...value.skills } : base.skills,
    aoxueWu: isRecord(value.aoxueWu) ? { ...base.aoxueWu, ...value.aoxueWu } : base.aoxueWu,
    globalEffects: isRecord(value.globalEffects)
      ? { ...base.globalEffects, ...value.globalEffects }
      : base.globalEffects,
    teamBuffDefinitions: isRecord(value.teamBuffDefinitions)
      ? { ...base.teamBuffDefinitions, ...value.teamBuffDefinitions }
      : base.teamBuffDefinitions,
    teamBuffs: isRecord(value.teamBuffs) ? { ...base.teamBuffs, ...value.teamBuffs } : base.teamBuffs,
  } as GoldenCase;
}

export function CalculatorApp() {
  const [caseInput, setCaseInput] = useState<GoldenCase>(() => cloneCase());
  const [activeResultView, setActiveResultView] = useState<ResultView>("damage");
  const [schemeText, setSchemeText] = useState("");
  const [schemeError, setSchemeError] = useState("");

  const result = useMemo(() => evaluateCase(caseInput), [caseInput]);
  const statWeights = useMemo(() => estimateStatWeights(caseInput), [caseInput]);

  const resetCase = () => {
    const nextCase = cloneCase();
    setCaseInput(nextCase);
    setSchemeText("");
    setSchemeError("");
  };

  const exportScheme = () => {
    setSchemeText(JSON.stringify(caseInput, null, 2));
    setSchemeError("");
  };

  const importScheme = () => {
    try {
      const nextCase = mergeImportedCase(JSON.parse(schemeText));
      evaluateCase(nextCase);
      setCaseInput(nextCase);
      setSchemeError("");
    } catch (error) {
      setSchemeError(error instanceof Error ? error.message : "方案导入失败。");
    }
  };

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

  const updateTeamBuff = (id: string, patch: Partial<TeamBuffConfig>) => {
    setCaseInput((current) => ({
      ...current,
      teamBuffs: {
        ...current.teamBuffs,
        [id]: {
          ...current.teamBuffs?.[id],
          enabled: current.teamBuffs?.[id]?.enabled ?? false,
          coverage: current.teamBuffs?.[id]?.coverage ?? 1,
          stacks: current.teamBuffs?.[id]?.stacks ?? 1,
          ...patch,
        },
      },
    }));
  };

  const updateTeamBuffEffect = (id: string, key: keyof TeamBuffEffects, value: number) => {
    setCaseInput((current) => {
      const existing = current.teamBuffs?.[id];
      const definition = current.teamBuffDefinitions?.[id];
      return {
        ...current,
        teamBuffs: {
          ...current.teamBuffs,
          [id]: {
            enabled: existing?.enabled ?? false,
            coverage: existing?.coverage ?? 1,
            stacks: existing?.stacks ?? 1,
            ...existing,
            effects: {
              ...definition?.effects,
              ...existing?.effects,
              [key]: value,
            },
          },
        },
      };
    });
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
  const teamBuffEntries = Object.entries(caseInput.teamBuffDefinitions ?? {});

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
            <strong data-testid="metric-dps">{formatWan(result.dps)}</strong>
          </div>
          <div className="metric">
            <span>总伤害</span>
            <strong data-testid="metric-total-damage">{formatWan(result.totalDamage)}</strong>
          </div>
          <div className="metric">
            <span>技能数</span>
            <strong>{result.breakdown.length}</strong>
          </div>
        </div>
      </section>

      <nav className="module-nav" aria-label="工作台模块">
        <a href="#panel-config">面板</a>
        <a href="#rotation-config">循环</a>
        <a href="#buff-config">增益</a>
        <a href="#result-views">结果</a>
      </nav>

      <section className="workspace">
        <div className="inputs-column">
          <section className="panel" id="scheme-config">
            <div className="panel-title">
              <h2>方案</h2>
              <button type="button" onClick={resetCase}>
                恢复默认
              </button>
            </div>
            <div className="action-row">
              <button type="button" onClick={exportScheme}>
                导出
              </button>
              <button type="button" onClick={importScheme}>
                导入
              </button>
            </div>
            <label className="scheme-editor">
              <span>方案 JSON</span>
              <textarea
                data-testid="scheme-json"
                value={schemeText}
                onChange={(event) => setSchemeText(event.target.value)}
              />
            </label>
            {schemeError ? <p className="form-error">{schemeError}</p> : null}
          </section>

          <section className="panel" id="panel-config">
            <div className="panel-title">
              <h2>基础面板</h2>
              <button type="button" onClick={resetCase}>
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

          <section className="panel" id="rotation-config">
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

          <section className="panel" id="buff-config">
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

          <section className="panel">
            <div className="panel-title">
              <h2>团队增益</h2>
              <button
                type="button"
                onClick={() => {
                  setCaseInput((current) => ({
                    ...current,
                    teamBuffs: cloneCase().teamBuffs,
                  }));
                }}
              >
                恢复默认
              </button>
            </div>
            <div className="active-buffs" data-testid="active-team-buffs">
              {result.activeTeamBuffs.length > 0
                ? result.activeTeamBuffs.map((buff) => (
                    <span key={buff.id}>{buff.label}</span>
                  ))
                : <span>未启用</span>}
            </div>
            <div className="buff-list">
              {teamBuffEntries.map(([id, definition]) => {
                const config = caseInput.teamBuffs?.[id];
                const effects = config?.effects ?? definition.effects;
                return (
                  <section className="buff-item" key={id}>
                    <label className="buff-toggle">
                      <input
                        type="checkbox"
                        checked={config?.enabled ?? false}
                        onChange={(event) => updateTeamBuff(id, { enabled: event.target.checked })}
                      />
                      <span>{definition.label}</span>
                    </label>
                    <p>{definition.description}</p>
                    <div className="field-grid compact">
                      <label>
                        <span>覆盖率</span>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          value={numberValue(config?.coverage ?? 1)}
                          onChange={(event) => updateTeamBuff(id, { coverage: Number(event.target.value) })}
                        />
                      </label>
                      <label>
                        <span>层数</span>
                        <input
                          type="number"
                          min="0"
                          max={definition.maxStacks}
                          value={numberValue(config?.stacks ?? 1)}
                          onChange={(event) => updateTeamBuff(id, { stacks: Number(event.target.value) })}
                        />
                      </label>
                      {Object.entries(effects).map(([key, value]) => (
                        <label key={key}>
                          <span>{teamBuffEffectLabels[key as keyof TeamBuffEffects]}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={numberValue(value)}
                            onChange={(event) => {
                              updateTeamBuffEffect(
                                id,
                                key as keyof TeamBuffEffects,
                                Number(event.target.value),
                              );
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>
        </div>

        <div className="outputs-column" id="result-views">
          <section className="panel result-tabs-panel">
            <div className="result-tabs" role="tablist" aria-label="结果视图">
              {resultViews.map(([view, label]) => (
                <button
                  type="button"
                  key={view}
                  aria-selected={activeResultView === view}
                  onClick={() => setActiveResultView(view)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {activeResultView === "panel" ? (
            <section className="panel" data-testid="panel-view">
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
          ) : null}

          {activeResultView === "damage" ? (
            <section className="panel" data-testid="damage-view">
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
          ) : null}

          {activeResultView === "details" ? (
            <section className="panel" data-testid="details-view">
              <h2>技能明细</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>技能</th>
                      <th>次数</th>
                      <th>非会心</th>
                      <th>会心</th>
                      <th>总伤害</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdown.map((row) => (
                      <tr key={row.skill}>
                        <td>{skillLabel(row.skill)}</td>
                        <td>{row.count}</td>
                        <td>{formatWan(row.noncrit)}</td>
                        <td>{formatWan(row.crit)}</td>
                        <td>{formatWan(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {activeResultView === "weights" ? (
            <section className="panel" data-testid="weights-view">
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
          ) : null}
        </div>
      </section>
    </main>
  );
}
