import { buildFlagFigures } from "../figures";
import { FlagPattern } from "../engine";

const pattern: FlagPattern = {
  setupId: "bull-flag-1",
  kind: "bull_flag",
  direction: "LONG",
  entryMode: "close_acceptance",
  entryStage: "close_accepted",
  poleStart: { timestamp: 1, index: 0, value: 100 },
  poleEnd: { timestamp: 2, index: 5, value: 120 },
  upperPivots: [
    { timestamp: 3, index: 6, value: 121, kind: "high" },
    { timestamp: 5, index: 8, value: 119.5, kind: "high" },
  ],
  lowerPivots: [
    { timestamp: 4, index: 7, value: 117.75, kind: "low" },
    { timestamp: 6, index: 9, value: 116.25, kind: "low" },
  ],
  flagStartTimestamp: 3,
  flagEndTimestamp: 6,
  flagBars: 8,
  poleBars: 5,
  poleMove: 20,
  poleMovePct: 20,
  poleMoveAtr: 8,
  poleEfficiencyRatio: 1,
  upperBoundaryStart: 121,
  upperBoundaryEnd: 115.75,
  upperBoundaryAtBreakout: 115,
  lowerBoundaryStart: 118.5,
  lowerBoundaryEnd: 113.25,
  lowerBoundaryAtBreakout: 112.5,
  upperSlope: -0.75,
  lowerSlope: -0.75,
  counterTrendSlopePctPerBar: 0.625,
  slopeDivergenceRatio: 0,
  upperR2: 1,
  lowerR2: 1,
  channelWidth: 2.5,
  channelWidthPct: 2.08,
  channelToPoleRatio: 0.125,
  retracementRatio: 0.34,
  breakoutDistanceAtr: 0.24,
  atr: 2.5,
  targetPrice: 135,
  stopLossPrice: 112.25,
  breakoutTimestamp: 7,
  breakoutPrice: 115.6,
  confirmationBars: 1,
  timestamp: 8,
  close: 115.8,
};

describe("Flag figures", () => {
  it("renders the pole, channel, target, stop, pivots, breakout, and entry", () => {
    const figures = buildFlagFigures({
      pattern,
      entryTimestamp: 8,
      entryPrice: 115.8,
    });

    expect(figures.lines?.map((line) => line.kind)).toEqual([
      "flag_bull_flag_pole",
      "flag_upper_boundary",
      "flag_lower_boundary",
      "flag_target",
      "flag_stop",
    ]);
    expect(figures.points).toHaveLength(3);
    expect(figures.points?.[0]?.points).toHaveLength(4);
    expect(figures.points?.[1]?.points[0]?.value).toBe(115.6);
  });
});
