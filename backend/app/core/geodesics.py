import numpy as np
from scipy.integrate import cumulative_trapezoid, solve_ivp

from app.core.observables import (
    dveff_nc_schwarzschild_dr,
    f_schwarzschild,
    kappa_from_particle,
    nc_horizons,
    potencial_foton_nc,
    potencial_massiva_nc,
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
    K: float | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Integrate a noncommutative Schwarzschild orbit with u(phi)=1/r.

    The NC convention is:
      (1/2) (dr/dlambda)^2 + V_eff(r) = E
      V_eff(r) = f(r) * (K + L^2/(2 r^2))
    with K=1/2 for massive particles and K=0 for photons.
    The orbit acceleration uses dV_eff/dr from the same function plotted by
    /veff_nc, so the trajectory and potential share one physical model.
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

    kappa = kappa_from_particle(particle) if K is None else K

    veff0 = float(veff_nc_schwarzschild(np.array([r0], dtype=np.float64), M, theta, L, particle, K=kappa)[0])
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

    capture_candidates = [value for value in (r_outer, r_stop) if value is not None]
    r_capture = max(capture_candidates) if capture_candidates else None

    def d2u_dphi2(u_val: float) -> float:
        if u_val <= 0.0 or not np.isfinite(u_val):
            return np.nan
        r_val = 1.0 / u_val
        dVdr = float(dveff_nc_schwarzschild_dr(np.array([r_val], dtype=np.float64), M, theta, L, particle, K=kappa)[0])
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

    if r_capture is not None:

        def capture_event(_phi: float, y: np.ndarray) -> float:
            u_val = float(y[0])
            if u_val <= 0.0:
                return -1.0
            return (1.0 / u_val) - r_capture

        capture_event.terminal = True
        capture_event.direction = -1
        include_event_indexes.add(len(events))
        events.append(capture_event)

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


def orbita_massiva_nc(
    L: float,
    E: float,
    rst: float,
    norbit: float,
    theta: float,
    n_points: int = 5000,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Legacy massive NC orbit from the old Streamlit simulator.

    This intentionally preserves the old quadrature in u=1/r instead of solving
    a second-order ODE, because this mode exists to reproduce old plots.
    """
    if L <= 0:
        raise ValueError("L > 0")
    if theta <= 0:
        raise ValueError("theta > 0")
    if rst <= 0:
        raise ValueError("rst > 0")
    if norbit <= 0:
        raise ValueError("norbit > 0")
    if n_points < 10:
        raise ValueError("n_points >= 10")

    scale = 0.5
    u_min = scale / rst
    u_max = min(0.5, (1.0 / np.sqrt(theta)) * 0.9)
    if u_max <= u_min:
        raise ValueError("Legacy massive orbit has no valid u interval. Increase rst or theta.")

    n_samples = max(10, int(n_points * max(1.0, L / 3.0)))
    u_vals = np.linspace(u_min, u_max, n_samples, dtype=np.float64)
    r_vals_full = 1.0 / u_vals
    Veff_full = potencial_massiva_nc(r_vals_full, L, theta)
    discr = E - Veff_full

    eps = 1.0e-10 * max(1.0, 1.0 / theta)
    valid = np.isfinite(discr) & (discr > eps)
    idx_valid = np.where(valid)[0]
    if len(idx_valid) < 10:
        raise ValueError("Legacy massive orbit has no allowed radial window for E - V_eff > 0.")

    idx_last = int(idx_valid[-1])
    u = u_vals[: idx_last + 1]
    r_vals = 1.0 / u
    discr = discr[: idx_last + 1]

    integrand = (L / np.sqrt(2.0)) / np.sqrt(np.clip(discr, eps, None))
    phi_raw = cumulative_trapezoid(integrand, u, initial=0.0)

    if idx_last < len(u_vals) - 1:
        phi_out = phi_raw[-1] + (phi_raw[-1] - phi_raw[::-1])
        r_out = r_vals[::-1]
        phi = np.concatenate([phi_raw, phi_out])
        r = np.concatenate([r_vals, r_out])
    else:
        phi = phi_raw * 4.5
        r = r_vals

    V = potencial_massiva_nc(r, L, theta)
    valid_points = np.isfinite(phi) & np.isfinite(r) & np.isfinite(V) & (r > 0.0)
    if not np.all(valid_points):
        first_invalid = int(np.argmax(~valid_points))
        phi = phi[:first_invalid]
        r = r[:first_invalid]
        V = V[:first_invalid]

    return phi, r, V


def orbita_foton_nc(
    b: float,
    rst: float,
    theta: float,
    n_points: int = 2000,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Legacy NC photon orbit from the old Streamlit simulator.
    """
    if b <= 0:
        raise ValueError("b > 0")
    if theta <= 0:
        raise ValueError("theta > 0")
    if rst <= 0:
        raise ValueError("rst > 0")
    if n_points < 10:
        raise ValueError("n_points >= 10")

    u_min = 1.0 / rst
    u_max = 0.5
    if u_max <= u_min:
        raise ValueError("Legacy photon orbit has no valid u interval. Increase rst.")

    u_vals = np.linspace(u_min, u_max, n_points, dtype=np.float64)
    Veff = potencial_foton_nc(1.0 / u_vals, theta)
    discr = (1.0 / (b * b)) - Veff
    valid = np.isfinite(discr) & (discr > 0.0)
    if not np.any(valid):
        raise ValueError("Impact parameter b is outside the allowed legacy photon window.")

    last_idx = int(np.where(valid)[0][-1])
    u = u_vals[: last_idx + 1]
    if len(u) > 1:
        u = np.append(u[:-1], u[-1] * 0.999)
    else:
        u = np.array([u[0] * 0.999], dtype=np.float64)

    discr = (1.0 / (b * b)) - potencial_foton_nc(1.0 / u, theta)
    integrand = 1.0 / np.sqrt(np.maximum(1.0e-12, discr))
    integrand[~np.isfinite(integrand)] = 0.0

    phi = cumulative_trapezoid(integrand, u, initial=0.0)
    r = 1.0 / u
    V = potencial_foton_nc(r, theta)
    valid_points = np.isfinite(phi) & np.isfinite(r) & np.isfinite(V) & (r > 0.0)
    if not np.all(valid_points):
        first_invalid = int(np.argmax(~valid_points))
        phi = phi[:first_invalid]
        r = r[:first_invalid]
        V = V[:first_invalid]

    return phi, r, V


def orbit_nc_maple(
    m: float,
    theta: float,
    kappa: float,
    L: float,
    u0: float,
    du0: float,
    phi_max: float,
    n: int,
    r_outer_horizon: float | None = None,
    r_stop: float | None = None,
    capture_radius: float | None = None,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Integrate the Maple/TCC approximate timelike NC equation directly in u(phi).
    """
    if m <= 0:
        raise ValueError("m > 0")
    if theta <= 0:
        raise ValueError("theta > 0")
    if kappa < 0:
        raise ValueError("kappa >= 0")
    if L <= 0:
        raise ValueError("L > 0")
    if u0 <= 0:
        raise ValueError("u0 > 0")
    if phi_max <= 0:
        raise ValueError("phi_max > 0")
    if n < 10:
        raise ValueError("n >= 10")
    if r_stop is not None and r_stop <= 0:
        raise ValueError("r_stop > 0")
    if capture_radius is not None and capture_radius <= 0:
        raise ValueError("capture_radius > 0")

    L2 = L * L
    sqrt_theta = np.sqrt(theta)
    linear_factor = 1.0 + (16.0 * m * sqrt_theta * kappa) / (np.pi * L2)
    capture_candidates = [value for value in (r_outer_horizon, capture_radius) if value is not None]
    r_capture = max(capture_candidates) if capture_candidates else None

    def rhs(_phi: float, y: np.ndarray) -> list[float]:
        u_val, up_val = float(y[0]), float(y[1])
        if not np.isfinite(u_val) or not np.isfinite(up_val):
            raise ValueError("Maple orbit integration reached nonfinite state values")
        source = (2.0 * m * kappa) / L2 + 3.0 * m * u_val * u_val
        correction = (16.0 * m * sqrt_theta * u_val * u_val * u_val) / np.pi
        return [up_val, source - correction - linear_factor * u_val]

    def nonpositive_u_event(_phi: float, y: np.ndarray) -> float:
        return float(y[0])

    def nonfinite_event(_phi: float, y: np.ndarray) -> float:
        return 1.0 if np.all(np.isfinite(y)) else 0.0

    nonpositive_u_event.terminal = True
    nonpositive_u_event.direction = -1
    nonfinite_event.terminal = True
    nonfinite_event.direction = -1

    events = [nonpositive_u_event, nonfinite_event]
    include_event_indexes: set[int] = set()

    if r_capture is not None:

        def horizon_crossing_event(_phi: float, y: np.ndarray) -> float:
            u_val = float(y[0])
            if u_val <= 0.0 or not np.isfinite(u_val):
                return -1.0
            return (1.0 / u_val) - r_capture

        horizon_crossing_event.terminal = True
        horizon_crossing_event.direction = -1
        include_event_indexes.add(len(events))
        events.append(horizon_crossing_event)

    if r_stop is not None:

        def r_stop_event(_phi: float, y: np.ndarray) -> float:
            u_val, up_val = float(y[0]), float(y[1])
            if u_val <= 0.0 or not np.isfinite(u_val) or up_val >= 0.0:
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
        [u0, du0],
        t_eval=phi_eval,
        events=events,
        rtol=RTOL,
        atol=ATOL,
    )

    if not sol.success and all(len(times) == 0 for times in sol.t_events):
        raise ValueError(f"Maple orbit integration failed: {sol.message}")

    phi, y = _append_terminal_event(sol.t, sol.y, sol.t_events, sol.y_events, include_event_indexes)
    u = y[0]
    valid = np.isfinite(phi) & np.isfinite(u) & (u > 0.0)
    if not np.all(valid):
        first_invalid = int(np.argmax(~valid))
        phi = phi[:first_invalid]
        u = u[:first_invalid]

    return phi, u, 1.0 / u
