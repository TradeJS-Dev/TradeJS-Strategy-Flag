import { Candle, Direction } from "@tradejs/types";
import { FlagConfig, FlagEntryMode } from "./config";

export type FlagPatternKind = "bull_flag" | "bear_flag";
export type FlagEntryStage = "breakout" | "close_accepted" | "retest_held";

export interface FlagPoint {
  timestamp: number;
  index: number;
  value: number;
}

export interface FlagBoundaryPivot extends FlagPoint {
  kind: "high" | "low";
}

export interface FlagPattern {
  setupId: string;
  kind: FlagPatternKind;
  direction: Direction;
  entryMode: FlagEntryMode;
  entryStage: FlagEntryStage;
  poleStart: FlagPoint;
  poleEnd: FlagPoint;
  upperPivots: FlagBoundaryPivot[];
  lowerPivots: FlagBoundaryPivot[];
  flagStartTimestamp: number;
  flagEndTimestamp: number;
  flagBars: number;
  poleBars: number;
  poleMove: number;
  poleMovePct: number;
  poleMoveAtr: number;
  poleEfficiencyRatio: number;
  upperBoundaryStart: number;
  upperBoundaryEnd: number;
  upperBoundaryAtBreakout: number;
  lowerBoundaryStart: number;
  lowerBoundaryEnd: number;
  lowerBoundaryAtBreakout: number;
  upperSlope: number;
  lowerSlope: number;
  counterTrendSlopePctPerBar: number;
  slopeDivergenceRatio: number;
  upperR2: number;
  lowerR2: number;
  channelWidth: number;
  channelWidthPct: number;
  channelToPoleRatio: number;
  retracementRatio: number;
  breakoutDistanceAtr: number;
  atr: number;
  targetPrice: number;
  stopLossPrice: number;
  breakoutTimestamp: number;
  breakoutPrice: number;
  confirmationBars: number;
  timestamp: number;
  close: number;
}

export interface FlagPendingSetup {
  setupId: string;
  mode: Exclude<FlagEntryMode, "breakout">;
  breakoutIndex: number;
  pattern: FlagPattern;
}

export interface FlagRuntimeState {
  pattern: FlagPattern | null;
  pending: FlagPendingSetup | null;
  bufferedCandles: number;
}

interface IndexedCandle {
  index: number;
  candle: Candle;
}

interface RegressionLine {
  intercept: number;
  slope: number;
  r2: number;
}

interface EngineState {
  candles: IndexedCandle[];
  currentIndex: number;
  pattern: FlagPattern | null;
  pending: FlagPendingSetup | null;
  consumedSetupIds: Set<string>;
  consumedSetupOrder: string[];
  lastTimestamp: number | null;
}

interface FlagEngineOptions {
  atrPeriod: number;
  poleLookbackBars: number;
  minPoleMovePct: number;
  minPoleMoveAtr: number;
  minPoleEfficiencyRatio: number;
  minFlagBars: number;
  maxFlagBars: number;
  pivotRadius: number;
  minTouchesPerBoundary: number;
  minCounterTrendSlopePctPerBar: number;
  maxSlopeDivergenceRatio: number;
  maxChannelWidthPct: number;
  maxChannelToPoleRatio: number;
  maxRetracementRatio: number;
  maxBoundaryViolationAtr: number;
  breakoutBufferAtr: number;
  maxBreakoutDistanceAtr: number;
  targetPoleRatio: number;
  stopBufferAtr: number;
  entryMode: FlagEntryMode;
  confirmationMaxBars: number;
  retestMaxBars: number;
  retestToleranceAtr: number;
}

const asNumber = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const positiveNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
};

const nonNegativeNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const positiveInteger = (value: unknown, fallback: number) =>
  Math.max(1, Math.floor(positiveNumber(value, fallback)));

