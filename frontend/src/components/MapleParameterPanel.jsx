import { ErrorMessage } from "./ErrorMessage";

export function MapleParameterPanel({
  mapleParams,
  mapleTraj,
  mapleVeff,
  setMapleNum,
  applyMaplePreset,
  runMapleOrbit,
  runMaplePotential,
  mapleOrbitLoading,
  maplePotentialLoading,
  mapleOrbitErr,
  maplePotentialErr,
}) {
  const energy = mapleTraj?.meta?.E ?? mapleVeff?.meta?.E ?? null;
  const outerHorizon = mapleTraj?.meta?.r_outer_horizon ?? mapleVeff?.meta?.r_outer_horizon ?? null;

  return (
    <article>
      <div className="programa">
        <h5>Aproximacao Maple/TCC</h5>
        <p className="note">
          Modo adicional para reproduzir a EDO aproximada usada no Maple. A energia E e calculada a partir de u0 e du0.
        </p>

        <div className="input">
          <div className="input-grid">
            <label className="field">
              Massa (m)
              <input className="css-input" type="number" step="0.01" value={mapleParams.m} onChange={setMapleNum("m")} />
            </label>

            <label className="field">
              Parametro theta
              <input
                className="css-input"
                type="number"
                step="0.001"
                value={mapleParams.theta}
                onChange={setMapleNum("theta")}
              />
            </label>

            <label className="field">
              kappa
              <input
                className="css-input"
                type="number"
                step="0.1"
                value={mapleParams.kappa}
                onChange={setMapleNum("kappa")}
              />
              <small>Use 0.5 para tipo-tempo</small>
            </label>

            <label className="field">
              Momento angular (L)
              <input className="css-input" type="number" step="0.01" value={mapleParams.L} onChange={setMapleNum("L")} />
            </label>

            <label className="field">
              u0
              <input className="css-input" type="number" step="0.01" value={mapleParams.u0} onChange={setMapleNum("u0")} />
            </label>

            <label className="field">
              du0
              <input className="css-input" type="number" step="0.00001" value={mapleParams.du0} onChange={setMapleNum("du0")} />
            </label>

            <label className="field">
              phi_max
              <input
                className="css-input"
                type="number"
                step="0.01"
                value={mapleParams.phi_max}
                onChange={setMapleNum("phi_max")}
              />
            </label>

            <label className="field">
              Pontos da orbita (n)
              <input className="css-input" type="number" step="100" value={mapleParams.n} onChange={setMapleNum("n")} />
            </label>

            <label className="field">
              r_min (Veff)
              <input
                className="css-input"
                type="number"
                step="0.01"
                value={mapleParams.r_min}
                onChange={setMapleNum("r_min")}
              />
            </label>

            <label className="field">
              r_max (Veff)
              <input
                className="css-input"
                type="number"
                step="0.1"
                value={mapleParams.r_max}
                onChange={setMapleNum("r_max")}
              />
            </label>

            <label className="field">
              Pontos Veff (n)
              <input
                className="css-input"
                type="number"
                step="100"
                value={mapleParams.n_veff}
                onChange={setMapleNum("n_veff")}
              />
            </label>
          </div>
        </div>

        <button onClick={runMapleOrbit} disabled={mapleOrbitLoading} className="click">
          {mapleOrbitLoading ? "Calculando orbita Maple..." : "Gerar Orbita Maple/TCC"}
        </button>
        <button onClick={runMaplePotential} disabled={maplePotentialLoading} className="click">
          {maplePotentialLoading ? "Calculando potencial Maple..." : "Gerar Potencial Maple/TCC"}
        </button>
        <button onClick={() => applyMaplePreset("maple1")} className="click">
          Preset Maple 1
        </button>
        <button onClick={() => applyMaplePreset("maple2")} className="click">
          Preset Maple 2
        </button>

        <div className="valor">
          r0 = <strong>{(1 / mapleParams.u0).toFixed(3)}</strong>
          {" | "}phi_max = <strong>{mapleParams.phi_max.toFixed(3)}</strong>
          {Number.isFinite(energy) ? <>{" | "}E = <strong>{Number(energy).toFixed(6)}</strong></> : null}
          {Number.isFinite(outerHorizon) ? <>{" | "}r+ ~= <strong>{Number(outerHorizon).toFixed(6)}</strong></> : null}
        </div>

        <ErrorMessage label="Orbita Maple/TCC" message={mapleOrbitErr} />
        <ErrorMessage label="Potencial Maple/TCC" message={maplePotentialErr} />
      </div>
    </article>
  );
}
