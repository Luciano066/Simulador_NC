import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestJson, resolveApiBaseUrl } from "./client";
import { simulateOrbit } from "./simulate";
import { simulateOrbitNCLegacy } from "./simulate_nc_legacy";
import { fetchVeff } from "./veff";
import { fetchVeffNCLegacy } from "./veff_nc_legacy";

describe("API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("normaliza a URL base", () => {
    expect(resolveApiBaseUrl("http://localhost:8000/")).toBe("http://localhost:8000");
    expect(resolveApiBaseUrl("", false)).toBe("http://127.0.0.1:8000");
    expect(resolveApiBaseUrl("", true)).toBe("");
  });

  it("propaga detail da API em erros", async () => {
    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ detail: "r0 deve ser > 2M" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(requestJson("/simulate", { any: true })).rejects.toThrow("r0 deve ser > 2M");
  });

  it("faz POST para os endpoints classicos", async () => {
    const payload = {
      metric: "schwarzschild",
      particle: "massive",
      M: 1,
      E: 1.2,
      L: 4,
      r0: 10,
      radial_sign: "in",
      phi_max: 10,
      n: 100,
    };
    const potentialPayload = {
      metric: "schwarzschild",
      particle: "massive",
      M: 1,
      E: 1.2,
      L: 4,
      r_min: 2.2,
      r_max: 50,
      n: 100,
    };

    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ phi: [], r: [], x: [], y: [], meta: { ok: true } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ r: [], U_eff: [], V_eff2: [], meta: { ok: true } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const orbitResponse = await simulateOrbit(payload);
    const potentialResponse = await fetchVeff(potentialPayload);

    expect(orbitResponse.meta.ok).toBe(true);
    expect(potentialResponse.meta.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:8000/simulate");
    expect(fetch.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(payload);
    expect(fetch.mock.calls[1][0]).toBe("http://127.0.0.1:8000/veff");
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(potentialPayload);
  });

  it("faz POST para os endpoints NC legado", async () => {
    const payload = {
      metric: "nc-legacy",
      particle: "massive",
      theta: 0.05,
      L: 1,
      E: 0.1,
      b: 5,
      n: 100,
    };

    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ phi: [], r: [], V_eff: [], x: [], y: [], meta: { mode: "nc-legado" } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ r: [], V_eff: [], meta: { mode: "nc-legado" } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await simulateOrbitNCLegacy(payload);
    await fetchVeffNCLegacy(payload);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:8000/simulate_nc_legacy");
    expect(fetch.mock.calls[1][0]).toBe("http://127.0.0.1:8000/veff_nc_legacy");
  });
});
