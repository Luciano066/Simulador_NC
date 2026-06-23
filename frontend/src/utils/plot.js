export function downsampleXY(x, y, maxPoints = 7000) {
  const n = Math.min(x.length, y.length);
  if (n <= maxPoints) return { x, y };

  const step = Math.ceil(n / maxPoints);
  const xd = [];
  const yd = [];
  for (let i = 0; i < n; i += step) {
    xd.push(x[i]);
    yd.push(y[i]);
  }

  return { x: xd, y: yd };
}

export function computeRange(x, y, padFrac = 0.08) {
  if (!x.length || !y.length) return null;

  let xmin = Infinity;
  let xmax = -Infinity;
  let ymin = Infinity;
  let ymax = -Infinity;

  for (let i = 0; i < x.length; i += 1) {
    const xi = x[i];
    const yi = y[i];
    if (!Number.isFinite(xi) || !Number.isFinite(yi)) continue;
    if (xi < xmin) xmin = xi;
    if (xi > xmax) xmax = xi;
    if (yi < ymin) ymin = yi;
    if (yi > ymax) ymax = yi;
  }

  if (!Number.isFinite(xmin)) return null;

  const cx = (xmin + xmax) / 2;
  const cy = (ymin + ymax) / 2;
  const half = Math.max(xmax - xmin, ymax - ymin) / 2 || 1;
  const r = half * (1 + padFrac);

  return { xRange: [cx - r, cx + r], yRange: [cy - r, cy + r] };
}
