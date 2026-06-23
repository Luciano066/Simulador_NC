import Plot from "react-plotly.js";
import { computeRange, downsampleXY } from "../utils/plot";

export function LegacyNcOrbitPlot({ legacyTraj, plotTheme, baseLayout, axisBase }) {
  const { x: xPlot, y: yPlot } = downsampleXY(legacyTraj?.x ?? [], legacyTraj?.y ?? [], 7000);
  const ranges = computeRange(xPlot, yPlot, 0.12);
  const captureRadius = legacyTraj?.meta?.capture_radius ?? 2.0;

  return (
    <article>
      <div className="programa">
        <h5>Orbita NC legado</h5>
        <div className="graf1 plot-card">
          <Plot
            data={[
              {
                x: xPlot,
                y: yPlot,
                type: "scatter",
                mode: "lines",
                name: "trajetoria legado",
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
              title: "Trajetoria polar NC legado",
              xaxis: { title: "x", range: ranges?.xRange, ...axisBase },
              yaxis: { title: "y", scaleanchor: "x", range: ranges?.yRange, ...axisBase },
              hovermode: "closest",
              uirevision: "keep-zoom",
              shapes: Number.isFinite(captureRadius)
                ? [
                    {
                      type: "circle",
                      xref: "x",
                      yref: "y",
                      x0: -captureRadius,
                      y0: -captureRadius,
                      x1: captureRadius,
                      y1: captureRadius,
                      line: { width: 2, dash: "dash", color: plotTheme.accent },
                      fillcolor: plotTheme.horizonFill,
                    },
                  ]
                : [],
            }}
            config={{ responsive: true, displaylogo: false }}
            useResizeHandler
            style={{ width: "100%" }}
          />
        </div>

        {legacyTraj?.meta && (
          <div className="valor">
            points_returned: <strong>{legacyTraj.meta.points_returned}</strong>
            {" | "}points_plotted: <strong>{xPlot.length}</strong>
            {" | "}captured: <strong>{String(Boolean(legacyTraj.meta.captured))}</strong>
            {" | "}retorno: <strong>{String(Boolean(legacyTraj.meta.returned))}</strong>
            {" | "}fim: <strong>{legacyTraj.meta.termination_reason ?? "u_max"}</strong>
          </div>
        )}
      </div>
    </article>
  );
}
