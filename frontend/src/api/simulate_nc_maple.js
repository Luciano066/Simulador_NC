import { requestJson } from "./client";

export function simulateOrbitNCMaple(payload) {
  return requestJson("/simulate_nc_maple", payload);
}
