import Plot from "react-plotly.js";

export function PotentialPlot({
  p,
  veff,
  energyParam,
  energyLabel,
  critPoints,
  potentialStats,
  horizon,
  photonSphere,
  plotTheme,
  baseLayout,
  axisBase,
}) {
  return (
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
                ? [
                    {
                      x: critPoints.map((point) => point.r),
                      y: critPoints.map((point) => point.v),
                      type: "scatter",
                      mode: "markers",
                      name: "extremos",
                      marker: { size: 8, color: plotTheme.accent },
                    },
                  ]
                : []),
            ]}
            layout={{
              ...baseLayout,
              title: "Energia potencial efetiva",
              xaxis: { title: "r", ...axisBase },
              yaxis: {
                title: "U_eff",
                ...axisBase,
                range: p.particle === "massive" ? [-0.5, (potentialStats?.vmax ?? 0) + 0.1] : undefined,
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
          Se der &quot;sem orbita&quot;, normalmente e porque <strong>{energyLabel} &lt; U_eff(r0)</strong>{" "}
          (regiao proibida).
        </p>
      </div>
    </article>
  );
}
