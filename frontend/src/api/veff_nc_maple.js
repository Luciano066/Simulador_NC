import { requestJson } from "./client";

export function fetchVeffNCMaple(payload) {
  return requestJson("/veff_nc_maple", payload);
}
