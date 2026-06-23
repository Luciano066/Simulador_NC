import { useEffect, useState } from "react";
import { resolveApiBaseUrl } from "../api/client";
import { simulateOrbitNCLegacy } from "../api/simulate_nc_legacy";
import { fetchVeffNCLegacy } from "../api/veff_nc_legacy";
import { toFriendlyErrorMessage } from "../utils/errors";

const API_BASE_URL = resolveApiBaseUrl();

const PRESETS = {
  massive: {
    metric: "nc-legacy",
    particle: "massive",
    theta: 0.05,
    L: 1.0,
    E: 0.1,
    b: 5.0,
    auto_rst: true,
    rst: 12.0,
    norbit: 50.0,
    capture_radius: 2.0,
    n: 5000,
    r_min: 0.001,
    n_veff: 50000,
  },
  photon: {
    metric: "nc-legacy",
    particle: "photon",
    theta: 0.05,
    L: 1.0,
    E: 0.1,
    b: 5.0,
    auto_rst: true,
    rst: 50.0,
    norbit: 50.0,
    capture_radius: 2.0,
    n: 2000,
    r_min: 0.001,
    n_veff: 50000,
  },
};

function minMax(values) {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: null, max: null };
  return { min, max };
}

function logLegacyResponse(label, response) {
  const r = response?.r ?? [];
  const V = response?.V_eff ?? [];
  const { min, max } = minMax(V);
  console.info(`SI-NC nc-legado ${label}`, {
    mode: response?.meta?.mode ?? "nc-legado",
    first_r: r.length ? r[0] : null,
    last_r: r.length ? r[r.length - 1] : null,
    min_V: min,
    max_V: max,
    E: response?.meta?.energy_level ?? response?.meta?.E ?? null,
    points: r.length,
  });
}

function legacyPayload(params, extra = {}) {
  const payload = {
    metric: params.metric,
    particle: params.particle,
    theta: params.theta,
    L: params.L,
    E: params.E,
    b: params.b,
    ...extra,
  };
  if (!params.auto_rst) {
    payload.rst = params.rst;
  }
  return payload;
}

export function useLegacyNcSimulation() {
  const [legacyParams, setLegacyParams] = useState(PRESETS.massive);
  const [legacyTraj, setLegacyTraj] = useState(null);
  const [legacyVeff, setLegacyVeff] = useState(null);
  const [legacyOrbitErr, setLegacyOrbitErr] = useState("");
  const [legacyPotentialErr, setLegacyPotentialErr] = useState("");
  const [legacyOrbitLoading, setLegacyOrbitLoading] = useState(false);
  const [legacyPotentialLoading, setLegacyPotentialLoading] = useState(false);

  const setLegacyNum = (key) => (event) => {
    setLegacyParams((state) => ({ ...state, [key]: Number(event.target.value) }));
  };
  const setLegacyStr = (key) => (event) => {
    setLegacyParams((state) => ({ ...state, [key]: event.target.value }));
  };
  const setLegacyBool = (key) => (event) => {
    setLegacyParams((state) => ({ ...state, [key]: event.target.checked }));
  };

  function applyLegacyPreset(preset) {
    setLegacyParams(PRESETS[preset] ?? PRESETS.massive);
  }

  function validateCommon(setError) {
    if (!Number.isFinite(legacyParams.theta) || legacyParams.theta <= 0) {
      setError("Theta invalido. Use theta > 0.");
      return false;
    }
    if (!Number.isFinite(legacyParams.L) || legacyParams.L <= 0) {
      setError("Momento angular invalido. Use L > 0.");
      return false;
    }
    if (!Number.isFinite(legacyParams.b) || legacyParams.b <= 0) {
      setError("Parametro de impacto invalido. Use b > 0.");
      return false;
    }
    if (!legacyParams.auto_rst && (!Number.isFinite(legacyParams.rst) || legacyParams.rst <= 0)) {
      setError("rst invalido. Use rst > 0 ou ative rst automatico.");
      return false;
    }
    return true;
  }

  async function runLegacyOrbit() {
    setLegacyOrbitErr("");
    if (!validateCommon(setLegacyOrbitErr)) return;
    if (!Number.isFinite(legacyParams.E)) {
      setLegacyOrbitErr("Energia invalida.");
      return;
    }
    if (!Number.isFinite(legacyParams.capture_radius) || legacyParams.capture_radius <= 0) {
      setLegacyOrbitErr("Raio de captura invalido. Use capture_radius > 0.");
      return;
    }
    if (!Number.isFinite(legacyParams.n) || legacyParams.n < 100) {
      setLegacyOrbitErr("Numero de pontos da orbita invalido. Use n >= 100.");
      return;
    }

    setLegacyOrbitLoading(true);
    try {
      const payload = legacyPayload(legacyParams, {
        norbit: legacyParams.norbit,
        capture_radius: legacyParams.capture_radius,
        n: legacyParams.n,
      });
      console.info("SI-NC nc-legado orbit payload", payload);
      const result = await simulateOrbitNCLegacy(payload);
      logLegacyResponse("orbit response", result);
      setLegacyTraj(result);
    } catch (error) {
      setLegacyOrbitErr(toFriendlyErrorMessage(error, API_BASE_URL, "Falha ao calcular orbita NC legado."));
      setLegacyTraj(null);
    } finally {
      setLegacyOrbitLoading(false);
    }
  }

  async function runLegacyPotential() {
    setLegacyPotentialErr("");
    if (!validateCommon(setLegacyPotentialErr)) return;
    if (!Number.isFinite(legacyParams.r_min) || legacyParams.r_min <= 0) {
      setLegacyPotentialErr("r_min invalido. Use r_min > 0.");
      return;
    }
    if (!Number.isFinite(legacyParams.n_veff) || legacyParams.n_veff < 10) {
      setLegacyPotentialErr("Numero de pontos do potencial invalido. Use n_veff >= 10.");
      return;
    }

    setLegacyPotentialLoading(true);
    try {
      const payload = legacyPayload(legacyParams, {
        r_min: legacyParams.r_min,
        n: legacyParams.n_veff,
      });
      console.info("SI-NC nc-legado potential payload", payload);
      const result = await fetchVeffNCLegacy(payload);
      logLegacyResponse("potential response", result);
      setLegacyVeff(result);
    } catch (error) {
      setLegacyPotentialErr(toFriendlyErrorMessage(error, API_BASE_URL, "Falha ao calcular potencial NC legado."));
      setLegacyVeff(null);
    } finally {
      setLegacyPotentialLoading(false);
    }
  }

  useEffect(() => {
    void runLegacyOrbit();
    void runLegacyPotential();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    legacyParams,
    legacyTraj,
    legacyVeff,
    legacyOrbitErr,
    legacyPotentialErr,
    legacyOrbitLoading,
    legacyPotentialLoading,
    setLegacyNum,
    setLegacyStr,
    setLegacyBool,
    applyLegacyPreset,
    runLegacyOrbit,
    runLegacyPotential,
  };
}
