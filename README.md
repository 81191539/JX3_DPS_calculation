# DPS Calculation

Wu Tiance DPS calculation tools for estimating expected damage, DPS, rotation
breakdowns, and simple stat weights.

## Project Scope

This project is currently a simplified expected-value DPS model for Ao Xue
Tiance. It uses fixed rotation counts, expected critical damage, expected damage
bonuses, and a small target-defense table to estimate output. It is not a
Guo-style per-hit integer rounding model, and it does not yet fully model all
in-game damage buckets, manuals, talents, team buffs, special mechanics, or
combat-log calibration for target levels 131-133.

The migration path is `React + TypeScript WebUI + TypeScript calculation core`.
During the migration, `tiance_dps.py` remains the reference implementation for
regression checks.

The repository currently includes:

- `tiance_dps.py`: the Python DPS model and helper APIs.
- `index.html`: a browser-based calculator UI.
- `app.html`: the new Vite/React shell for the TypeScript migration.
- `src/`: React UI shell plus TypeScript core/data modules.
- `src/core/tianceDps.ts`: data-driven TypeScript calculation core.
- `src/data/tiance.ts`: Ao Xue Tiance skill, target, default panel, rotation,
  and simplified buff data.
- `tiance_dps.ipynb`: a notebook entry point for interactive exploration.
- `tests/test_tiance_dps.py`: regression tests for the Python model.

## Requirements

- Python 3.10 or newer
- `pip`

Install the Python dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

## Browser Calculator

Open `index.html` directly in a browser to use the legacy standalone
calculator UI. No server is required for the current static page.

The React calculator is served through Vite at `app.html`. It provides editable
panel inputs, target and duration settings, simplified buff controls, team buff
switches, rotation counts, scheme import/export, final panel output, skill
damage ratios, skill details, and stat weights from the TypeScript calculation
core.

## React / TypeScript Development

Install the frontend dependencies:

```powershell
npm install
```

Start the Vite development server and open `app.html`:

```powershell
npm run dev
```

Then open:

```text
http://127.0.0.1:5173/app.html
```

Build the React shell:

```powershell
npm run build
```

Run the TypeScript/Vitest checks:

```powershell
npm test
```

Run the Playwright WebUI acceptance checks:

```powershell
npx playwright install chromium
npm run test:e2e
```

The TypeScript calculation core is in `src/core/tianceDps.ts`. It currently
mirrors the simplified Python expected-value model for the default `sample_134`
case, including target defense, Ao Xue Wu modifiers, global gains, skill totals,
team buffs, and final panel summaries. Ao Xue Tiance data is kept in
`src/data/tiance.ts` so panel values, rotation counts, skill coefficients,
target data, and simplified team buff definitions can change without changing
the core formulas.

For TypeScript customization, start with `defaultCalculatorCase`,
`simplifiedTeamBuffs`, and `defaultTeamBuffConfigs` in `src/data/tiance.ts`.

## Python Usage

Run the default calibration case from Python:

```powershell
@'
import tiance_dps

case = tiance_dps.CALIBRATION_CASES["sample_134"]
result = tiance_dps.evaluate_case(case)

print(f"DPS: {result['dps']:.2f}")
print(f"Total damage: {result['total_damage']:.2f}")
'@ | python -
```

To customize inputs, start with these data structures in `tiance_dps.py`:

- `DEFAULT_PANEL`
- `DEFAULT_ROTATION_COUNTS`
- `DEFAULT_AOXUE_WU_BUFF`
- `DEFAULT_GLOBAL_EFFECTS`
- `CALIBRATION_CASES`

The default sample targets level `134` and uses a `180` second duration.

## Python / TypeScript Snapshot

The default `sample_134` regression target is:

| Field | Python reference | TypeScript expected |
| --- | ---: | ---: |
| DPS | `3150209.131609443` | `3150209.131609443` |
| Total damage | `567037643.6896998` | `567037643.6896998` |
| Long Ya total | `155052662.00165403` | `155052662.00165403` |
| Liu Xue tick total | `153552301.65019527` | `153552301.65019527` |

The TypeScript tests also assert that skill detail totals sum back to total
damage and unsupported target levels produce a clear error.

## Tests

Run the test suite with:

```powershell
python -m pytest
```

Run both current check suites with:

```powershell
python -m pytest
npm test
npm run build
```

## Phase 5 Acceptance

Phase 5 keeps the migrated TypeScript core and React calculator pinned to a
repeatable quality baseline.

Use the project virtual environment for Python checks when it is available:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Run the frontend unit tests, production build, and desktop/mobile WebUI
acceptance checks:

```powershell
npm run test:phase5
```

If Playwright browsers are not installed yet, install Chromium once:

```powershell
npx playwright install chromium
```

The Playwright suite opens `app.html` through Vite, checks the default
calculator result, verifies that the page does not create horizontal viewport
overflow, and writes desktop/mobile visual baselines to
`tests/visual-baselines/`. Generated Playwright artifacts are written under
`test-results/` and `playwright-report/`.

## Phase 6 Team Buffs

Team buffs are represented as data-driven definitions plus user-facing configs.
The current simplified set is `撼如雷`, `破风`, `破甲`, and `虚弱`. Each config
supports:

- `enabled`: whether the buff is active.
- `coverage`: uptime from `0` to `1`.
- `stacks`: integer stack count clamped by the buff definition.
- `effects`: editable simplified effect values such as attack gain, ignore
  defense, or skill damage buckets.

All team buffs are disabled in `defaultCalculatorCase`, so the default
`sample_134` result remains the Phase 5 baseline. Enabling one or more buffs in
the WebUI updates the final panel, DPS, skill ratios, and the active buff list
from the same TypeScript evaluation path.

## Phase 7 Workbench

The React UI is organized as a single workbench:

- Module navigation jumps between panel, rotation, buff, and result sections.
- The scheme panel can export the current `GoldenCase` JSON, import a modified
  JSON scheme, or restore the default sample.
- Result tabs split final panel, damage ratio, skill details, and stat weights
  into focused views while the top DPS summary remains visible.

Import, export, reset, result-view switching, and the default calculator result
are covered by the Playwright desktop/mobile acceptance suite.

## Notes

- The Python module does not run calculations on import.
- Unsupported target levels raise a clear `ValueError`.
- The TypeScript core receives target and skill data through `GoldenCase`;
  Ao Xue Tiance data does not depend on React components.
- Stat weights are estimated with finite differences through
  `scaled_stat_gradients`.
