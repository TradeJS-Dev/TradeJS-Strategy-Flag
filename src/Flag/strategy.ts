import { createCostIsolatedStrategyConfigParser } from "@tradejs/strategy-kit/config";
import type { ValidatedStrategyRegistryEntry } from "@tradejs/strategy-kit/config";
import { config as DEFAULT_CONFIG, FlagConfig } from "./config";
import { createFlagCore } from "./core";
import { flagManifest } from "./manifest";

export const FlagStrategyDefinition: ValidatedStrategyRegistryEntry<FlagConfig> =
  {
    defaults: DEFAULT_CONFIG,
    parseConfig: createCostIsolatedStrategyConfigParser({
      strategyName: "Flag",
      defaults: DEFAULT_CONFIG,
    }),
    createCore: createFlagCore,
    manifest: flagManifest,
  };
