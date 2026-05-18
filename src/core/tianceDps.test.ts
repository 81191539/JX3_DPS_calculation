import { describe, expect, it } from "vitest";
import { aoxueTianceSkills, defaultCalculatorCase, tianceTargetConfigs } from "../data/tiance";
import { buildTianceFromPanel, estimateStatWeights, evaluateCase } from "./tianceDps";

function expectClose(actual: number | undefined, expected: number, epsilon = 1e-6) {
  expect(actual).toBeTypeOf("number");
  expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(epsilon);
}

describe("evaluateCase", () => {
  it("matches the Python sample_134 snapshot", () => {
    const result = evaluateCase(defaultCalculatorCase);

    expectClose(result.totalDamage, 567037643.6896998, 1e-5);
    expectClose(result.dps, 3150209.131609443, 1e-6);
    expectClose(result.panel.attackPowerTotal, 74489.1);
    expectClose(result.panel.critRate, 0.4086661597611112);
    expectClose(result.panel.overcomeRate, 0.28533300641170617);
    expectClose(result.panel.defenseRateAfterIgnore, 0.1772104772287745);
  });

  it("keeps skill totals aligned with the Python reference", () => {
    const result = evaluateCase(defaultCalculatorCase);

    expectClose(result.skillTotals.long_ya, 155052662.00165403, 1e-5);
    expectClose(result.skillTotals.liu_xue_tick, 153552301.65019527, 1e-5);
    expectClose(result.skillTotals.li_po_wj, 55846054.22363548, 1e-5);
    expectClose(result.skillTotals.chuan_yun_2_counter, 28881321.002244163, 1e-5);
  });

  it("sums skill details back to total damage", () => {
    const result = evaluateCase(defaultCalculatorCase);
    const detailTotal = result.breakdown.reduce((total, row) => total + row.total, 0);
    const ratioTotal = result.breakdown.reduce((total, row) => total + row.ratio, 0);

    expectClose(detailTotal, result.totalDamage, 1e-6);
    expectClose(ratioTotal, 1, 1e-12);
  });
});

describe("buildTianceFromPanel", () => {
  it("fails clearly for unsupported target levels", () => {
    expect(() => {
      buildTianceFromPanel({
        ...defaultCalculatorCase.panel,
        targetLevel: 124,
      }, tianceTargetConfigs);
    }).toThrow("Unsupported target_level=124. Supported levels: 131, 132, 133, 134.");
  });
});

describe("data-driven interfaces", () => {
  it("responds to panel changes without changing the core API", () => {
    const base = evaluateCase(defaultCalculatorCase);
    const stronger = evaluateCase({
      ...defaultCalculatorCase,
      panel: {
        ...defaultCalculatorCase.panel,
        basePhysicalAttackPower: defaultCalculatorCase.panel.basePhysicalAttackPower + 100,
      },
    });

    expect(stronger.totalDamage).toBeGreaterThan(base.totalDamage);
  });

  it("uses skill definitions supplied by the data module", () => {
    const base = evaluateCase(defaultCalculatorCase);
    const strongerLongYa = evaluateCase({
      ...defaultCalculatorCase,
      skills: {
        ...aoxueTianceSkills,
        long_ya: {
          ...aoxueTianceSkills.long_ya,
          attackPowerCof: aoxueTianceSkills.long_ya.attackPowerCof + 0.1,
        },
      },
    });

    expect(strongerLongYa.skillTotals.long_ya).toBeGreaterThan(base.skillTotals.long_ya ?? 0);
    expect(strongerLongYa.totalDamage).toBeGreaterThan(base.totalDamage);
  });
});

describe("estimateStatWeights", () => {
  it("returns finite stat weights from the same evaluation core", () => {
    const weights = estimateStatWeights(defaultCalculatorCase);

    expect(weights).toHaveLength(8);
    expect(weights.map((row) => row.stat)).toContain("basePhysicalAttackPower");
    for (const row of weights) {
      expect(Number.isFinite(row.deltaDps)).toBe(true);
      expect(Number.isFinite(row.scaledDeltaDps)).toBe(true);
    }
  });
});