const getOptions = (config: FlagConfig): FlagEngineOptions => {
  const minFlagBars = positiveInteger(config.FLAG_MIN_BARS, 6);
  const maxFlagBars = Math.max(
    minFlagBars,
    positiveInteger(config.FLAG_MAX_BARS, 30),
  );

  return {
    atrPeriod: Math.max(2, positiveInteger(config.FLAG_ATR_PERIOD, 14)),
    poleLookbackBars: positiveInteger(config.FLAG_POLE_LOOKBACK_BARS, 12),
    minPoleMovePct: nonNegativeNumber(config.FLAG_MIN_POLE_MOVE_PCT, 2),
    minPoleMoveAtr: nonNegativeNumber(config.FLAG_MIN_POLE_MOVE_ATR, 3),
    minPoleEfficiencyRatio: Math.min(
      1,
      nonNegativeNumber(config.FLAG_MIN_POLE_EFFICIENCY_RATIO, 0.6),
    ),
    minFlagBars,
    maxFlagBars,
    pivotRadius: positiveInteger(config.FLAG_PIVOT_RADIUS, 1),
    minTouchesPerBoundary: positiveInteger(
      config.FLAG_MIN_TOUCHES_PER_BOUNDARY,
      2,
    ),
    minCounterTrendSlopePctPerBar: nonNegativeNumber(
      config.FLAG_MIN_COUNTER_TREND_SLOPE_PCT_PER_BAR,
      0.02,
    ),
    maxSlopeDivergenceRatio: nonNegativeNumber(
      config.FLAG_MAX_SLOPE_DIVERGENCE_RATIO,
      0.5,
    ),
    maxChannelWidthPct: nonNegativeNumber(
      config.FLAG_MAX_CHANNEL_WIDTH_PCT,
      2.5,
    ),
    maxChannelToPoleRatio: nonNegativeNumber(
      config.FLAG_MAX_CHANNEL_TO_POLE_RATIO,
      0.6,
    ),
    maxRetracementRatio: nonNegativeNumber(
      config.FLAG_MAX_RETRACEMENT_RATIO,
      0.7,
    ),
    maxBoundaryViolationAtr: nonNegativeNumber(
      config.FLAG_MAX_BOUNDARY_VIOLATION_ATR,
      0.3,
    ),
    breakoutBufferAtr: nonNegativeNumber(config.FLAG_BREAKOUT_BUFFER_ATR, 0.05),
    maxBreakoutDistanceAtr: nonNegativeNumber(
      config.FLAG_MAX_BREAKOUT_DISTANCE_ATR,
      1.5,
    ),
    targetPoleRatio: nonNegativeNumber(config.FLAG_TARGET_POLE_RATIO, 1),
    stopBufferAtr: nonNegativeNumber(config.FLAG_STOP_BUFFER_ATR, 0.25),
    entryMode: config.FLAG_ENTRY_MODE ?? "close_acceptance",
    confirmationMaxBars: positiveInteger(config.FLAG_CONFIRMATION_MAX_BARS, 2),
    retestMaxBars: positiveInteger(config.FLAG_RETEST_MAX_BARS, 4),
    retestToleranceAtr: nonNegativeNumber(
      config.FLAG_RETEST_TOLERANCE_ATR,
      0.25,
    ),
  };
};

const calculateAtr = (
  candles: IndexedCandle[],
  period: number,
): number | null => {
  const relevant = candles.slice(-(period + 1));
  if (relevant.length < 2) return null;

  const trueRanges: number[] = [];
  for (let index = 1; index < relevant.length; index += 1) {
    const current = relevant[index]?.candle;
    const previous = relevant[index - 1]?.candle;
    const high = asNumber(current?.high);
    const low = asNumber(current?.low);
    const previousClose = asNumber(previous?.close);
    if (high == null || low == null || previousClose == null) continue;
    trueRanges.push(
      Math.max(
        high - low,
        Math.abs(high - previousClose),
        Math.abs(low - previousClose),
      ),
    );
  }

  if (trueRanges.length === 0) return null;
  return trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length;
};

const regress = (
  points: Array<{ x: number; value: number }>,
): RegressionLine => {
  const count = points.length;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / count;
  const meanY = points.reduce((sum, point) => sum + point.value, 0) / count;
  const covariance = points.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.value - meanY),
    0,
  );
  const varianceX = points.reduce(
    (sum, point) => sum + (point.x - meanX) ** 2,
    0,
  );
  const slope = varianceX > 0 ? covariance / varianceX : 0;
  const intercept = meanY - slope * meanX;
  const totalVariance = points.reduce(
    (sum, point) => sum + (point.value - meanY) ** 2,
    0,
  );
  const residualVariance = points.reduce(
    (sum, point) => sum + (point.value - (intercept + slope * point.x)) ** 2,
    0,
  );
  const r2 =
    totalVariance <= Number.EPSILON
      ? residualVariance <= Number.EPSILON
        ? 1
        : 0
      : Math.max(0, Math.min(1, 1 - residualVariance / totalVariance));

  return { intercept, slope, r2 };
};

