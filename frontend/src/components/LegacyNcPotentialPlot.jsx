import { useMemo, useState } from "react";
import Plot from "react-plotly.js";

function finiteLegacyPoints(legacyVeff) {
  return (legacyVeff?.r ?? [])
    .map((r, i) => ({ r, v: legacyVeff?.V_eff?.[i] }))
    .filter((point) => Number.isFinite(point.r) && Number.isFinite(point.v));
}

function percentile(sortedValues, q) {
  if (!sortedValues.length) return null;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.floor(q * (sortedValues.length - 1))));
  return sortedValues[index];
}

function rangeFromValues(values, energy, fullScale) {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  const rangeValues = fullScale
    ? finiteValues
    : (() => {
        const sorted = [...finiteValues].sort((a, b) => a - b);
        const p01 = percentile(sorted, 0.01);
        const p99 = percentile(sorted, 0.99);
        if (!Number.isFinite(p01) || !Number.isFinite(p99)) return finiteValues;
        return finiteValues.filter((value) => value >= p01 && value <= p99);
      })();

  let ymin = Infinity;
  let ymax = -Infinity;

  for (const value of rangeValues) {
    if (value < ymin) ymin = value;
    if (value > ymax) ymax = value;
  }

  if (Number.isFinite(energy)) {
    ymin = Math.min(ymin, energy);
    ymax = Math.max(ymax, energy);
  }

  if (!Number.isFinite(ymin) || !Number.isFinite(ymax)) return undefined;
  const span = Math.max(1e-9, ymax - ymin);
  const pad = 0.08 * span;
  return [ymin - pad, ymax + pad];
}

function criticalTrace(points, name, symbol, color) {
  const finitePoints = (points ?? []).filter((point) => Number.isFinite(point.r) && Number.isFinite(point.V_eff));
  return {
    x: finitePoints.map((point) => point.r),
    y: finitePoints.map((point) => point.V_eff),
    type: "scatter",
    mode: "markers",
    name,
    marker: { size: 8, symbol, color },
  };
}

