# @tradejs/strategy-flag

TradeJS strategy plugin providing `Flag`.

## Strategy overview

`Flag` detects continuation patterns. Each pattern includes the following price
movements:

1. A strong, efficient directional impulse (the pole).
2. A compact parallel channel whose boundaries slope against that impulse.
3. A close through the channel boundary in the direction of the original trend.

A bull flag opens `LONG` after a break above the upper boundary. A bear flag
opens `SHORT` after a break below the lower boundary. The stop sits beyond the
opposite channel boundary. The target projects a configurable part of the pole
from the broken boundary.

![Flag strategy logic](https://raw.githubusercontent.com/TradeJS-Dev/TradeJS-Strategy-Flag/main/docs/strategy-logic.svg)

## Signal on an example chart

![Bull and bear flag examples](https://raw.githubusercontent.com/TradeJS-Dev/TradeJS-Strategy-Flag/main/docs/signal-example.svg)

The illustrations are schematic rather than market data. Exact pole, channel,
touch, retracement, breakout, confirmation, and risk thresholds come from the
active TradeJS config.

## Detection model

- The pole must pass minimum percentage, ATR, and directional efficiency checks.
- Swing highs and lows inside the consolidation define two regression lines.
  Both lines must slope against the pole and remain close to parallel.
- The channel width, correction depth, boundary violations, and breakout
  distance have configurable limits.
- The detector supports `breakout`, `close_acceptance`, and `retest` entries.
  It keeps a bounded state and produces the same result during replay.

The primary tuning fields are grouped by purpose:

- Pole
  - `FLAG_POLE_LOOKBACK_BARS`
  - `FLAG_MIN_POLE_MOVE_PCT`
  - `FLAG_MIN_POLE_MOVE_ATR`
- Channel
  - `FLAG_MIN_BARS` and `FLAG_MAX_BARS`
  - `FLAG_MIN_TOUCHES_PER_BOUNDARY`
  - `FLAG_MIN_COUNTER_TREND_SLOPE_PCT_PER_BAR`
  - `FLAG_MAX_SLOPE_DIVERGENCE_RATIO`
  - `FLAG_MAX_CHANNEL_TO_POLE_RATIO`
  - `FLAG_MAX_RETRACEMENT_RATIO`
- Entry and target
  - `FLAG_ENTRY_MODE`
  - `FLAG_TARGET_POLE_RATIO`
- Directional risk
  - `LONG.minRiskRatio`
  - `SHORT.minRiskRatio`

## Install

```bash
yarn add @tradejs/strategy-flag
```

Register the package in `tradejs.config.ts`:

```ts
import { defineConfig } from "@tradejs/core/config";

export default defineConfig({
  strategies: ["@tradejs/strategy-flag"],
});
```

The package exports `strategyEntries`, its strategy definition, its manifest,
and its default config. It also exports an AI adapter. The adapter adds flag
geometry to the AI payload. It does not include a researched deterministic
approval gate.

## Development

```bash
yarn install --immutable
yarn checks
```

The pinned `TradeJS-Workflows@v1` workflow publishes beta releases first.

## Runtime host contract

All `@tradejs/*` runtime packages are peer dependencies. The consuming TradeJS
Project owns their exact installed versions and package manifest. The strategy
package therefore uses the engine, types package, and Strategy Kit supplied by
the Project.
