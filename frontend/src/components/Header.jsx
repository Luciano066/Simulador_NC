function PlanetIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="Planeta">
      <circle cx="32" cy="32" r="16" fill="currentColor" />
      <ellipse cx="32" cy="36" rx="26" ry="8" fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

function PhotonIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="Foton">
      <circle cx="16" cy="32" r="6" fill="currentColor" />
      <path d="M26 32H56" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 20c6-6 12-6 18 0s12 6 18 0" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export function Header({ darkMode, onToggleTheme, particle, onParticleChange }) {
  return (
    <>
      <button className="botao" onClick={onToggleTheme} aria-label="Alternar modo">
        <span>{darkMode ? "LIGHT" : "DARK"}</span>
      </button>

      <header className="hero">
        <h1>
          ORBITAS
          <br />
          RELATIVISTICAS
        </h1>
        <p className="subtitle">
          Simulador interativo para comparar trajetorias relativisticas e potencial efetivo.
        </p>
      </header>

      <div className="menu">
        <button
          type="button"
          className={`card ${particle === "massive" ? "selected" : ""}`}
          onClick={() => onParticleChange("massive")}
        >
          <h2>
            Orbitas de
            <br />
            <strong>
              corpos
              <br />
              massivos
            </strong>
          </h2>
          <PlanetIcon className="icons" />
        </button>

        <button
          type="button"
          className={`card ${particle === "photon" ? "selected" : ""}`}
          onClick={() => onParticleChange("photon")}
        >
          <h2>
            Orbitas de
            <br />
            <strong>
              raios
              <br />
              de luz
            </strong>
          </h2>
          <PhotonIcon className="icons" />
        </button>
      </div>
    </>
  );
}
