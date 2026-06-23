import { ErrorMessage } from "./ErrorMessage";

export function ParameterPanel({
  p,
  setNum,
  setStr,
  useEnergyParam,
  setUseEnergyParam,
  useEnergyParamForMassive,
  autoRange,
  setAutoRange,
  rMinUsed,
  rMaxUsed,
  orbitLoading,
  potentialLoading,
  runOrbit,
  runPotential,
  phiMax,
  b,
  bcrit,
  energyParam,
  energyLabel,
  orbitErr,
  potentialErr,
}) {
  return (
    <>
      <div className="meta-row">
        <label className="field">
          <span>Modo do site (Ebar)</span>
          <input
            type="checkbox"
            checked={useEnergyParam}
            onChange={(event) => setUseEnergyParam(event.target.checked)}
          />
        </label>
        <label className="field">
          <span>Auto r_min/r_max</span>
          <input
            type="checkbox"
            checked={autoRange}
            onChange={(event) => setAutoRange(event.target.checked)}
          />
        </label>
      </div>

      <article>
        <div className="programa">
          <h5>1. Ajuste os parametros da orbita</h5>
          <div className="input">
            <div className="input-grid">
              <label className="field">
                Massa central (M)
                <input className="css-input" type="number" step="0.1" value={p.M} onChange={setNum("M")} />
              </label>

              <label className="field">
                Energia {useEnergyParamForMassive ? "(Ebar)" : "(E)"}
                <input className="css-input" type="number" step="0.01" value={p.E} onChange={setNum("E")} />
                {useEnergyParamForMassive && <small>Ebar = (E^2 - 1)/2</small>}
              </label>

              <label className="field">
                Momento angular (L)
                <input className="css-input" type="number" step="0.1" value={p.L} onChange={setNum("L")} />
                <small>Para foton, b = L / E</small>
              </label>

              <label className="field">
                Raio inicial (r0)
                <input className="css-input" type="number" step="0.1" value={p.r0} onChange={setNum("r0")} />
              </label>

              <label className="field">
                Direcao radial
                <select className="css-input" value={p.radial_sign} onChange={setStr("radial_sign")}>
                  <option value="in">in (cair)</option>
                  <option value="out">out (sair)</option>
                </select>
              </label>

              <label className="field">
                Voltas (1-20)
                <input
                  className="css-input"
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={p.turns}
                  onChange={setNum("turns")}
                />
              </label>

              <label className="field">
                Pontos da orbita (n)
                <input className="css-input" type="number" step="100" value={p.n} onChange={setNum("n")} />
              </label>

              <label className="field">
                r_min (Veff)
                <input
                  className="css-input"
                  type="number"
                  step="0.1"
                  value={autoRange ? rMinUsed : p.r_min}
                  onChange={setNum("r_min")}
                  disabled={autoRange}
                />
              </label>

              <label className="field">
                r_max (Veff)
                <input
                  className="css-input"
                  type="number"
                  step="1"
                  value={autoRange ? rMaxUsed : p.r_max}
                  onChange={setNum("r_max")}
                  disabled={autoRange}
                />
              </label>

              <label className="field">
                Pontos Veff (n)
                <input className="css-input" type="number" step="100" value={p.n_veff} onChange={setNum("n_veff")} />
              </label>
            </div>
          </div>

          <button onClick={runOrbit} disabled={orbitLoading} className="click">
            {orbitLoading ? "Calculando orbita..." : "Gerar Orbita"}
          </button>
          <button onClick={runPotential} disabled={potentialLoading} className="click">
            {potentialLoading ? "Calculando potencial..." : "Gerar Potencial"}
          </button>

          <div className="valor">
            phi_max = <strong>{phiMax.toFixed(3)}</strong> rad (turns = {p.turns}) | b = L/E =
            <strong> {Number.isFinite(b) ? b.toFixed(3) : "inf"}</strong>
            {p.particle === "massive" && (
              <> | {energyLabel} = <strong>{Number.isFinite(energyParam) ? energyParam.toFixed(3) : "-"}</strong></>
            )}
            {p.particle === "photon" && (
              <> | b_crit ~= <strong>{bcrit.toFixed(3)}</strong></>
            )}
          </div>

          <ErrorMessage label="Orbita" message={orbitErr} />
          <ErrorMessage label="Potencial" message={potentialErr} />
        </div>
      </article>
    </>
  );
}
