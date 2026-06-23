import { useMemo } from "react";
import Plot from "react-plotly.js";

export function NcPotentialPlot({ ncPotential, ncVeff, plotTheme, baseLayout, axisBase }) {
  const outerHorizon = ncVeff?.meta?.r_outer_horizon ?? null;
  const massBand = 3.0 * Math.sqrt(Math.max(ncPotential.theta, 0));
  const asymptote = ncPotential.particle === "massive" ? 0.5 : 0.0;
  const potentialRange = useMemo(() => {
    const values = (ncVeff?.V_eff ?? []).filter((value) => Number.isFinite(value));
    if (!values.length) return undefined;

    const sorted = [...values].sort((a, b) => a - b);
    const at = (q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
    let ymin = at(0.02);
    let ymax = at(0.98);
    ymin = Math.min(ymin, asymptote, ncPotential.E);
    ymax = Math.max(ymax, asymptote, ncPotential.E);
    const span = Math.max(1e-6, ymax - ymin);
    const pad = 0.08 * span;

    return [ymin - pad, ymax + pad];
  }, [asymptote, ncPotential.E, ncVeff]);

  return (
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
                range: potentialRange,
              },
              shapes: [
                {
                  type: "rect",
                  x0: 0,
                  x1: massBand,
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
                  y0: asymptote,
                  y1: asymptote,
                  xref: "paper",
                  yref: "y",
                  line: { width: 1, dash: "dash", color: plotTheme.grid },
                },
                ...(Number.isFinite(outerHorizon)
                  ? [
                      {
                        type: "line",
                        x0: outerHorizon,
                        x1: outerHorizon,
                        y0: 0,
                        y1: 1,
                        xref: "x",
                        yref: "paper",
                        line: { width: 2, dash: "dot", color: plotTheme.accent },
                      },
                    ]
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
          Para orbitas reais, precisa <strong>E &gt;= V_eff(r)</strong>.
          {Number.isFinite(outerHorizon) ? (
            <> Para iniciar fora do buraco negro, use tambem <strong>r0 &gt; r+</strong>.</>
          ) : null}
        </p>
      </div>
    </article>
  );
}
