import { ErrorMessage } from "./ErrorMessage";

export function NcParameterPanel({
  ncOrbit,
  ncPotential,
  setNcOrbitNum,
  setNcOrbitStr,
  setNcPotentialNum,
  setNcPotentialStr,
  runNCOrbit,
  runNCPotential,
  applyNcPreset,
  ncOrbitLoading,
  ncPotentialLoading,
  ncPhiMax,
  ncB,
  ncOrbitErr,
  ncPotentialErr,
}) {
  return (
    <article>
      <div className="programa">
        <h5>Buraco negro nao comutativo (NCSBH)</h5>
        <p className="note">
          Modelo com massa efetiva m(r) espalhada por theta. Use theta &gt; 0 (unidades de L^2).
          Orbita e potencial usam parametros independentes para evitar conflito entre os graficos.
        </p>

        <h5>Parametros da orbita NC</h5>
        <div className="input">
          <div className="input-grid">
            <label className="field">
              Tipo
              <select className="css-input" value={ncOrbit.particle} onChange={setNcOrbitStr("particle")}>
                <option value="massive">Corpo massivo</option>
                <option value="photon">Foton</option>
              </select>
            </label>

            <label className="field">
              Massa (M)
              <input className="css-input" type="number" step="0.1" value={ncOrbit.M} onChange={setNcOrbitNum("M")} />
            </label>

            <label className="field">
              Parametro theta
              <input
                className="css-input"
                type="number"
                step="0.1"
                value={ncOrbit.theta}
                onChange={setNcOrbitNum("theta")}
              />
              <small>theta controla o espalhamento</small>
            </label>

            <label className="field">
              Energia (E)
              <input className="css-input" type="number" step="0.01" value={ncOrbit.E} onChange={setNcOrbitNum("E")} />
            </label>

            <label className="field">
              Momento angular (L)
              <input className="css-input" type="number" step="0.1" value={ncOrbit.L} onChange={setNcOrbitNum("L")} />
            </label>

            <label className="field">
              Raio inicial (r0)
              <input className="css-input" type="number" step="0.1" value={ncOrbit.r0} onChange={setNcOrbitNum("r0")} />
            </label>

            <label className="field">
              Limite de fuga (r_stop)
              <input
                className="css-input"
                type="number"
                step="1"
                value={ncOrbit.r_stop}
                onChange={setNcOrbitNum("r_stop")}
              />
              <small>Encerra a orbita quando r cresce demais</small>
            </label>

            <label className="field">
              Direcao radial
              <select className="css-input" value={ncOrbit.radial_sign} onChange={setNcOrbitStr("radial_sign")}>
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
                value={ncOrbit.turns}
                onChange={setNcOrbitNum("turns")}
              />
            </label>

            <label className="field">
              Pontos da orbita (n)
              <input className="css-input" type="number" step="100" value={ncOrbit.n} onChange={setNcOrbitNum("n")} />
            </label>
          </div>
        </div>

        <h5>Parametros do potencial NC</h5>
        <p className="note">
          Presets abaixo reproduzem o comportamento qualitativo das Figuras 5, 6 e 7 do TCC.
        </p>
        <div className="input">
          <div className="input-grid">
            <label className="field">
              Tipo
              <select className="css-input" value={ncPotential.particle} onChange={setNcPotentialStr("particle")}>
                <option value="massive">Corpo massivo</option>
                <option value="photon">Foton</option>
              </select>
            </label>

            <label className="field">
              Massa (M)
              <input
                className="css-input"
                type="number"
                step="0.1"
                value={ncPotential.M}
                onChange={setNcPotentialNum("M")}
              />
            </label>

            <label className="field">
              Parametro theta
              <input
                className="css-input"
                type="number"
                step="0.1"
                value={ncPotential.theta}
                onChange={setNcPotentialNum("theta")}
              />
            </label>

            <label className="field">
              Energia (E)
              <input
                className="css-input"
                type="number"
                step="0.01"
                value={ncPotential.E}
                onChange={setNcPotentialNum("E")}
              />
            </label>

            <label className="field">
              Momento angular (L)
              <input
                className="css-input"
                type="number"
                step="0.1"
                value={ncPotential.L}
                onChange={setNcPotentialNum("L")}
              />
            </label>

            <label className="field">
              r_min (Veff)
              <input
                className="css-input"
                type="number"
                step="0.001"
                value={ncPotential.r_min}
                onChange={setNcPotentialNum("r_min")}
              />
            </label>

            <label className="field">
              r_max (Veff)
              <input
                className="css-input"
                type="number"
                step="0.1"
                value={ncPotential.r_max}
                onChange={setNcPotentialNum("r_max")}
              />
            </label>

            <label className="field">
              Pontos Veff (n)
              <input
                className="css-input"
                type="number"
                step="100"
                value={ncPotential.n_veff}
                onChange={setNcPotentialNum("n_veff")}
              />
            </label>
          </div>
        </div>

        <button onClick={runNCOrbit} disabled={ncOrbitLoading} className="click">
          {ncOrbitLoading ? "Calculando orbita NC..." : "Gerar Orbita NC"}
        </button>
        <button onClick={runNCPotential} disabled={ncPotentialLoading} className="click">
          {ncPotentialLoading ? "Calculando potencial NC..." : "Gerar Potencial NC"}
        </button>
        <button onClick={() => applyNcPreset("fig5")} className="click">
          Preset Fig. 5
        </button>
        <button onClick={() => applyNcPreset("fig6")} className="click">
          Preset Fig. 6
        </button>
        <button onClick={() => applyNcPreset("fig7")} className="click">
          Preset Fig. 7
        </button>

        <div className="valor">
          orbita: phi_max = <strong>{ncPhiMax.toFixed(3)}</strong> rad (turns = {ncOrbit.turns}) | b = L/E =
          <strong> {Number.isFinite(ncB) ? ncB.toFixed(3) : "inf"}</strong>
        </div>

        <ErrorMessage label="Orbita NC" message={ncOrbitErr} />
        <ErrorMessage label="Potencial NC" message={ncPotentialErr} />
      </div>
    </article>
  );
}
