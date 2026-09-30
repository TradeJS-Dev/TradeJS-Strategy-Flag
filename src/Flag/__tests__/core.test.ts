/** @jest-environment node */

import { createFlagCore } from "../core";
import { createTestStateController } from "../../testUtils/stateControllerTestUtils";
import {
  makeBearFlagCandles,
  makeBullFlagCandles,
  makeFlagConfig,
} from "./fixtures";

const makeIndicatorsState = () =>
  ({
    setCurrentBar: jest.fn(),
    next: jest.fn(),
    onBar: jest.fn(),
    ensureInitializedWithCurrentBar: jest.fn(),
    snapshot: jest.fn(() => ({ baseContext: {} })),
    latestNumber: jest.fn(() => undefined),
    isInitialized: jest.fn(() => true),
  }) as any;

const makeStrategyApi = ({
  marketData,
  currentPosition = null,
}: {
  marketData: any;
  currentPosition?: any;
}) =>
  ({
    skip: (code: string) => ({ kind: "skip", code }),
    getDecisionPriceContext: jest.fn(async () => ({
      timestamp: marketData.timestamp,
      currentPrice: marketData.currentPrice,
      candle: marketData.lastCandle,
    })),
    getBaseContext: jest.fn(() => ({})),
    getCurrentPosition: jest.fn(async () => currentPosition),
    createLastTradeController: jest.fn(() => ({
      isInCooldown: () => false,
      markTrade: jest.fn(),
      getLastTradeTimestamp: () => null,
    })),
    createStateController: createTestStateController(),
    entry: jest.fn(async (params: any) => ({
      kind: "entry",
      code: params.code,
      entryContext: {
        strategy: "Flag",
        symbol: "TESTUSDT",
        interval: "15",
        direction: params.direction,
        timestamp: marketData.timestamp,
        prices: {
          currentPrice: marketData.currentPrice,
          takeProfitPrice: params.orderPlan.takeProfits[0].price,
          stopLossPrice: params.orderPlan.stopLossPrice,
          riskRatio: 1,
        },
        isConfigFromBacktest: false,
      },
      orderPlan: params.orderPlan,
      signal: {
        signalId: "flag-test-signal",
        strategy: "Flag",
        symbol: "TESTUSDT",
        interval: "15",
        direction: params.direction,
        timestamp: marketData.timestamp,
        figures: params.figures ?? {},
        prices: {
          currentPrice: marketData.currentPrice,
          takeProfitPrice: params.orderPlan.takeProfits[0].price,
          stopLossPrice: params.orderPlan.stopLossPrice,
          riskRatio: 1,
        },
        indicators: params.indicators ?? {},
        additionalIndicators: params.additionalIndicators,
      },
    })),
    exit: jest.fn(async (params: any) => ({
      kind: "exit",
      code: params.code,
      closePlan: {
        direction: params.direction,
        price: marketData.currentPrice,
        timestamp: marketData.timestamp,
      },
    })),
  }) as any;

describe("Flag core", () => {
  it("creates a long entry with channel figures on a bull flag breakout", async () => {
    const candles = makeBullFlagCandles();
    const currentCandle = candles.at(-1)!;
    const strategyApi = makeStrategyApi({
      marketData: {
        timestamp: currentCandle.timestamp,
        currentPrice: currentCandle.close,
        lastCandle: currentCandle,
      },
    });
    const core = await createFlagCore({
      config: {
        ...makeFlagConfig(),
        LONG: { enable: true, direction: "LONG", minRiskRatio: 0.5 },
      },
      data: candles.slice(0, -1) as any,
      strategyApi,
      indicatorsState: makeIndicatorsState(),
    });

    const result = await core(currentCandle as any, currentCandle as any);

    expect(result.kind).toBe("entry");
    expect((result as any).code).toBe("FLAG_BULL_BREAKOUT");
    expect((result as any).entryContext.direction).toBe("LONG");
    expect((result as any).signal.figures.lines).toHaveLength(5);
    expect(
      (result as any).signal.additionalIndicators.flagContext.patternKind,
    ).toBe("bull_flag");
    expect(
      (result as any).signal.additionalIndicators.jevEvidence,
    ).toMatchObject({
      version: "flag-setup-v1",
      knownAt: currentCandle.timestamp,
      facts: { entryStage: "breakout" },
      geometry: { upperR2: expect.any(Number) },
    });
  });

  it("exits an existing long when a bear flag breaks down", async () => {
    const candles = makeBearFlagCandles();
    const currentCandle = candles.at(-1)!;
    const strategyApi = makeStrategyApi({
      marketData: {
        timestamp: currentCandle.timestamp,
        currentPrice: currentCandle.close,
        lastCandle: currentCandle,
      },
      currentPosition: { direction: "LONG", price: 110, qty: 1 },
    });
    const core = await createFlagCore({
      config: makeFlagConfig(),
      data: candles.slice(0, -1) as any,
      strategyApi,
      indicatorsState: makeIndicatorsState(),
    });

    const result = await core(currentCandle as any, currentCandle as any);

    expect(result).toMatchObject({
      kind: "exit",
      code: "FLAG_OPPOSITE_PATTERN_EXIT",
    });
  });
});
