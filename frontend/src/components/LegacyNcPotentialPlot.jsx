import { useMemo } from "react";
import Plot from "react-plotly.js";

function rangeFromValues(values, energy) {
  let ymin = Infinity;
  let ymax = -Infinity;

  for (const value of values) {
    if (!Number.isFinite(value)) continue;
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
  return {
    x: points.map((point) => point.r),
    y: points.map((point) => point.V_eff),
    type: "scatter",
    mode: "markers",
    name,
    marker: { size: 8, symbol, color },
  };
}

export function LegacyNcPotentialPlot({ legacyVeff, plotTheme, baseLayout, axisBase }) {
  const energy = legacyVeff?.meta?.energy_level ?? null;
  const criticalPoints = legacyVeff?.meta?.critical_points ?? { maxima: [], minima: [] };
  const yRange = useMemo(() => rangeFromValues(legacyVeff?.V_eff ?? [], energy), [energy, legacyVeff]);

  return (
    <article>
      <div className="programa">
        <h5>Potencial efetivo NC legado</h5>
        <div className="graf1 plot-card">
          <Plot
            data={[
              {
                x: legacyVeff?.r ?? [],
                y: legacyVeff?.V_eff ?? [],
                type: "scatter",
                mode: "lines",
                name: "V_eff legado",
              },
              {
                x: legacyVeff?.r ?? [],
                y: (legacyVeff?.r ?? []).map(() => energy),
                type: "scatter",
                mode: "lines",
                name: legacyVeff?.meta?.particle === "photon" ? "1/b^2" : "E",
              },
              criticalTrace(criticalPoints.maxima ?? [], "maximos", "triangle-up", plotTheme.accent),
              criticalTrace(criticalPoints.minima ?? [], "minimos", "triangle-down", "#10b981"),
            ]}
            layout={{
              ...baseLayout,
              title: "Potencial polinomial NC legado",
              xaxis: { title: "r", ...axisBase },
              yaxis: {
                title: "V_eff(r)",
                ...axisBase,
                range: yRange,
              },
            }}
            config={{ responsive: true, displaylogo: false }}
            useResizeHandler
            style={{ width: "100%" }}
          />
        </div>

        {legacyVeff && (
          <div className="valor">
            potencial points: <strong>{legacyVeff.r?.length ?? 0}</strong>
            {Number.isFinite(energy) ? <> | nivel: <strong>{Number(energy).toFixed(6)}</strong></> : null}
            {" | "}maximos: <strong>{criticalPoints.maxima?.length ?? 0}</strong>
            {" | "}minimos: <strong>{criticalPoints.minima?.length ?? 0}</strong>
          </div>
        )}

        <p className="note">
          Este modo usa minimo e maximo reais da curva no eixo Y; nao aplica percentis, para preservar o poco em r pequeno.
        </p>
      </div>
    </article>
  );
}