const lineValue = (line: RegressionLine, x: number) =>
  line.intercept + line.slope * x;

const findBoundaryPivots = ({
  candles,
  radius,
  kind,
}: {
  candles: IndexedCandle[];
  radius: number;
  kind: FlagBoundaryPivot["kind"];
}): Array<FlagBoundaryPivot & { x: number }> => {
  const result: Array<FlagBoundaryPivot & { x: number }> = [];

  for (let index = 0; index < candles.length; index += 1) {
    const current = candles[index];
    const value = asNumber(
      kind === "high" ? current?.candle.high : current?.candle.low,
    );
    if (!current || value == null) continue;

    const neighborValues: number[] = [];
    const start = Math.max(0, index - radius);
    const end = Math.min(candles.length - 1, index + radius);
    for (let neighborIndex = start; neighborIndex <= end; neighborIndex += 1) {
      if (neighborIndex === index) continue;
      const neighbor = candles[neighborIndex];
      const neighborValue = asNumber(
        kind === "high" ? neighbor?.candle.high : neighbor?.candle.low,
      );
      if (neighborValue != null) neighborValues.push(neighborValue);
    }
    if (neighborValues.length === 0) continue;

    const isExtreme =
      kind === "high"
        ? neighborValues.every((neighbor) => value >= neighbor) &&
          neighborValues.some((neighbor) => value > neighbor)
        : neighborValues.every((neighbor) => value <= neighbor) &&
          neighborValues.some((neighbor) => value < neighbor);
    if (!isExtreme) continue;

    result.push({
      timestamp: current.candle.timestamp,
      index: current.index,
      value,
      kind,
      x: index,
    });
  }

  return result;
};

const calculatePoleEfficiency = (candles: IndexedCandle[]) => {
  let path = 0;
  for (let index = 1; index < candles.length; index += 1) {
    const previous = asNumber(candles[index - 1]?.candle.close);
    const current = asNumber(candles[index]?.candle.close);
    if (previous != null && current != null)
      path += Math.abs(current - previous);
  }
  const first = asNumber(candles[0]?.candle.close);
  const last = asNumber(candles[candles.length - 1]?.candle.close);
  if (first == null || last == null || path <= Number.EPSILON) return 0;
  return Math.abs(last - first) / path;
};

const hasAcceptableBoundaryContainment = ({
  flagCandles,
  upperLine,
  lowerLine,
  tolerance,
}: {
  flagCandles: IndexedCandle[];
  upperLine: RegressionLine;
  lowerLine: RegressionLine;
  tolerance: number;
}) =>
  flagCandles.every(({ candle }, index) => {
    const high = asNumber(candle.high);
    const low = asNumber(candle.low);
    if (high == null || low == null) return false;
    return (
      high <= lineValue(upperLine, index) + tolerance &&
      low >= lineValue(lowerLine, index) - tolerance
    );
  });

const rememberConsumedSetup = (state: EngineState, setupId: string) => {
  if (state.consumedSetupIds.has(setupId)) return;
  state.consumedSetupIds.add(setupId);
  state.consumedSetupOrder.push(setupId);
  if (state.consumedSetupOrder.length > 64) {
    const oldest = state.consumedSetupOrder.shift();
    if (oldest) state.consumedSetupIds.delete(oldest);
  }
};

