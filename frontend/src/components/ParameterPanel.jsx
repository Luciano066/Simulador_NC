import { ErrorMessage } from "./ErrorMessage";
import { InfoBadge } from "./InfoBadge";

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
  runSimulation,
  resetDefaults,
  phiMax,
  b,
  bcrit,
  energyParam,
  energyLabel,
  orbitErr,
  potentialErr,
}) {
  const loading = orbitLoading || potentialLoading;

  return (
    <article className="parameter-card">
      <div className="programa">
        <div className="card-title-row">
          <div>
            <p className="eyebrow">Entrada</p>
            <h5>Parametros</h5>
          </div>
          <InfoBadge>{p.particle === "massive" ? "Massiva" : "Foton"}</InfoBadge>
        </div>

        <div className="meta-row">
          <label className="field check-field">
            <input
              type="checkbox"
              checked={useEnergyParam}
              onChange={(event) => setUseEnergyParam(event.target.checked)}
            />
            <span>Usar Ebar</span>
          </label>
          <label className="field check-field">
            <input
              type="checkbox"
              checked={autoRange}
              onChange={(event) => setAutoRange(event.target.checked)}
            />
            <span>Auto r_min/r_max</span>
          </label>
        </div>

          <div className="input">
            <div className="input-grid">
              <label className="field">
                Tipo de particula
                <select className="css-input" value={p.particle} onChange={setStr("particle")}>
                  <option value="massive">Corpo massivo</option>
                  <option value="photon">Foton</option>
                </select>
              </label>

              <label className="field">
                Massa central (M)
                <input className="css-input" type="number" step="0.1" value={p.M} onChange={setNum("M")} />
                <input className="range-input" type="range" min="0.1" max="5" step="0.1" value={p.M} onChange={setNum("M")} />
              </label>

              <label className="field">
                Energia {useEnergyParamForMassive ? "(Ebar)" : "(E)"}
                <input className="css-input" type="number" step="0.01" value={p.E} onChange={setNum("E")} />
                {useEnergyParamForMassive && <small>Ebar = (E^2 - 1)/2</small>}
              </label>

              <label className="field">
                Momento angular (L)
                <input className="css-input" type="number" step="0.1" value={p.L} onChange={setNum("L")} />
                <input className="range-input" type="range" min="0.1" max="12" step="0.1" value={p.L} onChange={setNum("L")} />
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
                <input className="range-input" type="range" min="1" max="20" step="1" value={p.turns} onChange={setNum("turns")} />
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

          <div className="action-row">
            <button onClick={runSimulation} disabled={loading} className="click primary-action">
              {loading ? "Calculando..." : "Gerar simulacao"}
            </button>
            <button onClick={resetDefaults} disabled={loading} className="click secondary-action">
              Restaurar padrao
            </button>
          </div>

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
  );
}
