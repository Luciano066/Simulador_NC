const MODES = [
  { id: "classic", label: "Schwarzschild classico" },
  { id: "legacy", label: "NC TCC/legado" },
];

export function ModeTabs({ activeMode, onChange }) {
  return (
    <nav className="mode-tabs" aria-label="Modos do simulador">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={`mode-tab ${activeMode === mode.id ? "active" : ""}`}
          onClick={() => onChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </nav>
  );
}
