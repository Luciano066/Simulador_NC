import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { resolveApiBaseUrl } from "./api/client";
import { simulateOrbit } from "./api/simulate";
import { fetchVeff } from "./api/veff";
import { simulateOrbitNC } from "./api/simulate_nc";
import { fetchVeffNC } from "./api/veff_nc";

const API_BASE_URL = resolveApiBaseUrl();

function PlanetIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="Planeta">
      <circle cx="32" cy="32" r="16" fill="currentColor" />
      <ellipse cx="32" cy="36" rx="26" ry="8" fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

function PhotonIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="Foton">
      <circle cx="16" cy="32" r="6" fill="currentColor" />
      <path d="M26 32H56" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 20c6-6 12-6 18 0s12 6 18 0" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function downsampleXY(x, y, maxPoints = 7000) {
  const n = Math.min(x.length, y.length);
  if (n <= maxPoints) return { x, y };
  const step = Math.ceil(n / maxPoints);
  const xd = [];
  const yd = [];
  for (let i = 0; i < n; i += step) {
    xd.push(x[i]);
    yd.push(y[i]);
  }
  return { x: xd, y: yd };
}

function computeRange(x, y, padFrac = 0.08) {
  if (!x.length || !y.length) return null;
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i], yi = y[i];
    if (!Number.isFinite(xi) || !Number.isFinite(yi)) continue;
    if (xi < xmin) xmin = xi;
    if (xi > xmax) xmax = xi;
    if (yi < ymin) ymin = yi;
    if (yi > ymax) ymax = yi;
  }
  if (!Number.isFinite(xmin)) return null;
  const cx = (xmin + xmax) / 2;
  const cy = (ymin + ymax) / 2;
  const half = Math.max(xmax - xmin, ymax - ymin) / 2 || 1;
  const r = half * (1 + padFrac);
  return { xRange: [cx - r, cx + r], yRange: [cy - r, cy + r] };
}

function toFriendlyErrorMessage(error, fallback = "Não foi possível concluir a simulação.") {
  const raw = String(error?.message ?? error ?? "").trim();
  if (!raw) return fallback;

  if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) {
    return `Não foi possível conectar à API (${API_BASE_URL}). Verifique se o backend está rodando.`;
  }
  if (raw.includes("Parâmetros proibidos em r0")) {
    return "Sem órbita real para os parâmetros escolhidos. Ajuste E, L ou r0.";
  }
  if (raw.includes("r0 deve ser > 2M")) {
    return "Raio inicial inválido. Use r0 > 2M para iniciar fora do horizonte.";
  }
  if (raw.includes("r_min deve ser > 2M")) {
    return "Intervalo inválido: r_min deve ser maior que 2M.";
  }
  if (raw.includes("r0 deve ser > r_+")) {
    return "Raio inicial inválido. Use r0 maior que o horizonte externo r+.";
  }
  if (raw.includes("r_min deve ser > r_+")) {
    return "Intervalo inválido: r_min deve ser maior que o horizonte externo r+.";
  }

  return raw;
}

