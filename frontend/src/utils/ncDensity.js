export function buildDensityGrid(xRange, yRange, theta, M = 1.0, gridSize = 90) {
  if (!xRange || !yRange || !Number.isFinite(theta) || theta <= 0) {
    return { x: [], y: [], z: [] };
  }

  const xmin = Math.min(xRange[0], xRange[1]);
  const xmax = Math.max(xRange[0], xRange[1]);
  const ymin = Math.min(yRange[0], yRange[1]);
  const ymax = Math.max(yRange[0], yRange[1]);
  const x = Array.from({ length: gridSize }, (_, index) => xmin + ((xmax - xmin) * index) / (gridSize - 1));
  const y = Array.from({ length: gridSize }, (_, index) => ymin + ((ymax - ymin) * index) / (gridSize - 1));
  const sqrtTheta = Math.sqrt(theta);
  const denominatorScale = Math.PI * Math.PI;
  const z = [];
  let zMax = 0;

  for (const yy of y) {
    const row = [];
    for (const xx of x) {
      const rho = (M * sqrtTheta) / (denominatorScale * (xx * xx + yy * yy + theta) ** 2);
      const value = Math.log10(1 + rho);
      row.push(value);
      if (value > zMax) zMax = value;
    }
    z.push(row);
  }

  if (zMax > 0) {
    for (const row of z) {
      for (let index = 0; index < row.length; index += 1) {
        row[index] /= zMax;
      }
    }
  }

  return { x, y, z };
}
