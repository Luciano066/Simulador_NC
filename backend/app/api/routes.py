import logging

import numpy as np
from fastapi import APIRouter, HTTPException

from app.schemas import (
    VeffRequest,
    VeffResponse,
    SimulateRequest,
    SimulateResponse,
    VeffNCRequest,
    VeffNCResponse,
    SimulateNCRequest,
    SimulateNCResponse,
    VeffNCLegacyRequest,
    VeffNCLegacyResponse,
    SimulateNCLegacyRequest,
    SimulateNCLegacyResponse,
    VeffNCMapleRequest,
    VeffNCMapleResponse,
    SimulateNCMapleRequest,
    SimulateNCMapleResponse,
)
from app.core.observables import (
    energy_nc_maple,
    critical_points_legacy,
    kappa_from_particle,
    legacy_rst_massive,
    nc_maple_horizons,
    potencial_foton_nc,
    potencial_massiva_nc,
    veff2_schwarzschild,
    veff_nc_maple as veff_nc_maple_observable,
    ueff_schwarzschild,
    veff_nc_schwarzschild,
    nc_horizons,
)
from app.core.geodesics import orbit_nc_maple, orbit_u_phi, orbit_r_phi_nc, orbita_foton_nc, orbita_massiva_nc

router = APIRouter()
logger = logging.getLogger("uvicorn.error")


def _finite_min_max(values: np.ndarray) -> tuple[float | None, float | None]:
    finite = values[np.isfinite(values)]
    if len(finite) == 0:
        return None, None
    return float(np.min(finite)), float(np.max(finite))


def _nc_effective_k(particle: str, K: float | None) -> float:
    return kappa_from_particle(particle) if K is None else K


def _serialize_nc_critical_points(r: np.ndarray, V: np.ndarray, r_outer: float | None) -> dict[str, list[dict[str, float | str | bool]]]:
    from scipy.signal import find_peaks

    finite = np.isfinite(r) & np.isfinite(V)
    r_finite = r[finite]
    V_finite = V[finite]
    if len(r_finite) < 3:
        return {"maxima": [], "minima": []}

    maxima_ids, _ = find_peaks(V_finite, distance=10)
    minima_ids, _ = find_peaks(-V_finite, distance=10)

    def serialize(indexes: np.ndarray, stability: str) -> list[dict[str, float | str | bool]]:
        points: list[dict[str, float | str | bool]] = []
        for index in indexes:
            rr = float(r_finite[index])
            vv = float(V_finite[index])
            if not np.isfinite(rr) or not np.isfinite(vv):
                continue
            points.append(
                {
                    "r": rr,
                    "V_eff": vv,
                    "stability": stability,
                    "inside_outer_horizon": bool(r_outer is not None and rr <= r_outer),
                }
            )
        return points

    return {
        "maxima": serialize(maxima_ids, "unstable"),
        "minima": serialize(minima_ids, "stable"),
    }


def _select_nc_extrema(
    r: np.ndarray,
    V: np.ndarray,
    critical_points: dict[str, list[dict[str, float | str | bool]]],
    r_outer: float | None,
) -> dict:
    finite = np.isfinite(r) & np.isfinite(V)
    if not np.any(finite):
        return {"V_min": None, "V_max": None, "r_at_V_min": None, "r_at_V_max": None}

    def outside(points: list[dict[str, float | str | bool]]) -> list[dict[str, float | str | bool]]:
        if r_outer is None:
            return points
        outside_points = [point for point in points if float(point["r"]) > r_outer]
        return outside_points or points

    minima = outside(critical_points.get("minima", []))
    maxima = outside(critical_points.get("maxima", []))

    if minima:
        min_point = min(minima, key=lambda point: float(point["V_eff"]))
        V_min = float(min_point["V_eff"])
        r_at_V_min = float(min_point["r"])
    else:
        indexes = np.where(finite)[0]
        idx = int(indexes[np.argmin(V[finite])])
        V_min = float(V[idx])
        r_at_V_min = float(r[idx])

    if maxima:
        max_point = max(maxima, key=lambda point: float(point["V_eff"]))
        V_max = float(max_point["V_eff"])
        r_at_V_max = float(max_point["r"])
    else:
        indexes = np.where(finite)[0]
        idx = int(indexes[np.argmax(V[finite])])
        V_max = float(V[idx])
        r_at_V_max = float(r[idx])

    return {
        "V_min": V_min,
        "V_max": V_max,
        "r_at_V_min": r_at_V_min,
        "r_at_V_max": r_at_V_max,
    }


