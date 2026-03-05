import { requestJson } from "./client";

export function fetchVeff(payload) {
  return requestJson("/veff", payload);
}