const buildCandidate = ({
  state,
  current,
  atr,
  flagBars,
  options,
}: {
  state: EngineState;
  current: IndexedCandle;
  atr: number;
  flagBars: number;
  options: FlagEngineOptions;
}): FlagPattern | null => {
  const prior = state.candles.slice(0, -1);
  const flagStartPosition = prior.length - flagBars;
  const poleEndPosition = flagStartPosition - 1;
  const poleStartPosition = poleEndPosition - options.poleLookbackBars;
  if (poleStartPosition < 0) return null;

  const flagCandles = prior.slice(flagStartPosition);
  const poleCandles = prior.slice(poleStartPosition, poleEndPosition + 1);
  const poleStartCandle = poleCandles[0];
  const poleEndCandle = poleCandles[poleCandles.length - 1];
  const poleStartClose = asNumber(poleStartCandle?.candle.close);
  const poleEndClose = asNumber(poleEndCandle?.candle.close);
  const currentClose = asNumber(current.candle.close);
  const previousClose = asNumber(
    flagCandles[flagCandles.length - 1]?.candle.close,
  );
  if (
    !poleStartCandle ||
    !poleEndCandle ||
    poleStartClose == null ||
    poleEndClose == null ||
    currentClose == null ||
    previousClose == null ||
    Math.abs(poleStartClose) <= Number.EPSILON
  ) {
    return null;
  }

  const signedPoleMove = poleEndClose - poleStartClose;
  if (Math.abs(signedPoleMove) <= Number.EPSILON) return null;
  const direction: Direction = signedPoleMove > 0 ? "LONG" : "SHORT";
  const kind: FlagPatternKind =
    direction === "LONG" ? "bull_flag" : "bear_flag";
  const poleMove = Math.abs(signedPoleMove);
  const poleMovePct = (poleMove / Math.abs(poleStartClose)) * 100;
  const poleMoveAtr = atr > 0 ? poleMove / atr : 0;
  const poleEfficiencyRatio = calculatePoleEfficiency(poleCandles);
  if (
    poleMovePct < options.minPoleMovePct ||
    poleMoveAtr < options.minPoleMoveAtr ||
    poleEfficiencyRatio < options.minPoleEfficiencyRatio
  ) {
    return null;
  }

  const upperPivotsWithX = findBoundaryPivots({
    candles: flagCandles,
    radius: options.pivotRadius,
    kind: "high",
  });
  const lowerPivotsWithX = findBoundaryPivots({
    candles: flagCandles,
    radius: options.pivotRadius,
    kind: "low",
  });
  if (
    upperPivotsWithX.length < options.minTouchesPerBoundary ||
    lowerPivotsWithX.length < options.minTouchesPerBoundary
  ) {
    return null;
  }

  const upperLine = regress(upperPivotsWithX);
  const lowerLine = regress(lowerPivotsWithX);
  const hasCounterTrendSlope =
    direction === "LONG"
      ? upperLine.slope < 0 && lowerLine.slope < 0
      : upperLine.slope > 0 && lowerLine.slope > 0;
  const centerSlope = (upperLine.slope + lowerLine.slope) / 2;
  const counterTrendSlopePctPerBar =
    (Math.abs(centerSlope) / Math.abs(poleEndClose)) * 100;
  if (
    !hasCounterTrendSlope ||
    counterTrendSlopePctPerBar < options.minCounterTrendSlopePctPerBar
  ) {
    return null;
  }

  const slopeDivergenceRatio =
    Math.abs(upperLine.slope - lowerLine.slope) /
    Math.max(
      Math.abs(upperLine.slope),
      Math.abs(lowerLine.slope),
      Number.EPSILON,
    );
  if (slopeDivergenceRatio > options.maxSlopeDivergenceRatio) return null;

  const lastFlagX = flagBars - 1;
  const breakoutX = flagBars;
  const upperBoundaryStart = lineValue(upperLine, 0);
  const upperBoundaryEnd = lineValue(upperLine, lastFlagX);
  const upperBoundaryAtBreakout = lineValue(upperLine, breakoutX);
  const lowerBoundaryStart = lineValue(lowerLine, 0);
  const lowerBoundaryEnd = lineValue(lowerLine, lastFlagX);
  const lowerBoundaryAtBreakout = lineValue(lowerLine, breakoutX);
  const startWidth = upperBoundaryStart - lowerBoundaryStart;
  const endWidth = upperBoundaryEnd - lowerBoundaryEnd;
  const breakoutWidth = upperBoundaryAtBreakout - lowerBoundaryAtBreakout;
  if (startWidth <= 0 || endWidth <= 0 || breakoutWidth <= 0) return null;

  const channelWidth = (startWidth + endWidth) / 2;
  const channelWidthPct = (channelWidth / Math.abs(poleEndClose)) * 100;
  const channelToPoleRatio = channelWidth / poleMove;
  if (
    (options.maxChannelWidthPct > 0 &&
      channelWidthPct > options.maxChannelWidthPct) ||
    (options.maxChannelToPoleRatio > 0 &&
      channelToPoleRatio > options.maxChannelToPoleRatio)
  ) {
    return null;
  }

  const flagHighs = flagCandles
    .map(({ candle }) => asNumber(candle.high))
    .filter((value): value is number => value != null);
  const flagLows = flagCandles
    .map(({ candle }) => asNumber(candle.low))
    .filter((value): value is number => value != null);
  if (flagHighs.length !== flagBars || flagLows.length !== flagBars)
    return null;
  const retracement =
    direction === "LONG"
      ? Math.max(0, poleEndClose - Math.min(...flagLows))
      : Math.max(0, Math.max(...flagHighs) - poleEndClose);
  const retracementRatio = retracement / poleMove;
  if (retracementRatio > options.maxRetracementRatio) return null;

  const boundaryTolerance = atr * options.maxBoundaryViolationAtr;
  if (
    !hasAcceptableBoundaryContainment({
      flagCandles,
      upperLine,
      lowerLine,
      tolerance: boundaryTolerance,
    })
  ) {
    return null;
  }

  const breakoutBoundary =
    direction === "LONG" ? upperBoundaryAtBreakout : lowerBoundaryAtBreakout;
  const previousBoundary =
    direction === "LONG" ? upperBoundaryEnd : lowerBoundaryEnd;
  const breakoutBuffer = atr * options.breakoutBufferAtr;
  const crossedBoundary =
    direction === "LONG"
      ? currentClose > breakoutBoundary + breakoutBuffer &&
        previousClose <= previousBoundary + breakoutBuffer
      : currentClose < breakoutBoundary - breakoutBuffer &&
        previousClose >= previousBoundary - breakoutBuffer;
  if (!crossedBoundary) return null;

  const breakoutDistance = Math.abs(currentClose - breakoutBoundary);
  const breakoutDistanceAtr = atr > 0 ? breakoutDistance / atr : 0;
  if (
    options.maxBreakoutDistanceAtr > 0 &&
    breakoutDistanceAtr > options.maxBreakoutDistanceAtr
  ) {
    return null;
  }

  const flagStart = flagCandles[0];
  const flagEnd = flagCandles[flagCandles.length - 1];
  if (!flagStart || !flagEnd) return null;
  const setupId = `${kind}:${poleStartCandle.candle.timestamp}:${flagStart.candle.timestamp}:${flagEnd.candle.timestamp}`;
  if (state.consumedSetupIds.has(setupId)) return null;

  const stopLossPrice =
    direction === "LONG"
      ? lowerBoundaryAtBreakout - atr * options.stopBufferAtr
      : upperBoundaryAtBreakout + atr * options.stopBufferAtr;
  const targetPrice =
    direction === "LONG"
      ? upperBoundaryAtBreakout + poleMove * options.targetPoleRatio
      : lowerBoundaryAtBreakout - poleMove * options.targetPoleRatio;

  return {
    setupId,
    kind,
    direction,
    entryMode: options.entryMode,
    entryStage: "breakout",
    poleStart: {
      timestamp: poleStartCandle.candle.timestamp,
      index: poleStartCandle.index,
      value: poleStartClose,
    },
    poleEnd: {
      timestamp: poleEndCandle.candle.timestamp,
      index: poleEndCandle.index,
      value: poleEndClose,
    },
    upperPivots: upperPivotsWithX.map(({ x: _x, ...pivot }) => pivot),
    lowerPivots: lowerPivotsWithX.map(({ x: _x, ...pivot }) => pivot),
    flagStartTimestamp: flagStart.candle.timestamp,
    flagEndTimestamp: flagEnd.candle.timestamp,
    flagBars,
    poleBars: options.poleLookbackBars,
    poleMove,
    poleMovePct,
    poleMoveAtr,
    poleEfficiencyRatio,
    upperBoundaryStart,
    upperBoundaryEnd,
    upperBoundaryAtBreakout,
    lowerBoundaryStart,
    lowerBoundaryEnd,
    lowerBoundaryAtBreakout,
    upperSlope: upperLine.slope,
    lowerSlope: lowerLine.slope,
    counterTrendSlopePctPerBar,
    slopeDivergenceRatio,
    upperR2: upperLine.r2,
    lowerR2: lowerLine.r2,
    channelWidth,
    channelWidthPct,
    channelToPoleRatio,
    retracementRatio,
    breakoutDistanceAtr,
    atr,
    targetPrice,
    stopLossPrice,
    breakoutTimestamp: current.candle.timestamp,
    breakoutPrice: currentClose,
    confirmationBars: 0,
    timestamp: current.candle.timestamp,
    close: currentClose,
  };
};

