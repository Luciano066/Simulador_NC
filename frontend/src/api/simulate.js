import { requestJson } from "./client";

export function simulateOrbit(payload) {
  return requestJson("/simulate", payload);
}