export function LegacyNcPotentialPlot({ legacyVeff, plotTheme, baseLayout, axisBase }) {
  const [showFullWell, setShowFullWell] = useState(false);
  const energy = legacyVeff?.meta?.energy_level ?? null;
  const theta = legacyVeff?.meta?.theta ?? null;
  const thetaForBand = Number.isFinite(theta) ? theta : 0;
  const massConcentrationRadius = Number.isFinite(legacyVeff?.meta?.mass_concentration_radius)
    ? legacyVeff.meta.mass_concentration_radius
    : 3.0 * Math.sqrt(Math.max(thetaForBand, 0));
  const criticalPoints = legacyVeff?.meta?.critical_points ?? { maxima: [], minima: [] };
  const points = useMemo(() => finiteLegacyPoints(legacyVeff), [legacyVeff]);
  const rValues = useMemo(() => points.map((point) => point.r), [points]);
  const vValues = useMemo(() => points.map((point) => point.v), [points]);
  const energyValues = useMemo(
    () => (Number.isFinite(energy) ? rValues.map(() => energy) : []),
    [energy, rValues],
  );
  const yRange = useMemo(() => rangeFromValues(vValues, energy, showFullWell), [energy, showFullWell, vValues]);
  const xRange = useMemo(() => {
    const finiteR = rValues.filter((value) => Number.isFinite(value));
    if (!finiteR.length && !Number.isFinite(massConcentrationRadius)) return undefined;
    const xmax = Math.max(...finiteR, Number.isFinite(massConcentrationRadius) ? massConcentrationRadius : 0);
    return [0, xmax > 0 ? xmax : 1];
  }, [massConcentrationRadius, rValues]);
  const hasPotentialData = points.length > 0;

  return (
    <article>
      <div className="programa">
        <h5>Potencial efetivo NC TCC/legado</h5>
        <label className="field inline-check">
          <input type="checkbox" checked={showFullWell} onChange={(event) => setShowFullWell(event.target.checked)} />
          Mostrar poco completo
        </label>
        <div className="graf1 plot-card">
          {hasPotentialData ? (
            <Plot
              data={[
                {
                  x: rValues,
                  y: vValues,
                  type: "scatter",
                  mode: "lines",
                  name: "V_eff legado",
                },
                {
                  x: Number.isFinite(energy) ? rValues : [],
                  y: energyValues,
                  type: "scatter",
                  mode: "lines",
                  name: legacyVeff?.meta?.energy_line_convention ?? (legacyVeff?.meta?.particle === "photon" ? "1/b^2" : "E"),
                },
                criticalTrace(criticalPoints.maxima ?? [], "maximos", "triangle-up", plotTheme.accent),
                criticalTrace(criticalPoints.minima ?? [], "minimos", "triangle-down", "#10b981"),
              ]}
              layout={{
                ...baseLayout,
                title: "Potencial polinomial NC TCC/legado",
                xaxis: { title: "r", range: xRange, ...axisBase },
                yaxis: {
                  title: "V_eff(r)",
                  ...axisBase,
                  range: yRange,
                },
                shapes: [
                  {
                    type: "rect",
                    x0: 0,
                    x1: massConcentrationRadius,
                    y0: 0,
                    y1: 1,
                    xref: "x",
                    yref: "paper",
                    layer: "below",
                    line: { width: 0 },
                    fillcolor: "rgba(96, 165, 250, 0.25)",
                  },
                  {
                    type: "line",
                    x0: massConcentrationRadius,
                    x1: massConcentrationRadius,
                    y0: 0,
                    y1: 1,
                    xref: "x",
                    yref: "paper",
                    line: { width: 2, dash: "dash", color: "rgba(37, 99, 235, 0.85)" },
                  },
                ],
                annotations: [
                  {
                    x: massConcentrationRadius / 2,
                    y: 0.96,
                    xref: "x",
                    yref: "paper",
                    text: "Maior concentração da massa",
                    showarrow: false,
                    align: "center",
                    font: { size: 11, color: plotTheme.text },
                    bgcolor: plotTheme.paper,
                    opacity: 0.82,
                    borderpad: 3,
                  },
                ],
              }}
              config={{ responsive: true, displaylogo: false }}
              useResizeHandler
              style={{ width: "100%" }}
            />
          ) : (
            <div className="empty-plot">Nenhum dado de potencial recebido ainda. Clique em Gerar Potencial NC Legado.</div>
          )}
        </div>

        {legacyVeff && hasPotentialData && (
          <div className="valor">
            potencial points: <strong>{points.length}</strong>
            {Number.isFinite(energy) ? <> | nivel: <strong>{Number(energy).toFixed(6)}</strong></> : null}
            {Number.isFinite(legacyVeff.meta?.r_min) && Number.isFinite(legacyVeff.meta?.r_max) ? (
              <> | r: <strong>{Number(legacyVeff.meta.r_min).toFixed(3)} a {Number(legacyVeff.meta.r_max).toFixed(3)}</strong></>
            ) : null}
            {Number.isFinite(legacyVeff.meta?.V_min) ? <> | V_min: <strong>{Number(legacyVeff.meta.V_min).toExponential(3)}</strong></> : null}
            {Number.isFinite(legacyVeff.meta?.V_max) ? <> | V_max: <strong>{Number(legacyVeff.meta.V_max).toExponential(3)}</strong></> : null}
            {Number.isFinite(massConcentrationRadius) ? <> | r_massa: <strong>{Number(massConcentrationRadius).toFixed(4)}</strong></> : null}
            {" | "}maximos: <strong>{criticalPoints.maxima?.length ?? 0}</strong>
            {" | "}minimos: <strong>{criticalPoints.minima?.length ?? 0}</strong>
          </div>
        )}

        <p className="note">
          {showFullWell
            ? "Escala completa: minimo e maximo reais da curva."
            : "Zoom no potencial: escala por percentis 1-99 mantendo a linha de energia visivel."}
        </p>
      </div>
    </article>
  );
}
