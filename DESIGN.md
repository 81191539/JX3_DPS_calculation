# Historical Design Note

This document is a legacy ECMO digital twin design note and is not the current
product design source for the JX3 DPS calculator. It is retained only as
historical reference while the repository is being cleaned up.

# ECMO Digital Twin DESIGN.md

## Design Intent

This project is a clinical engineering demo for ECMO + NIV digital twin simulation. The interface should feel like a serious monitoring console: calm, precise, readable under pressure, and visually restrained.

The visual language combines three references:

- IBM-style rigor: strict grid, clear hierarchy, low ornament, semantic status colors, thin borders.
- Supabase-style product clarity: clean dashboard surfaces, legible data panels, obvious controls, sparse accent usage.
- Sentry-style monitoring language: strong alarm states, event emphasis, status rhythm, and scan-friendly incident cues.

Do not make the UI look like a marketing landing page. The first screen should be a usable dashboard.

## Core Principles

- Prioritize patient/state readability over brand expression.
- Use dense but organized layouts: operators should scan many values quickly.
- Keep the visual system dark by default, with high contrast text and restrained cyan/green accents.
- Use color semantically, not decoratively.
- Use thin borders and surface changes for hierarchy; avoid heavy shadows and glossy effects.
- Keep controls close to the data they affect.
- Make alarms impossible to miss without making normal operation noisy.

## Color System

### Base Surfaces

| Token | Hex | Use |
| --- | --- | --- |
| `bg` | `#07111F` | App background |
| `surface` | `#0F1E33` | Main panels |
| `surface_alt` | `#132746` | Nested cards, inputs, inactive controls |
| `surface_raised` | `#182D4D` | Selected tabs, active panels |
| `line` | `#204365` | Chart grids, separators |
| `border` | `rgba(120, 160, 200, 0.24)` | Panel/card borders |
| `border_strong` | `rgba(120, 200, 220, 0.42)` | Focus, hover, active boundaries |

### Text

| Token | Hex | Use |
| --- | --- | --- |
| `text` | `#EAF1F7` | Primary labels, values, headings |
| `text_muted` | `#9AB4CC` | Secondary labels, helper text |
| `text_dim` | `#607A94` | Units, captions, disabled metadata |
| `text_inverse` | `#07111F` | Text on bright semantic fills |

### Accents and Semantics

| Token | Hex | Use |
| --- | --- | --- |
| `accent` | `#33C7D9` | Primary action, selected state, live stream signal |
| `accent_soft` | `#5FD1A5` | Secondary positive clinical signal |
| `success` | `#22D3A8` | Stable / in-range / connected |
| `warning` | `#F2B134` | Borderline / attention needed |
| `danger` | `#F05A5A` | Critical alarm / unsafe range |
| `info` | `#7EA8FF` | Informational status, neutral highlights |

### Color Rules

- Use `accent` sparingly: one dominant cyan focus per viewport.
- Use `success`, `warning`, and `danger` only for state meaning.
- Do not create decorative gradients. A subtle radial tint behind the dashboard is acceptable only if it does not reduce readability.
- Never encode state by color alone; pair color with label, icon, or text.

## Typography

### Font Stack

Use system fonts optimized for Windows clinical/demo environments:

```css
font-family: Bahnschrift, Aptos, "Segoe UI", "Microsoft YaHei", sans-serif;
font-variant-numeric: tabular-nums;
```

Use monospace only for logs, IDs, raw API payloads, or technical traces:

```css
font-family: "Cascadia Mono", Consolas, ui-monospace, monospace;
```

### Type Scale

| Role | Size | Weight | Use |
| --- | ---: | ---: | --- |
| `page_title` | 24px | 700 | Dashboard title |
| `section_title` | 16px | 700 | Panel heading |
| `panel_title` | 14px | 600 | Card title, group title |
| `body` | 13px | 400 | Default UI text |
| `label` | 12px | 500 | Field labels, control labels |
| `caption` | 11px | 400 | Units, timestamps, hints |
| `metric_value` | 22px | 700 | Primary numeric values |
| `metric_value_large` | 30px | 700 | Top-level oxygenation / ventilation values |

### Typography Rules

- Always use tabular numerals for physiologic values.
- Keep labels short and concrete.
- Prefer sentence case in Chinese or English; avoid decorative all-caps except compact status chips.
- Do not scale font size with viewport width.

## Layout

### Grid

- Base spacing unit: 4px.
- Standard panel gap: 12px.
- Standard card padding: 12px to 16px.
- Dashboard max width: 1600px to 1800px.
- Use 2 to 4 columns on desktop depending on data density.
- Collapse to one column on mobile or narrow windows.

### Layout Rhythm

- Top band: scenario, connection state, run controls, global summary.
- Main dashboard: arterial gases, venous gases, ECMO settings, NIV/ventilator settings, hemodynamics, alarms.
- Lower band: trends, parameter details, history, event log.

### Density

This is an operational UI. Prefer compact, aligned information over spacious editorial layouts. Whitespace should separate functional groups, not create atmosphere.

