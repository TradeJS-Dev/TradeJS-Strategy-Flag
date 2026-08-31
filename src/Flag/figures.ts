import {
  StrategyEntryModelFigures,
  StrategyFigureLine,
  StrategyFigurePoints,
} from "@tradejs/types";
import { FlagPattern } from "./engine";

export const buildFlagFigures = ({
  pattern,
  entryTimestamp,
  entryPrice,
}: {
  pattern: FlagPattern;
  entryTimestamp: number;
  entryPrice: number;
}): StrategyEntryModelFigures => {
  const color = pattern.direction === "LONG" ? "#22c55e" : "#ef4444";
  const breakoutTimestamp = pattern.breakoutTimestamp;

  const lines: StrategyFigureLine[] = [
    {
      id: `flag-pole-${entryTimestamp}`,
      kind: `flag_${pattern.kind}_pole`,
      points: [
        {
          timestamp: pattern.poleStart.timestamp,
          value: pattern.poleStart.value,
        },
        { timestamp: pattern.poleEnd.timestamp, value: pattern.poleEnd.value },
      ],
      color,
      width: 3,
      style: "solid",
    },
    {
      id: `flag-upper-${entryTimestamp}`,
      kind: "flag_upper_boundary",
      points: [
        {
          timestamp: pattern.flagStartTimestamp,
          value: pattern.upperBoundaryStart,
        },
        {
          timestamp: breakoutTimestamp,
          value: pattern.upperBoundaryAtBreakout,
        },
      ],
      color: "#0ea5e9",
      width: 2,
      style: "solid",
    },
    {
      id: `flag-lower-${entryTimestamp}`,
      kind: "flag_lower_boundary",
      points: [
        {
          timestamp: pattern.flagStartTimestamp,
          value: pattern.lowerBoundaryStart,
        },
        {
          timestamp: breakoutTimestamp,
          value: pattern.lowerBoundaryAtBreakout,
        },
      ],
      color: "#0ea5e9",
      width: 2,
      style: "solid",
    },
    {
      id: `flag-target-${entryTimestamp}`,
      kind: "flag_target",
      points: [
        { timestamp: pattern.flagStartTimestamp, value: pattern.targetPrice },
        { timestamp: entryTimestamp, value: pattern.targetPrice },
      ],
      color: "#22c55e",
      width: 1,
      style: "dashed",
    },
    {
      id: `flag-stop-${entryTimestamp}`,
      kind: "flag_stop",
      points: [
        { timestamp: pattern.flagStartTimestamp, value: pattern.stopLossPrice },
        { timestamp: entryTimestamp, value: pattern.stopLossPrice },
      ],
      color: "#ef4444",
      width: 1,
      style: "dashed",
    },
  ];

  const points: StrategyFigurePoints[] = [
    {
      id: `flag-boundary-pivots-${entryTimestamp}`,
      kind: "flag_boundary_pivots",
      points: [...pattern.upperPivots, ...pattern.lowerPivots].map(
        ({ timestamp, value }) => ({ timestamp, value }),
      ),
      color: "#0ea5e9",
      radius: 4,
    },
    {
      id: `flag-breakout-${entryTimestamp}`,
      kind: "flag_breakout",
      points: [{ timestamp: breakoutTimestamp, value: pattern.breakoutPrice }],
      color,
      radius: 5,
    },
    {
      id: `flag-entry-${entryTimestamp}`,
      kind: "flag_entry",
      points: [{ timestamp: entryTimestamp, value: entryPrice }],
      color,
      radius: 5,
    },
  ];

  return { lines, points };
};
