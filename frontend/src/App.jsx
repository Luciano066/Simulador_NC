import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { MapleOrbitPlot } from "./components/MapleOrbitPlot";
import { MapleParameterPanel } from "./components/MapleParameterPanel";
import { MaplePotentialPlot } from "./components/MaplePotentialPlot";
import { NcOrbitPlot } from "./components/NcOrbitPlot";
import { NcParameterPanel } from "./components/NcParameterPanel";
import { NcPotentialPlot } from "./components/NcPotentialPlot";
import { OrbitPlot } from "./components/OrbitPlot";
import { ParameterPanel } from "./components/ParameterPanel";
import { PotentialPlot } from "./components/PotentialPlot";
import { useMapleSimulation } from "./hooks/useMapleSimulation";
import { useNcSimulation } from "./hooks/useNcSimulation";
import { useSchwarzschildSimulation } from "./hooks/useSchwarzschildSimulation";

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const schwarzschild = useSchwarzschildSimulation();
  const nc = useNcSimulation();
  const maple = useMapleSimulation();

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  const plotTheme = useMemo(() => {
    if (darkMode) {
      return {
        paper: "#181F2F",
        plot: "#181F2F",
        grid: "#353549",
        text: "#ffffff",
        accent: "#FFC700",
        horizonFill: "rgba(255,255,255,0.08)",
      };
    }
    return {
      paper: "#f6f6f6",
      plot: "#f6f6f6",
      grid: "#c1bfbf",
      text: "#000000",
      accent: "#ffdb57",
      horizonFill: "rgba(0,0,0,0.08)",
    };
  }, [darkMode]);

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
      <Header
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((value) => !value)}
        particle={schwarzschild.p.particle}
        onParticleChange={(particle) => schwarzschild.setP((state) => ({ ...state, particle }))}
      />

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
        runOrbit={schwarzschild.runOrbit}
        runPotential={schwarzschild.runPotential}
        phiMax={schwarzschild.phi_max}
        b={schwarzschild.b}
        bcrit={schwarzschild.bcrit}
        energyParam={schwarzschild.energyParam}
        energyLabel={schwarzschild.energyLabel}
        orbitErr={schwarzschild.orbitErr}
        potentialErr={schwarzschild.potentialErr}
      />

      <OrbitPlot
        traj={schwarzschild.traj}
        horizon={schwarzschild.horizon}
        photonSphere={schwarzschild.photonSphere}
        plotTheme={plotTheme}
        baseLayout={baseLayout}
        axisBase={axisBase}
      />

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

      <NcParameterPanel
        ncOrbit={nc.ncOrbit}
        ncPotential={nc.ncPotential}
        setNcOrbitNum={nc.setNcOrbitNum}
        setNcOrbitStr={nc.setNcOrbitStr}
        setNcPotentialNum={nc.setNcPotentialNum}
        setNcPotentialStr={nc.setNcPotentialStr}
        runNCOrbit={nc.runNCOrbit}
        runNCPotential={nc.runNCPotential}
        applyNcPreset={nc.applyNcPreset}
        ncOrbitLoading={nc.ncOrbitLoading}
        ncPotentialLoading={nc.ncPotentialLoading}
        ncPhiMax={nc.ncPhiMax}
        ncB={nc.ncB}
        ncOrbitErr={nc.ncOrbitErr}
        ncPotentialErr={nc.ncPotentialErr}
      />

      <NcOrbitPlot ncTraj={nc.ncTraj} plotTheme={plotTheme} baseLayout={baseLayout} axisBase={axisBase} />

      <NcPotentialPlot
        ncPotential={nc.ncPotential}
        ncVeff={nc.ncVeff}
        plotTheme={plotTheme}
        baseLayout={baseLayout}
        axisBase={axisBase}
      />

      <MapleParameterPanel
        mapleParams={maple.mapleParams}
        mapleTraj={maple.mapleTraj}
        mapleVeff={maple.mapleVeff}
        setMapleNum={maple.setMapleNum}
        applyMaplePreset={maple.applyMaplePreset}
        runMapleOrbit={maple.runMapleOrbit}
        runMaplePotential={maple.runMaplePotential}
        mapleOrbitLoading={maple.mapleOrbitLoading}
        maplePotentialLoading={maple.maplePotentialLoading}
        mapleOrbitErr={maple.mapleOrbitErr}
        maplePotentialErr={maple.maplePotentialErr}
      />

      <MapleOrbitPlot
        mapleTraj={maple.mapleTraj}
        plotTheme={plotTheme}
        baseLayout={baseLayout}
        axisBase={axisBase}
      />

      <MaplePotentialPlot
        mapleVeff={maple.mapleVeff}
        plotTheme={plotTheme}
        baseLayout={baseLayout}
        axisBase={axisBase}
      />
    </div>
  );
}
