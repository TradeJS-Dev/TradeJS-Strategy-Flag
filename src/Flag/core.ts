import { round } from "@tradejs/core/math";
import {
  buildTradeEconomics,
  isStopLossOnCorrectSide,
} from "@tradejs/strategy-kit/risk";
import type {
  CreateStrategyCore,
  IndicatorsHistorySnapshot,
  Position,
} from "@tradejs/types";
import { FlagConfig } from "./config";
import { buildFlagSignalContext, createFlagEngine } from "./engine";
import { buildFlagFigures } from "./figures";

const isOpenPosition = (position: Position | null): position is Position =>
  Boolean(
    position &&
    typeof position.price === "number" &&
    Number.isFinite(position.price) &&
    typeof position.qty === "number" &&
    Number.isFinite(position.qty) &&
    position.qty > 0 &&
    (position.direction === "LONG" || position.direction === "SHORT"),
  );

const buildFlagStateKey = (config: FlagConfig) =>
  JSON.stringify({
    atrPeriod: config.FLAG_ATR_PERIOD,
    poleLookbackBars: config.FLAG_POLE_LOOKBACK_BARS,
    minPoleMovePct: config.FLAG_MIN_POLE_MOVE_PCT,
    minPoleMoveAtr: config.FLAG_MIN_POLE_MOVE_ATR,
    minPoleEfficiencyRatio: config.FLAG_MIN_POLE_EFFICIENCY_RATIO,
    minPoleDirectionalConsistencyRatio:
      config.FLAG_MIN_POLE_DIRECTIONAL_CONSISTENCY_RATIO,
    minPoleDirectionalConsistencyRatioLong:
      config.FLAG_MIN_POLE_DIRECTIONAL_CONSISTENCY_RATIO_LONG,
    minPoleDirectionalConsistencyRatioShort:
      config.FLAG_MIN_POLE_DIRECTIONAL_CONSISTENCY_RATIO_SHORT,
    maxPoleTerminalExpansionRatio:
      config.FLAG_MAX_POLE_TERMINAL_EXPANSION_RATIO,
    maxPoleTerminalExpansionRatioLong:
      config.FLAG_MAX_POLE_TERMINAL_EXPANSION_RATIO_LONG,
    maxPoleTerminalExpansionRatioShort:
      config.FLAG_MAX_POLE_TERMINAL_EXPANSION_RATIO_SHORT,
    poleTerminalBars: config.FLAG_POLE_TERMINAL_BARS,
    minBars: config.FLAG_MIN_BARS,
    maxBars: config.FLAG_MAX_BARS,
    maxFlagToPoleBarsRatio: config.FLAG_MAX_FLAG_TO_POLE_BARS_RATIO,
    maxFlagToPoleBarsRatioLong: config.FLAG_MAX_FLAG_TO_POLE_BARS_RATIO_LONG,
    maxFlagToPoleBarsRatioShort: config.FLAG_MAX_FLAG_TO_POLE_BARS_RATIO_SHORT,
    pivotRadius: config.FLAG_PIVOT_RADIUS,
    minTouchesPerBoundary: config.FLAG_MIN_TOUCHES_PER_BOUNDARY,
    minCounterTrendSlopePctPerBar:
      config.FLAG_MIN_COUNTER_TREND_SLOPE_PCT_PER_BAR,
    maxSlopeDivergenceRatio: config.FLAG_MAX_SLOPE_DIVERGENCE_RATIO,
    maxChannelWidthPct: config.FLAG_MAX_CHANNEL_WIDTH_PCT,
    maxChannelWidthAtr: config.FLAG_MAX_CHANNEL_WIDTH_ATR,
    maxChannelWidthAtrLong: config.FLAG_MAX_CHANNEL_WIDTH_ATR_LONG,
    maxChannelWidthAtrShort: config.FLAG_MAX_CHANNEL_WIDTH_ATR_SHORT,
    maxChannelToPoleRatio: config.FLAG_MAX_CHANNEL_TO_POLE_RATIO,
    maxFlagToPoleVolumeRatio: config.FLAG_MAX_FLAG_TO_POLE_VOLUME_RATIO,
    maxRetracementRatio: config.FLAG_MAX_RETRACEMENT_RATIO,
    maxBoundaryViolationAtr: config.FLAG_MAX_BOUNDARY_VIOLATION_ATR,
    breakoutBufferAtr: config.FLAG_BREAKOUT_BUFFER_ATR,
    maxBreakoutDistanceAtr: config.FLAG_MAX_BREAKOUT_DISTANCE_ATR,
    targetPoleRatio: config.FLAG_TARGET_POLE_RATIO,
    stopBufferAtr: config.FLAG_STOP_BUFFER_ATR,
    entryMode: config.FLAG_ENTRY_MODE,
    confirmationMaxBars: config.FLAG_CONFIRMATION_MAX_BARS,
    retestMaxBars: config.FLAG_RETEST_MAX_BARS,
    retestToleranceAtr: config.FLAG_RETEST_TOLERANCE_ATR,
  });

