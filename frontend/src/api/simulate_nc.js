import { requestJson } from "./client";

export function simulateOrbitNC(payload) {
  return requestJson("/simulate_nc", payload);
}