## Components

### Panels

Panels are the main dashboard containers.

- Background: `surface`
- Border: 1px `border`
- Radius: 8px to 12px
- Padding: 14px to 16px
- Shadow: none or very subtle only

Do not nest card-like panels inside other decorative cards. Nested content should use `surface_alt` with thinner borders.

### Metric Cards

Metric cards show one physiologic or device value.

- Label at top left.
- Numeric value dominant and tabular.
- Unit visually quieter than value.
- Status appears as left border, value color, or compact text hint.
- Include trend arrows only when data supports them.

State mapping:

- `success`: value is inside target range.
- `warning`: value is borderline or needs attention.
- `danger`: value is critical.
- `accent`: neutral live value or controlled parameter.

### Alarm Rows

Alarm rows use Sentry-style monitoring emphasis but in a clinical tone.

- Critical alarms use `danger` border/fill and clear text.
- Warning alarms use `warning` border/fill.
- Normal state should be visible but quiet.
- Alarm rows should include timestamp or current-state marker when possible.

Recommended structure:

```text
[severity dot] LOW PaO2    PaO2 52.0 mmHg below target    Live
```

### Buttons

Primary actions:

- Fill or outline using `accent`.
- Radius: 6px to 8px.
- Minimum height: 36px desktop, 44px touch.

Danger actions:

- Use `danger` only for reset, stop, disconnect, or clinically unsafe simulation actions.

Secondary actions:

- Use `surface_alt` fill with `border`.

Do not use pill-shaped buttons except for small status badges.

### Tabs

- Use understated tabs with cyan selected underline or raised surface.
- Keep tab labels short.
- Tabs should separate functional views, not decorative sections.

### Inputs and Sliders

- Inputs use `surface_alt` with 1px border.
- Focus state uses `accent` border or underline.
- Sliders should use `accent` for active track.
- Controls that affect simulation state should be grouped near explanatory labels and current values.

### Tables

Use tables for parameter catalogs and historical values.

- Header background: `surface_alt`
- Row separators: `line`
- Hover: subtle `surface_raised`
- Status column should use text + color chip.
- Avoid excessive rounded cards around every row.

### Charts

- Background should match panel surface.
- Grid lines use `line` at low contrast.
- Primary traces use `accent`, `success`, `warning`, or `danger` according to meaning.
- Label axes clearly.
- Do not use rainbow palettes unless comparing many unrelated traces.

### Logs and Technical Details

Raw IDs, API status, and debug output should use monospace and compact panels.

- Background: near-black or `surface_alt`
- Text: `text_muted`
- Highlight errors with `danger`

## Clinical Status Language

Use these labels consistently:

| Status | Meaning | Visual |
| --- | --- | --- |
| `Stable` | In range, no action needed | `success` |
| `Watch` | Borderline or drifting | `warning` |
| `Critical` | Unsafe or severe abnormality | `danger` |
| `Offline` | API/device unavailable | muted + warning |
| `Simulated` | Demo/simulation-only value | `info` |
| `Pending` | Placeholder or future hardware value | muted |

Always make clear this project is demo/simulation-only and not for clinical decision-making.

## Motion and Feedback

- Use minimal animation.
- Live indicators may pulse subtly, but not faster than once per second.
- Alarm changes may flash once, then settle into persistent color.
- Avoid continuous decorative motion.

## Responsive Behavior

### Desktop

- 3 to 4 column dashboard.
- Trends and parameter tables can sit below the main monitoring cards.
- Keep controls visible without deep scrolling.

### Tablet

- 2 column dashboard.
- Tabs may become segmented controls.
- Parameter tables may horizontally scroll.

### Mobile

- Single column.
- Prioritize summary, alarms, and core metrics first.
- Controls should remain at least 44px tall.

## Do

- Use dark clinical surfaces with high-contrast data.
- Keep semantic colors consistent.
- Use tabular numeric values.
- Make alarm severity obvious.
- Use thin borders and compact grids.
- Keep the dashboard usable as the first screen.
- Prefer real product UI/data density over decorative hero sections.

## Don't

- Do not create a marketing landing page.
- Do not copy IBM, Supabase, or Sentry branding directly.
- Do not use decorative orbs, bokeh, heavy gradients, or oversized hero type.
- Do not use color without text labels for clinical status.
- Do not make every metric a separate oversized card.
- Do not hide warnings inside low-contrast text.
- Do not add telemetry, analytics, or external network calls for design effects.

## Agent Prompt Guide

When asking an AI agent to update UI, use this file as the source of truth.

Example prompts:

```text
Use DESIGN.md to restyle the Streamlit dashboard. Keep the current information architecture, but make panels, metric cards, alarms, and tabs follow the ECMO clinical monitoring design system.
```

```text
Use DESIGN.md to redesign the parameter details page as a dense clinical engineering table with status chips, compact filters, and clear readiness states.
```

```text
Use DESIGN.md to build a React dashboard screen for ECMO simulation. The first viewport must be the actual monitoring console, not a landing page.
```
