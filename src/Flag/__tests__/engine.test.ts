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
    expect(pattern?.flagToPoleBarsRatio).toBeCloseTo(1.6);
    expect(pattern?.channelWidthAtr).toBeGreaterThan(0);
    expect(pattern?.flagToPoleVolumeRatio).toBeCloseTo(1);
    expect(pattern?.poleDirectionalConsistencyRatio).toBeCloseTo(1);
    expect(pattern?.poleTerminalExpansionRatio).toBeGreaterThan(0);
  });

  it("requires consolidation volume to contract relative to the pole", () => {
    const withVolumes = (flagVolume: number) =>
      makeBullFlagCandles().map((candle, index) => ({
        ...candle,
        volume: index < 6 ? 2_000 : index < 14 ? flagVolume : 1_000,
      }));
    const config = makeFlagConfig({
      FLAG_MAX_FLAG_TO_POLE_VOLUME_RATIO: 0.85,
    });

    const contraction = createFlagEngine({ config });
    const contractionStates = withVolumes(1_000).map((candle) =>
      contraction.next(candle as any),
    );
    expect(
      contractionStates.at(-1)?.pattern?.flagToPoleVolumeRatio,
    ).toBeCloseTo(0.5);

    const expansion = createFlagEngine({ config });
    const expansionStates = withVolumes(2_000).map((candle) =>
      expansion.next(candle as any),
    );
    expect(expansionStates.at(-1)?.pattern).toBeNull();
  });

  it("requires compact duration and ATR-normalized channel width", () => {
    const candles = makeBullFlagCandles();
    const durationRejected = createFlagEngine({
      config: makeFlagConfig({ FLAG_MAX_FLAG_TO_POLE_BARS_RATIO: 1.5 }),
    });
    expect(
      candles.map((candle) => durationRejected.next(candle as any)).at(-1)
        ?.pattern,
    ).toBeNull();

    const widthRejected = createFlagEngine({
      config: makeFlagConfig({ FLAG_MAX_CHANNEL_WIDTH_ATR: 0.5 }),
    });
    expect(
      candles.map((candle) => widthRejected.next(candle as any)).at(-1)
        ?.pattern,
    ).toBeNull();
  });

  it("can apply compactness only to short flags", () => {
    const config = makeFlagConfig({
      FLAG_MAX_FLAG_TO_POLE_BARS_RATIO: 0,
      FLAG_MAX_FLAG_TO_POLE_BARS_RATIO_SHORT: 1.5,
    });
    const bull = createFlagEngine({ config });
    expect(
      makeBullFlagCandles()
        .map((candle) => bull.next(candle as any))
        .at(-1)?.pattern?.direction,
    ).toBe("LONG");

    const bear = createFlagEngine({ config });
    expect(
      makeBearFlagCandles()
        .map((candle) => bear.next(candle as any))
        .at(-1)?.pattern,
    ).toBeNull();
  });

  it("rejects incoherent or terminally exhausted poles", () => {
    const base = makeBullFlagCandles();
    const incoherentCloses = [100, 106, 104, 112, 110, 120];
    const incoherent = base.map((candle, index) => {
      if (index >= incoherentCloses.length) return candle;
      const close = incoherentCloses[index]!;
      const open = index === 0 ? close : incoherentCloses[index - 1]!;
      return makeCandle(
        index,
        open,
        Math.max(open, close) + 0.5,
        Math.min(open, close) - 0.5,
        close,
      );
    });
    const consistencyFilter = createFlagEngine({
      config: makeFlagConfig({
        FLAG_MIN_POLE_DIRECTIONAL_CONSISTENCY_RATIO: 0.75,
      }),
    });
    expect(
      incoherent.map((candle) => consistencyFilter.next(candle as any)).at(-1)
        ?.pattern,
    ).toBeNull();

    const exhausted = base.map((candle, index) =>
      index >= 3 && index < 6
        ? { ...candle, high: candle.high + 8, low: candle.low - 8 }
        : candle,
    );
    const expansionFilter = createFlagEngine({
      config: makeFlagConfig({
        FLAG_MAX_POLE_TERMINAL_EXPANSION_RATIO: 1.75,
        FLAG_POLE_TERMINAL_BARS: 3,
      }),
    });
    expect(
      exhausted.map((candle) => expansionFilter.next(candle as any)).at(-1)
        ?.pattern,
    ).toBeNull();
  });

  it("can apply impulse quality only to long flags", () => {
    const config = makeFlagConfig({
      FLAG_MIN_POLE_DIRECTIONAL_CONSISTENCY_RATIO: 0,
      FLAG_MIN_POLE_DIRECTIONAL_CONSISTENCY_RATIO_LONG: 0.75,
    });
    const base = makeBullFlagCandles();
    const incoherentCloses = [100, 106, 104, 112, 110, 120];
    const incoherent = base.map((candle, index) => {
      if (index >= incoherentCloses.length) return candle;
      const close = incoherentCloses[index]!;
      const open = index === 0 ? close : incoherentCloses[index - 1]!;
      return makeCandle(
        index,
        open,
        Math.max(open, close) + 0.5,
        Math.min(open, close) - 0.5,
        close,
      );
    });
    const bull = createFlagEngine({ config });
    expect(
      incoherent.map((candle) => bull.next(candle as any)).at(-1)?.pattern,
    ).toBeNull();

    const bear = createFlagEngine({ config });
    expect(
      makeBearFlagCandles()
        .map((candle) => bear.next(candle as any))
        .at(-1)?.pattern?.direction,
    ).toBe("SHORT");
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
