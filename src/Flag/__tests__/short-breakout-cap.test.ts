/** @jest-environment node */
import { createFlagEngine } from "../engine";
import {
  makeBearFlagCandles,
  makeBullFlagCandles,
  makeFlagConfig,
} from "./fixtures";

describe("SHORT initial breakout distance cap", () => {
  it.each([-1, NaN])(
    "inherits the generic cap for neutral/non-finite override %s",
    (cap) => {
      for (const candles of [makeBullFlagCandles(), makeBearFlagCandles()]) {
        const a = createFlagEngine({ config: makeFlagConfig() }),
          b = createFlagEngine({
            config: makeFlagConfig({
              FLAG_MAX_BREAKOUT_DISTANCE_ATR_SHORT: cap,
            }),
          });
        for (const candle of candles)
          expect(b.next(candle as any)).toEqual(a.next(candle as any));
      }
    },
  );
  it("accepts the exact initial distance boundary, rejects above it, and replays deterministically", () => {
    const candles = makeBearFlagCandles(),
      probe = createFlagEngine({ config: makeFlagConfig() });
    for (const candle of candles) probe.next(candle as any);
    const distance = probe.getState().pattern!.breakoutDistanceAtr;
    for (const [cap, accepted] of [
      [distance - 1e-9, false],
      [distance, true],
      [distance + 1e-9, true],
    ] as const) {
      const config = makeFlagConfig({
          FLAG_MAX_BREAKOUT_DISTANCE_ATR_SHORT: cap,
        }),
        engine = createFlagEngine({ config });
      for (const candle of candles) engine.next(candle as any);
      expect(engine.getState().pattern !== null).toBe(accepted);
      expect(
        createFlagEngine({ config, initialCandles: candles as any }).getState(),
      ).toEqual(engine.getState());
      expect(engine.next(candles.at(-1)! as any)).toEqual(engine.getState());
    }
  });
  it("does not change any LONG state or generic confirmation mode", () => {
    const a = createFlagEngine({
        config: makeFlagConfig({ FLAG_ENTRY_MODE: "close_acceptance" }),
      }),
      b = createFlagEngine({
        config: makeFlagConfig({
          FLAG_ENTRY_MODE: "close_acceptance",
          FLAG_MAX_BREAKOUT_DISTANCE_ATR_SHORT: 0.0001,
        }),
      });
    for (const candle of makeBullFlagCandles())
      expect(b.next(candle as any)).toEqual(a.next(candle as any));
    expect(b.getState().pending?.mode).toBe("close_acceptance");
  });
  it("zero disables only SHORT's generic distance cap", () => {
    const engine = createFlagEngine({
      config: makeFlagConfig({
        FLAG_MAX_BREAKOUT_DISTANCE_ATR: 0.0001,
        FLAG_MAX_BREAKOUT_DISTANCE_ATR_SHORT: 0,
      }),
    });
    for (const candle of makeBearFlagCandles()) engine.next(candle as any);
    expect(engine.getState().pattern?.direction).toBe("SHORT");
  });
});