const detectBreakout = ({
  state,
  current,
  atr,
  options,
}: {
  state: EngineState;
  current: IndexedCandle;
  atr: number;
  options: FlagEngineOptions;
}): FlagPattern | null => {
  const candidates: FlagPattern[] = [];
  for (
    let flagBars = options.minFlagBars;
    flagBars <= options.maxFlagBars;
    flagBars += 1
  ) {
    const candidate = buildCandidate({
      state,
      current,
      atr,
      flagBars,
      options,
    });
    if (candidate) candidates.push(candidate);
  }

  candidates.sort((left, right) => {
    const leftScore =
      left.flagBars +
      left.upperPivots.length * 3 +
      left.lowerPivots.length * 3 +
      Math.min(left.upperR2, left.lowerR2) * 2 -
      left.slopeDivergenceRatio * 2;
    const rightScore =
      right.flagBars +
      right.upperPivots.length * 3 +
      right.lowerPivots.length * 3 +
      Math.min(right.upperR2, right.lowerR2) * 2 -
      right.slopeDivergenceRatio * 2;
    return rightScore - leftScore;
  });

  return candidates[0] ?? null;
};

const resolvePending = ({
  state,
  current,
  atr,
  options,
}: {
  state: EngineState;
  current: IndexedCandle;
  atr: number;
  options: FlagEngineOptions;
}): FlagPattern | null => {
  const pending = state.pending;
  if (!pending) return null;
  const confirmationBars = current.index - pending.breakoutIndex;
  if (confirmationBars < 1) return null;

  const close = asNumber(current.candle.close);
  const high = asNumber(current.candle.high);
  const low = asNumber(current.candle.low);
  if (close == null || high == null || low == null) return null;

  const pattern = pending.pattern;
  const maxBars =
    pending.mode === "retest"
      ? options.retestMaxBars
      : options.confirmationMaxBars;
  const invalidated =
    pattern.direction === "LONG"
      ? low <= pattern.stopLossPrice
      : high >= pattern.stopLossPrice;
  if (invalidated || confirmationBars > maxBars) {
    rememberConsumedSetup(state, pattern.setupId);
    state.pending = null;
    return null;
  }

  const upperBoundary =
    pattern.upperBoundaryAtBreakout + pattern.upperSlope * confirmationBars;
  const lowerBoundary =
    pattern.lowerBoundaryAtBreakout + pattern.lowerSlope * confirmationBars;
  const breakoutBoundary =
    pattern.direction === "LONG" ? upperBoundary : lowerBoundary;
  const breakoutBuffer = atr * options.breakoutBufferAtr;
  const closeAccepted =
    pattern.direction === "LONG"
      ? close >= breakoutBoundary + breakoutBuffer
      : close <= breakoutBoundary - breakoutBuffer;

  let entryStage: FlagEntryStage | null = null;
  if (pending.mode === "close_acceptance") {
    if (closeAccepted) entryStage = "close_accepted";
  } else {
    const tolerance = atr * options.retestToleranceAtr;
    const retestTouched =
      pattern.direction === "LONG"
        ? Math.abs(low - breakoutBoundary) <= tolerance
        : Math.abs(high - breakoutBoundary) <= tolerance;
    if (retestTouched && closeAccepted) entryStage = "retest_held";
  }
  if (!entryStage) return null;

  rememberConsumedSetup(state, pattern.setupId);
  state.pending = null;
  return {
    ...pattern,
    entryStage,
    confirmationBars,
    timestamp: current.candle.timestamp,
    close,
  };
};

