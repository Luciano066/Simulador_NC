import Plot from "react-plotly.js";
import { computeRange, downsampleXY } from "../utils/plot";

export function OrbitPlot({ traj, horizon, photonSphere, plotTheme, baseLayout, axisBase }) {
  const xRaw = traj?.x ?? [];
  const yRaw = traj?.y ?? [];
  const { x: xPlot, y: yPlot } = downsampleXY(xRaw, yRaw, 7000);
  const ranges = computeRange(xPlot, yPlot);
  const x0 = xPlot?.[0];
  const y0 = yPlot?.[0];
  const xF = xPlot?.[xPlot.length - 1];
  const yF = yPlot?.[yPlot.length - 1];

  return (
    <article>
      <div className="programa" id="titulo2">
        <h5>Grafico da Orbita</h5>
        <div className="graf1 plot-card">
          <Plot
            data={[
              {
                x: xPlot,
                y: yPlot,
                type: "scatter",
                mode: "lines",
                name: "trajetoria",
                line: { color: plotTheme.accent, width: 2 },
              },
              {
                x: Number.isFinite(x0) ? [x0] : [],
                y: Number.isFinite(y0) ? [y0] : [],
                type: "scatter",
                mode: "markers",
                name: "inicio",
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
              title: "Trajetoria (x,y)",
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
          Horizonte (2M) sombreado; esfera de fotons (3M) tracejada; inicio/fim marcados.
        </p>
      </div>
    </article>
  );
}
