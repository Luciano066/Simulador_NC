import { ErrorMessage } from "./ErrorMessage";
import { InfoBadge } from "./InfoBadge";

export function LegacyNcParameterPanel({
  legacyParams,
  legacyTraj,
  legacyVeff,
  setLegacyNum,
  setLegacyStr,
  setLegacyBool,
  applyLegacyPreset,
  runLegacySimulation,
  runLegacyPotential,
  resetLegacyDefaults,
  legacyOrbitLoading,
  legacyPotentialLoading,
  legacyOrbitErr,
  legacyPotentialErr,
}) {
  const rst = legacyTraj?.meta?.rst ?? legacyVeff?.meta?.rst ?? legacyParams.rst;
  const energy = legacyTraj?.meta?.energy_level ?? legacyVeff?.meta?.energy_level ?? null;
  const loading = legacyOrbitLoading || legacyPotentialLoading;

  return (
    <article className="parameter-card">
      <div className="programa">
        <div className="card-title-row">
          <div>
            <p className="eyebrow">Entrada</p>
            <h5>Parametros</h5>
          </div>
          <InfoBadge tone="accent">NC legado</InfoBadge>
        </div>

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
              <input
                className="range-input"
                type="range"
                min="0.001"
                max="0.2"
                step="0.001"
                value={legacyParams.theta}
                onChange={setLegacyNum("theta")}
              />
            </label>

            <label className="field">
              Momento angular (L)
              <input className="css-input" type="number" step="0.01" value={legacyParams.L} onChange={setLegacyNum("L")} />
              <input className="range-input" type="range" min="0.1" max="10" step="0.01" value={legacyParams.L} onChange={setLegacyNum("L")} />
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

        <div className="action-row">
          <button onClick={runLegacySimulation} disabled={loading} className="click primary-action">
            {loading ? "Calculando..." : "Gerar simulacao"}
          </button>
          <button onClick={resetLegacyDefaults} disabled={loading} className="click secondary-action">
            Restaurar padrao
          </button>
        </div>

        <div className="preset-row">
          <button onClick={() => applyLegacyPreset("massive")} className="mini-button">
            Massivo
          </button>
          <button onClick={() => applyLegacyPreset("photon")} className="mini-button">
            Foton
          </button>
          <button onClick={runLegacyPotential} disabled={legacyPotentialLoading} className="mini-button">
            Atualizar potencial
          </button>
        </div>

        <div className="valor">
          rst = <strong>{Number.isFinite(rst) ? Number(rst).toFixed(3) : "auto"}</strong>
          {Number.isFinite(energy) ? <>{" | "}nivel = <strong>{Number(energy).toFixed(6)}</strong></> : null}
          {legacyTraj?.meta?.termination_reason ? (
            <>{" | "}fim: <strong>{legacyTraj.meta.termination_reason}</strong></>
          ) : null}
        </div>

        <ErrorMessage label="Orbita NC TCC/legado" message={legacyOrbitErr} />
        <ErrorMessage label="Potencial NC TCC/legado" message={legacyPotentialErr} />
      </div>
    </article>
  );
}
