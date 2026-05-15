import math
import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import tiance_dps


def test_default_target_level_is_supported_current_level():
    attr = tiance_dps.build_tiance_from_panel(
        strength=1000,
        base_physical_attack_power=2000,
        weapon_damage=100,
        crit_rating=0,
        crit_effect_rating=0,
        base_overcome_rating=0,
        strain_rating=0,
    )

    assert attr.target_level == 134
    assert attr.defense_scale == pytest.approx(tiance_dps.TARGET_CONFIGS[134].defense_scale)
    assert attr.target_defense == pytest.approx(tiance_dps.TARGET_CONFIGS[134].target_defense)


def test_unsupported_target_level_fails_with_clear_message():
    with pytest.raises(ValueError, match="Unsupported target_level=124"):
        tiance_dps.build_tiance_from_panel(
            strength=1000,
            base_physical_attack_power=2000,
            weapon_damage=100,
            target_level=124,
        )


def test_percent_overcome_path_removes_same_strength_contribution_that_tiance_adds_back():
    attr = tiance_dps.build_tiance_from_panel(
        strength=1000,
        base_physical_attack_power=2000,
        weapon_damage=100,
        crit_rate=0,
        crit_effect_total=1.75,
        overcome_rate=0.20,
        strain_rate=0.10,
    )

    assert float(attr.overcome) == pytest.approx(0.20, abs=1e-6)


def test_dps_default_has_no_hidden_level_reduction():
    total = 1000.0

    assert tiance_dps.dps_from_total(total, duration=10.0) == pytest.approx(100.0)
    assert tiance_dps.dps_from_total(total, duration=10.0, level_reduction=0.20) == pytest.approx(80.0)


def test_haste_tier_controls_fixed_rotation_counts():
    counts = tiance_dps.get_rotation_counts_for_haste_tier("haste_1")

    assert counts == tiance_dps.DEFAULT_ROTATION_COUNTS
    assert tiance_dps.CALIBRATION_CASES["sample_134"].haste_tier == "haste_1"
    with pytest.raises(NotImplementedError, match="二段加速"):
        tiance_dps.get_rotation_counts_for_haste_tier("haste_2")


def test_rotation_breakdown_matches_total_damage_sum():
    case = tiance_dps.CALIBRATION_CASES["sample_134"]
    attr, skills = tiance_dps.build_case_context(case)
    total = float(tiance_dps.sum_rotation_damage(attr, skills, case.counts))
    rows = tiance_dps.rotation_breakdown(attr, skills, case.counts)

    assert sum(row["total"] for row in rows) == pytest.approx(total, rel=1e-6)
    assert sum(row["ratio"] for row in rows) == pytest.approx(1.0, abs=1e-6)


def test_sample_calibration_case_exposes_log_comparison_fields():
    case = tiance_dps.CALIBRATION_CASES["sample_134"]
    result = tiance_dps.evaluate_case(case)

    assert result["name"] == "sample_134"
    assert result["panel"]["level"] == 134
    assert result["total_damage"] > 0
    assert result["dps"] > 0
    assert set(case.counts).issubset(result["skill_totals"])
    assert set(case.counts).issubset(result["skill_ratios"])


def test_expected_case_comparison_reports_deltas():
    base = tiance_dps.CALIBRATION_CASES["sample_134"]
    result = tiance_dps.evaluate_case(base)
    case = tiance_dps.GoldenCase(
        name="current_snapshot",
        panel=base.panel,
        counts=base.counts,
        duration=base.duration,
        level_reduction=base.level_reduction,
        aoxue_wu=base.aoxue_wu,
        global_effects=base.global_effects,
        expected_total_damage=result["total_damage"],
        expected_dps=result["dps"],
        expected_skill_totals={"long_ya": result["skill_totals"]["long_ya"]},
        expected_skill_ratios={"long_ya": result["skill_ratios"]["long_ya"]},
    )

    deltas = tiance_dps.compare_case_to_expected(case)

    assert all(math.isclose(delta, 0.0, abs_tol=1e-6) for delta in deltas.values())


def test_scaled_stat_gradients_use_plain_float_objective():
    case = tiance_dps.CALIBRATION_CASES["sample_134"]
    attr, skills = tiance_dps.build_case_context(case)

    def objective(current_attr):
        total = tiance_dps.sum_rotation_damage(current_attr, skills, case.counts)
        return tiance_dps.dps_from_total(total, duration=case.duration, level_reduction=case.level_reduction)

    grads = tiance_dps.scaled_stat_gradients(attr, objective)

    assert set(grads) == set(tiance_dps.ATTRIBUTE_GRADIENT_WEIGHTS)
    assert grads["base_physical_attack_power"] > 0