def _nc_delta_diagnostics(r: np.ndarray, V: np.ndarray, E: float) -> dict:
    finite = np.isfinite(r) & np.isfinite(V)
    if len(r) == 0 or not np.any(finite):
        return {
            "delta_min": None,
            "delta_max": None,
            "forbidden_fraction": None,
            "trajectory_warning": None,
        }

    delta = E - V[finite]
    forbidden_fraction = float(np.mean(delta < -1.0e-8))
    return {
        "delta_min": float(np.min(delta)),
        "delta_max": float(np.max(delta)),
        "forbidden_fraction": forbidden_fraction,
        "trajectory_warning": "A trajetória atravessa região proibida: E < V_eff."
        if forbidden_fraction > 0.0
        else None,
    }


def _nc_circular_orbit_status(E: float, extrema: dict, tolerance: float = 1.0e-4) -> str | None:
    for key, status in (("V_max", "unstable"), ("V_min", "stable")):
        value = extrema.get(key)
        if value is None:
            continue
        scale = max(1.0, abs(float(value)), abs(E))
        if abs(E - float(value)) <= tolerance * scale:
            return status
    return None


def _legacy_rst(particle: str, L: float, rst: float | None) -> float:
    if rst is not None:
        return rst
    if particle == "massive":
        return legacy_rst_massive(L)
    return 50.0


def _legacy_default_potential_r_max(particle: str, rst: float) -> float:
    if particle == "massive":
        return 2.0 * rst
    return rst


def _legacy_energy_level(particle: str, E: float, b: float) -> float:
    if particle == "massive":
        return E
    if particle == "photon":
        return 1.0 / (b * b)
    raise ValueError("particle must be massive or photon")


def _legacy_potential(r: np.ndarray, particle: str, L: float, theta: float) -> np.ndarray:
    if particle == "massive":
        return potencial_massiva_nc(r, L, theta)
    if particle == "photon":
        return potencial_foton_nc(r, theta)
    raise ValueError("particle must be massive or photon")


def _legacy_orbit_diagnostics(r: np.ndarray, V: np.ndarray, energy_level: float) -> dict:
    finite = np.isfinite(r) & np.isfinite(V)
    if len(r) == 0 or not np.any(finite):
        return {
            "delta_min": None,
            "delta_max": None,
            "forbidden_fraction": None,
            "r_min_orbit": None,
            "r_max_orbit": None,
            "V_min_on_orbit": None,
            "V_max_on_orbit": None,
            "warning": None,
        }

    r_finite = r[finite]
    V_finite = V[finite]
    delta = energy_level - V_finite
    forbidden_fraction = float(np.mean(delta < -1.0e-8))
    warning = (
        "A órbita atravessa região proibida: potencial e órbita podem estar incoerentes."
        if forbidden_fraction > 0.0
        else None
    )

    return {
        "delta_min": float(np.min(delta)),
        "delta_max": float(np.max(delta)),
        "forbidden_fraction": forbidden_fraction,
        "r_min_orbit": float(np.min(r_finite)),
        "r_max_orbit": float(np.max(r_finite)),
        "V_min_on_orbit": float(np.min(V_finite)),
        "V_max_on_orbit": float(np.max(V_finite)),
        "warning": warning,
    }

@router.get("/health")
def health():
    return {"status": "ok"}

@router.post("/veff", response_model=VeffResponse)
def veff(req: VeffRequest):
    r_h = 2.0 * req.M
    if req.r_min <= r_h:
        raise HTTPException(status_code=400, detail=f"r_min deve ser > 2M. 2M={r_h:.6g}")

    r = np.linspace(req.r_min, req.r_max, req.n, dtype=np.float64)

    V2 = veff2_schwarzschild(r=r, M=req.M, E=req.E, L=req.L, particle=req.particle)
    U = ueff_schwarzschild(r=r, M=req.M, L=req.L, particle=req.particle)

    return VeffResponse(
        r=r.tolist(),
        U_eff=U.tolist(),
        V_eff2=V2.tolist(),
        meta={
            "metric": req.metric,
            "particle": req.particle,
            "M": req.M,
            "E": req.E,
            "L": req.L,
            "b": (req.L / req.E) if req.E != 0 else None,
            "E2": req.E * req.E,
            "r_horizon": r_h,
            "photon_sphere": 3.0 * req.M,
            "n": req.n,
        },
    )

