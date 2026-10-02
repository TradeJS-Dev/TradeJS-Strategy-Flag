/** @jest-environment node */

import { FlagStrategyDefinition } from "../strategy";

describe("Flag configuration", () => {
  it("applies the researched geometry and LONG pole filters to new configs", () => {
    expect(FlagStrategyDefinition.parseConfig({})).toMatchObject({
      FLAG_REQUIRE_FULL_PIVOT_NEIGHBORHOOD: true,
      FLAG_MIN_TOUCHES_PER_BOUNDARY: 3,
      FLAG_BOUNDARY_FIT_MODE: "least_squares",
      FLAG_MIN_POLE_DIRECTIONAL_CONSISTENCY_RATIO_LONG: 0.85,
      FLAG_MAX_POLE_TERMINAL_EXPANSION_RATIO_LONG: 1.5,
      FLAG_MIN_POLE_DIRECTIONAL_CONSISTENCY_RATIO_SHORT: 0,
      FLAG_MAX_POLE_TERMINAL_EXPANSION_RATIO_SHORT: 0,
    });
  });

  it("preserves explicit backtest overrides", () => {
    expect(
      FlagStrategyDefinition.parseConfig({
        FLAG_REQUIRE_FULL_PIVOT_NEIGHBORHOOD: false,
        FLAG_MIN_TOUCHES_PER_BOUNDARY: 2,
        FLAG_MIN_POLE_DIRECTIONAL_CONSISTENCY_RATIO_LONG: 0,
        FLAG_MAX_POLE_TERMINAL_EXPANSION_RATIO_LONG: 0,
      }),
    ).toMatchObject({
      FLAG_REQUIRE_FULL_PIVOT_NEIGHBORHOOD: false,
      FLAG_MIN_TOUCHES_PER_BOUNDARY: 2,
      FLAG_MIN_POLE_DIRECTIONAL_CONSISTENCY_RATIO_LONG: 0,
      FLAG_MAX_POLE_TERMINAL_EXPANSION_RATIO_LONG: 0,
    });
  });
});
