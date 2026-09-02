import { mapAiRuntimeFromConfig } from "@tradejs/core/strategies";
import {
  getAiPayloadNumber,
  getAiPayloadString,
  withStrategyLocalAiGate,
} from "@tradejs/strategy-kit/ai-gate";
import { AiPayload, StrategyAiAdapter } from "@tradejs/types";
import { FlagConfig } from "../config";
import { FlagSignalContext } from "../engine";

const getFlagContext = (payload: AiPayload): Partial<FlagSignalContext> => {
  const additional = payload.additionalIndicators as
    Record<string, unknown> | undefined;
  const context = additional?.flagContext;
  return context && typeof context === "object"
    ? (context as Partial<FlagSignalContext>)
    : {};
};

const flagBaseAiAdapter: StrategyAiAdapter = {
  buildPayload: ({ signal, basePayload }) => {
    const baseAdditional =
      (basePayload.additionalIndicators as
        Record<string, unknown> | undefined) ?? {};
    const signalAdditional = signal.additionalIndicators as
      Record<string, unknown> | undefined;

    return {
      ...basePayload,
      additionalIndicators: {
        ...baseAdditional,
        flagContext: signalAdditional?.flagContext,
      },
    };
  },
  buildHumanPromptAddon: ({ payload }) => {
    const context = getFlagContext(payload);
    return `
Additional Flag context:
- patternKind=${context.patternKind ?? "n/a"}
- signalDirection=${context.signalDirection ?? "n/a"}
- entryMode=${context.entryMode ?? "n/a"}
- entryStage=${context.entryStage ?? "n/a"}
- poleMovePct=${String(context.poleMovePct ?? "n/a")}
- poleMoveAtr=${String(context.poleMoveAtr ?? "n/a")}
- poleEfficiencyRatio=${String(context.poleEfficiencyRatio ?? "n/a")}
- poleDirectionalConsistencyRatio=${String(context.poleDirectionalConsistencyRatio ?? "n/a")}
- poleTerminalExpansionRatio=${String(context.poleTerminalExpansionRatio ?? "n/a")}
- flagBars=${String(context.flagBars ?? "n/a")}
- flagToPoleBarsRatio=${String(context.flagToPoleBarsRatio ?? "n/a")}
- counterTrendSlopePctPerBar=${String(context.counterTrendSlopePctPerBar ?? "n/a")}
- slopeDivergenceRatio=${String(context.slopeDivergenceRatio ?? "n/a")}
- channelWidthPct=${String(context.channelWidthPct ?? "n/a")}
- channelWidthAtr=${String(context.channelWidthAtr ?? "n/a")}
- channelToPoleRatio=${String(context.channelToPoleRatio ?? "n/a")}
- flagToPoleVolumeRatio=${String(context.flagToPoleVolumeRatio ?? "n/a")}
- retracementRatio=${String(context.retracementRatio ?? "n/a")}
- breakoutDistanceAtr=${String(context.breakoutDistanceAtr ?? "n/a")}
- targetPrice=${String(context.targetPrice ?? "n/a")}
- stopLossPrice=${String(context.stopLossPrice ?? "n/a")}

Interpretation rules for Flag:
- A bull flag requires a strong upward pole, a downward-sloping parallel channel, and an upper-boundary breakout.
- A bear flag requires a strong downward pole, an upward-sloping parallel channel, and a lower-boundary breakdown.
- Prefer efficient and directionally consistent poles without terminal range exhaustion, contracting consolidation volume, compact normalized duration and width, several touches on both boundaries, parallel channel lines, limited retracement, and a breakout close near the boundary.
- Reject a setup when the channel slopes in the same direction as the pole or the breakout is already extended.
`.trim();
  },
  mapEntryRuntimeFromConfig: (config) =>
    mapAiRuntimeFromConfig(
      config as Pick<FlagConfig, "AI_ENABLED" | "AI_MODE" | "MIN_AI_QUALITY">,
    ),
};

export const flagAiAdapter = withStrategyLocalAiGate(flagBaseAiAdapter, {
  id: "flag_structural_v3_near_support_btc_lead_short_gate_2026_09_02",
  approves: ({ signal, payload }) => {
    if (signal.direction !== "SHORT") return false;

    const alphaVsBtc4h = getAiPayloadNumber(
      payload,
      "additionalIndicators.baseContext.relative.targetVsBtc.alphaVsBtc4h",
    );
    const btcVsAltReturn4h = getAiPayloadNumber(
      payload,
      "additionalIndicators.baseContext.relative.btcAltRegime.btcVsAltReturn4h",
    );
    const upperR2 = getAiPayloadNumber(
      payload,
      "additionalIndicators.flagContext.upperR2",
    );
    const lowerR2 = getAiPayloadNumber(
      payload,
      "additionalIndicators.flagContext.lowerR2",
    );
    const rsi = getAiPayloadNumber(
      payload,
      "additionalIndicators.baseContext.regime.momentum.rsi",
    );
    const bodyStrength = getAiPayloadNumber(
      payload,
      "additionalIndicators.baseContext.regime.momentum.bodyStrength",
    );
    const h1TrendBias = getAiPayloadString(
      payload,
      "additionalIndicators.baseContext.mtf.summary.h1TrendBias",
    );
    const h4TrendBias = getAiPayloadString(
      payload,
      "additionalIndicators.baseContext.mtf.summary.h4TrendBias",
    );
    const mtfAlignment = getAiPayloadString(
      payload,
      "additionalIndicators.baseContext.mtf.summary.mtfAlignment",
    );
    const entryLocation = getAiPayloadString(
      payload,
      "additionalIndicators.baseContext.gateFeatures.setup.entryLocation",
    );
    const btcAltRegime = getAiPayloadString(
      payload,
      "additionalIndicators.baseContext.relative.btcAltRegime.regime",
    );

    const relativeApproved =
      alphaVsBtc4h != null &&
      alphaVsBtc4h <= -1.3 &&
      btcVsAltReturn4h != null &&
      btcVsAltReturn4h <= 0.02;
    const strictGeometryApproved =
      upperR2 != null && upperR2 >= 0.9 && lowerR2 != null && lowerR2 >= 0.9;
    const relaxedGeometryApproved =
      rsi != null &&
      rsi >= 35 &&
      h1TrendBias === "bear" &&
      h4TrendBias === "bear" &&
      bodyStrength != null &&
      bodyStrength >= 0.15;
    const residualTailPocket =
      entryLocation === "near_support" && btcAltRegime === "btc_lead";

    return (
      relativeApproved &&
      (strictGeometryApproved || relaxedGeometryApproved) &&
      mtfAlignment != null &&
      mtfAlignment !== "aligned_bear" &&
      !residualTailPocket
    );
  },
});