@router.post("/veff_nc", response_model=VeffNCResponse)
def veff_nc(req: VeffNCRequest):
    logger.info("nc-completo potential payload=%s", req.model_dump())
    horizons = nc_horizons(req.M, req.theta)
    r_outer = horizons[-1] if horizons else None
    K = _nc_effective_k(req.particle, req.K)
    mass_concentration_radius = 3.0 * float(np.sqrt(req.theta))
    r = np.linspace(req.r_min, req.r_max, req.n, dtype=np.float64)
    V = veff_nc_schwarzschild(r=r, M=req.M, theta=req.theta, L=req.L, particle=req.particle, K=K)
    v_min, v_max = _finite_min_max(V)
    critical_points = _serialize_nc_critical_points(r, V, r_outer)
    extrema = _select_nc_extrema(r, V, critical_points, r_outer)
    delta_diagnostics = _nc_delta_diagnostics(r, V, req.E)
    circular_orbit = _nc_circular_orbit_status(req.E, extrema)
    logger.info(
        "nc-completo potential first_r=%s last_r=%s min_V=%s max_V=%s E=%s points=%s",
        float(r[0]),
        float(r[-1]),
        v_min,
        v_max,
        req.E,
        len(r),
    )

    return VeffNCResponse(
        r=r.tolist(),
        V_eff=V.tolist(),
        meta={
            "metric": req.metric,
            "particle": req.particle,
            "M": req.M,
            "theta": req.theta,
            "K": K,
            "E": req.E,
            "L": req.L,
            "b": (req.L / req.E) if req.E != 0 else None,
            "mode": "nc-tcc",
            "physical_model": "nc-tcc-eq47",
            "mass_concentration_radius": mass_concentration_radius,
            "has_horizon": bool(horizons),
            "horizons": horizons,
            "r_outer_horizon": r_outer,
            "V_min_raw": v_min,
            "V_max_raw": v_max,
            "critical_points": critical_points,
            "circular_orbit": circular_orbit,
            **extrema,
            **delta_diagnostics,
            "n": req.n,
        },
    )


@router.post("/veff_nc_legacy", response_model=VeffNCLegacyResponse)
def veff_nc_legacy(req: VeffNCLegacyRequest):
    logger.info("nc-legado potential payload=%s", req.model_dump())
    rst = _legacy_rst(req.particle, req.L, req.rst)
    r_max = req.r_max if req.r_max is not None else _legacy_default_potential_r_max(req.particle, rst)
    mass_concentration_radius = 3.0 * float(np.sqrt(req.theta))
    if r_max <= req.r_min:
        raise HTTPException(status_code=400, detail="r_max/rst must be greater than r_min")

    r = np.linspace(req.r_min, r_max, req.n, dtype=np.float64)
    try:
        V = _legacy_potential(r, req.particle, req.L, req.theta)
        energy_level = _legacy_energy_level(req.particle, req.E, req.b)
    except ValueError:
        raise HTTPException(status_code=400, detail="particle must be massive or photon")

    critical_points = critical_points_legacy(r, V)
    v_min, v_max = _finite_min_max(V)
    logger.info(
        "nc-legado potential first_r=%s last_r=%s min_V=%s max_V=%s E=%s points=%s",
        float(r[0]),
        float(r[-1]),
        v_min,
        v_max,
        energy_level,
        len(r),
    )

    return VeffNCLegacyResponse(
        r=r.tolist(),
        V_eff=V.tolist(),
        meta={
            "metric": req.metric,
            "mode": "nc-legado",
            "physical_model": "nc-legacy-polynomial",
            "particle": req.particle,
            "theta": req.theta,
            "mass_concentration_radius": mass_concentration_radius,
            "L": req.L,
            "E": req.E,
            "b": req.b,
            "energy_level": energy_level,
            "energy_line_convention": "E" if req.particle == "massive" else "1/b^2",
            "rst": rst,
            "r_min": req.r_min,
            "r_max": r_max,
            "n": req.n,
            "V_min": v_min,
            "V_max": v_max,
            "critical_points": critical_points,
        },
    )


