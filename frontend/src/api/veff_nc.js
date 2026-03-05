import { requestJson } from "./client";

export function fetchVeffNC(payload) {
  return requestJson("/veff_nc", payload);
}
