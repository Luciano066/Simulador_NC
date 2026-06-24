import { describe, expect, it } from "vitest";

import { buildDensityGrid } from "../utils/ncDensity";

describe("buildDensityGrid", () => {
  it("espalha a densidade quando theta aumenta", () => {
    const narrow = buildDensityGrid([-1, 1], [-1, 1], 0.001, 1, 101);
    const wide = buildDensityGrid([-1, 1], [-1, 1], 0.1, 1, 101);

    const center = 50;
    const offCenter = 75;

    expect(narrow.z[center][center]).toBeCloseTo(1);
    expect(wide.z[center][center]).toBeCloseTo(1);
    expect(wide.z[center][offCenter]).toBeGreaterThan(narrow.z[center][offCenter]);
  });
});
