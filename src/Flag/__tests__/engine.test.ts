/** @jest-environment node */

import { createFlagEngine } from "../engine";
import {
  makeBullFlagCandles,
  makeBearFlagCandles,
  makeCandle,
  makeFlagConfig,
} from "./fixtures";

describe("Flag engine", () => {
  it("detects a bull flag on the upper channel breakout", () => {
    const engine = createFlagEngine({ config: makeFlagConfig() });
    const states = makeBullFlagCandles().map((candle) =>
      engine.next(candle as any),
    );
    const pattern = states.at(-1)?.pattern;

    expect(pattern?.kind).toBe("bull_flag");
    expect(pattern?.direction).toBe("LONG");
    expect(pattern?.upperSlope).toBeCloseTo(-0.75);
    expect(pattern?.lowerSlope).toBeCloseTo(-0.75);
    expect(pattern?.upperPivots.length).toBeGreaterThanOrEqual(2);
    expect(pattern?.lowerPivots.length).toBeGreaterThanOrEqual(2);
    expect(pattern?.targetPrice).toBeGreaterThan(pattern?.close ?? Infinity);
    expect(pattern?.stopLossPrice).toBeLessThan(pattern?.close ?? -Infinity);
  });

  it("detects a bear flag on the lower channel breakdown", () => {
    const engine = createFlagEngine({ config: makeFlagConfig() });
    const states = makeBearFlagCandles().map((candle) =>
      engine.next(candle as any),
    );
    const pattern = states.at(-1)?.pattern;

    expect(pattern?.kind).toBe("bear_flag");
    expect(pattern?.direction).toBe("SHORT");
    expect(pattern?.upperSlope).toBeCloseTo(0.75);
    expect(pattern?.lowerSlope).toBeCloseTo(0.75);
    expect(pattern?.targetPrice).toBeLessThan(pattern?.close ?? -Infinity);
    expect(pattern?.stopLossPrice).toBeGreaterThan(pattern?.close ?? Infinity);
  });

  it("rejects a channel that slopes with the pole instead of against it", () => {
    const engine = createFlagEngine({ config: makeFlagConfig() });
    const states = makeBullFlagCandles({ channelSlope: 0.75 }).map((candle) =>
      engine.next(candle as any),
    );

    expect(states.at(-1)?.pattern).toBeNull();
  });

  it("waits for close acceptance and emits a setup once", () => {
    const engine = createFlagEngine({
      config: makeFlagConfig({
        FLAG_ENTRY_MODE: "close_acceptance",
        FLAG_CONFIRMATION_MAX_BARS: 2,
      }),
    });
    const candles = makeBullFlagCandles();
    const breakoutState = candles.reduce(
      (_, candle) => engine.next(candle as any),
      engine.getState(),
    );

    expect(breakoutState.pattern).toBeNull();
    expect(breakoutState.pending?.mode).toBe("close_acceptance");

    const confirmation = makeCandle(15, 115.2, 116.2, 114.5, 115.8);
    const accepted = engine.next(confirmation as any);
    expect(accepted.pattern?.entryStage).toBe("close_accepted");
    expect(accepted.pattern?.confirmationBars).toBe(1);

    expect(engine.next(confirmation as any)).toEqual(accepted);
    expect(
      engine.next(makeCandle(16, 115.8, 116, 115, 115.5) as any).pattern,
    ).toBeNull();
  });

  it("accepts a retest that touches the broken boundary and closes above it", () => {
    const engine = createFlagEngine({
      config: makeFlagConfig({
        FLAG_ENTRY_MODE: "retest",
        FLAG_RETEST_TOLERANCE_ATR: 0.4,
      }),
    });
    for (const candle of makeBullFlagCandles()) engine.next(candle as any);

    const held = engine.next(makeCandle(15, 115, 116, 114.3, 115.4) as any);
    expect(held.pattern?.entryStage).toBe("retest_held");
    expect(held.pending).toBeNull();
  });

  it("replays initial candles identically and keeps the buffer bounded", () => {
    const config = makeFlagConfig();
    const prefix = Array.from({ length: 100 }, (_, index) =>
      makeCandle(index, 100, 101, 99, 100),
    );
    const patternCandles = makeBullFlagCandles({ startIndex: 100 });
    const history = [...prefix, ...patternCandles.slice(0, -1)];
    const breakout = patternCandles.at(-1)!;

    const continuous = createFlagEngine({ config });
    for (const candle of history) continuous.next(candle as any);
    const continuousState = continuous.next(breakout as any);

    const restored = createFlagEngine({
      config,
      initialCandles: history as any,
    });
    const restoredState = restored.next(breakout as any);

    expect(restoredState.pattern).toEqual(continuousState.pattern);
    expect(restoredState.bufferedCandles).toBeLessThanOrEqual(15);
  });
});
