import Plot from "react-plotly.js";
import { computeRange, downsampleXY } from "../utils/plot";

function filterMapleOrbit(traj) {
  const phi = traj?.phi ?? [];
  const r = traj?.r ?? [];
  const u = traj?.u ?? [];
  const x = [];
  const y = [];

  for (let index = 0; index < Math.min(phi.length, r.length, u.length); index += 1) {
    const phiValue = phi[index];
    const rValue = r[index];
    const uValue = u[index];
    if (!Number.isFinite(phiValue) || !Number.isFinite(rValue) || !Number.isFinite(uValue)) continue;
    if (rValue < 0.1 || rValue > 3.0) continue;
    if (uValue < 1.0 || uValue > 10.0) continue;

    x.push(rValue * Math.cos(phiValue));
    y.push(rValue * Math.sin(phiValue));
  }

  return { x, y };
}

export function MapleOrbitPlot({ mapleTraj, plotTheme, baseLayout, axisBase }) {
  const filtered = filterMapleOrbit(mapleTraj);
  const { x: xPlot, y: yPlot } = downsampleXY(filtered.x, filtered.y, 7000);
  const ranges = computeRange(xPlot, yPlot, 0.12);
  const outerHorizon = mapleTraj?.meta?.r_outer_horizon ?? null;

  const referenceShapes = [
    {
      type: "circle",
      xref: "x",
      yref: "y",
      x0: -0.1,
      y0: -0.1,
      x1: 0.1,
      y1: 0.1,
      line: { width: 2, dash: "dot", color: plotTheme.grid },
      fillcolor: "rgba(80, 140, 230, 0.12)",
    },
    ...(Number.isFinite(outerHorizon)
      ? [
          {
            type: "circle",
            xref: "x",
            yref: "y",
            x0: -outerHorizon,
            y0: -outerHorizon,
            x1: outerHorizon,
            y1: outerHorizon,
            line: { width: 2, dash: "dash", color: plotTheme.accent },
            fillcolor: plotTheme.horizonFill,
          },
        ]
      : []),
  ];

  return (
    <article>
      <div className="programa">
        <h5>Orbita Maple/TCC</h5>
        <div className="graf1 plot-card">
          <Plot
            data={[
              {
                x: xPlot,
                y: yPlot,
                type: "scatter",
                mode: "lines",
                name: "trajetoria Maple",
                line: { color: plotTheme.accent, width: 2 },
              },
              {
                x: [0],
                y: [0],
                type: "scatter",
                mode: "markers",
                name: "centro",
                marker: { size: 9, color: plotTheme.text },
              },
            ]}
            layout={{
              ...baseLayout,
              title: "Trajetoria polar Maple/TCC",
              xaxis: { title: "x", range: ranges?.xRange, ...axisBase },
              yaxis: { title: "y", scaleanchor: "x", range: ranges?.yRange, ...axisBase },
              hovermode: "closest",
              uirevision: "keep-zoom",
              shapes: referenceShapes,
            }}
            config={{ responsive: true, displaylogo: false }}
            useResizeHandler
            style={{ width: "100%" }}
          />
        </div>

        {mapleTraj?.meta && (
          <div className="valor">
            points_returned: <strong>{mapleTraj.meta.points_returned}</strong>
            {" | "}points_plotted: <strong>{xPlot.length}</strong>
            {" | "}captured: <strong>{String(Boolean(mapleTraj.meta.captured))}</strong>
            {" | "}r_stop: <strong>{String(Boolean(mapleTraj.meta.clipped_by_r_stop))}</strong>
            {" | "}fim: <strong>{mapleTraj.meta.termination_reason ?? "phi_max"}</strong>
          </div>
        )}

        <p className="note">
          Filtro visual Maple: 0.1 &lt;= r &lt;= 3 e 1 &lt;= u &lt;= 10. O circulo interno marca r = 0.1.
        </p>
      </div>
    </article>
  );
}
