import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requestJson, resolveApiBaseUrl } from "./client";
import { simulateOrbit } from "./simulate";

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
});