export const createFlagCore: CreateStrategyCore<
  FlagConfig,
  IndicatorsHistorySnapshot | undefined
> = async ({ config, data: initialData, strategyApi, indicatorsState }) => {
  const detectorState = strategyApi.createStateController<
    { engine: ReturnType<typeof createFlagEngine> },
    ReturnType<ReturnType<typeof createFlagEngine>["next"]>,
    ReturnType<ReturnType<typeof createFlagEngine>["getState"]>
  >(
    "Flag",
    () => ({
      engine: createFlagEngine({
        config,
        initialCandles: initialData,
      }),
    }),
    {
      configKey: buildFlagStateKey(config),
      snapshot: (state) => state.engine.getState(),
    },
  );
  const lastTradeController = strategyApi.createLastTradeController({
    enabled: true,
  });
  const nextDetectorState = (
    candle: Parameters<ReturnType<typeof createFlagEngine>["next"]>[0],
  ) =>
    detectorState.oncePerTimestamp(candle.timestamp, (state) =>
      state.engine.next(candle),
    );

  return async (candle) => {
    const runtimeState = nextDetectorState(candle);
    const pattern = runtimeState.pattern;
    if (!pattern) return strategyApi.skip("NO_PATTERN");

    const position = await strategyApi.getCurrentPosition();
    if (isOpenPosition(position)) {
      const oppositePattern = position.direction !== pattern.direction;
      if (Boolean(config.FLAG_EXIT_ON_OPPOSITE_PATTERN) && oppositePattern) {
        return strategyApi.exit({
          code: "FLAG_OPPOSITE_PATTERN_EXIT",
          direction: position.direction,
        });
      }
      return strategyApi.skip("POSITION_EXISTS");
    }

    if (lastTradeController.isInCooldown(candle.timestamp)) {
      return strategyApi.skip("DEV_TRADE_COOLDOWN");
    }

    const sideConfig =
      pattern.direction === "LONG" ? config.LONG : config.SHORT;
    if (!sideConfig.enable) return strategyApi.skip("STRATEGY_DISABLED");

    const { timestamp, currentPrice } =
      await strategyApi.getDecisionPriceContext();
    if (
      !isStopLossOnCorrectSide({
        direction: pattern.direction,
        currentPrice,
        stopLossPrice: pattern.stopLossPrice,
      })
    ) {
      return strategyApi.skip("INVALID_STOP");
    }

    const targetIsValid =
      pattern.direction === "LONG"
        ? pattern.targetPrice > currentPrice
        : pattern.targetPrice < currentPrice;
    if (!targetIsValid) return strategyApi.skip("TARGET_ALREADY_PASSED");

    const economics = buildTradeEconomics({
      entryPrice: currentPrice,
      stopLossPrice: pattern.stopLossPrice,
      takeProfitPrice: pattern.targetPrice,
      feeRate: Number(config.RISK_FEE_RATE ?? 0),
      slippageBps:
        Number(config.RISK_SLIPPAGE_BPS ?? 0) +
        Number(config.RISK_MARKET_IMPACT_BPS ?? 0),
    });
    const qty =
      economics.lossPerUnit > 0
        ? Number(config.MAX_LOSS_VALUE ?? 0) / economics.lossPerUnit
        : 0;
    if (!qty || !Number.isFinite(qty) || qty <= 0) {
      return strategyApi.skip("INVALID_QTY");
    }
    if (economics.netRiskRatio <= sideConfig.minRiskRatio) {
      return strategyApi.skip(`RISK_RATIO:${round(economics.netRiskRatio)}`);
    }

    const signalContext = {
      ...buildFlagSignalContext({ ...pattern, close: currentPrice }),
      executionEconomics: {
        grossRiskRatio: economics.grossRiskRatio,
        netRiskRatio: economics.netRiskRatio,
        lossPerUnit: economics.lossPerUnit,
        rewardPerUnit: economics.rewardPerUnit,
      },
    };
    const indicators = indicatorsState.snapshot();
    lastTradeController.markTrade(timestamp);

    const kindCode = pattern.kind === "bull_flag" ? "BULL" : "BEAR";
    return strategyApi.entry({
      code: `FLAG_${kindCode}_${pattern.entryStage.toUpperCase()}`,
      direction: sideConfig.direction,
      indicators,
      additionalIndicators: {
        flagContext: signalContext,
        jevEvidence: {
          version: "flag-setup-v1",
          knownAt: timestamp,
          facts: {
            entryStage: pattern.entryStage,
            poleMoveAtr: pattern.poleMoveAtr,
            poleEfficiencyRatio: pattern.poleEfficiencyRatio,
            retracementRatio: pattern.retracementRatio,
            breakoutDistanceAtr: pattern.breakoutDistanceAtr,
            confirmationBars: pattern.confirmationBars,
            flagToPoleVolumeRatio: pattern.flagToPoleVolumeRatio,
          },
          geometry: {
            upperR2: pattern.upperR2,
            lowerR2: pattern.lowerR2,
            slopeDivergenceRatio: pattern.slopeDivergenceRatio,
            channelWidthAtr: pattern.channelWidthAtr,
            channelToPoleRatio: pattern.channelToPoleRatio,
            counterTrendSlopePctPerBar: pattern.counterTrendSlopePctPerBar,
            flagToPoleBarsRatio: pattern.flagToPoleBarsRatio,
          },
          factDetails: {
            "setup.poleMoveAtr": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "ATR",
            },
            "setup.poleEfficiencyRatio": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "ratio",
            },
            "setup.retracementRatio": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "ratio",
            },
            "setup.breakoutDistanceAtr": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "ATR",
            },
            "setup.confirmationBars": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "bars",
            },
            "setup.flagToPoleVolumeRatio": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "ratio",
            },
            "geometry.upperR2": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "ratio",
            },
            "geometry.lowerR2": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "ratio",
            },
            "geometry.slopeDivergenceRatio": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "ratio",
            },
            "geometry.channelWidthAtr": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "ATR",
            },
            "geometry.channelToPoleRatio": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "ratio",
            },
            "geometry.counterTrendSlopePctPerBar": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "percent/bar",
            },
            "geometry.flagToPoleBarsRatio": {
              knownAt: timestamp,
              scope: "strategy",
              unit: "ratio",
            },
          },
        },
      },
      figures: buildFlagFigures({
        pattern,
        entryTimestamp: timestamp,
        entryPrice: currentPrice,
      }),
      orderPlan: {
        qty,
        stopLossPrice: pattern.stopLossPrice,
        takeProfits: [{ rate: 1, price: pattern.targetPrice }],
      },
    });
  };
};
