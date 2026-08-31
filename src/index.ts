import { defineStrategyPlugin } from "@tradejs/core/config";
import type { ValidatedStrategyRegistryEntry } from "@tradejs/strategy-kit/config";
import type { StrategyConfig } from "@tradejs/types";
import { config as flagDefaultConfig } from "./Flag/config";
import { FlagStrategyDefinition } from "./Flag/strategy";

export const strategyEntries: ValidatedStrategyRegistryEntry<any>[] = [
  FlagStrategyDefinition,
];

const defaultConfigs: Record<string, StrategyConfig> = {
  Flag: flagDefaultConfig,
};

export const getBuiltInStrategyDefaultConfig = (
  strategyName: string,
): StrategyConfig | undefined => defaultConfigs[strategyName];

export { FlagStrategyDefinition } from "./Flag/strategy";
export { flagDefaultConfig };
export { flagManifest } from "./Flag/manifest";
export { flagAiAdapter } from "./Flag/adapters/ai";

export default defineStrategyPlugin({ strategyEntries });
