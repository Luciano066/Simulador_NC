import Plot from "react-plotly.js";
import { computeRange, downsampleXY } from "../utils/plot";

export function NcOrbitPlot({ ncTraj, plotTheme, baseLayout, axisBase }) {
  const xRaw = ncTraj?.x ?? [];
  const yRaw = ncTraj?.y ?? [];
  const { x: xPlot, y: yPlot } = downsampleXY(xRaw, yRaw, 7000);
  const ranges = computeRange(xPlot, yPlot);
  const x0 = xPlot?.[0];
  const y0 = yPlot?.[0];
  const xF = xPlot?.[xPlot.length - 1];
  const yF = yPlot?.[yPlot.length - 1];
  const outerHorizon = ncTraj?.meta?.r_outer_horizon ?? null;

  return (
    <article>
      <div className="programa">
        <h5>Orbita nao comutativa</h5>
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
              title: "Trajetoria (x,y) - NC",
              xaxis: { title: "x", range: ranges?.xRange, ...axisBase },
              yaxis: { title: "y", scaleanchor: "x", range: ranges?.yRange, ...axisBase },
              hovermode: "closest",
              uirevision: "keep-zoom",
              shapes: Number.isFinite(outerHorizon)
                ? [
                    {
                      type: "circle",
                      xref: "x",
                      yref: "y",
                      x0: -outerHorizon,
                      y0: -outerHorizon,
                      x1: outerHorizon,
                      y1: outerHorizon,
                      line: { width: 2, dash: "dot", color: plotTheme.accent },
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

        {ncTraj?.meta && (
          <div className="valor">
            points_returned: <strong>{ncTraj.meta.points_returned}</strong>
            {" | "}captured: <strong>{String(Boolean(ncTraj.meta.captured))}</strong>
            {" | "}clipped_by_r_stop: <strong>{String(Boolean(ncTraj.meta.clipped_by_r_stop))}</strong>
            {" | "}has_horizon: <strong>{String(Boolean(ncTraj.meta.has_horizon))}</strong>
            {Number.isFinite(outerHorizon) ? (
              <>{" | "}r+ = <strong>{Number(outerHorizon).toFixed(3)}</strong></>
            ) : null}
          </div>
        )}

        <p className="note">
          Para particula massiva, quando <strong>E &gt;= 0.5</strong> a orbita tende a escapar.
          O parametro <strong>r_stop</strong> corta a trajetoria de fuga para manter o grafico legivel.
        </p>
      </div>
    </article>
  );
}
