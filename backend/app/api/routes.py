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
    VeffNCMapleRequest,
    VeffNCMapleResponse,
    SimulateNCMapleRequest,
    SimulateNCMapleResponse,
)
from app.core.observables import (
    energy_nc_maple,
    nc_maple_horizons,
    veff2_schwarzschild,
    veff_nc_maple as veff_nc_maple_observable,
    ueff_schwarzschild,
    veff_nc_schwarzschild,
    nc_horizons,
)
from app.core.geodesics import orbit_nc_maple, orbit_u_phi, orbit_r_phi_nc

router = APIRouter()
logger = logging.getLogger(__name__)

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
    horizons = nc_horizons(req.M, req.theta)
    r_outer = horizons[-1] if horizons else None
    r = np.linspace(req.r_min, req.r_max, req.n, dtype=np.float64)
    V = veff_nc_schwarzschild(r=r, M=req.M, theta=req.theta, L=req.L, particle=req.particle)

    return VeffNCResponse(
        r=r.tolist(),
        V_eff=V.tolist(),
        meta={
            "metric": req.metric,
            "particle": req.particle,
            "M": req.M,
            "theta": req.theta,
            "E": req.E,
            "L": req.L,
            "b": (req.L / req.E) if req.E != 0 else None,
            "has_horizon": bool(horizons),
            "horizons": horizons,
            "r_outer_horizon": r_outer,
            "n": req.n,
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
    horizons = nc_horizons(req.M, req.theta)
    r_outer = horizons[-1] if horizons else None
    if r_outer is not None and req.r0 <= r_outer:
        raise HTTPException(
            status_code=400,
            detail=f"r0 deve ser > r_+ (horizonte externo). r_+={r_outer:.6g}",
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

    captured = bool(r_outer is not None and len(r) > 0 and np.min(r) <= (r_outer * 1.0005))
    clipped_by_r_stop = bool(req.r_stop is not None and len(r) > 0 and np.max(r) >= req.r_stop)
    termination_reason = "captured" if captured else "r_stop" if clipped_by_r_stop else "phi_max"
    logger.info(
        "simulate_nc termination=%s M=%s theta=%s E=%s L=%s r0=%s points=%s",
        termination_reason,
        req.M,
        req.theta,
        req.E,
        req.L,
        req.r0,
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
            "E": req.E,
            "L": req.L,
            "b": (req.L / req.E) if req.E != 0 else None,
            "r0": req.r0,
            "r_stop": req.r_stop,
            "radial_sign": req.radial_sign,
            "phi_max": req.phi_max,
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
