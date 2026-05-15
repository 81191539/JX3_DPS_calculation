# -*- coding: utf-8 -*-
"""
Wu Tiance (无界天策) DPS Calculator
----------------------------------------------------
This module follows the attribute/skill abstraction you provided and
specializes it for Unbounded Tiance. It is **data-driven** and ready to be
used for expectation DPS and attribute weight computation (via autograd).

Notes
- No computation runs on import. Use the provided helper functions or
  wire your own pipeline.
- Formulas/乘区 order matches your spec:
  base = base_damage + AP*coef + WD*coef
  base *= (1 + k_b) * (1 + k_c) * (1 + k_d)
  base *= (1 + overcome) * (1 + strain)
  hit  = base * (1 - defense_rate)
  crit = hit * critical_effect
  dmg  = crit * critical_strike + hit * (1 - critical_strike)
- GCD for Tiance is fixed at 1.0s (can be extended for haste-driven GCD).
- Runtime uses only Python floats. Attribute weights are estimated with finite
  differences when an objective callback is provided.

Author: You ;)
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Callable, Dict, Iterable, Mapping, Optional

# ----------------------------- Constants ------------------------------------
CRITICAL_STRIKE_SCALE  = 225946.1
CRITICAL_EFFECT_SCALE  = 72846.14
OVERCOME_SCALE         = 225946.1
STRAIN_SCALE           = 133328.82

DEFAULT_TARGET_LEVEL = 134
DEFAULT_DURATION = 180.0
DEFAULT_LEVEL_REDUCTION = 0.0
BASE_STRENGTH_TO_PHYSICAL_AP = 0.15
TIANCE_EXTRA_STRENGTH_TO_PHYSICAL_AP = 1.8
BASE_STRENGTH_TO_PHYSICAL_OVERCOME = 0.28
TIANCE_EXTRA_STRENGTH_TO_PHYSICAL_OVERCOME = 0.28

# (defense_scale, target_defense) per level
DEFENSE_COF = {
    131: (44291.70, 11073),
    132: (46582.65, 15528),
    133: (48873.60, 26317),
    134: (155408.88, 83679),
}


@dataclass(frozen=True)
class TargetConfig:
    level: int
    defense_scale: float
    target_defense: float
    level_reduction: float = DEFAULT_LEVEL_REDUCTION


TARGET_CONFIGS = {
    level: TargetConfig(level=level, defense_scale=defense_scale, target_defense=target_defense)
    for level, (defense_scale, target_defense) in DEFENSE_COF.items()
}

DEFAULT_PANEL = {
    "strength": 12873,
    "base_physical_attack_power": 47035,
    "weapon_damage": 10616,
    "crit_rating": 35850,
    "crit_effect_rating": 8437,
    "base_overcome_rating": 57261,
    "strain_rating": 88736,
    "counter_value": 31107,
    "target_level": DEFAULT_TARGET_LEVEL,
}

DEFAULT_ROTATION_COUNTS = {
    "long_ya": 58,
    "long_ya_counter": 58,
    "liu_xue_tick": 112,
    "li_po_wj": 6,
    "mie": 19,
    "pi_li": 20,
    "chuan_yun_1": 15,
    "chuan_yun_1_counter": 15,
    "chuan_yun_2": 14,
    "chuan_yun_2_counter": 14,
    "long_yin": 30,
}

DEFAULT_HASTE_TIER = "haste_1"
HASTE_TIER_ROTATION_COUNTS = {
    "haste_1": {
        "label": "一段加速",
        "available": True,
        "counts": DEFAULT_ROTATION_COUNTS,
    },
    "haste_2": {
        "label": "二段加速（待补）",
        "available": False,
        "counts": None,
    },
}

DEFAULT_AOXUE_WU_BUFF = {
    "vs_non_player_kd": 0.65,
    "ignore_def_pct": 0.60,
    "strain_gain_add": 0.00,
    "flat_ap_add": 0,
    "ap_gain_add": 0.0,
}

DEFAULT_GLOBAL_EFFECTS = {
    "global_crit_gain": 0.25,
    "global_kb_gain": 0.10,
    "global_kc_gain": 0.35,
    "ap_gain_add": 0.05,
}

ATTRIBUTE_GRADIENT_WEIGHTS = {
    "base_strength": 1.0,
    "base_physical_attack_power": 2.0,
    "base_physical_overcome": 4.45,
    "base_physical_critical_strike": 4.45,
    "base_physical_critical_effect": 4.45,
    "base_strain": 4.45,
    "weapon_damage": 220.0 / 73.0,
    "counter": 4.45,
}

SKILL_SPECS = {
    "chuan_yun_1": {"attack_power_cof": 1.84, "weapon_damage_cof": 1.00},
    "chuan_yun_2": {"attack_power_cof": 2.25, "weapon_damage_cof": 1.00},
    "pi_li": {"attack_power_cof": 5.03, "weapon_damage_cof": 2.00},
    "long_yin": {"attack_power_cof": 2.79, "weapon_damage_cof": 1.00},
    "mie": {"attack_power_cof": 4.51, "weapon_damage_cof": 2.00},
    "long_ya": {"attack_power_cof": 3.00, "weapon_damage_cof": 1.00, "k_b": 1.05},
    "li_po_wj": {"attack_power_cof": 11.36, "weapon_damage_cof": 4.00, "k_b": 0.60, "critical_strike": 0.25},
    "liu_xue_tick": {"attack_power_cof": 3.15},
    "chuan_yun_1_counter": {"kind": "counter", "counter_cof": 1.10},
    "chuan_yun_2_counter": {"kind": "counter", "counter_cof": 11.35},
    "long_ya_counter": {"kind": "counter", "counter_cof": 1.80},
}


@dataclass(frozen=True)
class GoldenCase:
    """A complete input/output shell for calibrating against combat logs."""

    name: str
    panel: Mapping[str, float]
    counts: Mapping[str, int]
    haste_tier: str = DEFAULT_HASTE_TIER
    duration: float = DEFAULT_DURATION
    level_reduction: float = DEFAULT_LEVEL_REDUCTION
    aoxue_wu: Optional[Mapping[str, float]] = None
    global_effects: Optional[Mapping[str, float]] = None
    expected_total_damage: Optional[float] = None
    expected_dps: Optional[float] = None
    expected_skill_totals: Optional[Mapping[str, float]] = None
    expected_skill_ratios: Optional[Mapping[str, float]] = None


CALIBRATION_CASES = {
    "sample_134": GoldenCase(
        name="sample_134",
        panel=DEFAULT_PANEL,
        counts=HASTE_TIER_ROTATION_COUNTS[DEFAULT_HASTE_TIER]["counts"],
        haste_tier=DEFAULT_HASTE_TIER,
        duration=DEFAULT_DURATION,
        level_reduction=DEFAULT_LEVEL_REDUCTION,
        aoxue_wu=DEFAULT_AOXUE_WU_BUFF,
        global_effects=DEFAULT_GLOBAL_EFFECTS,
    ),
}

# --------------------------- Attribute Base ---------------------------------
class Attribute:
    def __init__(
        self,
        base_agility: float = 0,
        agility_gain: float = 1,
        base_spunk: float = 0,
        spunk_gain: float = 1,
        base_strength: float = 0,
        strength_gain: float = 1,
        base_spirit: float = 0,
        spirit_gain: float = 1,
        base_physical_attack_power: float = 0,
        physical_attack_power_gain: float = 1,
        base_magical_attack_power: float = 0,
        magical_attack_power_gain: float = 1,
        base_physical_critical_strike: float = 0,
        physical_critical_strike_gain: float = 0,
        base_magical_critical_strike: float = 0,
        magical_critical_strike_gain: float = 0,
        base_physical_critical_effect: float = 0,
        physical_critical_effect_gain: float = 0,
        base_magical_critical_effect: float = 0,
        magical_critical_effect_gain: float = 0,
        base_physical_overcome: float = 0,
        physical_overcome_gain: float = 1,
        base_magical_overcome: float = 0,
        magical_overcome_gain: float = 1,
        base_strain: float = 0,
        strain_gain: float = 0,
        haste: float = 0,
        weapon_damage: float = 0,
        counter: float = 0,
        ignore_defense: float = 0,
        target_level: int = DEFAULT_TARGET_LEVEL,
    ) -> None:
        # primary stats
        self.base_agility  = float(base_agility)
        self.agility_gain  = agility_gain
        self.base_spunk    = float(base_spunk)
        self.spunk_gain    = spunk_gain
        self.base_strength = float(base_strength)
        self.strength_gain = strength_gain
        self.base_spirit   = float(base_spirit)
        self.spirit_gain   = spirit_gain

        # attack power (physical/magical)
        self.base_physical_attack_power = float(base_physical_attack_power)
        self.physical_attack_power_gain = physical_attack_power_gain
        self.base_magical_attack_power  = float(base_magical_attack_power)
        self.magical_attack_power_gain  = magical_attack_power_gain

        # crit & crit effect (physical/magical)
        self.base_physical_critical_strike = float(base_physical_critical_strike)
        self.physical_critical_strike_gain = physical_critical_strike_gain
        self.base_magical_critical_strike  = float(base_magical_critical_strike)
        self.magical_critical_strike_gain  = magical_critical_strike_gain

        self.base_physical_critical_effect = float(base_physical_critical_effect)
        self.physical_critical_effect_gain = physical_critical_effect_gain
        self.base_magical_critical_effect  = float(base_magical_critical_effect)
        self.magical_critical_effect_gain  = magical_critical_effect_gain

        # overcome (破防) & strain (无双)
        self.base_physical_overcome = float(base_physical_overcome)
        self.physical_overcome_gain = physical_overcome_gain
        self.base_magical_overcome  = float(base_magical_overcome)
        self.magical_overcome_gain  = magical_overcome_gain

        self.base_strain = float(base_strain)
        self.strain_gain = strain_gain

        # misc
        self.haste         = haste
        self.weapon_damage = float(weapon_damage)
        self.counter       = float(counter)

        if target_level not in TARGET_CONFIGS:
            supported = ", ".join(str(level) for level in sorted(TARGET_CONFIGS))
            raise ValueError(f"Unsupported target_level={target_level}. Supported levels: {supported}.")
        target_config = TARGET_CONFIGS[target_level]
        self.target_defense = target_config.target_defense
        self.defense_scale  = target_config.defense_scale
        self.ignore_defense = ignore_defense
        self.target_level = target_level


    # ---------------------------- Derived stats -----------------------------
    @property
    def gcd(self) -> float:
        # override in subclass if haste affects gcd
        return 1.5

    @property
    def agility(self):  return self.base_agility  * self.agility_gain
    @property
    def spunk(self):    return self.base_spunk    * self.spunk_gain
    @property
    def strength(self): return self.base_strength * self.strength_gain
    @property
    def spirit(self):   return self.base_spirit   * self.spirit_gain

    @property
    def physical_attack_power(self):
        # base + 0.15*STR baseline
        return self.base_physical_attack_power * self.physical_attack_power_gain + self.strength * BASE_STRENGTH_TO_PHYSICAL_AP

    @property
    def magical_attack_power(self):
        return self.base_magical_attack_power * self.magical_attack_power_gain + self.spunk * 0.18

    @property
    def attack_power(self):
        raise NotImplementedError

    @property
    def physical_critical_strike(self):
        # per your spec (no clamp): rating/scale + gains + agility*0.64
        return (
            self.base_physical_critical_strike / CRITICAL_STRIKE_SCALE
            + self.physical_critical_strike_gain
            + self.agility * 0.64
        )

    @property
    def magical_critical_strike(self):
        return (
            self.base_magical_critical_strike / CRITICAL_STRIKE_SCALE
            + self.magical_critical_strike_gain
            + self.spirit * 0.64
        )

    @property
    def critical_strike(self):
        raise NotImplementedError

    @property
    def physical_critical_effect(self):
        return 1.75 + self.base_physical_critical_effect / CRITICAL_EFFECT_SCALE + self.physical_critical_effect_gain

    @property
    def magical_critical_effect(self):
        return 1.75 + self.base_magical_critical_effect / CRITICAL_EFFECT_SCALE + self.magical_critical_effect_gain

    @property
    def critical_effect(self):
        raise NotImplementedError

    @property
    def physical_overcome(self):
        # (rating + 0.3*STR) / SCALE, then * gains
        return (
            self.base_physical_overcome + self.strength * BASE_STRENGTH_TO_PHYSICAL_OVERCOME
        ) / OVERCOME_SCALE * self.physical_overcome_gain

    @property
    def magical_overcome(self):
        return (self.base_magical_overcome + self.spunk * 0.3) / OVERCOME_SCALE * self.magical_overcome_gain

    @property
    def overcome(self):
        raise NotImplementedError

    @property
    def strain(self):
        return self.base_strain / STRAIN_SCALE + self.strain_gain

    # -------------------------- Gradient scaling ---------------------------
    def clone(self) -> "Attribute":
        """Copy the current attribute state, including applied buffs."""
        return self.__class__(
            base_agility=self.base_agility,
            agility_gain=self.agility_gain,
            base_spunk=self.base_spunk,
            spunk_gain=self.spunk_gain,
            base_strength=self.base_strength,
            strength_gain=self.strength_gain,
            base_spirit=self.base_spirit,
            spirit_gain=self.spirit_gain,
            base_physical_attack_power=self.base_physical_attack_power,
            physical_attack_power_gain=self.physical_attack_power_gain,
            base_magical_attack_power=self.base_magical_attack_power,
            magical_attack_power_gain=self.magical_attack_power_gain,
            base_physical_critical_strike=self.base_physical_critical_strike,
            physical_critical_strike_gain=self.physical_critical_strike_gain,
            base_magical_critical_strike=self.base_magical_critical_strike,
            magical_critical_strike_gain=self.magical_critical_strike_gain,
            base_physical_critical_effect=self.base_physical_critical_effect,
            physical_critical_effect_gain=self.physical_critical_effect_gain,
            base_magical_critical_effect=self.base_magical_critical_effect,
            magical_critical_effect_gain=self.magical_critical_effect_gain,
            base_physical_overcome=self.base_physical_overcome,
            physical_overcome_gain=self.physical_overcome_gain,
            base_magical_overcome=self.base_magical_overcome,
            magical_overcome_gain=self.magical_overcome_gain,
            base_strain=self.base_strain,
            strain_gain=self.strain_gain,
            haste=self.haste,
            weapon_damage=self.weapon_damage,
            counter=self.counter,
            ignore_defense=self.ignore_defense,
            target_level=self.target_level,
        )

    def scale_gradient(self, stat_name: str, value: float) -> float:
        """Scale finite-difference gradients by stat budget capacity weights."""
        return float(value) * ATTRIBUTE_GRADIENT_WEIGHTS.get(stat_name, 1.0)


# ------------------------ Unbounded Tiance Attribute ------------------------
class TianceAttribute(Attribute):
    """Unbounded Tiance specialization.

    - Physical path (物理会心/会效)，attack_power = physical_attack_power
    - GCD = 1.0s
    - Extra passive: +1.8*STR to physical_attack_power, +0.28*STR to physical_overcome rating
    """
    @property
    def gcd(self) -> float:
        return 1.0

    @property
    def physical_attack_power(self):
        # parent adds +0.15*STR; here we add extra +1.8*STR per spec
        return super().physical_attack_power + self.strength * TIANCE_EXTRA_STRENGTH_TO_PHYSICAL_AP

    @property
    def physical_overcome(self):
        # add +0.28*STR rating before scaling
        return super().physical_overcome + self.strength * TIANCE_EXTRA_STRENGTH_TO_PHYSICAL_OVERCOME / OVERCOME_SCALE

    @property
    def attack_power(self):
        return self.physical_attack_power

    @property
    def critical_strike(self):
        return self.physical_critical_strike

    @property
    def critical_effect(self):
        return self.physical_critical_effect

    @property
    def overcome(self):
        return self.physical_overcome


# ------------------------------ Skill Base ----------------------------------
class Skill:
    def __init__(
        self,
        *,
        base_damage: float = 0.0,
        weapon_damage_cof: float = 0.0,
        attack_power_cof: float = 0.0,
        cast_time: float = 0.0,
        times: int = 1,
        cd: float = 0.0,
        k_b: float = 0.0,
        k_c: float = 0.0,
        k_d: float = 0.0,
        increasing_k_b: float = 0.0,
        increasing_k_c: float = 0.0,
        increasing_k_d: float = 0.0,
        ignore_defense: float = 0.0,
        critical_strike: float = 0.0,
        critical_effect: float = 0.0,
    ) -> None:
        self.base_damage = float(base_damage)
        self.weapon_damage_cof = float(weapon_damage_cof)
        self.attack_power_cof = float(attack_power_cof)
        self.cast_time = float(cast_time)
        self.times = int(times)
        self.cd = float(cd)

        self.k_b = float(k_b)
        self.k_c = float(k_c)
        self.k_d = float(k_d)
        self.increasing_k_b = float(increasing_k_b)
        self.increasing_k_c = float(increasing_k_c)
        self.increasing_k_d = float(increasing_k_d)

        self.ignore_defense = float(ignore_defense)

        self.critical_strike = float(critical_strike)
        self.critical_effect = float(critical_effect)

    # ---------------------- Single-hit expectation -------------------------
    def cal_single_damage(self, attribute: Attribute, inc_b: float, inc_c: float, inc_d: float) -> float:
        critical_strike = attribute.critical_strike + self.critical_strike
        critical_effect = attribute.critical_effect + self.critical_effect

        target_defense = attribute.target_defense * (1.0 - self.ignore_defense - attribute.ignore_defense)
        if target_defense < 0:
            target_defense = 0.0
        defense_rate = target_defense / (attribute.defense_scale + target_defense)

        k_b = self.k_b + inc_b
        k_c = self.k_c + inc_c
        k_d = self.k_d + inc_d

        base = float(self.base_damage)
        base = base + attribute.attack_power * self.attack_power_cof
        base = base + attribute.weapon_damage * self.weapon_damage_cof
        base = base * (1.0 + k_b) * (1.0 + k_c) * (1.0 + k_d)

        base = base * (1.0 + attribute.overcome) * (1.0 + attribute.strain)

        hit_damage      = base * (1.0 - defense_rate)
        critical_damage = hit_damage * (critical_effect)

        return critical_damage * (critical_strike) + hit_damage * (1.0 - critical_strike)

    # ------------------------ Multi-hit expectation ------------------------
    def cal_total_damage(self, attribute: Attribute) -> float:
        total = 0.0
        inc_b = inc_c = inc_d = 0.0
        for _ in range(self.times):
            total = total + self.cal_single_damage(attribute, inc_b, inc_c, inc_d)
            inc_b += self.increasing_k_b
            inc_c += self.increasing_k_c
            inc_d += self.increasing_k_d
        return total

    def __call__(self, attribute: Attribute) -> float:
        return self.cal_total_damage(attribute)
        
    # —— 新增：按期望分解为“不会心贡献”和“会心贡献”，并汇总总伤害 ——
    def breakdown(self, attribute: Attribute):
        total_noncrit = 0.0
        total_crit    = 0.0
        inc_b = inc_c = inc_d = 0.0
        for _ in range(self.times):
            crit = attribute.critical_strike + self.critical_strike
            cfx  = attribute.critical_effect + self.critical_effect

            target_def = attribute.target_defense * (1.0 - self.ignore_defense - attribute.ignore_defense)
            if target_def < 0:
                target_def = 0.0
            dr = target_def / (attribute.defense_scale + target_def)

            k_b = self.k_b + inc_b
            k_c = self.k_c + inc_c
            k_d = self.k_d + inc_d

            base = float(self.base_damage)
            base = base + attribute.attack_power * self.attack_power_cof
            base = base + attribute.weapon_damage * self.weapon_damage_cof
            base = base * (1.0 + k_b) * (1.0 + k_c) * (1.0 + k_d)
            base = base * (1.0 + attribute.overcome) * (1.0 + attribute.strain)

            hit  = base * (1.0 - dr)
            critd = hit * cfx
            total_noncrit = total_noncrit + hit  * (1.0 - crit)
            total_crit    = total_crit    + critd * crit

            inc_b += self.increasing_k_b
            inc_c += self.increasing_k_c
            inc_d += self.increasing_k_d

        return total_noncrit, total_crit, (total_noncrit + total_crit)


class Counter(Skill):
    """Counter-only damage skill — uses attribute.counter and counter_cof."""
    def __init__(self, *, counter_cof: float, **kwargs) -> None:
        self.counter_cof = float(counter_cof)
        super().__init__(**kwargs)

    def cal_single_damage(self, attribute: Attribute, inc_b: float, inc_c: float, inc_d: float) -> float:
        critical_strike = attribute.critical_strike + self.critical_strike
        critical_effect = attribute.critical_effect + self.critical_effect

        target_defense = attribute.target_defense * (1.0 - self.ignore_defense - attribute.ignore_defense)
        if target_defense < 0:
            target_defense = 0.0
        defense_rate = target_defense / (attribute.defense_scale + target_defense)

        k_b = self.k_b + inc_b
        k_c = self.k_c + inc_c
        k_d = self.k_d + inc_d

        base = attribute.counter * self.counter_cof
        base = base * (1.0 + k_b) * (1.0 + k_c) * (1.0 + k_d)
        base = base * (1.0 + attribute.overcome) * (1.0 + attribute.strain)

        hit_damage      = base * (1.0 - defense_rate)
        critical_damage = hit_damage * (critical_effect)
        return critical_damage * (critical_strike) + hit_damage * (1.0 - critical_strike)
        # —— 新增：破招技能的分解版本 ——
    def breakdown(self, attribute: Attribute):
        total_noncrit = 0.0
        total_crit    = 0.0
        inc_b = inc_c = inc_d = 0.0
        for _ in range(self.times):
            crit = attribute.critical_strike + self.critical_strike
            cfx  = attribute.critical_effect + self.critical_effect

            target_def = attribute.target_defense * (1.0 - self.ignore_defense - attribute.ignore_defense)
            if target_def < 0:
                target_def = 0.0
            dr = target_def / (attribute.defense_scale + target_def)

            k_b = self.k_b + inc_b
            k_c = self.k_c + inc_c
            k_d = self.k_d + inc_d

            base = attribute.counter * self.counter_cof
            base = base * (1.0 + k_b) * (1.0 + k_c) * (1.0 + k_d)
            base = base * (1.0 + attribute.overcome) * (1.0 + attribute.strain)

            hit  = base * (1.0 - dr)
            critd = hit * cfx
            total_noncrit = total_noncrit + hit  * (1.0 - crit)
            total_crit    = total_crit    + critd * crit

            inc_b += self.increasing_k_b
            inc_c += self.increasing_k_c
            inc_d += self.increasing_k_d

        return total_noncrit, total_crit, (total_noncrit + total_crit)


# -------------------------- Helper: Panel -> Attr ---------------------------
def build_tiance_from_panel(
    *,
    strength: float,
    base_physical_attack_power: float,
    weapon_damage: float,
    # —— 旧版：百分比输入（任一给了就会被用到）
    crit_rate: float | None = None,          # 例如 0.1814
    crit_effect_total: float | None = None,  # 例如 1.8658（含基础1.75）
    overcome_rate: float | None = None,      # 例如 0.2694
    strain_rate: float | None = None,        # 例如 0.6655
    # —— 新版：评级/基础值输入（建议用这个）
    crit_rating: float | None = None,             # 会心评级，例如 35850
    crit_effect_rating: float | None = None,      # 会效评级（不含1.75），例如 8437
    base_overcome_rating: float | None = None,    # 基础破防评级（不含力道），例如 57261
    strain_rating: float | None = None,           # 无双评级，例如 88736
    # —— 其它
    counter_value: float = 0.0,
    target_level: int = DEFAULT_TARGET_LEVEL,
    **kw,  # 允许别名/中文键从 kwargs 进来（例如 **{"会心": 35850}）
) -> TianceAttribute:
    """
    面板 -> TianceAttribute 基础属性（不含姿态与全局增益）。
    支持两种输入方式：
      A) 旧版百分比：crit_rate / crit_effect_total / overcome_rate / strain_rate
      B) 新版评级值：crit_rating / crit_effect_rating / base_overcome_rating / strain_rating
    若两种同时给：优先采用新版评级值。
    """

    # ---- 别名与中文键（通过 **kwargs 传入时有效）----
    def first_not_none(*vals):
        for v in vals:
            if v is not None:
                return v
        return None

    # 中文键仅在以 **dict 调用时可行（Python 允许 Unicode 关键字，但直接写‘会心=’不一定方便）
    crit_rating        = first_not_none(crit_rating,        kw.get("crit"), kw.get("crit_rate_rating"), kw.get("会心"))
    crit_effect_rating = first_not_none(crit_effect_rating, kw.get("crit_power_rating"), kw.get("cfx_rating"), kw.get("会效"))
    base_overcome_rating = first_not_none(base_overcome_rating, kw.get("overcome_base"), kw.get("overcome_rating"), kw.get("基础破防"))
    strain_rating      = first_not_none(strain_rating,      kw.get("strain_value"), kw.get("无双"))

    # ---- 计算基础评级（优先走新版评级路径）----
    # 会心评级
    if crit_rating is not None:
        base_phys_crit_strike = float(crit_rating)
    else:
        # 百分比 -> 评级
        base_phys_crit_strike = float( (crit_rate or 0.0) * CRITICAL_STRIKE_SCALE )

    # 会效评级（注意：评级不含基础1.75）
    if crit_effect_rating is not None:
        base_phys_crit_effect = float(crit_effect_rating)
    else:
        # 给的是“总会效”，先减基础1.75，再转评级
        ce_total = crit_effect_total or 0.0
        base_phys_crit_effect = float( (ce_total - 1.75) * CRITICAL_EFFECT_SCALE )

    # 破防评级（这里的“基础破防”应为不含力道转化的纯评级）
    if base_overcome_rating is not None:
        base_phys_overcome = float(base_overcome_rating)
    else:
        # 百分比 -> 评级，并去掉父/子类中会额外加回的力道破防。
        strength_to_overcome = BASE_STRENGTH_TO_PHYSICAL_OVERCOME + TIANCE_EXTRA_STRENGTH_TO_PHYSICAL_OVERCOME
        base_phys_overcome = float((overcome_rate or 0.0) * OVERCOME_SCALE - strength_to_overcome * strength)

    # 无双评级（只存评级本体；姿态的 +10% 在其它流程加到 gain 上）
    if strain_rating is not None:
        base_strain_rating = float(strain_rating)
    else:
        # 百分比 -> 评级；旧口径里面板含 +10%，所以减去 0.10 再转评级
        base_strain_rating = float( ((strain_rate or 0.0) - 0.10) * STRAIN_SCALE )

    return TianceAttribute(
        base_strength=strength,
        base_physical_attack_power=base_physical_attack_power,
        weapon_damage=weapon_damage,
        base_physical_critical_strike=base_phys_crit_strike,
        base_physical_critical_effect=base_phys_crit_effect,
        base_physical_overcome=base_phys_overcome,
        base_strain=base_strain_rating,
        counter=counter_value,
        target_level=target_level,
    )

# ---------------------- Helper: Apply stance/buffs --------------------------
def apply_aoxue_wu(
    attr: TianceAttribute,
    skills: Iterable[Skill],
    *,
    vs_non_player_kd: float = 0.65,   # 对非侠士伤害 +65% -> D乘区
    ignore_def_pct: float = 0.60,     # 无视防御 60%
    strain_gain_add: float = 0.00,    # 无双 0%
    flat_ap_add: float = 0,      # 外功攻击 +7164
    ap_gain_add: float = 0.0,         # 留做额外AP gain，通常由其它被动补
) -> None:
    """Apply 傲血战意·悟 stance modifiers."""
    # flat AP
    attr.base_physical_attack_power += float(flat_ap_add)
    # +10% strain
    attr.strain_gain += float(strain_gain_add)
    # ignore defense
    attr.ignore_defense += float(ignore_def_pct)
    # optional AP gain
    attr.physical_attack_power_gain += float(ap_gain_add)
    # vs non-player -> D乘区到所有技能
    for s in skills:
        s.k_d += float(vs_non_player_kd)


def apply_global_effects(
    attr: TianceAttribute,
    skills: Iterable[Skill],
    *,
    global_crit_gain: float = 0.25,  # 例：穿云一 0.10 + 霹雳 0.15
    global_kb_gain: float = 0.10,    # 例：龙牙 0.10（只保留龙牙在 B）
    global_kc_gain: float = 0.35,    # 例：龙吟 0.15 + 骁武 0.20  => 0.35
    ap_gain_add: float = 0.05,       # 例：憾如雷 +0.05
) -> None:

    """Apply always-on global effects with coverage=1 (期望建模)."""
    attr.physical_critical_strike_gain += float(global_crit_gain)
    attr.physical_attack_power_gain   += float(ap_gain_add)
    for s in skills:
        s.k_b += float(global_kb_gain)
        s.k_c += float(global_kc_gain)


# ---------------------------- Tiance Skills ---------------------------------

def build_tiance_skills(*, add_global_kd: float = 0.0, add_global_kb: float = 0.0) -> Dict[str, Skill]:
    """
    Create skill instances for Unbounded Tiance.
    - You may pass default global k_d / k_b that will be added at creation.
    - For DoT "流血": per-tick AP coeff should be set directly (you asked to
      treat 315% as **per tick**); set via `liu_xue_tick.attack_power_cof`.
    """
    kd = float(add_global_kd)
    kb = float(add_global_kb)

    skills: Dict[str, Skill] = {}
    for key, spec in SKILL_SPECS.items():
        params = dict(spec)
        kind = params.pop("kind", "skill")
        params["k_d"] = kd + float(params.get("k_d", 0.0))
        params["k_b"] = kb + float(params.get("k_b", 0.0))
        if kind == "counter":
            skills[key] = Counter(**params)
        else:
            skills[key] = Skill(**params)
    return skills


# --------------------------- Rotation Utilities -----------------------------

def sum_rotation_damage(
    attr: TianceAttribute,
    skills: Mapping[str, Skill],
    counts: Mapping[str, int],
) -> float:
    """Sum total damage over a rotation by multiplying per-cast/tick damage.

    counts keys are free-form; use the same skill ids returned by build_tiance_skills.
    Example keys: "long_ya", "long_ya_counter", "liu_xue_tick", ...
    """
    total = 0.0
    for key, n in counts.items():
        n = int(n)
        if n <= 0:
            continue
        s = skills[key]
        total = total + s(attr) * n
    return total


def dps_from_total(
    total: float,
    *,
    duration: float = DEFAULT_DURATION,
    level_reduction: float = DEFAULT_LEVEL_REDUCTION,
) -> float:
    """Convert total damage to DPS.

    `level_reduction` is intentionally explicit. The built-in target table is
    131-134 only, so the historical 124-level 20% reduction should not be a
    hidden default for current 134-level log calibration.
    """
    return (total / float(duration)) * (1.0 - float(level_reduction))


def get_rotation_counts_for_haste_tier(haste_tier: str = DEFAULT_HASTE_TIER) -> Mapping[str, int]:
    """Return fixed rotation counts for one haste tier."""
    if haste_tier not in HASTE_TIER_ROTATION_COUNTS:
        supported = ", ".join(sorted(HASTE_TIER_ROTATION_COUNTS))
        raise ValueError(f"Unsupported haste_tier={haste_tier}. Supported tiers: {supported}.")
    config = HASTE_TIER_ROTATION_COUNTS[haste_tier]
    if not config["available"] or config["counts"] is None:
        raise NotImplementedError(f"{config['label']} 的技能次数数据待补。")
    return config["counts"]


def build_case_context(case: GoldenCase) -> tuple[TianceAttribute, Dict[str, Skill]]:
    """Build an attribute object and skill table from one calibration case."""
    attr = build_tiance_from_panel(**dict(case.panel))
    skills = build_tiance_skills()
    if case.aoxue_wu:
        apply_aoxue_wu(attr, skills.values(), **dict(case.aoxue_wu))
    if case.global_effects:
        apply_global_effects(attr, skills.values(), **dict(case.global_effects))
    return attr, skills


def evaluate_case(case: GoldenCase) -> dict:
    """Return the explainable DPS output used for log calibration."""
    attr, skills = build_case_context(case)
    total = sum_rotation_damage(attr, skills, case.counts)
    dps = dps_from_total(total, duration=case.duration, level_reduction=case.level_reduction)
    rows = rotation_breakdown(attr, skills, case.counts)
    return {
        "name": case.name,
        "haste_tier": case.haste_tier,
        "duration": float(case.duration),
        "level_reduction": float(case.level_reduction),
        "panel": summarize_final_panel(attr),
        "total_damage": float(total),
        "dps": float(dps),
        "skill_totals": {row["skill"]: row["total"] for row in rows},
        "skill_ratios": {row["skill"]: row["ratio"] for row in rows},
        "breakdown": rows,
    }


def compare_case_to_expected(case: GoldenCase) -> dict:
    """Return absolute deltas for expected fields supplied by a combat log."""
    result = evaluate_case(case)
    deltas = {}
    if case.expected_total_damage is not None:
        deltas["total_damage"] = result["total_damage"] - float(case.expected_total_damage)
    if case.expected_dps is not None:
        deltas["dps"] = result["dps"] - float(case.expected_dps)
    for key, expected in (case.expected_skill_totals or {}).items():
        deltas[f"skill_total.{key}"] = result["skill_totals"].get(key, 0.0) - float(expected)
    for key, expected in (case.expected_skill_ratios or {}).items():
        deltas[f"skill_ratio.{key}"] = result["skill_ratios"].get(key, 0.0) - float(expected)
    return deltas


# ------------------------------- Gradients ----------------------------------

def scaled_stat_gradients(
    attr: Attribute,
    objective: Callable[[Attribute], float],
    *,
    step: float = 1.0,
) -> Dict[str, Optional[float]]:
    """
    Estimate scaled stat weights with central finite differences.

    `objective` should rebuild the scalar of interest from an Attribute, e.g.
    `lambda a: dps_from_total(sum_rotation_damage(a, skills, counts))`.
    """
    if not callable(objective):
        raise TypeError(
            "scaled_stat_gradients now uses finite differences. Pass a callable "
            "like lambda a: dps_from_total(sum_rotation_damage(a, skills, counts))."
        )

    def finite_diff(stat_name: str) -> float:
        plus = attr.clone()
        minus = attr.clone()
        setattr(plus, stat_name, getattr(plus, stat_name) + float(step))
        setattr(minus, stat_name, getattr(minus, stat_name) - float(step))
        raw = (float(objective(plus)) - float(objective(minus))) / (2.0 * float(step))
        return attr.scale_gradient(stat_name, raw)

    return {
        "base_strength": finite_diff("base_strength"),
        "base_physical_attack_power": finite_diff("base_physical_attack_power"),
        "base_physical_overcome": finite_diff("base_physical_overcome"),
        "base_physical_critical_strike": finite_diff("base_physical_critical_strike"),
        "base_physical_critical_effect": finite_diff("base_physical_critical_effect"),
        "base_strain": finite_diff("base_strain"),
        "weapon_damage": finite_diff("weapon_damage"),
        "counter": finite_diff("counter"),
    }


# ------------------------------- Example ------------------------------------
if __name__ == "__main__":
    # This example is commented to avoid any side effects on import.
    # Un-comment to try with your panel values and 3-minute counts.
    """
    # 1) Build attribute from a panel
    attr = build_tiance_from_panel(
        strength=12878,
        base_physical_attack_power=47035,
        weapon_damage=10616,
        crit_rate=0.1814,
        crit_effect_total=1.8658,
        overcome_rate=0.2694,
        strain_rate=0.6655,
        counter_value=31107,
        target_level=134,
    )

    # 2) Build skills and apply stance + global effects
    skills = build_tiance_skills()

    # 傲血战意·悟：+7164 AP, +10% 无双, 忽视60%防御, 对非侠士+39%(D乘区)
    apply_aoxue_wu(attr, skills.values(), vs_non_player_kd=0.39, ignore_def_pct=0.60, strain_gain_add=0.10, flat_ap_add=7164)

    # 全局：会心+25%（穿云一+霹雳）、B乘区+25%（龙吟+龙牙）、憾如雷AP+5%
    apply_global_effects(attr, skills.values(), global_crit_gain=0.25, global_kb_gain=0.25, ap_gain_add=0.05)

    # 3) 3-minute counts (your example)
    counts = {
        "long_ya": 58,
        "long_ya_counter": 58,
        "liu_xue_tick": 112,   # DoT as ticks; each tick = 3.15×AP per your spec
        "li_po_wj": 6,
        "mie": 19,
        "pi_li": 20,
        "chuan_yun_1": 15,
        "chuan_yun_1_counter": 15,
        "chuan_yun_2": 14,
        "chuan_yun_2_counter": 14,
        "long_yin": 30,
    }

    # 4) compute total & DPS
    total = sum_rotation_damage(attr, skills, counts)
    dps = dps_from_total(total, duration=180.0, level_reduction=0.0)
    print("DPS:", float(dps))

    # 5) gradients (attribute weights)
    grads = scaled_stat_gradients(attr, lambda a: dps_from_total(sum_rotation_damage(a, skills, counts)))
    for k, v in grads.items():
        print(f"{k:32s}: {v}")
    """

# —— 新增：汇总“最终人物面板”（含评级与百分比） ——
def summarize_final_panel(attr: Attribute) -> dict:
    # 等效“最终评级”（把百分比乘回 scale），便于对照“面板值”
    crit_rate  = float(attr.critical_strike)
    crit_eff   = float(attr.critical_effect)
    overcome   = float(attr.overcome)
    strain     = float(attr.strain)

    panel = {
        "level":                getattr(attr, "target_level", None),
        "strength":             float(attr.strength),
        "base_physical_ap":     float(attr.base_physical_attack_power),
        "ap_gain":              float(attr.physical_attack_power_gain),
        "attack_power_total":   float(attr.physical_attack_power),
        "weapon_damage":        float(attr.weapon_damage),

        "crit_rate":            crit_rate,                                # 会心（百分比）
        "crit_rating_equiv":    crit_rate  * CRITICAL_STRIKE_SCALE,       # 会心 等效评级
        "crit_effect_total":    crit_eff,                                 # 会效（含基础1.75）
        "crit_effect_rating_equiv": (crit_eff - 1.75) * CRITICAL_EFFECT_SCALE,

        "overcome_rate":        overcome,                                 # 破防（百分比）
        "overcome_rating_equiv":overcome * OVERCOME_SCALE,                # 破防 等效评级

        "strain_rate":          strain,                                   # 无双（百分比）
        "strain_rating_equiv":  strain  * STRAIN_SCALE,                   # 无双 等效评级

        "ignore_defense":       float(attr.ignore_defense),
        "target_defense":       float(attr.target_defense),
        "defense_scale":        float(attr.defense_scale),
    }

    # 命中目标的实际减伤率（考虑无视防御）
    eff_target_def = max(0.0, attr.target_defense * (1.0 - float(attr.ignore_defense)))
    defense_rate = eff_target_def / (attr.defense_scale + eff_target_def)
    panel["defense_rate_after_ignore"] = float(defense_rate)

    return panel


def print_final_panel(attr: Attribute) -> None:
    p = summarize_final_panel(attr)
    def pct(x): return f"{x*100:.2f}%"
    print("=== Final Panel ===")
    print(f"Level: {p['level']}")
    print(f"Strength: {p['strength']:.2f}")
    print(f"Base Physical AP: {p['base_physical_ap']:.2f}  | AP Gain: {p['ap_gain']:.4f}")
    print(f"Total Attack Power: {p['attack_power_total']:.2f}   | Weapon Damage: {p['weapon_damage']:.2f}")
    print(f"Crit: {pct(p['crit_rate'])}  (rating≈ {p['crit_rating_equiv']:.1f})")
    print(f"Crit Effect (total): {p['crit_effect_total']:.4f}  (rating≈ {p['crit_effect_rating_equiv']:.1f})")
    print(f"Overcome: {pct(p['overcome_rate'])}  (rating≈ {p['overcome_rating_equiv']:.1f})")
    print(f"Strain:   {pct(p['strain_rate'])}    (rating≈ {p['strain_rating_equiv']:.1f})")
    print(f"Ignore Defense: {pct(p['ignore_defense'])}")
    print(f"Target Defense: {p['target_defense']:.2f} | Defense Scale: {p['defense_scale']:.2f}")
    print(f"Defense Rate (after ignore): {pct(p['defense_rate_after_ignore'])}")
    
    # —— 新增：按 rotation 统计每个技能的“不会心/会心/总伤害”和占比 ——
def rotation_breakdown(attr: Attribute, skills: dict, counts: dict) -> list[dict]:
    rows = []
    grand = 0.0
    for key, n in counts.items():
        n = int(n)
        if n <= 0: 
            continue
        noncrit, crit, total = skills[key].breakdown(attr)
        noncrit = noncrit * n
        crit    = crit    * n
        total   = total   * n
        rows.append({
            "skill": key,
            "count": n,
            "noncrit": float(noncrit),
            "crit":    float(crit),
            "total":   float(total)
        })
        grand = grand + total
    grand_val = float(grand)
    # 计算占比
    for r in rows:
        r["ratio"] = 0.0 if grand_val == 0 else (r["total"] / grand_val)
    # 按总伤降序
    rows.sort(key=lambda x: x["total"], reverse=True)
    return rows


def print_rotation_breakdown(
    attr: Attribute,
    skills: dict,
    counts: dict,
    *,
    duration=DEFAULT_DURATION,
    level_reduction=DEFAULT_LEVEL_REDUCTION,
) -> None:
    rows = rotation_breakdown(attr, skills, counts)
    # 统一的等级减伤不会改变占比，这里仅在最后打印 DPS 时使用
    grand_total = sum(r["total"] for r in rows)
    dps = grand_total / float(duration) * (1.0 - float(level_reduction))

    print("=== Rotation Breakdown (non-crit / crit / total / ratio) ===")
    for r in rows:
        print(f"{r['skill']:20s} x{r['count']:3d}  "
              f"non-crit: {r['noncrit']:12.1f}  "
              f"crit: {r['crit']:12.1f}  "
              f"total: {r['total']:12.1f}  "
              f"ratio: {r['ratio']*100:6.2f}%")
    print(f"\nTotal Damage: {grand_total:,.1f}   |   DPS (after level reduction): {dps:,.2f}")
