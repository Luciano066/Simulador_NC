import { useMemo } from "react";
import Plot from "react-plotly.js";

export function MaplePotentialPlot({ mapleVeff, plotTheme, baseLayout, axisBase }) {
  const energy = mapleVeff?.meta?.E ?? null;
  const outerHorizon = mapleVeff?.meta?.r_outer_horizon ?? null;
  const yRange = useMemo(() => {
    const values = (mapleVeff?.V_eff ?? []).filter((value) => Number.isFinite(value));
    if (Number.isFinite(energy)) values.push(Number(energy));
    if (!values.length) return undefined;

    const ymin = Math.min(...values);
    const ymax = Math.max(...values);
    const span = Math.max(1e-9, ymax - ymin);
    const pad = 0.08 * span;

    return [ymin - pad, ymax + pad];
  }, [energy, mapleVeff]);

  return (
    <article>
      <div className="programa">
        <h5>Potencial efetivo Maple/TCC</h5>
        <div className="graf1 plot-card">
          <Plot
            data={[
              {
                x: mapleVeff?.r ?? [],
                y: mapleVeff?.V_eff ?? [],
                type: "scatter",
                mode: "lines",
                name: "V(r)",
              },
              {
                x: mapleVeff?.r ?? [],
                y: (mapleVeff?.r ?? []).map(() => energy),
                type: "scatter",
                mode: "lines",
                name: "E",
              },
            ]}
            layout={{
              ...baseLayout,
              title: "Potencial Maple/TCC",
              xaxis: { title: "r", ...axisBase },
              yaxis: {
                title: "V(r)",
                ...axisBase,
                range: yRange,
              },
              shapes: Number.isFinite(outerHorizon)
                ? [
                    {
                      type: "line",
                      x0: outerHorizon,
                      x1: outerHorizon,
                      y0: 0,
                      y1: 1,
                      xref: "x",
                      yref: "paper",
                      line: { width: 2, dash: "dash", color: plotTheme.accent },
                    },
                  ]
                : [],
            }}
            config={{ responsive: true, displaylogo: false }}
            useResizeHandler
            style={{ width: "100%" }}
          />
        </div>

        {mapleVeff && (
          <div className="valor">
            potencial points: <strong>{mapleVeff.r?.length ?? 0}</strong>
            {Number.isFinite(energy) ? <> | E: <strong>{Number(energy).toFixed(6)}</strong></> : null}
          </div>
        )}

        <p className="note">
          Este modo usa minimo e maximo reais da curva no eixo Y, incluindo E, para preservar a queda perto de r = 0.
        </p>
      </div>
    </article>
  );
}
