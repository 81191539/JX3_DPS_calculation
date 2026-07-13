# Core

TypeScript calculation core for the simplified expected-value Tiance DPS model.
It mirrors the current Python reference implementation during migration.

Team buffs are consumed as optional data on `GoldenCase`. Disabled buffs do not
change the Phase 5 default baseline; enabled buffs are applied before final
panel and rotation damage summaries are calculated.
