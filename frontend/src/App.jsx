import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { LegacyNcOrbitPlot } from "./components/LegacyNcOrbitPlot";
import { LegacyNcParameterPanel } from "./components/LegacyNcParameterPanel";
import { LegacyNcPotentialPlot } from "./components/LegacyNcPotentialPlot";
import { ModeTabs } from "./components/ModeTabs";
import { OrbitPlot } from "./components/OrbitPlot";
import { ParameterPanel } from "./components/ParameterPanel";
import { PotentialPlot } from "./components/PotentialPlot";
import { SimulationLayout } from "./components/SimulationLayout";
import { useLegacyNcSimulation } from "./hooks/useLegacyNcSimulation";
import { useSchwarzschildSimulation } from "./hooks/useSchwarzschildSimulation";

export default function App() {
  const [activeMode, setActiveMode] = useState("classic");
  const schwarzschild = useSchwarzschildSimulation();
  const legacy = useLegacyNcSimulation();

  useEffect(() => {
    document.body.classList.add("dark-mode");
    return () => document.body.classList.remove("dark-mode");
  }, []);

  const plotTheme = useMemo(() => {
    return {
      paper: "#0f172a",
      plot: "#0b1120",
      grid: "#1e293b",
      text: "#e5e7eb",
      accent: "#38bdf8",
      horizonFill: "rgba(56,189,248,0.12)",
    };
  }, []);

  const baseLayout = useMemo(
    () => ({
      paper_bgcolor: plotTheme.paper,
      plot_bgcolor: plotTheme.plot,
      font: { family: "Roboto, sans-serif", color: plotTheme.text },
      height: 520,
      margin: { l: 60, r: 30, t: 50, b: 50 },
      colorway: [plotTheme.accent, "#4f8cc9", "#10b981"],
    }),
    [plotTheme],
  );

  const axisBase = useMemo(
    () => ({
      gridcolor: plotTheme.grid,
      zerolinecolor: plotTheme.grid,
      linecolor: plotTheme.grid,
      tickfont: { color: plotTheme.text },
      titlefont: { color: plotTheme.text },
    }),
    [plotTheme],
  );

  return (
    <div className="page">
      <AppHeader />
      <ModeTabs activeMode={activeMode} onChange={setActiveMode} />

      {activeMode === "classic" ? (
        <SimulationLayout
          title="Schwarzschild classico"
          description="Geodesicas e potencial efetivo no espaco-tempo de Schwarzschild."
          parameters={
            <ParameterPanel
              p={schwarzschild.p}
              setNum={schwarzschild.setNum}
              setStr={schwarzschild.setStr}
              useEnergyParam={schwarzschild.useEnergyParam}
              setUseEnergyParam={schwarzschild.setUseEnergyParam}
              useEnergyParamForMassive={schwarzschild.useEnergyParamForMassive}
              autoRange={schwarzschild.autoRange}
              setAutoRange={schwarzschild.setAutoRange}
              rMinUsed={schwarzschild.rMinUsed}
              rMaxUsed={schwarzschild.rMaxUsed}
              orbitLoading={schwarzschild.orbitLoading}
              potentialLoading={schwarzschild.potentialLoading}
              runSimulation={schwarzschild.runSimulation}
              resetDefaults={schwarzschild.resetDefaults}
              phiMax={schwarzschild.phi_max}
              b={schwarzschild.b}
              bcrit={schwarzschild.bcrit}
              energyParam={schwarzschild.energyParam}
              energyLabel={schwarzschild.energyLabel}
              orbitErr={schwarzschild.orbitErr}
              potentialErr={schwarzschild.potentialErr}
            />
          }
          potential={
            <PotentialPlot
              p={schwarzschild.p}
              veff={schwarzschild.veff}
              energyParam={schwarzschild.energyParam}
              energyLabel={schwarzschild.energyLabel}
              critPoints={schwarzschild.critPoints}
              potentialStats={schwarzschild.potentialStats}
              horizon={schwarzschild.horizon}
              photonSphere={schwarzschild.photonSphere}
              plotTheme={plotTheme}
              baseLayout={baseLayout}
              axisBase={axisBase}
            />
          }
          orbit={
            <OrbitPlot
              traj={schwarzschild.traj}
              horizon={schwarzschild.horizon}
              photonSphere={schwarzschild.photonSphere}
              plotTheme={plotTheme}
              baseLayout={baseLayout}
              axisBase={axisBase}
            />
          }
        />
      ) : (
        <SimulationLayout
          title="Buraco negro NC - TCC/legado"
          description="Modelo nao comutativo legado com potencial polinomial e densidade de massa espalhada."
          parameters={
            <LegacyNcParameterPanel
              legacyParams={legacy.legacyParams}
              legacyTraj={legacy.legacyTraj}
              legacyVeff={legacy.legacyVeff}
              setLegacyNum={legacy.setLegacyNum}
              setLegacyStr={legacy.setLegacyStr}
              setLegacyBool={legacy.setLegacyBool}
              applyLegacyPreset={legacy.applyLegacyPreset}
              runLegacySimulation={legacy.runLegacySimulation}
              runLegacyPotential={legacy.runLegacyPotential}
              resetLegacyDefaults={legacy.resetLegacyDefaults}
              legacyOrbitLoading={legacy.legacyOrbitLoading}
              legacyPotentialLoading={legacy.legacyPotentialLoading}
              legacyOrbitErr={legacy.legacyOrbitErr}
              legacyPotentialErr={legacy.legacyPotentialErr}
            />
          }
          potential={
            <LegacyNcPotentialPlot
              legacyVeff={legacy.legacyVeff}
              plotTheme={plotTheme}
              baseLayout={baseLayout}
              axisBase={axisBase}
            />
          }
          orbit={
            <LegacyNcOrbitPlot
              legacyTraj={legacy.legacyTraj}
              plotTheme={plotTheme}
              baseLayout={baseLayout}
              axisBase={axisBase}
            />
          }
        />
      )}
    </div>
  );
}
