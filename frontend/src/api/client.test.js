import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestJson, resolveApiBaseUrl } from "./client";
import { simulateOrbit } from "./simulate";
import { simulateOrbitNCMaple } from "./simulate_nc_maple";
import { fetchVeffNCMaple } from "./veff_nc_maple";

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
    expect(resolveApiBaseUrl("")).toBe("http://127.0.0.1:8000");
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

  it("faz POST para /simulate", async () => {
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

    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ phi: [], r: [], x: [], y: [], meta: { ok: true } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const response = await simulateOrbit(payload);

    expect(response.meta.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8000/simulate");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it("faz POST para os endpoints Maple/TCC", async () => {
    const payload = {
      metric: "nc-maple",
      m: 0.1,
      theta: 0.001,
      kappa: 0.5,
      L: 2,
      u0: 1,
      du0: 2.09862,
      phi_max: 2 * Math.PI,
      r_min: 0.1,
      r_max: 2,
      n: 100,
    };

    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ phi: [], u: [], r: [], x: [], y: [], meta: { E: 1 } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    fetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ r: [], V_eff: [], meta: { E: 1 } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await simulateOrbitNCMaple(payload);
    await fetchVeffNCMaple(payload);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toBe("http://127.0.0.1:8000/simulate_nc_maple");
    expect(fetch.mock.calls[1][0]).toBe("http://127.0.0.1:8000/veff_nc_maple");
  });
});
