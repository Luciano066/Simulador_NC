import numpy as np
from scipy.integrate import solve_ivp

from app.core.observables import (
    f_nc_schwarzschild,
    f_schwarzschild,
    fprime_nc_schwarzschild,
    nc_horizons,
    veff_nc_schwarzschild,
)

RTOL = 1.0e-9
ATOL = 1.0e-11


def _append_terminal_event(
    phi: np.ndarray,
    y: np.ndarray,
    event_times: list[np.ndarray],
    event_states: list[np.ndarray],
    include_event_indexes: set[int],
) -> tuple[np.ndarray, np.ndarray]:
    candidates: list[tuple[float, np.ndarray]] = []
    for index, times in enumerate(event_times):
        if index not in include_event_indexes or len(times) == 0:
            continue
        candidates.append((float(times[0]), event_states[index][0]))

    if not candidates:
        return phi, y

    event_phi, event_y = min(candidates, key=lambda item: item[0])
    if len(phi) == 0 or event_phi > float(phi[-1]) + 1.0e-12:
        phi = np.append(phi, event_phi)
        y = np.column_stack((y, event_y))

    return phi, y


def _finite_orbit(phi: np.ndarray, u: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    valid = np.isfinite(phi) & np.isfinite(u) & (u > 0.0)
    if not np.all(valid):
        first_invalid = int(np.argmax(~valid))
        phi = phi[:first_invalid]
        u = u[:first_invalid]

    return phi, 1.0 / u


def _drdphi0_from_E(M: float, E: float, L: float, r0: float, particle: str, radial_sign: str) -> float:
    """
    Initial dr/dphi consistent with E, L and r0.

    There is no real trajectory when E^2 < V_eff^2(r0).
    """
    f0 = float(f_schwarzschild(np.array([r0], dtype=np.float64), M)[0])

    if particle == "massive":
        veff2 = f0 * (1.0 + (L * L) / (r0 * r0))
    elif particle == "photon":
        veff2 = f0 * ((L * L) / (r0 * r0))
    else:
        raise ValueError("particle must be 'massive' or 'photon'")

    E2 = E * E
    inside = (r0**4 / (L**2)) * (E2 - veff2)

    if inside < 0:
        raise ValueError(
            f"Forbidden parameters at r0={r0:.6g}: E^2={E2:.6g} < V_eff^2(r0)={veff2:.6g}. "
            f"Adjust E/L or choose another r0."
        )

    mag = float(np.sqrt(inside))
    sign = -1.0 if radial_sign == "in" else 1.0
    return sign * mag


def orbit_u_phi(
    M: float,
    L: float,
    r0: float,
    E: float,
    radial_sign: str,
    phi_max: float,
    n: int,
    particle: str,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Integrate a Schwarzschild orbit using u(phi)=1/r.

    Massive: u'' + u = M/L^2 + 3 M u^2
    Photon:  u'' + u = 3 M u^2
    """
    if M <= 0:
        raise ValueError("M > 0")
    if L <= 0:
        raise ValueError("L > 0")
    if r0 <= 0:
        raise ValueError("r0 > 0")
    if phi_max <= 0:
        raise ValueError("phi_max > 0")
    if n < 10:
        raise ValueError("n >= 10")

    drdphi0 = _drdphi0_from_E(M=M, E=E, L=L, r0=r0, particle=particle, radial_sign=radial_sign)
    u0 = 1.0 / r0
    up0 = -(1.0 / (r0 * r0)) * drdphi0
    L2 = L * L
    r_capture = 2.0 * M * 1.0005
    u_floor = 1.0e-12

    def rhs(_phi: float, y: np.ndarray) -> list[float]:
        u_val, up_val = float(y[0]), float(y[1])
        if particle == "massive":
            source = (M / L2) + (3.0 * M * u_val * u_val)
        elif particle == "photon":
            source = 3.0 * M * u_val * u_val
        else:
            raise ValueError("particle must be 'massive' or 'photon'")
        return [up_val, source - u_val]

    def capture_event(_phi: float, y: np.ndarray) -> float:
        u_val = float(y[0])
        if u_val <= 0.0:
            return -1.0
        return (1.0 / u_val) - r_capture

    def escape_event(_phi: float, y: np.ndarray) -> float:
        return float(y[0]) - u_floor

    capture_event.terminal = True
    capture_event.direction = -1
    escape_event.terminal = True
    escape_event.direction = -1

    phi_eval = np.linspace(0.0, phi_max, n, dtype=np.float64)
    sol = solve_ivp(
        rhs,
        (0.0, phi_max),
        [u0, up0],
        t_eval=phi_eval,
        events=[capture_event, escape_event],
        rtol=RTOL,
        atol=ATOL,
    )

    if not sol.success and all(len(times) == 0 for times in sol.t_events):
        raise ValueError(f"Orbit integration failed: {sol.message}")

    phi, y = _append_terminal_event(sol.t, sol.y, sol.t_events, sol.y_events, include_event_indexes={0})
    return _finite_orbit(phi, y[0])


def orbit_r_phi_nc(
    M: float,
    theta: float,
    L: float,
    r0: float,
    E: float,
    radial_sign: str,
    phi_max: float,
    n: int,
    particle: str,
    r_outer_horizon: float | None = None,
    r_stop: float | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Integrate a noncommutative Schwarzschild orbit with u(phi)=1/r.

    The NC convention is:
      (1/2) (dr/dlambda)^2 + V_eff(r) = E
      V_eff(r) = f(r) * (K + L^2/(2 r^2))
    with K=1/2 for massive particles and K=0 for photons.
    """
    if M <= 0:
        raise ValueError("M > 0")
    if theta <= 0:
        raise ValueError("theta > 0")
    if L <= 0:
        raise ValueError("L > 0")
    if r0 <= 0:
        raise ValueError("r0 > 0")
    if phi_max <= 0:
        raise ValueError("phi_max > 0")
    if n < 10:
        raise ValueError("n >= 10")
    if r_stop is not None and r_stop <= 0:
        raise ValueError("r_stop > 0")

    if particle == "massive":
        kappa = 0.5
    elif particle == "photon":
        kappa = 0.0
    else:
        raise ValueError("particle must be 'massive' or 'photon'")

    veff0 = float(veff_nc_schwarzschild(np.array([r0], dtype=np.float64), M, theta, L, particle)[0])
    if E < veff0:
        raise ValueError(
            f"Forbidden parameters at r0={r0:.6g}: E={E:.6g} < V_eff(r0)={veff0:.6g}. "
            f"Adjust E/L or choose another r0."
        )

    sign = -1.0 if radial_sign == "in" else 1.0
    drdlambda0 = sign * np.sqrt(max(2.0 * (E - veff0), 0.0))
    u0 = 1.0 / r0
    up0 = -drdlambda0 / L

    L2 = L * L
    scale = max(M, np.sqrt(theta), 1.0)
    r_min_stop = 1.0e-7 * scale
    u_floor = 1.0e-12 / scale
    if r_outer_horizon is None:
        horizons = nc_horizons(M, theta)
        r_outer = horizons[-1] if horizons else None
    else:
        r_outer = r_outer_horizon

    def d2u_dphi2(u_val: float) -> float:
        if u_val <= 0.0 or not np.isfinite(u_val):
            return np.nan
        r_val = 1.0 / u_val
        f_val = float(f_nc_schwarzschild(np.array([r_val], dtype=np.float64), M, theta)[0])
        fp_val = float(fprime_nc_schwarzschild(np.array([r_val], dtype=np.float64), M, theta)[0])
        dVdr = fp_val * (kappa + (L2 / (2.0 * r_val * r_val))) - f_val * (L2 / (r_val * r_val * r_val))
        return dVdr / (L2 * u_val * u_val)

    def rhs(_phi: float, y: np.ndarray) -> list[float]:
        u_val, up_val = float(y[0]), float(y[1])
        accel = d2u_dphi2(u_val)
        if not np.isfinite(accel):
            accel = 0.0
        return [up_val, accel]

    def escape_event(_phi: float, y: np.ndarray) -> float:
        return float(y[0]) - u_floor

    def origin_event(_phi: float, y: np.ndarray) -> float:
        u_val = float(y[0])
        if u_val <= 0.0:
            return -1.0
        return (1.0 / u_val) - r_min_stop

    events = [escape_event, origin_event]
    include_event_indexes: set[int] = set()
    escape_event.terminal = True
    escape_event.direction = -1
    origin_event.terminal = True
    origin_event.direction = -1

    if r_outer is not None:
        r_capture = r_outer * 1.0005

        def capture_event(_phi: float, y: np.ndarray) -> float:
            u_val = float(y[0])
            if u_val <= 0.0:
                return -1.0
            return (1.0 / u_val) - r_capture

        capture_event.terminal = True
        capture_event.direction = -1
        include_event_indexes.add(len(events))
        events.append(capture_event)

    if r_stop is not None:

        def r_stop_event(_phi: float, y: np.ndarray) -> float:
            u_val, up_val = float(y[0]), float(y[1])
            if u_val <= 0.0 or up_val >= 0.0:
                return 1.0
            return r_stop - (1.0 / u_val)

        r_stop_event.terminal = True
        r_stop_event.direction = -1
        include_event_indexes.add(len(events))
        events.append(r_stop_event)

    phi_eval = np.linspace(0.0, phi_max, n, dtype=np.float64)
    sol = solve_ivp(
        rhs,
        (0.0, phi_max),
        [u0, up0],
        t_eval=phi_eval,
        events=events,
        rtol=RTOL,
        atol=ATOL,
    )

    if not sol.success and all(len(times) == 0 for times in sol.t_events):
        raise ValueError(f"Orbit integration failed: {sol.message}")

    phi, y = _append_terminal_event(sol.t, sol.y, sol.t_events, sol.y_events, include_event_indexes)
    return _finite_orbit(phi, y[0])
