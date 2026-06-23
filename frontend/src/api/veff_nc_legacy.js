import { requestJson } from "./client";

export function fetchVeffNCLegacy(payload) {
  return requestJson("/veff_nc_legacy", payload);
}