export default function App() {
  const [p, setP] = useState({
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
  });

  const [traj, setTraj] = useState(null);
  const [veff, setVeff] = useState(null);
  const [orbitErr, setOrbitErr] = useState("");
  const [potentialErr, setPotentialErr] = useState("");
  const [orbitLoading, setOrbitLoading] = useState(false);
  const [potentialLoading, setPotentialLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [useEnergyParam, setUseEnergyParam] = useState(true);
  const [autoRange, setAutoRange] = useState(true);
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

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  const setNum = (k) => (e) => setP((s) => ({ ...s, [k]: Number(e.target.value) }));
  const setStr = (k) => (e) => setP((s) => ({ ...s, [k]: e.target.value }));
  const setNcOrbitNum = (k) => (e) => setNcOrbit((s) => ({ ...s, [k]: Number(e.target.value) }));
  const setNcOrbitStr = (k) => (e) => setNcOrbit((s) => ({ ...s, [k]: e.target.value }));
  const setNcPotentialNum = (k) => (e) => setNcPotential((s) => ({ ...s, [k]: Number(e.target.value) }));
  const setNcPotentialStr = (k) => (e) => setNcPotential((s) => ({ ...s, [k]: e.target.value }));
  const applyNcPreset = (preset) => {
    if (preset === "fig5") {
      setNcPotential((s) => ({
        ...s,
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
      setNcPotential((s) => ({
        ...s,
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
      setNcPotential((s) => ({
        ...s,
        particle: "photon",
        M: 0.09,
        theta: 0.001,
        E: 0.3,
        L: 0.6,
        r_min: 0.001,
        r_max: 2.0,
      }));
    }
  };

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
  const energyLabel = p.particle === "massive" ? "Ē" : "k";
  const b = E_spec !== 0 ? (p.L / E_spec) : Infinity;
  const bcrit = 3 * Math.sqrt(3) * p.M;

  const potentialStats = useMemo(() => {
    if (p.particle !== "massive") return null;
    if (!Number.isFinite(p.M) || !Number.isFinite(p.L) || p.M <= 0 || p.L <= 0) return null;
    const disc = 1 - (12 * p.M * p.M) / (p.L * p.L);
    if (disc <= 0) return null;
    const sqrtDisc = Math.sqrt(disc);
    const u1 = (1 - sqrtDisc) / (6 * p.M);
    const u2 = (1 + sqrtDisc) / (6 * p.M);
    const toUeff = (u) => (-p.M * u) + 0.5 * (p.L * p.L) * (u * u) - (p.M * p.L * p.L) * (u * u * u);
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
  const ncPhiMax = useMemo(() => 2 * Math.PI * Math.max(1, Math.min(20, ncOrbit.turns)), [ncOrbit.turns]);
  const ncB = ncOrbit.E !== 0 ? (ncOrbit.L / ncOrbit.E) : Infinity;

  const plotTheme = useMemo(() => {
    if (darkMode) {
      return {
        paper: "#181F2F",
        plot: "#181F2F",
        grid: "#353549",
        text: "#ffffff",
        accent: "#FFC700",
        horizonFill: "rgba(255,255,255,0.08)",
      };
    }
    return {
      paper: "#f6f6f6",
      plot: "#f6f6f6",
      grid: "#c1bfbf",
      text: "#000000",
      accent: "#ffdb57",
      horizonFill: "rgba(0,0,0,0.08)",
    };
  }, [darkMode]);

  async function runOrbit() {
    setOrbitErr("");
    if (!Number.isFinite(p.M) || p.M <= 0) {
      setOrbitErr("Massa central inválida. Use M > 0.");
      return;
    }
    if (!Number.isFinite(p.L) || p.L <= 0) {
      setOrbitErr("Momento angular inválido. Use L > 0.");
      return;
    }
    if (energyParamInvalid || !Number.isFinite(E_spec)) {
      setOrbitErr("Energia inválida. Para corpos massivos, use Ē ≥ -0.5.");
      return;
    }
    if (E_spec <= 0) {
      setOrbitErr("Energia inválida. Use E > 0.");
      return;
    }
    if (!Number.isFinite(p.r0) || p.r0 <= horizon) {
      setOrbitErr(`Raio inicial inválido. Use r0 > 2M (${horizon.toFixed(3)}).`);
      return;
    }
    if (!Number.isFinite(p.n) || p.n < 100) {
      setOrbitErr("Número de pontos da órbita inválido. Use n >= 100.");
      return;
    }

    setOrbitLoading(true);
    try {
      const t = await simulateOrbit({
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
      setTraj(t);
    } catch (e) {
      setOrbitErr(toFriendlyErrorMessage(e, "Falha ao calcular órbita."));
      setTraj(null);
    } finally {
      setOrbitLoading(false);
    }
  }

  async function runPotential() {
    setPotentialErr("");
    if (!Number.isFinite(p.M) || p.M <= 0) {
      setPotentialErr("Massa central inválida. Use M > 0.");
      return;
    }
    if (!Number.isFinite(p.L) || p.L <= 0) {
      setPotentialErr("Momento angular inválido. Use L > 0.");
      return;
    }
    if (energyParamInvalid || !Number.isFinite(E_spec)) {
      setPotentialErr("Energia inválida. Para corpos massivos, use Ē ≥ -0.5.");
      return;
    }
    if (E_spec <= 0) {
      setPotentialErr("Energia inválida. Use E > 0.");
      return;
    }
    if (!Number.isFinite(p.n_veff) || p.n_veff < 10) {
      setPotentialErr("Número de pontos do potencial inválido. Use n_veff >= 10.");
      return;
    }
    if (!Number.isFinite(rMinUsed) || !Number.isFinite(rMaxUsed) || rMaxUsed <= rMinUsed) {
      setPotentialErr("Intervalo de r inválido. Ajuste r_min/r_max.");
      return;
    }

    setPotentialLoading(true);
    try {
      const v = await fetchVeff({
        metric: p.metric,
        particle: p.particle,
        M: p.M,
        E: E_spec,
        L: p.L,
        r_min: rMinUsed,
        r_max: rMaxUsed,
        n: p.n_veff,
      });
      setVeff(v);
    } catch (e) {
      setPotentialErr(toFriendlyErrorMessage(e, "Falha ao calcular potencial."));
      setVeff(null);
    } finally {
      setPotentialLoading(false);
    }
  }

  async function runNCOrbit() {
    setNcOrbitErr("");
    if (!Number.isFinite(ncOrbit.M) || ncOrbit.M <= 0) {
      setNcOrbitErr("Massa central inválida. Use M > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.theta) || ncOrbit.theta <= 0) {
      setNcOrbitErr("Theta inválido. Use θ > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.E) || ncOrbit.E <= 0) {
      setNcOrbitErr("Energia inválida. Use E > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.L) || ncOrbit.L <= 0) {
      setNcOrbitErr("Momento angular inválido. Use L > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.r0) || ncOrbit.r0 <= 0) {
      setNcOrbitErr("Raio inicial inválido. Use r0 > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.r_stop) || ncOrbit.r_stop <= 0) {
      setNcOrbitErr("Limite de raio inválido. Use r_stop > 0.");
      return;
    }
    if (!Number.isFinite(ncOrbit.n) || ncOrbit.n < 100) {
      setNcOrbitErr("Número de pontos da órbita inválido. Use n >= 100.");
      return;
    }

    setNcOrbitLoading(true);
    try {
      const t = await simulateOrbitNC({
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
      setNcTraj(t);
    } catch (e) {
      setNcOrbitErr(toFriendlyErrorMessage(e, "Falha ao calcular órbita NC."));
      setNcTraj(null);
    } finally {
      setNcOrbitLoading(false);
    }
  }

  async function runNCPotential() {
    setNcPotentialErr("");
    if (!Number.isFinite(ncPotential.M) || ncPotential.M <= 0) {
      setNcPotentialErr("Massa central inválida. Use M > 0.");
      return;
    }
    if (!Number.isFinite(ncPotential.theta) || ncPotential.theta <= 0) {
      setNcPotentialErr("Theta inválido. Use θ > 0.");
      return;
    }
    if (!Number.isFinite(ncPotential.E) || ncPotential.E <= 0) {
      setNcPotentialErr("Energia inválida. Use E > 0.");
      return;
    }
    if (!Number.isFinite(ncPotential.L) || ncPotential.L <= 0) {
      setNcPotentialErr("Momento angular inválido. Use L > 0.");
      return;
    }
    if (!Number.isFinite(ncPotential.n_veff) || ncPotential.n_veff < 10) {
      setNcPotentialErr("Número de pontos do potencial inválido. Use n_veff >= 10.");
      return;
    }
    if (
      !Number.isFinite(ncPotential.r_min) ||
      !Number.isFinite(ncPotential.r_max) ||
      ncPotential.r_max <= ncPotential.r_min
    ) {
      setNcPotentialErr("Intervalo de r inválido. Ajuste r_min/r_max.");
      return;
    }

    setNcPotentialLoading(true);
    try {
      const v = await fetchVeffNC({
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
      setNcVeff(v);
    } catch (e) {
      setNcPotentialErr(toFriendlyErrorMessage(e, "Falha ao calcular potencial NC."));
      setNcVeff(null);
    } finally {
      setNcPotentialLoading(false);
    }
  }

  function runAll() {
    void runOrbit();
    void runPotential();
  }

  function runNCAll() {
    void runNCOrbit();
    void runNCPotential();
  }

  useEffect(() => {
    runAll();
    runNCAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const xRaw = traj?.x ?? [];
  const yRaw = traj?.y ?? [];
  const { x: xPlot, y: yPlot } = downsampleXY(xRaw, yRaw, 7000);
  const ranges = computeRange(xPlot, yPlot);

  const x0 = xPlot?.[0], y0 = yPlot?.[0];
  const xF = xPlot?.[xPlot.length - 1], yF = yPlot?.[yPlot.length - 1];

  const ncXRaw = ncTraj?.x ?? [];
  const ncYRaw = ncTraj?.y ?? [];
  const { x: ncXPlot, y: ncYPlot } = downsampleXY(ncXRaw, ncYRaw, 7000);
  const ncRanges = computeRange(ncXPlot, ncYPlot);
  const ncX0 = ncXPlot?.[0], ncY0 = ncYPlot?.[0];
  const ncXF = ncXPlot?.[ncXPlot.length - 1], ncYF = ncYPlot?.[ncYPlot.length - 1];
  const ncOrbitOuterHorizon = ncTraj?.meta?.r_outer_horizon ?? null;
  const ncPotentialOuterHorizon = ncVeff?.meta?.r_outer_horizon ?? null;
  const ncMassBand = 3.0 * Math.sqrt(Math.max(ncPotential.theta, 0));
  const ncAsymptote = ncPotential.particle === "massive" ? 0.5 : 0.0;
  const ncPotentialRange = useMemo(() => {
    const values = (ncVeff?.V_eff ?? []).filter((v) => Number.isFinite(v));
    if (!values.length) return undefined;
    const sorted = [...values].sort((a, b) => a - b);
    const at = (q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
    let ymin = at(0.02);
    let ymax = at(0.98);
    ymin = Math.min(ymin, ncAsymptote, ncPotential.E);
    ymax = Math.max(ymax, ncAsymptote, ncPotential.E);
    const span = Math.max(1e-6, ymax - ymin);
    const pad = 0.08 * span;
    return [ymin - pad, ymax + pad];
  }, [ncVeff, ncAsymptote, ncPotential.E]);

  const baseLayout = {
    paper_bgcolor: plotTheme.paper,
    plot_bgcolor: plotTheme.plot,
    font: { family: "Roboto, sans-serif", color: plotTheme.text },
    height: 520,
    margin: { l: 60, r: 30, t: 50, b: 50 },
    colorway: [plotTheme.accent, "#4f8cc9", "#10b981"],
  };

  const axisBase = {
    gridcolor: plotTheme.grid,
    zerolinecolor: plotTheme.grid,
    linecolor: plotTheme.grid,
    tickfont: { color: plotTheme.text },
    titlefont: { color: plotTheme.text },
  };

  return (
    <div className="page">
      <button className="botao" onClick={() => setDarkMode((v) => !v)} aria-label="Alternar modo">
        <span>{darkMode ? "LIGHT" : "DARK"}</span>
      </button>

      <header className="hero">
        <h1>ÓRBITAS<br />RELATIVÍSTICAS</h1>
        <p className="subtitle">
          Simulador interativo para comparar trajetórias relativísticas e potencial efetivo.
        </p>
      </header>

      <div className="menu">
        <button
          type="button"
          className={`card ${p.particle === "massive" ? "selected" : ""}`}
          onClick={() => setP((s) => ({ ...s, particle: "massive" }))}
        >
          <h2>Órbitas de<br /><strong>corpos<br />massivos</strong></h2>
          <PlanetIcon className="icons" />
        </button>

        <button
          type="button"
          className={`card ${p.particle === "photon" ? "selected" : ""}`}
          onClick={() => setP((s) => ({ ...s, particle: "photon" }))}
        >
          <h2>Órbitas de<br /><strong>raios<br />de luz</strong></h2>
          <PhotonIcon className="icons" />
        </button>
      </div>

      <div className="meta-row">
        <label className="field">
          <span>Modo do site (Ē)</span>
          <input
            type="checkbox"
            checked={useEnergyParam}
            onChange={(e) => setUseEnergyParam(e.target.checked)}
          />
        </label>
        <label className="field">
          <span>Auto r_min/r_max</span>
          <input
            type="checkbox"
            checked={autoRange}
            onChange={(e) => setAutoRange(e.target.checked)}
          />
        </label>
      </div>

      <article>
        <div className="programa">
          <h5>1. Ajuste os parâmetros da órbita</h5>
          <div className="input">
            <div className="input-grid">
              <label className="field">
                Massa central (M)
                <input className="css-input" type="number" step="0.1" value={p.M} onChange={setNum("M")} />
              </label>

              <label className="field">
                Energia {useEnergyParamForMassive ? "(Ē)" : "(E)"}
                <input className="css-input" type="number" step="0.01" value={p.E} onChange={setNum("E")} />
                {useEnergyParamForMassive && (
                  <small>Ē = (E² − 1)/2</small>
                )}
              </label>

              <label className="field">
                Momento angular (L)
                <input className="css-input" type="number" step="0.1" value={p.L} onChange={setNum("L")} />
                <small>Para fóton, b = L / E</small>
              </label>

              <label className="field">
                Raio inicial (r0)
                <input className="css-input" type="number" step="0.1" value={p.r0} onChange={setNum("r0")} />
              </label>

              <label className="field">
                Direção radial
                <select className="css-input" value={p.radial_sign} onChange={setStr("radial_sign")}>
                  <option value="in">in (cair)</option>
                  <option value="out">out (sair)</option>
                </select>
              </label>

              <label className="field">
                Voltas (1–20)
                <input className="css-input" type="number" min="1" max="20" step="1" value={p.turns} onChange={setNum("turns")} />
              </label>

              <label className="field">
                Pontos da órbita (n)
                <input className="css-input" type="number" step="100" value={p.n} onChange={setNum("n")} />
              </label>

              <label className="field">
                r_min (Veff)
                <input
                  className="css-input"
                  type="number"
                  step="0.1"
                  value={autoRange ? rMinUsed : p.r_min}
                  onChange={setNum("r_min")}
                  disabled={autoRange}
                />
              </label>

              <label className="field">
                r_max (Veff)
                <input
                  className="css-input"
                  type="number"
                  step="1"
                  value={autoRange ? rMaxUsed : p.r_max}
                  onChange={setNum("r_max")}
                  disabled={autoRange}
                />
              </label>

              <label className="field">
                Pontos Veff (n)
                <input className="css-input" type="number" step="100" value={p.n_veff} onChange={setNum("n_veff")} />
              </label>
            </div>
          </div>

          <button onClick={runOrbit} disabled={orbitLoading} className="click">
            {orbitLoading ? "Calculando órbita..." : "Gerar Órbita"}
          </button>
          <button onClick={runPotential} disabled={potentialLoading} className="click">
            {potentialLoading ? "Calculando potencial..." : "Gerar Potencial"}
          </button>

          <div className="valor">
            φ_max = <strong>{phi_max.toFixed(3)}</strong> rad (turns = {p.turns}) | b = L/E =
            <strong> {Number.isFinite(b) ? b.toFixed(3) : "∞"}</strong>
            {p.particle === "massive" && (
              <> | Ē = <strong>{Number.isFinite(energyParam) ? energyParam.toFixed(3) : "—"}</strong></>
            )}
            {p.particle === "photon" && (
              <> | b_crit ≈ <strong>{bcrit.toFixed(3)}</strong></>
            )}
          </div>

          {orbitErr && <pre className="error">Órbita: {orbitErr}</pre>}
          {potentialErr && <pre className="error">Potencial: {potentialErr}</pre>}
        </div>
      </article>

      <article>
        <div className="programa" id="titulo2">
          <h5>Gráfico da Órbita</h5>
          <div className="graf1 plot-card">
            <Plot
              data={[
                {
                  x: xPlot,
                  y: yPlot,
                  type: "scatter",
                  mode: "lines",
                  name: "trajetória",
                  line: { color: plotTheme.accent, width: 2 },
                },
                {
                  x: Number.isFinite(x0) ? [x0] : [],
                  y: Number.isFinite(y0) ? [y0] : [],
                  type: "scatter",
                  mode: "markers",
                  name: "início",
                  marker: { size: 8, color: plotTheme.text },
                },
                {
                  x: Number.isFinite(xF) ? [xF] : [],
                  y: Number.isFinite(yF) ? [yF] : [],
                  type: "scatter",
                  mode: "markers",
                  name: "fim",
                  marker: { size: 9, symbol: "x", color: plotTheme.text },
                },
                {
                  x: [0],
                  y: [0],
                  type: "scatter",
                  mode: "markers",
                  name: "BH",
                  marker: { size: 10, color: plotTheme.text },
                },
              ]}
              layout={{
                ...baseLayout,
                title: "Trajetória (x,y)",
                xaxis: { title: "x", range: ranges?.xRange, ...axisBase },
                yaxis: { title: "y", scaleanchor: "x", range: ranges?.yRange, ...axisBase },
                hovermode: "closest",
                uirevision: "keep-zoom",
                shapes: [
                  {
                    type: "circle",
                    xref: "x",
                    yref: "y",
                    x0: -horizon,
                    y0: -horizon,
                    x1: horizon,
                    y1: horizon,
                    line: { width: 2, dash: "dot", color: plotTheme.accent },
                    fillcolor: plotTheme.horizonFill,
                  },
                  {
                    type: "circle",
                    xref: "x",
                    yref: "y",
                    x0: -photonSphere,
                    y0: -photonSphere,
                    x1: photonSphere,
                    y1: photonSphere,
                    line: { width: 1, dash: "dash", color: plotTheme.grid },
                  },
                ],
              }}
              config={{ responsive: true, displaylogo: false }}
              useResizeHandler
              style={{ width: "100%" }}
            />
          </div>

          {traj?.meta && (
            <div className="valor">
              points_returned: <strong>{traj.meta.points_returned}</strong> | captured:
              <strong> {String(traj.meta.captured)}</strong>
            </div>
          )}

          <p className="note">
            Horizonte (2M) sombreado; esfera de fótons (3M) tracejada; início/fim marcados.
          </p>
        </div>
      </article>

      <article>
        <div className="programa">
          <h5>Energia potencial efetiva</h5>
          <div className="graf1 plot-card">
            <Plot
              data={[
                {
                  x: veff?.r ?? [],
                  y: veff?.U_eff ?? veff?.V_eff2 ?? [],
                  type: "scatter",
                  mode: "lines",
                  name: "U_eff(r)",
                },
                {
                  x: veff?.r ?? [],
                  y: (veff?.r ?? []).map(() => energyParam),
                  type: "scatter",
                  mode: "lines",
                  name: energyLabel,
                },
                ...(critPoints.length
                  ? [{
                      x: critPoints.map((point) => point.r),
                      y: critPoints.map((point) => point.v),
                      type: "scatter",
                      mode: "markers",
                      name: "extremos",
                      marker: { size: 8, color: plotTheme.accent },
                    }]
                  : []),
              ]}
              layout={{
                ...baseLayout,
                title: "Energia potencial efetiva",
                xaxis: { title: "r", ...axisBase },
                yaxis: {
                  title: "U_eff",
                  ...axisBase,
                  range: p.particle === "massive"
                    ? [
                        -0.5,
                        (potentialStats?.vmax ?? 0) + 0.1,
                      ]
                    : undefined,
                },
                shapes: [
                  {
                    type: "line",
                    x0: horizon,
                    x1: horizon,
                    y0: 0,
                    y1: 1,
                    xref: "x",
                    yref: "paper",
                    line: { width: 2, dash: "dot", color: plotTheme.accent },
                  },
                  {
                    type: "line",
                    x0: photonSphere,
                    x1: photonSphere,
                    y0: 0,
                    y1: 1,
                    xref: "x",
                    yref: "paper",
                    line: { width: 1, dash: "dash", color: plotTheme.grid },
                  },
                ],
              }}
              config={{ responsive: true, displaylogo: false }}
              useResizeHandler
              style={{ width: "100%" }}
            />
          </div>

          {veff && (
            <div className="valor">
              potencial points: <strong>{veff.r?.length ?? 0}</strong>
              {veff.meta?.n ? <> | n: <strong>{veff.meta.n}</strong></> : null}
            </div>
          )}

          <p className="note">
            Se der “sem órbita”, normalmente é porque <strong>{energyLabel} &lt; U_eff(r0)</strong> (região proibida).
          </p>
        </div>
      </article>

      <article>
        <div className="programa">
          <h5>Buraco negro não comutativo (NCSBH)</h5>
          <p className="note">
            Modelo com massa efetiva m(r) espalhada por θ. Use θ &gt; 0 (unidades de L²).
            Órbita e potencial usam parâmetros independentes para evitar conflito entre os gráficos.
          </p>
          <h5>Parâmetros da órbita NC</h5>
          <div className="input">
            <div className="input-grid">
              <label className="field">
                Tipo
                <select className="css-input" value={ncOrbit.particle} onChange={setNcOrbitStr("particle")}>
                  <option value="massive">Corpo massivo</option>
                  <option value="photon">Fóton</option>
                </select>
              </label>

              <label className="field">
                Massa (M)
                <input className="css-input" type="number" step="0.1" value={ncOrbit.M} onChange={setNcOrbitNum("M")} />
              </label>

              <label className="field">
                Parâmetro θ
                <input className="css-input" type="number" step="0.1" value={ncOrbit.theta} onChange={setNcOrbitNum("theta")} />
                <small>θ controla o espalhamento</small>
              </label>

              <label className="field">
                Energia (E)
                <input className="css-input" type="number" step="0.01" value={ncOrbit.E} onChange={setNcOrbitNum("E")} />
              </label>

              <label className="field">
                Momento angular (L)
                <input className="css-input" type="number" step="0.1" value={ncOrbit.L} onChange={setNcOrbitNum("L")} />
              </label>

              <label className="field">
                Raio inicial (r0)
                <input className="css-input" type="number" step="0.1" value={ncOrbit.r0} onChange={setNcOrbitNum("r0")} />
              </label>

              <label className="field">
                Limite de fuga (r_stop)
                <input className="css-input" type="number" step="1" value={ncOrbit.r_stop} onChange={setNcOrbitNum("r_stop")} />
                <small>Encerra a órbita quando r cresce demais</small>
              </label>

              <label className="field">
                Direção radial
                <select className="css-input" value={ncOrbit.radial_sign} onChange={setNcOrbitStr("radial_sign")}>
                  <option value="in">in (cair)</option>
                  <option value="out">out (sair)</option>
                </select>
              </label>

              <label className="field">
                Voltas (1–20)
                <input className="css-input" type="number" min="1" max="20" step="1" value={ncOrbit.turns} onChange={setNcOrbitNum("turns")} />
              </label>

              <label className="field">
                Pontos da órbita (n)
                <input className="css-input" type="number" step="100" value={ncOrbit.n} onChange={setNcOrbitNum("n")} />
              </label>
            </div>
          </div>

          <h5>Parâmetros do potencial NC</h5>
          <p className="note">
            Presets abaixo reproduzem o comportamento qualitativo das Figuras 5, 6 e 7 do TCC.
          </p>
          <div className="input">
            <div className="input-grid">
              <label className="field">
                Tipo
                <select className="css-input" value={ncPotential.particle} onChange={setNcPotentialStr("particle")}>
                  <option value="massive">Corpo massivo</option>
                  <option value="photon">Fóton</option>
                </select>
              </label>

              <label className="field">
                Massa (M)
                <input className="css-input" type="number" step="0.1" value={ncPotential.M} onChange={setNcPotentialNum("M")} />
              </label>

              <label className="field">
                Parâmetro θ
                <input className="css-input" type="number" step="0.1" value={ncPotential.theta} onChange={setNcPotentialNum("theta")} />
              </label>

              <label className="field">
                Energia (E)
                <input className="css-input" type="number" step="0.01" value={ncPotential.E} onChange={setNcPotentialNum("E")} />
              </label>

              <label className="field">
                Momento angular (L)
                <input className="css-input" type="number" step="0.1" value={ncPotential.L} onChange={setNcPotentialNum("L")} />
              </label>

              <label className="field">
                r_min (Veff)
                <input className="css-input" type="number" step="0.001" value={ncPotential.r_min} onChange={setNcPotentialNum("r_min")} />
              </label>

              <label className="field">
                r_max (Veff)
                <input className="css-input" type="number" step="0.1" value={ncPotential.r_max} onChange={setNcPotentialNum("r_max")} />
              </label>

              <label className="field">
                Pontos Veff (n)
                <input className="css-input" type="number" step="100" value={ncPotential.n_veff} onChange={setNcPotentialNum("n_veff")} />
              </label>
            </div>
          </div>

          <button onClick={runNCOrbit} disabled={ncOrbitLoading} className="click">
            {ncOrbitLoading ? "Calculando órbita NC..." : "Gerar Órbita NC"}
          </button>
          <button onClick={runNCPotential} disabled={ncPotentialLoading} className="click">
            {ncPotentialLoading ? "Calculando potencial NC..." : "Gerar Potencial NC"}
          </button>
          <button onClick={() => applyNcPreset("fig5")} className="click">
            Preset Fig. 5
          </button>
          <button onClick={() => applyNcPreset("fig6")} className="click">
            Preset Fig. 6
          </button>
          <button onClick={() => applyNcPreset("fig7")} className="click">
            Preset Fig. 7
          </button>

          <div className="valor">
            órbita: φ_max = <strong>{ncPhiMax.toFixed(3)}</strong> rad (turns = {ncOrbit.turns}) | b = L/E =
            <strong> {Number.isFinite(ncB) ? ncB.toFixed(3) : "∞"}</strong>
          </div>

          {ncOrbitErr && <pre className="error">Órbita NC: {ncOrbitErr}</pre>}
          {ncPotentialErr && <pre className="error">Potencial NC: {ncPotentialErr}</pre>}
        </div>
      </article>

      <article>
        <div className="programa">
          <h5>Órbita não comutativa</h5>
          <div className="graf1 plot-card">
            <Plot
              data={[
                {
                  x: ncXPlot,
                  y: ncYPlot,
                  type: "scatter",
                  mode: "lines",
                  name: "trajetória",
                  line: { color: plotTheme.accent, width: 2 },
                },
                {
                  x: Number.isFinite(ncX0) ? [ncX0] : [],
                  y: Number.isFinite(ncY0) ? [ncY0] : [],
                  type: "scatter",
                  mode: "markers",
                  name: "início",
                  marker: { size: 8, color: plotTheme.text },
                },
                {
                  x: Number.isFinite(ncXF) ? [ncXF] : [],
                  y: Number.isFinite(ncYF) ? [ncYF] : [],
                  type: "scatter",
                  mode: "markers",
                  name: "fim",
                  marker: { size: 9, symbol: "x", color: plotTheme.text },
                },
                {
                  x: [0],
                  y: [0],
                  type: "scatter",
                  mode: "markers",
                  name: "BH",
                  marker: { size: 10, color: plotTheme.text },
                },
              ]}
              layout={{
                ...baseLayout,
                title: "Trajetória (x,y) — NC",
                xaxis: { title: "x", range: ncRanges?.xRange, ...axisBase },
                yaxis: { title: "y", scaleanchor: "x", range: ncRanges?.yRange, ...axisBase },
                hovermode: "closest",
                uirevision: "keep-zoom",
                shapes: Number.isFinite(ncOrbitOuterHorizon)
                  ? [{
                      type: "circle",
                      xref: "x",
                      yref: "y",
                      x0: -ncOrbitOuterHorizon,
                      y0: -ncOrbitOuterHorizon,
                      x1: ncOrbitOuterHorizon,
                      y1: ncOrbitOuterHorizon,
                      line: { width: 2, dash: "dot", color: plotTheme.accent },
                      fillcolor: plotTheme.horizonFill,
                    }]
                  : [],
              }}
              config={{ responsive: true, displaylogo: false }}
              useResizeHandler
              style={{ width: "100%" }}
            />
          </div>

          {ncTraj?.meta && (
            <div className="valor">
              points_returned: <strong>{ncTraj.meta.points_returned}</strong>
              {" | "}captured: <strong>{String(Boolean(ncTraj.meta.captured))}</strong>
              {" | "}clipped_by_r_stop: <strong>{String(Boolean(ncTraj.meta.clipped_by_r_stop))}</strong>
              {" | "}has_horizon: <strong>{String(Boolean(ncTraj.meta.has_horizon))}</strong>
              {Number.isFinite(ncOrbitOuterHorizon) ? (
                <>{" | "}r+ = <strong>{Number(ncOrbitOuterHorizon).toFixed(3)}</strong></>
              ) : null}
            </div>
          )}
          <p className="note">
            Para partícula massiva, quando <strong>E ≥ 0.5</strong> a órbita tende a escapar.
            O parâmetro <strong>r_stop</strong> corta a trajetória de fuga para manter o gráfico legível.
          </p>
        </div>
      </article>

      <article>
        <div className="programa">
          <h5>Potencial efetivo (NC)</h5>
          <div className="graf1 plot-card">
            <Plot
              data={[
                {
                  x: ncVeff?.r ?? [],
                  y: ncVeff?.V_eff ?? [],
                  type: "scatter",
                  mode: "lines",
                  name: "V_eff(r)",
                },
                {
                  x: ncVeff?.r ?? [],
                  y: (ncVeff?.r ?? []).map(() => ncPotential.E),
                  type: "scatter",
                  mode: "lines",
                  name: "E",
                },
              ]}
              layout={{
                ...baseLayout,
                title: "Potencial efetivo (NCSBH)",
                xaxis: { title: "r", ...axisBase },
                yaxis: {
                  title: "V_eff",
                  ...axisBase,
                  range: ncPotentialRange,
                },
                shapes: [
                  {
                    type: "rect",
                    x0: 0,
                    x1: ncMassBand,
                    y0: 0,
                    y1: 1,
                    xref: "x",
                    yref: "paper",
                    line: { width: 0 },
                    fillcolor: "rgba(80, 140, 230, 0.18)",
                  },
                  {
                    type: "line",
                    x0: 0,
                    x1: 1,
                    y0: ncAsymptote,
                    y1: ncAsymptote,
                    xref: "paper",
                    yref: "y",
                    line: { width: 1, dash: "dash", color: plotTheme.grid },
                  },
                  ...(Number.isFinite(ncPotentialOuterHorizon)
                    ? [{
                        type: "line",
                        x0: ncPotentialOuterHorizon,
                        x1: ncPotentialOuterHorizon,
                        y0: 0,
                        y1: 1,
                        xref: "x",
                        yref: "paper",
                        line: { width: 2, dash: "dot", color: plotTheme.accent },
                      }]
                    : []),
                ],
              }}
              config={{ responsive: true, displaylogo: false }}
              useResizeHandler
              style={{ width: "100%" }}
            />
          </div>

          {ncVeff && (
            <div className="valor">
              potencial points: <strong>{ncVeff.r?.length ?? 0}</strong>
              {ncVeff.meta?.n ? <> | n: <strong>{ncVeff.meta.n}</strong></> : null}
            </div>
          )}

          <p className="note">
            Para órbitas reais, precisa <strong>E ≥ V_eff(r)</strong>.
            {Number.isFinite(ncPotentialOuterHorizon) ? (
              <> Para iniciar fora do buraco negro, use também <strong>r0 &gt; r+</strong>.</>
            ) : null}
          </p>
        </div>
      </article>
    </div>
  );
}
