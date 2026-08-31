# AGENTS.md

## Scope

These rules apply to this complete strategy repository.

## Workspace Routing

- The canonical workspace map is `~/dev/tradejs/AGENTS.md`. Do not scan
  sibling repositories when that map already identifies the owner.
- Make this strategy's source, config, adapters, figures, and test changes
  here; run `yarn checks` here.
- Run backtest, replay, Redis, evidence, notes, and release operations from
  `~/dev/tradejs/tradejs-project`. Keep that directory as `PROJECT_CWD` and
  point `TRADEJS_SOURCE_REPOSITORY_ROOT` at this repository for lineage.
- Use `$strategy-backtest-research` for implementation/backtest work,
  `$ai-train-local-research` for deterministic gate analysis,
  `$strategy-improvement-research` for bounded new research,
  `$strategy-forward-start` for an explicitly authorized risk-1 rollout, and
  `$strategy-forward-status` for read-only live inspection. Their instructions
  live in `~/dev/tradejs/investing/.codex/skills/`.
- Do not create `data/`, `notes/`, runtime config, or deployment files here.

## Ownership

This repository owns `Flag` strategy behavior, configuration, adapters,
figures, and tests.

## Architecture

- Export the TradeJS plugin contract through `strategyEntries`.
- Keep detector engines pure, bounded, and replay-safe.
- Keep StrategyAPI side effects, position checks, risk plans, and entries/exits
  in `core.ts`.
- Import neutral helpers from public `@tradejs/strategy-kit/*` subpaths.
- Do not add strategy-specific branches to TradeJS core, indicators, or
  Strategy Kit.
- Do not import source files from another strategy repository.

## Verification

Run `yarn checks` before every commit. Keep CI and release workflows as thin
callers of the pinned reusable workflows in TradeJS-Workflows.

## Runtime Dependency Contract

- Keep every `@tradejs/*` runtime package in both `peerDependencies` and
  `devDependencies`, never in `dependencies`.
- The consuming TradeJS Project must own the exact runtime composition; nested
  TradeJS package copies are forbidden.
- Keep the package-contract test in `yarn checks` whenever dependency metadata
  changes.