@router.post("/veff_nc_maple", response_model=VeffNCMapleResponse)
def veff_nc_maple(req: VeffNCMapleRequest):
    horizons = nc_maple_horizons(req.m, req.theta)
    r_outer = horizons[-1] if horizons else None
    energy = energy_nc_maple(
        m=req.m,
        theta=req.theta,
        kappa=req.kappa,
        L=req.L,
        u0=req.u0,
        du0=req.du0,
    )
    r = np.linspace(req.r_min, req.r_max, req.n, dtype=np.float64)
    V = veff_nc_maple_observable(r=r, m=req.m, theta=req.theta, kappa=req.kappa, L=req.L)

    return VeffNCMapleResponse(
        r=r.tolist(),
        V_eff=V.tolist(),
        meta={
            "metric": req.metric,
            "physical_model": "nc-maple-approximation",
            "m": req.m,
            "theta": req.theta,
            "kappa": req.kappa,
            "L": req.L,
            "u0": req.u0,
            "du0": req.du0,
            "r0": 1.0 / req.u0,
            "E": energy,
            "capture_radius": 0.1,
            "has_horizon": bool(horizons),
            "horizons": horizons,
            "r_outer_horizon": r_outer,
            "n": req.n,
        },
    )


@router.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest):
    r_h = 2.0 * req.M
    if req.r0 <= r_h:
        raise HTTPException(status_code=400, detail=f"r0 deve ser > 2M. 2M={r_h:.6g}")

    try:
        phi, r = orbit_u_phi(
            M=req.M,
            L=req.L,
            r0=req.r0,
            E=req.E,
            radial_sign=req.radial_sign,
            phi_max=req.phi_max,
            n=req.n,
            particle=req.particle,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    x = r * np.cos(phi)
    y = r * np.sin(phi)

    valid = np.isfinite(r) & np.isfinite(x) & np.isfinite(y)
    if not np.all(valid):
        first_invalid = int(np.argmax(~valid))
        phi = phi[:first_invalid]
        r = r[:first_invalid]
        x = x[:first_invalid]
        y = y[:first_invalid]

    captured = bool(len(r) > 0 and np.min(r) <= (r_h * 1.0005))

    return SimulateResponse(
        phi=phi.tolist(),
        r=r.tolist(),
        x=x.tolist(),
        y=y.tolist(),
        meta={
            "metric": req.metric,
            "particle": req.particle,
            "M": req.M,
            "E": req.E,
            "E2": req.E * req.E,
            "L": req.L,
            "b": (req.L / req.E) if req.E != 0 else None,
            "r0": req.r0,
            "radial_sign": req.radial_sign,
            "phi_max": req.phi_max,
            "n": req.n,
            "r_horizon": r_h,
            "photon_sphere": 3.0 * req.M,
            "captured": captured,
            "points_returned": int(len(r)),
        },
    )

@router.post("/simulate_nc", response_model=SimulateNCResponse)
def simulate_nc(req: SimulateNCRequest):
    logger.info("nc-completo orbit payload=%s", req.model_dump())
    horizons = nc_horizons(req.M, req.theta)
    r_outer = horizons[-1] if horizons else None
    K = _nc_effective_k(req.particle, req.K)
    capture_candidates = [value for value in (r_outer, req.r_stop) if value is not None]
    r_capture = max(capture_candidates) if capture_candidates else None
    if r_capture is not None and req.r0 <= r_capture:
        raise HTTPException(
            status_code=400,
            detail=f"r0 deve iniciar fora do raio de captura NC. r0={req.r0:.6g}, r_capture={r_capture:.6g}",
        )

    try:
        phi, r = orbit_r_phi_nc(
            M=req.M,
            theta=req.theta,
            L=req.L,
            r0=req.r0,
            E=req.E,
            radial_sign=req.radial_sign,
            phi_max=req.phi_max,
            n=req.n,
            particle=req.particle,
            r_outer_horizon=r_outer,
            r_stop=req.r_stop,
            K=K,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    x = r * np.cos(phi)
    y = r * np.sin(phi)

    valid = np.isfinite(r) & np.isfinite(x) & np.isfinite(y)
    if not np.all(valid):
        first_invalid = int(np.argmax(~valid))
        phi = phi[:first_invalid]
        r = r[:first_invalid]
        x = x[:first_invalid]
        y = y[:first_invalid]

    V_orbit = veff_nc_schwarzschild(r=r, M=req.M, theta=req.theta, L=req.L, particle=req.particle, K=K)
    critical_points = _serialize_nc_critical_points(r, V_orbit, r_outer)
    extrema = _select_nc_extrema(r, V_orbit, critical_points, r_outer)
    delta_diagnostics = _nc_delta_diagnostics(r, V_orbit, req.E)
    circular_orbit = _nc_circular_orbit_status(req.E, extrema)
    v_min, v_max = _finite_min_max(V_orbit)
    captured = bool(r_capture is not None and len(r) > 0 and np.min(r) <= (r_capture * 1.0005))
    stopped_at_r_stop = bool(req.r_stop is not None and len(r) > 0 and np.min(r) <= (req.r_stop * 1.0005))
    termination_reason = "captured" if captured else "phi_max"
    first_r = float(r[0]) if len(r) else None
    last_r = float(r[-1]) if len(r) else None
    logger.info(
        "simulate_nc termination=%s M=%s theta=%s E=%s L=%s r0=%s first_r=%s last_r=%s points=%s",
        termination_reason,
        req.M,
        req.theta,
        req.E,
        req.L,
        req.r0,
        first_r,
        last_r,
        len(r),
    )

    return SimulateNCResponse(
        phi=phi.tolist(),
        r=r.tolist(),
        x=x.tolist(),
        y=y.tolist(),
        meta={
            "metric": req.metric,
            "particle": req.particle,
            "M": req.M,
            "theta": req.theta,
            "K": K,
            "E": req.E,
            "L": req.L,
            "b": (req.L / req.E) if req.E != 0 else None,
            "mode": "nc-tcc",
            "physical_model": "nc-tcc-eq47",
            "r0": req.r0,
            "r_stop": req.r_stop,
            "r_capture": r_capture,
            "capture_radius_effective": r_capture,
            "radial_sign": req.radial_sign,
            "phi_max": req.phi_max,
            "n": req.n,
            "has_horizon": bool(horizons),
            "horizons": horizons,
            "r_outer_horizon": r_outer,
            "captured": captured,
            "clipped_by_r_stop": False,
            "stopped_at_r_stop": stopped_at_r_stop,
            "termination_reason": termination_reason,
            "V_min_raw": v_min,
            "V_max_raw": v_max,
            "critical_points": critical_points,
            "circular_orbit": circular_orbit,
            **extrema,
            **delta_diagnostics,
            "points_returned": int(len(r)),
        },
    )


@router.post("/simulate_nc_legacy", response_model=SimulateNCLegacyResponse)
def simulate_nc_legacy(req: SimulateNCLegacyRequest):
    logger.info("nc-legado orbit payload=%s", req.model_dump())
    rst = _legacy_rst(req.particle, req.L, req.rst)

    try:
        if req.particle == "massive":
            phi, r, V = orbita_massiva_nc(
                L=req.L,
                E=req.E,
                rst=rst,
                norbit=req.norbit,
                theta=req.theta,
                n_points=req.n,
            )
        elif req.particle == "photon":
            phi, r, V = orbita_foton_nc(
                b=req.b,
                rst=rst,
                theta=req.theta,
                n_points=req.n,
            )
        else:
            raise ValueError("particle must be massive or photon")
        energy_level = _legacy_energy_level(req.particle, req.E, req.b)
    except ValueError as exc:
        logger.warning("simulate_nc_legacy failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    x = r * np.cos(phi)
    y = r * np.sin(phi)

    valid = np.isfinite(phi) & np.isfinite(r) & np.isfinite(V) & np.isfinite(x) & np.isfinite(y)
    if not np.all(valid):
        first_invalid = int(np.argmax(~valid))
        phi = phi[:first_invalid]
        r = r[:first_invalid]
        V = V[:first_invalid]
        x = x[:first_invalid]
        y = y[:first_invalid]

    V = _legacy_potential(r, req.particle, req.L, req.theta)
    diagnostics = _legacy_orbit_diagnostics(r, V, energy_level)
    captured = bool(len(r) > 0 and np.min(r) <= (req.capture_radius * 1.002))
    returned = bool(len(r) > 2 and not captured and abs(float(r[-1]) - float(r[0])) <= max(1.0e-6, 0.01 * rst))
    termination_reason = "captured" if captured else "turning_point" if returned else "u_max"
    v_min, v_max = _finite_min_max(V)
    first_r = float(r[0]) if len(r) else None
    last_r = float(r[-1]) if len(r) else None
    logger.info(
        "nc-legado orbit termination=%s first_r=%s last_r=%s min_V=%s max_V=%s E=%s points=%s",
        termination_reason,
        first_r,
        last_r,
        v_min,
        v_max,
        energy_level,
        len(r),
    )

    return SimulateNCLegacyResponse(
        phi=phi.tolist(),
        r=r.tolist(),
        V_eff=V.tolist(),
        x=x.tolist(),
        y=y.tolist(),
        meta={
            "metric": req.metric,
            "mode": "nc-legado",
            "physical_model": "nc-legacy-polynomial",
            "particle": req.particle,
            "theta": req.theta,
            "L": req.L,
            "E": req.E,
            "b": req.b,
            "energy_level": energy_level,
            "energy_line_convention": "E" if req.particle == "massive" else "1/b^2",
            "rst": rst,
            "norbit": req.norbit,
            "capture_radius": req.capture_radius,
            "captured": captured,
            "returned": returned,
            "termination_reason": termination_reason,
            "points_returned": int(len(r)),
            "first_r": first_r,
            "last_r": last_r,
            "V_min": v_min,
            "V_max": v_max,
            **diagnostics,
        },
    )


@router.post("/simulate_nc_maple", response_model=SimulateNCMapleResponse)
def simulate_nc_maple(req: SimulateNCMapleRequest):
    horizons = nc_maple_horizons(req.m, req.theta)
    r_outer = horizons[-1] if horizons else None
    capture_candidates = [value for value in (r_outer, req.capture_radius) if value is not None]
    capture_radius_effective = max(capture_candidates) if capture_candidates else None
    r0 = 1.0 / req.u0
    if capture_radius_effective is not None and r0 <= capture_radius_effective:
        raise HTTPException(
            status_code=400,
            detail=f"r0 must start outside the Maple/TCC capture radius. r0={r0:.6g}, r_capture={capture_radius_effective:.6g}",
        )
    energy = energy_nc_maple(
        m=req.m,
        theta=req.theta,
        kappa=req.kappa,
        L=req.L,
        u0=req.u0,
        du0=req.du0,
    )

    try:
        phi, u, r = orbit_nc_maple(
            m=req.m,
            theta=req.theta,
            kappa=req.kappa,
            L=req.L,
            u0=req.u0,
            du0=req.du0,
            phi_max=req.phi_max,
            n=req.n,
            r_outer_horizon=r_outer,
            r_stop=req.r_stop,
            capture_radius=req.capture_radius,
        )
    except ValueError as exc:
        logger.warning("simulate_nc_maple integration failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    x = r * np.cos(phi)
    y = r * np.sin(phi)

    valid = np.isfinite(phi) & np.isfinite(u) & np.isfinite(r) & np.isfinite(x) & np.isfinite(y)
    if not np.all(valid):
        first_invalid = int(np.argmax(~valid))
        phi = phi[:first_invalid]
        u = u[:first_invalid]
        r = r[:first_invalid]
        x = x[:first_invalid]
        y = y[:first_invalid]

    captured = bool(
        capture_radius_effective is not None and len(r) > 0 and np.min(r) <= (capture_radius_effective * 1.0005)
    )
    clipped_by_r_stop = bool(req.r_stop is not None and len(r) > 0 and np.max(r) >= req.r_stop)
    termination_reason = "captured" if captured else "r_stop" if clipped_by_r_stop else "phi_max"
    logger.info(
        "simulate_nc_maple termination=%s m=%s theta=%s kappa=%s L=%s u0=%s du0=%s E=%s points=%s",
        termination_reason,
        req.m,
        req.theta,
        req.kappa,
        req.L,
        req.u0,
        req.du0,
        energy,
        len(r),
    )

    return SimulateNCMapleResponse(
        phi=phi.tolist(),
        u=u.tolist(),
        r=r.tolist(),
        x=x.tolist(),
        y=y.tolist(),
        meta={
            "metric": req.metric,
            "physical_model": "nc-maple-approximation",
            "m": req.m,
            "theta": req.theta,
            "kappa": req.kappa,
            "L": req.L,
            "u0": req.u0,
            "du0": req.du0,
            "r0": r0,
            "E": energy,
            "phi_max": req.phi_max,
            "r_stop": req.r_stop,
            "capture_radius": req.capture_radius,
            "capture_radius_effective": capture_radius_effective,
            "n": req.n,
            "has_horizon": bool(horizons),
            "horizons": horizons,
            "r_outer_horizon": r_outer,
            "captured": captured,
            "clipped_by_r_stop": clipped_by_r_stop,
            "termination_reason": termination_reason,
            "points_returned": int(len(r)),
        },
    )
