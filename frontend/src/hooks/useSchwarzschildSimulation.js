import { useEffect, useMemo, useState } from "react";
import { resolveApiBaseUrl } from "../api/client";
import { simulateOrbit } from "../api/simulate";
import { fetchVeff } from "../api/veff";
import { toFriendlyErrorMessage } from "../utils/errors";

const API_BASE_URL = resolveApiBaseUrl();

const DEFAULT_PARAMS = {
  metric: "schwarzschild",
  particle: "massive",
  M: 1.0,
  E: 1.05,
  L: 4.2,
  r0: 20.0,
  radial_sign: "in",
  turns: 6,
  n: 4000,
  r_min: 2.2,
  r_max: 50.0,
  n_veff: 2000,
};

export function useSchwarzschildSimulation() {
  const [p, setP] = useState(DEFAULT_PARAMS);

  const [traj, setTraj] = useState(null);
  const [veff, setVeff] = useState(null);
  const [orbitErr, setOrbitErr] = useState("");
  const [potentialErr, setPotentialErr] = useState("");
  const [orbitLoading, setOrbitLoading] = useState(false);
  const [potentialLoading, setPotentialLoading] = useState(false);
  const [useEnergyParam, setUseEnergyParam] = useState(true);
  const [autoRange, setAutoRange] = useState(true);

  const setNum = (key) => (event) => setP((state) => ({ ...state, [key]: Number(event.target.value) }));
  const setStr = (key) => (event) => setP((state) => ({ ...state, [key]: event.target.value }));

  const phi_max = useMemo(() => 2 * Math.PI * Math.max(1, Math.min(20, p.turns)), [p.turns]);
  const horizon = 2 * p.M;
  const photonSphere = 3 * p.M;
  const useEnergyParamForMassive = useEnergyParam && p.particle === "massive";
  const E_spec = useMemo(() => {
    if (useEnergyParamForMassive) {
      const inside = 2 * p.E + 1;
      return inside > 0 ? Math.sqrt(inside) : NaN;
    }
    return p.E;
  }, [p.E, useEnergyParamForMassive]);
  const E2 = E_spec * E_spec;
  const energyParam = useMemo(() => {
    if (p.particle === "massive") {
      return useEnergyParamForMassive ? p.E : (E2 - 1) / 2;
    }
    if (!p.L) return 0;
    return (E_spec / p.L) ** 2;
  }, [E2, E_spec, p.E, p.L, p.particle, useEnergyParamForMassive]);
  const energyLabel = p.particle === "massive" ? "Ebar" : "k";
  const b = E_spec !== 0 ? p.L / E_spec : Infinity;
  const bcrit = 3 * Math.sqrt(3) * p.M;

  const potentialStats = useMemo(() => {
    if (p.particle !== "massive") return null;
    if (!Number.isFinite(p.M) || !Number.isFinite(p.L) || p.M <= 0 || p.L <= 0) return null;

    const disc = 1 - (12 * p.M * p.M) / (p.L * p.L);
    if (disc <= 0) return null;

    const sqrtDisc = Math.sqrt(disc);
    const u1 = (1 - sqrtDisc) / (6 * p.M);
    const u2 = (1 + sqrtDisc) / (6 * p.M);
    const toUeff = (u) => -p.M * u + 0.5 * (p.L * p.L) * (u * u) - p.M * p.L * p.L * (u * u * u);
    const v1 = toUeff(u1);
    const v2 = toUeff(u2);

    return {
      points: [
        { r: 1 / u1, v: v1 },
        { r: 1 / u2, v: v2 },
      ],
      vmin: Math.min(v1, v2),
      vmax: Math.max(v1, v2),
      umin: Math.min(u1, u2),
    };
  }, [p.M, p.L, p.particle]);

  const critPoints = potentialStats?.points ?? [];
  const autoRangeValues = useMemo(() => {
    const rMin = Math.max(2.05 * p.M, 2.05);
    let rMax = 30 * p.M;
    if (p.particle === "massive" && potentialStats?.umin) {
      rMax = 2 / potentialStats.umin;
    }
    return { rMin, rMax };
  }, [p.M, p.particle, potentialStats]);

  const rMinUsed = autoRange ? autoRangeValues.rMin : p.r_min;
  const rMaxUsed = autoRange ? autoRangeValues.rMax : p.r_max;
  const energyParamInvalid = useEnergyParamForMassive && p.E < -0.5;

  async function runOrbit() {
    setOrbitErr("");
    if (!Number.isFinite(p.M) || p.M <= 0) {
      setOrbitErr("Massa central invalida. Use M > 0.");
      return;
    }
    if (!Number.isFinite(p.L) || p.L <= 0) {
      setOrbitErr("Momento angular invalido. Use L > 0.");
      return;
    }
    if (energyParamInvalid || !Number.isFinite(E_spec)) {
      setOrbitErr("Energia invalida. Para corpos massivos, use Ebar >= -0.5.");
      return;
    }
    if (E_spec <= 0) {
      setOrbitErr("Energia invalida. Use E > 0.");
      return;
    }
    if (!Number.isFinite(p.r0) || p.r0 <= horizon) {
      setOrbitErr(`Raio inicial invalido. Use r0 > 2M (${horizon.toFixed(3)}).`);
      return;
    }
    if (!Number.isFinite(p.n) || p.n < 100) {
      setOrbitErr("Numero de pontos da orbita invalido. Use n >= 100.");
      return;
    }

    setOrbitLoading(true);
    try {
      const result = await simulateOrbit({
        metric: p.metric,
        particle: p.particle,
        M: p.M,
        E: E_spec,
        L: p.L,
        r0: p.r0,
        radial_sign: p.radial_sign,
        phi_max,
        n: p.n,
      });
      setTraj(result);
    } catch (error) {
      setOrbitErr(toFriendlyErrorMessage(error, API_BASE_URL, "Falha ao calcular orbita."));
      setTraj(null);
    } finally {
      setOrbitLoading(false);
    }
  }

  async function runPotential() {
    setPotentialErr("");
    if (!Number.isFinite(p.M) || p.M <= 0) {
      setPotentialErr("Massa central invalida. Use M > 0.");
      return;
    }
    if (!Number.isFinite(p.L) || p.L <= 0) {
      setPotentialErr("Momento angular invalido. Use L > 0.");
      return;
    }
    if (energyParamInvalid || !Number.isFinite(E_spec)) {
      setPotentialErr("Energia invalida. Para corpos massivos, use Ebar >= -0.5.");
      return;
    }
    if (E_spec <= 0) {
      setPotentialErr("Energia invalida. Use E > 0.");
      return;
    }
    if (!Number.isFinite(p.n_veff) || p.n_veff < 10) {
      setPotentialErr("Numero de pontos do potencial invalido. Use n_veff >= 10.");
      return;
    }
    if (!Number.isFinite(rMinUsed) || !Number.isFinite(rMaxUsed) || rMaxUsed <= rMinUsed) {
      setPotentialErr("Intervalo de r invalido. Ajuste r_min/r_max.");
      return;
    }

    setPotentialLoading(true);
    try {
      const result = await fetchVeff({
        metric: p.metric,
        particle: p.particle,
        M: p.M,
        E: E_spec,
        L: p.L,
        r_min: rMinUsed,
        r_max: rMaxUsed,
        n: p.n_veff,
      });
      setVeff(result);
    } catch (error) {
      setPotentialErr(toFriendlyErrorMessage(error, API_BASE_URL, "Falha ao calcular potencial."));
      setVeff(null);
    } finally {
      setPotentialLoading(false);
    }
  }

  function runSimulation() {
    void runOrbit();
    void runPotential();
  }

  function resetDefaults() {
    setP(DEFAULT_PARAMS);
    setUseEnergyParam(true);
    setAutoRange(true);
  }

  useEffect(() => {
    void runOrbit();
    void runPotential();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    p,
    setP,
    setNum,
    setStr,
    traj,
    veff,
    orbitErr,
    potentialErr,
    orbitLoading,
    potentialLoading,
    useEnergyParam,
    setUseEnergyParam,
    autoRange,
    setAutoRange,
    phi_max,
    horizon,
    photonSphere,
    useEnergyParamForMassive,
    energyParam,
    energyLabel,
    b,
    bcrit,
    critPoints,
    potentialStats,
    rMinUsed,
    rMaxUsed,
    runOrbit,
    runPotential,
    runSimulation,
    resetDefaults,
  };
}
