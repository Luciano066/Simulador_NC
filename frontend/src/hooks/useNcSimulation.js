import { useEffect, useMemo, useState } from "react";
import { resolveApiBaseUrl } from "../api/client";
import { simulateOrbitNC } from "../api/simulate_nc";
import { fetchVeffNC } from "../api/veff_nc";
import { toFriendlyErrorMessage } from "../utils/errors";

const API_BASE_URL = resolveApiBaseUrl();

export function useNcSimulation() {
  const [ncOrbit, setNcOrbit] = useState({
    metric: "nc-schwarzschild",
    particle: "massive",
    M: 1.0,
    theta: 0.05,
    E: 0.48,
    L: 4.0,
    r0: 20.0,
    r_stop: 120.0,
    radial_sign: "in",
    turns: 6,
    n: 4000,
  });
  const [ncPotential, setNcPotential] = useState({
    metric: "nc-schwarzschild",
    particle: "massive",
    M: 0.09,
    theta: 0.001,
    E: 0.3,
    L: 0.1,
    r_min: 0.001,
    r_max: 2.0,
    n_veff: 2000,
  });
  const [ncTraj, setNcTraj] = useState(null);
  const [ncVeff, setNcVeff] = useState(null);
  const [ncOrbitErr, setNcOrbitErr] = useState("");
  const [ncPotentialErr, setNcPotentialErr] = useState("");
  const [ncOrbitLoading, setNcOrbitLoading] = useState(false);
  const [ncPotentialLoading, setNcPotentialLoading] = useState(false);

  const setNcOrbitNum = (key) => (event) => setNcOrbit((state) => ({ ...state, [key]: Number(event.target.value) }));
  const setNcOrbitStr = (key) => (event) => setNcOrbit((state) => ({ ...state, [key]: event.target.value }));
  const setNcPotentialNum = (key) => (event) => {
    setNcPotential((state) => ({ ...state, [key]: Number(event.target.value) }));
  };
  const setNcPotentialStr = (key) => (event) => setNcPotential((state) => ({ ...state, [key]: event.target.value }));

  const ncPhiMax = useMemo(() => 2 * Math.PI * Math.max(1, Math.min(20, ncOrbit.turns)), [ncOrbit.turns]);
  const ncB = ncOrbit.E !== 0 ? ncOrbit.L / ncOrbit.E : Infinity;

  function applyNcPreset(preset) {
    if (preset === "fig5") {
      setNcPotential((state) => ({
        ...state,
        particle: "massive",
        M: 0.09,
        theta: 0.001,
        E: 0.3,
        L: 0.1,
        r_min: 0.001,
        r_max: 2.0,
      }));
      return;
    }
    if (preset === "fig6") {
      setNcPotential((state) => ({
        ...state,
        particle: "massive",
        M: 0.09,
        theta: 0.001,
        E: 0.3,
        L: 0.4,
        r_min: 0.001,
        r_max: 2.0,
      }));
      return;
    }
    if (preset === "fig7") {
      setNcPotential((state) => ({
        ...state,
        particle: "photon",
        M: 0.09,
        theta: 0.001,
        E: 0.3,
        L: 0.6,
        r_min: 0.001,
        r_max: 2.0,
      }));
    }
  }

  async function runNCOrbit() {
    setNcOrbitErr("");
    if (!Number.isFinite(ncOrbit.M) || ncOrbit.M <= 0) {
      setNcOrbitErr("Massa central invalida. Use M > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.theta) || ncOrbit.theta <= 0) {
      setNcOrbitErr("Theta invalido. Use theta > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.E) || ncOrbit.E <= 0) {
      setNcOrbitErr("Energia invalida. Use E > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.L) || ncOrbit.L <= 0) {
      setNcOrbitErr("Momento angular invalido. Use L > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.r0) || ncOrbit.r0 <= 0) {
      setNcOrbitErr("Raio inicial invalido. Use r0 > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.r_stop) || ncOrbit.r_stop <= 0) {
      setNcOrbitErr("Limite de raio invalido. Use r_stop > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.n) || ncOrbit.n < 100) {
      setNcOrbitErr("Numero de pontos da orbita invalido. Use n >= 100.");
      return;
    }

    setNcOrbitLoading(true);
    try {
      const result = await simulateOrbitNC({
        metric: ncOrbit.metric,
        particle: ncOrbit.particle,
        M: ncOrbit.M,
        theta: ncOrbit.theta,
        E: ncOrbit.E,
        L: ncOrbit.L,
        r0: ncOrbit.r0,
        r_stop: ncOrbit.r_stop,
        radial_sign: ncOrbit.radial_sign,
        phi_max: ncPhiMax,
        n: ncOrbit.n,
      });
      setNcTraj(result);
    } catch (error) {
      setNcOrbitErr(toFriendlyErrorMessage(error, API_BASE_URL, "Falha ao calcular orbita NC."));
      setNcTraj(null);
    } finally {
      setNcOrbitLoading(false);
    }
  }

  async function runNCPotential() {
    setNcPotentialErr("");
    if (!Number.isFinite(ncPotential.M) || ncPotential.M <= 0) {
      setNcPotentialErr("Massa central invalida. Use M > 0.");
      return;
    }
    if (!Number.isFinite(ncPotential.theta) || ncPotential.theta <= 0) {
      setNcPotentialErr("Theta invalido. Use theta > 0.");
      return;
    }
    if (!Number.isFinite(ncPotential.E) || ncPotential.E <= 0) {
      setNcPotentialErr("Energia invalida. Use E > 0.");
      return;
    }
    if (!Number.isFinite(ncPotential.L) || ncPotential.L <= 0) {
      setNcPotentialErr("Momento angular invalido. Use L > 0.");
      return;
    }
    if (!Number.isFinite(ncPotential.n_veff) || ncPotential.n_veff < 10) {
      setNcPotentialErr("Numero de pontos do potencial invalido. Use n_veff >= 10.");
      return;
    }
    if (
      !Number.isFinite(ncPotential.r_min) ||
      !Number.isFinite(ncPotential.r_max) ||
      ncPotential.r_max <= ncPotential.r_min
    ) {
      setNcPotentialErr("Intervalo de r invalido. Ajuste r_min/r_max.");
      return;
    }

    setNcPotentialLoading(true);
    try {
      const result = await fetchVeffNC({
        metric: ncPotential.metric,
        particle: ncPotential.particle,
        M: ncPotential.M,
        theta: ncPotential.theta,
        E: ncPotential.E,
        L: ncPotential.L,
        r_min: ncPotential.r_min,
        r_max: ncPotential.r_max,
        n: ncPotential.n_veff,
      });
      setNcVeff(result);
    } catch (error) {
      setNcPotentialErr(toFriendlyErrorMessage(error, API_BASE_URL, "Falha ao calcular potencial NC."));
      setNcVeff(null);
    } finally {
      setNcPotentialLoading(false);
    }
  }

  useEffect(() => {
    void runNCOrbit();
    void runNCPotential();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ncOrbit,
    ncPotential,
    ncTraj,
    ncVeff,
    ncOrbitErr,
    ncPotentialErr,
    ncOrbitLoading,
    ncPotentialLoading,
    setNcOrbitNum,
    setNcOrbitStr,
    setNcPotentialNum,
    setNcPotentialStr,
    applyNcPreset,
    ncPhiMax,
    ncB,
    runNCOrbit,
    runNCPotential,
  };
}
