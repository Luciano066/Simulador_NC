export function SimulationLayout({ title, description, parameters, potential, orbit }) {
  const titleId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`;

  return (
    <section className="simulation-mode" aria-labelledby={titleId}>
      <div className="mode-heading">
        <h2 id={titleId}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>

      <div className="simulation-layout">
        <aside className="parameter-column">{parameters}</aside>
        <main className="plot-column">
          {potential}
          {orbit}
        </main>
      </div>
    </section>
  );
}
