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
});
