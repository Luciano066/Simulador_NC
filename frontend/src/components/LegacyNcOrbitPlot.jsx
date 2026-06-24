import { useMemo } from "react";
import Plot from "react-plotly.js";
import { buildDensityGrid } from "../utils/ncDensity";
import { computeRange } from "../utils/plot";

function downsampleWithBreaks(x, y, maxPoints = 7000) {
  const n = Math.min(x.length, y.length);
  const finiteCount = Array.from({ length: n }, (_, i) => i).filter((i) => Number.isFinite(x[i]) && Number.isFinite(y[i])).length;
  const step = Math.max(1, Math.ceil(finiteCount / maxPoints));
  const xd = [];
  const yd = [];
  let finiteIndex = 0;
  let lastWasBreak = false;

  for (let i = 0; i < n; i += 1) {
    const xi = x[i];
    const yi = y[i];
    const finite = Number.isFinite(xi) && Number.isFinite(yi);
    if (!finite) {
      if (!lastWasBreak && xd.length > 0) {
        xd.push(Number.NaN);
        yd.push(Number.NaN);
        lastWasBreak = true;
      }
      continue;
    }

    if (finiteIndex % step === 0) {
      xd.push(xi);
      yd.push(yi);
      lastWasBreak = false;
    }
    finiteIndex += 1;
  }

  return { x: xd, y: yd };
}

function fmt(value, digits = 3) {
  return Number.isFinite(value) ? Number(value).toExponential(digits) : "n/a";
}

function circleTrace(radius, count = 160) {
  if (!Number.isFinite(radius) || radius <= 0) return { x: [], y: [] };
  const x = [];
  const y = [];
  for (let index = 0; index <= count; index += 1) {
    const angle = (2 * Math.PI * index) / count;
    x.push(radius * Math.cos(angle));
    y.push(radius * Math.sin(angle));
  }
  return { x, y };
}

