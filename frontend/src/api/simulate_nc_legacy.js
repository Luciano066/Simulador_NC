import { requestJson } from "./client";

export function simulateOrbitNCLegacy(payload) {
  return requestJson("/simulate_nc_legacy", payload);
}