const clonePattern = (pattern: FlagPattern | null): FlagPattern | null =>
  pattern
    ? {
        ...pattern,
        poleStart: { ...pattern.poleStart },
        poleEnd: { ...pattern.poleEnd },
        upperPivots: pattern.upperPivots.map((pivot) => ({ ...pivot })),
        lowerPivots: pattern.lowerPivots.map((pivot) => ({ ...pivot })),
      }
    : null;

const clonePending = (
  pending: FlagPendingSetup | null,
): FlagPendingSetup | null =>
  pending
    ? {
        ...pending,
        pattern: clonePattern(pending.pattern)!,
      }
    : null;

export const buildFlagSignalContext = (pattern: FlagPattern) => ({
  setupId: pattern.setupId,
  patternKind: pattern.kind,
  signalDirection: pattern.direction,
  entryMode: pattern.entryMode,
  entryStage: pattern.entryStage,
  poleMove: pattern.poleMove,
  poleMovePct: pattern.poleMovePct,
  poleMoveAtr: pattern.poleMoveAtr,
  poleEfficiencyRatio: pattern.poleEfficiencyRatio,
  poleBars: pattern.poleBars,
  flagBars: pattern.flagBars,
  counterTrendSlopePctPerBar: pattern.counterTrendSlopePctPerBar,
  slopeDivergenceRatio: pattern.slopeDivergenceRatio,
  upperR2: pattern.upperR2,
  lowerR2: pattern.lowerR2,
  channelWidth: pattern.channelWidth,
  channelWidthPct: pattern.channelWidthPct,
  channelToPoleRatio: pattern.channelToPoleRatio,
  retracementRatio: pattern.retracementRatio,
  breakoutDistanceAtr: pattern.breakoutDistanceAtr,
  targetPrice: pattern.targetPrice,
  stopLossPrice: pattern.stopLossPrice,
  breakoutTimestamp: pattern.breakoutTimestamp,
  breakoutPrice: pattern.breakoutPrice,
  confirmationBars: pattern.confirmationBars,
  currentPrice: pattern.close,
  pole: {
    start: pattern.poleStart,
    end: pattern.poleEnd,
  },
  channel: {
    upper: {
      start: pattern.upperBoundaryStart,
      end: pattern.upperBoundaryEnd,
      breakout: pattern.upperBoundaryAtBreakout,
      slope: pattern.upperSlope,
    },
    lower: {
      start: pattern.lowerBoundaryStart,
      end: pattern.lowerBoundaryEnd,
      breakout: pattern.lowerBoundaryAtBreakout,
      slope: pattern.lowerSlope,
    },
  },
  upperPivots: pattern.upperPivots,
  lowerPivots: pattern.lowerPivots,
});

