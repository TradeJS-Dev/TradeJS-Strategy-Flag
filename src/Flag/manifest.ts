import { StrategyManifest } from "@tradejs/types";
import { flagAiAdapter } from "./adapters/ai";

export const flagManifest: StrategyManifest = {
  name: "Flag",
  aiAdapter: flagAiAdapter,
};
