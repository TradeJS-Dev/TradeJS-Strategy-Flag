import { flagAiAdapter } from "../adapters/ai";

describe("Flag AI adapter", () => {
  it("copies strategy geometry into the AI payload and prompt", () => {
    const flagContext = {
      patternKind: "bull_flag",
      signalDirection: "LONG",
      poleMovePct: 5.2,
      flagBars: 12,
      channelWidthPct: 1.1,
    };
    const signal = {
      additionalIndicators: { flagContext },
    } as any;
    const basePayload = {
      signal: {
        symbol: "BTCUSDT",
        signalId: "flag-1",
        interval: "15",
        direction: "LONG",
        timestamp: 1,
        strategy: "Flag",
        prices: {
          currentPrice: 100,
          takeProfitPrice: 110,
          stopLossPrice: 97,
        },
      },
      figures: {},
      indicators: {},
      additionalIndicators: { baseContext: { available: true } },
    } as any;

    const payload = flagAiAdapter.buildPayload!({ signal, basePayload });
    const prompt = flagAiAdapter.buildHumanPromptAddon!({ signal, payload });

    expect((payload.additionalIndicators as any).flagContext).toEqual(
      flagContext,
    );
    expect((payload.additionalIndicators as any).baseContext).toEqual({
      available: true,
    });
    expect(prompt).toContain("patternKind=bull_flag");
    expect(prompt).toContain("poleMovePct=5.2");
  });

  const applyLocalGate = ({
    direction = "SHORT",
    alphaVsBtc4h = -1.3,
    btcVsAltReturn4h = 0.02,
    upperR2 = 0.9,
    lowerR2 = 0.9,
    rsi,
    bodyStrength,
    h1TrendBias,
    h4TrendBias,
    mtfAlignment = "mixed",
    entryLocation = "breakdown",
    btcAltRegime = "balanced",
    swingAmplitudeAtr = 4.5,
    breakoutDistanceAtr = 0.22,
  }: {
    direction?: "LONG" | "SHORT";
    alphaVsBtc4h?: unknown;
    btcVsAltReturn4h?: unknown;
    upperR2?: unknown;
    lowerR2?: unknown;
    rsi?: unknown;
    bodyStrength?: unknown;
    h1TrendBias?: unknown;
    h4TrendBias?: unknown;
    mtfAlignment?: unknown;
    entryLocation?: unknown;
    btcAltRegime?: unknown;
    swingAmplitudeAtr?: unknown;
    breakoutDistanceAtr?: unknown;
  } = {}) =>
    flagAiAdapter.postProcessLocalAnalysis!({
      signal: {
        direction,
        prices: {
          currentPrice: 100,
          takeProfitPrice: direction === "SHORT" ? 90 : 110,
          stopLossPrice: direction === "SHORT" ? 105 : 95,
        },
      },
      payload: {
        additionalIndicators: {
          flagContext: { upperR2, lowerR2, breakoutDistanceAtr },
          baseContext: {
            relative: {
              targetVsBtc: { alphaVsBtc4h },
              btcAltRegime: { btcVsAltReturn4h, regime: btcAltRegime },
            },
            regime: { momentum: { rsi, bodyStrength } },
            mtf: {
              summary: { h1TrendBias, h4TrendBias, mtfAlignment },
            },
            gateFeatures: { setup: { entryLocation } },
            structure: { pivots: { swingAmplitudeAtr } },
          },
        },
      },
      analysis: { quality: 3 },
    } as any) as any;

  it("approves H2 at its inclusive boundaries", () => {
    expect(applyLocalGate()).toMatchObject({
      approved: true,
      direction: "SHORT",
      quality: 4,
      gateDecision: "approved",
      needRetest: false,
      takeProfitPrice: 90,
      stopLossPrice: 105,
    });
  });

  it("rejects the near-support pocket when BTC leads", () => {
    expect(
      applyLocalGate({
        entryLocation: "near_support",
        btcAltRegime: "btc_lead",
      }),
    ).toMatchObject({
      approved: false,
      direction: null,
      quality: 3,
      gateDecision: "rejected",
    });
  });

  it("keeps near-support signals outside the BTC-lead regime", () => {
    expect(
      applyLocalGate({
        entryLocation: "near_support",
        btcAltRegime: "balanced",
      }),
    ).toMatchObject({ approved: true, gateDecision: "approved" });
  });

  it("accepts the frozen relaxed geometry branch", () => {
    expect(
      applyLocalGate({
        upperR2: 0.899999,
        lowerR2: 0.899999,
        rsi: 35,
        bodyStrength: 0.15,
        h1TrendBias: "bear",
        h4TrendBias: "bear",
      }),
    ).toMatchObject({ approved: true, gateDecision: "approved" });
  });

  it.each([
    { direction: "LONG" as const },
    { alphaVsBtc4h: -1.299999 },
    { btcVsAltReturn4h: 0.020001 },
    { upperR2: null, lowerR2: null },
    { mtfAlignment: "aligned_bear" },
    { mtfAlignment: null },
    { swingAmplitudeAtr: 4.499999 },
    { swingAmplitudeAtr: null },
    { breakoutDistanceAtr: 0.219999 },
    { breakoutDistanceAtr: null },
  ])("rejects signals outside the frozen rule: %p", (params) => {
    expect(applyLocalGate(params)).toMatchObject({
      approved: false,
      gateDecision: "rejected",
    });
  });
});
