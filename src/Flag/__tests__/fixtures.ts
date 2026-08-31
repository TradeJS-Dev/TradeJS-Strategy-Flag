import { config as DEFAULT_CONFIG } from "../config";

export const makeCandle = (
  index: number,
  open: number,
  high: number,
  low: number,
  close: number,
) => ({
  timestamp: 1_700_000_000_000 + index * 60_000,
  dt: new Date(1_700_000_000_000 + index * 60_000).toISOString(),
  open,
  high,
  low,
  close,
  volume: 1_000,
  turnover: close * 1_000,
});

const makePole = ({
  closes,
  startIndex,
}: {
  closes: number[];
  startIndex: number;
}) =>
  closes.map((close, offset) => {
    const open = offset === 0 ? close : closes[offset - 1]!;
    return makeCandle(
      startIndex + offset,
      open,
      Math.max(open, close) + 0.5,
      Math.min(open, close) - 0.5,
      close,
    );
  });

export const makeBullFlagCandles = ({
  startIndex = 0,
  channelSlope = -0.75,
}: {
  startIndex?: number;
  channelSlope?: number;
} = {}) => {
  const pole = makePole({
    closes: [100, 104, 108, 112, 116, 120],
    startIndex,
  });
  const flag = Array.from({ length: 8 }, (_, x) => {
    const upper = 121 + channelSlope * x;
    const lower = upper - 2.5;
    const close = x % 2 === 0 ? upper - 0.6 : lower + 0.45;
    return makeCandle(
      startIndex + 6 + x,
      close - 0.2,
      x % 2 === 0 ? upper : upper - 0.8,
      x % 2 === 0 ? lower + 0.8 : lower,
      close,
    );
  });
  const breakoutBoundary = 121 + channelSlope * 8;
  const breakout = makeCandle(
    startIndex + 14,
    breakoutBoundary - 0.3,
    breakoutBoundary + 1,
    breakoutBoundary - 1.1,
    breakoutBoundary + 0.6,
  );
  return [...pole, ...flag, breakout];
};

export const makeBearFlagCandles = ({ startIndex = 0 } = {}) => {
  const pole = makePole({
    closes: [120, 116, 112, 108, 104, 100],
    startIndex,
  });
  const flag = Array.from({ length: 8 }, (_, x) => {
    const lower = 99 + 0.75 * x;
    const upper = lower + 2.5;
    const close = x % 2 === 0 ? lower + 0.6 : upper - 0.45;
    return makeCandle(
      startIndex + 6 + x,
      close + 0.2,
      x % 2 === 0 ? upper - 0.8 : upper,
      x % 2 === 0 ? lower : lower + 0.8,
      close,
    );
  });
  const breakoutBoundary = 99 + 0.75 * 8;
  const breakout = makeCandle(
    startIndex + 14,
    breakoutBoundary + 0.3,
    breakoutBoundary + 1.1,
    breakoutBoundary - 1,
    breakoutBoundary - 0.6,
  );
  return [...pole, ...flag, breakout];
};

export const makeFlagConfig = (overrides: Record<string, unknown> = {}) =>
  ({
    ...DEFAULT_CONFIG,
    FLAG_ATR_PERIOD: 3,
    FLAG_POLE_LOOKBACK_BARS: 5,
    FLAG_MIN_POLE_MOVE_PCT: 0.1,
    FLAG_MIN_POLE_MOVE_ATR: 0,
    FLAG_MIN_POLE_EFFICIENCY_RATIO: 0.5,
    FLAG_MIN_BARS: 8,
    FLAG_MAX_BARS: 8,
    FLAG_PIVOT_RADIUS: 1,
    FLAG_MIN_TOUCHES_PER_BOUNDARY: 2,
    FLAG_MIN_COUNTER_TREND_SLOPE_PCT_PER_BAR: 0.01,
    FLAG_MAX_SLOPE_DIVERGENCE_RATIO: 0.2,
    FLAG_MAX_CHANNEL_WIDTH_PCT: 5,
    FLAG_MAX_CHANNEL_TO_POLE_RATIO: 0.5,
    FLAG_MAX_RETRACEMENT_RATIO: 0.7,
    FLAG_MAX_BOUNDARY_VIOLATION_ATR: 0.1,
    FLAG_BREAKOUT_BUFFER_ATR: 0,
    FLAG_MAX_BREAKOUT_DISTANCE_ATR: 10,
    FLAG_STOP_BUFFER_ATR: 0.1,
    FLAG_ENTRY_MODE: "breakout",
    ...overrides,
  }) as any;
