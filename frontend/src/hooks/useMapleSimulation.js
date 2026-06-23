import { useEffect, useState } from "react";
import { resolveApiBaseUrl } from "../api/client";
import { simulateOrbitNCMaple } from "../api/simulate_nc_maple";
import { fetchVeffNCMaple } from "../api/veff_nc_maple";
import { toFriendlyErrorMessage } from "../utils/errors";

const API_BASE_URL = resolveApiBaseUrl();

const PRESETS = {
  maple1: {
    metric: "nc-maple",
    m: 0.1,
    theta: 0.001,
    kappa: 0.5,
    L: 2.0,
    u0: 1.0,
    du0: 2.09862,
    phi_max: 2 * Math.PI,
    r_min: 0.1,
    r_max: 2.0,
    n: 4000,
    n_veff: 2000,
  },
  maple2: {
    metric: "nc-maple",
    m: 0.1,
    theta: 0.001,
    kappa: 0.5,
    L: 0.25,
    u0: 1.0,
    du0: 1.3,
    phi_max: 2 * Math.PI,
    r_min: 0.1,
    r_max: 2.0,
    n: 4000,
    n_veff: 2000,
  },
};

export function useMapleSimulation() {
  const [mapleParams, setMapleParams] = useState(PRESETS.maple1);
  const [mapleTraj, setMapleTraj] = useState(null);
  const [mapleVeff, setMapleVeff] = useState(null);
  const [mapleOrbitErr, setMapleOrbitErr] = useState("");
  const [maplePotentialErr, setMaplePotentialErr] = useState("");
  const [mapleOrbitLoading, setMapleOrbitLoading] = useState(false);
  const [maplePotentialLoading, setMaplePotentialLoading] = useState(false);

  const setMapleNum = (key) => (event) => {
    setMapleParams((state) => ({ ...state, [key]: Number(event.target.value) }));
  };

  function applyMaplePreset(preset) {
    setMapleParams(PRESETS[preset] ?? PRESETS.maple1);
  }

  async function runMapleOrbit() {
    setMapleOrbitErr("");
    if (!Number.isFinite(mapleParams.m) || mapleParams.m <= 0) {
      setMapleOrbitErr("Parametro m invalido. Use m > 0.");
      return;
    }
    if (!Number.isFinite(mapleParams.theta) || mapleParams.theta <= 0) {
      setMapleOrbitErr("Theta invalido. Use theta > 0.");
      return;
    }
    if (!Number.isFinite(mapleParams.kappa) || mapleParams.kappa < 0) {
      setMapleOrbitErr("Kappa invalido. Use kappa >= 0.");
      return;
    }
    if (!Number.isFinite(mapleParams.L) || mapleParams.L <= 0) {
      setMapleOrbitErr("Momento angular invalido. Use L > 0.");
      return;
    }
    if (!Number.isFinite(mapleParams.u0) || mapleParams.u0 <= 0) {
      setMapleOrbitErr("u0 invalido. Use u0 > 0.");
      return;
    }
    if (!Number.isFinite(mapleParams.du0)) {
      setMapleOrbitErr("du0 invalido.");
      return;
    }
    if (!Number.isFinite(mapleParams.phi_max) || mapleParams.phi_max <= 0) {
      setMapleOrbitErr("phi_max invalido. Use phi_max > 0.");
      return;
    }
    if (!Number.isFinite(mapleParams.n) || mapleParams.n < 100) {
      setMapleOrbitErr("Numero de pontos da orbita invalido. Use n >= 100.");
      return;
    }

    setMapleOrbitLoading(true);
    try {
      const result = await simulateOrbitNCMaple({
        metric: mapleParams.metric,
        m: mapleParams.m,
        theta: mapleParams.theta,
        kappa: mapleParams.kappa,
        L: mapleParams.L,
        u0: mapleParams.u0,
        du0: mapleParams.du0,
        phi_max: mapleParams.phi_max,
        n: mapleParams.n,
      });
      setMapleTraj(result);
    } catch (error) {
      setMapleOrbitErr(toFriendlyErrorMessage(error, API_BASE_URL, "Falha ao calcular orbita Maple/TCC."));
      setMapleTraj(null);
    } finally {
      setMapleOrbitLoading(false);
    }
  }

  async function runMaplePotential() {
    setMaplePotentialErr("");
    if (!Number.isFinite(mapleParams.r_min) || !Number.isFinite(mapleParams.r_max)) {
      setMaplePotentialErr("Intervalo de r invalido.");
      return;
    }
    if (mapleParams.r_max <= mapleParams.r_min) {
      setMaplePotentialErr("Intervalo de r invalido. Ajuste r_min/r_max.");
      return;
    }
    if (!Number.isFinite(mapleParams.n_veff) || mapleParams.n_veff < 10) {
      setMaplePotentialErr("Numero de pontos do potencial invalido. Use n_veff >= 10.");
      return;
    }

    setMaplePotentialLoading(true);
    try {
      const result = await fetchVeffNCMaple({
        metric: mapleParams.metric,
        m: mapleParams.m,
        theta: mapleParams.theta,
        kappa: mapleParams.kappa,
        L: mapleParams.L,
        u0: mapleParams.u0,
        du0: mapleParams.du0,
        r_min: mapleParams.r_min,
        r_max: mapleParams.r_max,
        n: mapleParams.n_veff,
      });
      setMapleVeff(result);
    } catch (error) {
      setMaplePotentialErr(toFriendlyErrorMessage(error, API_BASE_URL, "Falha ao calcular potencial Maple/TCC."));
      setMapleVeff(null);
    } finally {
      setMaplePotentialLoading(false);
    }
  }

  useEffect(() => {
    void runMapleOrbit();
    void runMaplePotential();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    mapleParams,
    mapleTraj,
    mapleVeff,
    mapleOrbitErr,
    maplePotentialErr,
    mapleOrbitLoading,
    maplePotentialLoading,
    setMapleNum,
    applyMaplePreset,
    runMapleOrbit,
    runMaplePotential,
  };
}