export type FlagSignalContext = ReturnType<typeof buildFlagSignalContext>;

export const createFlagEngine = ({
  config,
  initialCandles = [],
}: {
  config: FlagConfig;
  initialCandles?: Candle[];
}): {
  next: (candle: Candle) => FlagRuntimeState;
  getState: () => FlagRuntimeState;
} => {
  const options = getOptions(config);
  const maxCandles = Math.max(
    options.atrPeriod + 1,
    options.poleLookbackBars + options.maxFlagBars + 2,
  );
  const state: EngineState = {
    candles: [],
    currentIndex: -1,
    pattern: null,
    pending: null,
    consumedSetupIds: new Set(),
    consumedSetupOrder: [],
    lastTimestamp: null,
  };

  const snapshot = (): FlagRuntimeState => ({
    pattern: clonePattern(state.pattern),
    pending: clonePending(state.pending),
    bufferedCandles: state.candles.length,
  });

  const apply = (candle: Candle): FlagRuntimeState => {
    if (state.lastTimestamp === candle.timestamp) return snapshot();
    state.lastTimestamp = candle.timestamp;
    state.pattern = null;
    state.currentIndex += 1;
    const current: IndexedCandle = { index: state.currentIndex, candle };
    state.candles.push(current);
    if (state.candles.length > maxCandles) {
      state.candles.splice(0, state.candles.length - maxCandles);
    }

    const atr = calculateAtr(state.candles.slice(0, -1), options.atrPeriod);
    if (atr == null || atr <= 0) return snapshot();

    const pendingPattern = resolvePending({
      state,
      current,
      atr,
      options,
    });
    if (pendingPattern) {
      state.pattern = pendingPattern;
      return snapshot();
    }
    if (state.pending) return snapshot();

    const breakout = detectBreakout({ state, current, atr, options });
    if (!breakout) return snapshot();
    if (options.entryMode === "breakout") {
      rememberConsumedSetup(state, breakout.setupId);
      state.pattern = breakout;
      return snapshot();
    }

    state.pending = {
      setupId: breakout.setupId,
      mode: options.entryMode,
      breakoutIndex: current.index,
      pattern: breakout,
    };
    return snapshot();
  };

  for (const candle of initialCandles) apply(candle);

  return { next: apply, getState: snapshot };
};
