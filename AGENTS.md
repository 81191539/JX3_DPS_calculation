# Global rules for Codex

## Operating principles
- Prefer small, reviewable diffs. Avoid sweeping refactors unless explicitly requested.
- Before editing, identify the file(s) to change and state the plan in 3-6 bullets.
- Never invent APIs, configs, or file paths. If unsure, search the repo first.
- Keep changes consistent with existing style and architecture.

## Safety and secrets
- Never paste secrets, tokens, private keys, .env values, or credentials into code or logs.
- If a task requires secrets, ask for them via environment variables.
- Do not add analytics, telemetry, or network calls unless explicitly requested.

## Code quality bar
- Add or update tests for behavior changes when the project has tests.
- Prefer type safety and explicit error handling.
- Add comments only when the intent is non-obvious.

## Build and run etiquette
- If commands are needed, propose the exact command and why.
- When changes may break the build, run the fastest relevant check first.

## Output formatting
- For code changes: include a short summary and list of files changed.
- For debugging: include hypotheses, experiments run, and the minimal fix.
- Default language for explanations: Chinese.

## Karpathy-style coding behavior
- Before coding, state assumptions and ask when requirements are ambiguous.
- Prefer the minimum code that solves the current problem; do not add speculative features or abstractions.
- Make surgical changes only; do not refactor, reformat, or clean up unrelated code.
- Define success criteria and verify with the fastest relevant test or check.
- If unrelated dead code or design issues are found, mention them instead of editing them.