export function LegacyNcOrbitPlot({ legacyTraj, plotTheme, baseLayout, axisBase }) {
  const { x: xPlot, y: yPlot } = downsampleWithBreaks(legacyTraj?.x ?? [], legacyTraj?.y ?? [], 7000);
  const theta = legacyTraj?.meta?.theta ?? null;
  const massConcentrationRadius = Number.isFinite(theta) ? 3.0 * Math.sqrt(theta) : null;
  const densityRangeRadius = Math.max(
    Number.isFinite(massConcentrationRadius) ? massConcentrationRadius : 0,
    Number.isFinite(legacyTraj?.meta?.capture_radius) ? legacyTraj.meta.capture_radius : 0,
  );
  const ranges = computeRange(
    [...xPlot, -densityRangeRadius, densityRangeRadius],
    [...yPlot, -densityRangeRadius, densityRangeRadius],
    0.12,
  );
  const densityGrid = useMemo(
    () => buildDensityGrid(ranges?.xRange, ranges?.yRange, theta, legacyTraj?.meta?.M ?? 1.0),
    [legacyTraj?.meta?.M, ranges?.xRange, ranges?.yRange, theta],
  );
  const massCircleTrace = useMemo(() => circleTrace(massConcentrationRadius), [massConcentrationRadius]);
  const captureRadius = legacyTraj?.meta?.capture_radius ?? 2.0;
  const forbiddenFraction = legacyTraj?.meta?.forbidden_fraction ?? null;
  const warning = legacyTraj?.meta?.warning ?? null;
  const massCircle =
    Number.isFinite(massConcentrationRadius) && massConcentrationRadius > 0
      ? {
          type: "circle",
          xref: "x",
          yref: "y",
          x0: -massConcentrationRadius,
          y0: -massConcentrationRadius,
          x1: massConcentrationRadius,
          y1: massConcentrationRadius,
          line: { width: 2, dash: "dot", color: "rgba(96, 165, 250, 0.95)" },
        }
      : null;
  const captureCircle = Number.isFinite(captureRadius)
    ? {
        type: "circle",
        xref: "x",
        yref: "y",
        x0: -captureRadius,
        y0: -captureRadius,
        x1: captureRadius,
        y1: captureRadius,
        line: { width: 2, dash: "dash", color: plotTheme.accent },
        fillcolor: plotTheme.horizonFill,
      }
    : null;

  return (
    <article>
      <div className="programa">
        <h5>Orbita NC TCC/legado</h5>
        <div className="graf1 plot-card">
          <Plot
            data={[
              {
                x: densityGrid.x,
                y: densityGrid.y,
                z: densityGrid.z,
                type: "heatmap",
                name: "rho_theta",
                colorscale: [
                  [0, "rgba(15, 23, 42, 0)"],
                  [0.35, "rgba(37, 99, 235, 0.25)"],
                  [0.7, "rgba(96, 165, 250, 0.65)"],
                  [1, "rgba(191, 219, 254, 0.95)"],
                ],
                showscale: false,
                showlegend: false,
                hoverinfo: "skip",
                opacity: 0.8,
              },
              {
                x: xPlot,
                y: yPlot,
                type: "scatter",
                mode: "lines",
                name: "Trajetória NC",
                line: { color: plotTheme.accent, width: 2 },
                connectgaps: false,
              },
              {
                x: massCircleTrace.x,
                y: massCircleTrace.y,
                type: "scatter",
                mode: "lines",
                name: "Maior concentração da massa",
                line: { width: 2, dash: "dot", color: "rgba(96, 165, 250, 0.95)" },
                hoverinfo: "skip",
                showlegend: Number.isFinite(massConcentrationRadius) && massConcentrationRadius > 0,
              },
              {
                x: [0],
                y: [0],
                type: "scatter",
                mode: "markers",
                name: "Centro do buraco negro",
                marker: { size: 9, color: plotTheme.text },
              },
            ]}
            layout={{
              ...baseLayout,
              margin: { ...(baseLayout.margin ?? {}), t: 90 },
              title: "Trajetoria polar NC TCC/legado",
              xaxis: { title: "x", range: ranges?.xRange, ...axisBase },
              yaxis: { title: "y", scaleanchor: "x", scaleratio: 1, range: ranges?.yRange, ...axisBase },
              legend: {
                orientation: "h",
                x: 0.5,
                y: 1.12,
                xanchor: "center",
                yanchor: "bottom",
                bgcolor: "rgba(15, 23, 42, 0.85)",
                bordercolor: "rgba(148, 163, 184, 0.25)",
                borderwidth: 1,
                font: {
                  size: 12,
                  color: "#e5e7eb",
                },
              },
              hovermode: "closest",
              uirevision: "keep-zoom",
              shapes: [captureCircle, massCircle].filter(Boolean),
              annotations:
                Number.isFinite(massConcentrationRadius) && massConcentrationRadius > 0
                  ? [
                      {
                        x: 0.02,
                        y: 0.98,
                        xref: "paper",
                        yref: "paper",
                        text: "Círculo tracejado: maior concentração da massa",
                        showarrow: false,
                        align: "left",
                        xanchor: "left",
                        yanchor: "top",
                        font: { size: 11, color: "#e5e7eb" },
                        bgcolor: "rgba(15, 23, 42, 0.82)",
                        bordercolor: "rgba(148, 163, 184, 0.25)",
                        borderwidth: 1,
                        borderpad: 4,
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
            {" | "}forbidden: <strong>{Number.isFinite(forbiddenFraction) ? forbiddenFraction.toFixed(4) : "n/a"}</strong>
            {" | "}delta_min: <strong>{fmt(legacyTraj.meta.delta_min)}</strong>
            {" | "}delta_max: <strong>{fmt(legacyTraj.meta.delta_max)}</strong>
            {" | "}r: <strong>{fmt(legacyTraj.meta.r_min_orbit, 2)} a {fmt(legacyTraj.meta.r_max_orbit, 2)}</strong>
            {Number.isFinite(massConcentrationRadius) ? (
              <>{" | "}r_massa: <strong>{Number(massConcentrationRadius).toFixed(4)}</strong></>
            ) : null}
          </div>
        )}

        {warning ? <div className="error">Diagnostico: {warning}</div> : null}
      </div>
    </article>
  );
}
