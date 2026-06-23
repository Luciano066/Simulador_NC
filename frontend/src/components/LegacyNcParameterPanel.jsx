import { ErrorMessage } from "./ErrorMessage";

export function LegacyNcParameterPanel({
  legacyParams,
  legacyTraj,
  legacyVeff,
  setLegacyNum,
  setLegacyStr,
  setLegacyBool,
  applyLegacyPreset,
  runLegacyOrbit,
  runLegacyPotential,
  legacyOrbitLoading,
  legacyPotentialLoading,
  legacyOrbitErr,
  legacyPotentialErr,
}) {
  const rst = legacyTraj?.meta?.rst ?? legacyVeff?.meta?.rst ?? legacyParams.rst;
  const energy = legacyTraj?.meta?.energy_level ?? legacyVeff?.meta?.energy_level ?? null;

  return (
    <article>
      <div className="programa">
        <h5>NC legado / Simulador antigo</h5>
        <p className="note">
          Modo polinomial em u = 1/r, separado do NC completo e do Maple/TCC. Usa a quadratura do simulador antigo.
        </p>

        <div className="input">
          <div className="input-grid">
            <label className="field">
              Tipo
              <select className="css-input" value={legacyParams.particle} onChange={setLegacyStr("particle")}>
                <option value="massive">Corpo massivo</option>
                <option value="photon">Foton</option>
              </select>
            </label>

            <label className="field">
              Parametro theta
              <input
                className="css-input"
                type="number"
                step="0.001"
                value={legacyParams.theta}
                onChange={setLegacyNum("theta")}
              />
            </label>

            <label className="field">
              Momento angular (L)
              <input className="css-input" type="number" step="0.01" value={legacyParams.L} onChange={setLegacyNum("L")} />
              <small>Usado na particula massiva</small>
            </label>

            <label className="field">
              Energia (E)
              <input className="css-input" type="number" step="0.01" value={legacyParams.E} onChange={setLegacyNum("E")} />
              <small>Linha de energia e discriminante E - V</small>
            </label>

            <label className="field">
              Impacto (b)
              <input className="css-input" type="number" step="0.1" value={legacyParams.b} onChange={setLegacyNum("b")} />
              <small>Usado no foton, com linha 1/b^2</small>
            </label>

            <label className="field">
              rst automatico
              <input type="checkbox" checked={legacyParams.auto_rst} onChange={setLegacyBool("auto_rst")} />
              <small>Replica a tabela antiga em funcao de L</small>
            </label>

            <label className="field">
              rst manual
              <input
                className="css-input"
                type="number"
                step="0.1"
                value={legacyParams.rst}
                onChange={setLegacyNum("rst")}
                disabled={legacyParams.auto_rst}
              />
            </label>

            <label className="field">
              norbit
              <input
                className="css-input"
                type="number"
                step="1"
                value={legacyParams.norbit}
                onChange={setLegacyNum("norbit")}
              />
              <small>Mantido para compatibilidade</small>
            </label>

            <label className="field">
              Raio de captura
              <input
                className="css-input"
                type="number"
                step="0.1"
                value={legacyParams.capture_radius}
                onChange={setLegacyNum("capture_radius")}
              />
            </label>

            <label className="field">
              Pontos da orbita (n)
              <input className="css-input" type="number" step="100" value={legacyParams.n} onChange={setLegacyNum("n")} />
            </label>

            <label className="field">
              r_min (Veff)
              <input
                className="css-input"
                type="number"
                step="0.001"
                value={legacyParams.r_min}
                onChange={setLegacyNum("r_min")}
              />
            </label>

            <label className="field">
              Pontos Veff (n)
              <input
                className="css-input"
                type="number"
                step="1000"
                value={legacyParams.n_veff}
                onChange={setLegacyNum("n_veff")}
              />
            </label>
          </div>
        </div>

        <button onClick={runLegacyOrbit} disabled={legacyOrbitLoading} className="click">
          {legacyOrbitLoading ? "Calculando orbita legado..." : "Gerar Orbita NC Legado"}
        </button>
        <button onClick={runLegacyPotential} disabled={legacyPotentialLoading} className="click">
          {legacyPotentialLoading ? "Calculando potencial legado..." : "Gerar Potencial NC Legado"}
        </button>
        <button onClick={() => applyLegacyPreset("massive")} className="click">
          Preset legado massivo
        </button>
        <button onClick={() => applyLegacyPreset("photon")} className="click">
          Preset legado foton
        </button>

        <div className="valor">
          rst = <strong>{Number.isFinite(rst) ? Number(rst).toFixed(3) : "auto"}</strong>
          {Number.isFinite(energy) ? <>{" | "}nivel = <strong>{Number(energy).toFixed(6)}</strong></> : null}
          {legacyTraj?.meta?.termination_reason ? (
            <>{" | "}fim: <strong>{legacyTraj.meta.termination_reason}</strong></>
          ) : null}
        </div>

        <ErrorMessage label="Orbita NC legado" message={legacyOrbitErr} />
        <ErrorMessage label="Potencial NC legado" message={legacyPotentialErr} />
      </div>
    </article>
  );
}
