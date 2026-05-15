# DPS Calculation

Wu Tiance DPS calculation tools for estimating expected damage, DPS, rotation
breakdowns, and simple stat weights.

The repository currently includes:

- `tiance_dps.py`: the Python DPS model and helper APIs.
- `index.html`: a browser-based calculator UI.
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

Open `index.html` directly in a browser to use the standalone calculator UI.
No server is required for the current static page.

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

## Tests

Run the test suite with:

```powershell
python -m pytest
```

## Notes

- The Python module does not run calculations on import.
- Unsupported target levels raise a clear `ValueError`.
- Stat weights are estimated with finite differences through
  `scaled_stat_gradients`.
