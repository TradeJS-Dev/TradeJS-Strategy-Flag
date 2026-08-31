import { mapAiRuntimeFromConfig } from "@tradejs/core/strategies";
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

export const flagAiAdapter: StrategyAiAdapter = {
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
- flagBars=${String(context.flagBars ?? "n/a")}
- counterTrendSlopePctPerBar=${String(context.counterTrendSlopePctPerBar ?? "n/a")}
- slopeDivergenceRatio=${String(context.slopeDivergenceRatio ?? "n/a")}
- channelWidthPct=${String(context.channelWidthPct ?? "n/a")}
- channelToPoleRatio=${String(context.channelToPoleRatio ?? "n/a")}
- retracementRatio=${String(context.retracementRatio ?? "n/a")}
- breakoutDistanceAtr=${String(context.breakoutDistanceAtr ?? "n/a")}
- targetPrice=${String(context.targetPrice ?? "n/a")}
- stopLossPrice=${String(context.stopLossPrice ?? "n/a")}

Interpretation rules for Flag:
- A bull flag requires a strong upward pole, a downward-sloping parallel channel, and an upper-boundary breakout.
- A bear flag requires a strong downward pole, an upward-sloping parallel channel, and a lower-boundary breakdown.
- Prefer efficient poles, several touches on both boundaries, parallel channel lines, limited retracement, and a breakout close near the boundary.
- Reject a setup when the channel slopes in the same direction as the pole or the breakout is already extended.
`.trim();
  },
  mapEntryRuntimeFromConfig: (config) =>
    mapAiRuntimeFromConfig(
      config as Pick<FlagConfig, "AI_ENABLED" | "AI_MODE" | "MIN_AI_QUALITY">,
    ),
};
