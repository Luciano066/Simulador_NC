import numpy as np
from app.core.observables import (
    f_schwarzschild,
    f_nc_schwarzschild,
    fprime_nc_schwarzschild,
    veff_nc_schwarzschild,
    nc_horizons,
)

def _drdphi0_from_E(M: float, E: float, L: float, r0: float, particle: str, radial_sign: str) -> float:
    """
    dr/dφ inicial consistente com E, L, r0.
    Se E² < Veff²(r0), NÃO existe movimento real (radicando < 0).
    """
    f0 = float(f_schwarzschild(np.array([r0], dtype=np.float64), M)[0])

    if particle == "massive":
        veff2 = f0 * (1.0 + (L * L) / (r0 * r0))
    elif particle == "photon":
        veff2 = f0 * ((L * L) / (r0 * r0))
    else:
        raise ValueError("particle deve ser 'massive' ou 'photon'")

    E2 = E * E
    inside = (r0**4 / (L**2)) * (E2 - veff2)

    if inside < 0:
        raise ValueError(
            f"Parâmetros proibidos em r0={r0:.6g}: E²={E2:.6g} < Veff²(r0)={veff2:.6g}. "
            f"Ajuste E/L ou escolha outro r0."
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
    Integra órbita usando u(φ)=1/r:
      Massive: u'' + u = M/L^2 + 3Mu^2
      Photon:  u'' + u = 3Mu^2
    """
    if M <= 0:
        raise ValueError("M > 0")
    if L <= 0:
        raise ValueError("L > 0")
    if r0 <= 0:
        raise ValueError("r0 > 0")
    if n < 10:
        raise ValueError("n >= 10")

    phi = np.linspace(0.0, phi_max, n, dtype=np.float64)
    h = phi[1] - phi[0]

    drdphi0 = _drdphi0_from_E(M=M, E=E, L=L, r0=r0, particle=particle, radial_sign=radial_sign)

    u0 = 1.0 / r0
    up0 = -(1.0 / (r0 * r0)) * drdphi0

    u = np.empty(n, dtype=np.float64)
    up = np.empty(n, dtype=np.float64)
    u[0] = u0
    up[0] = up0

    L2 = L * L

    def f(u_val: float) -> float:
        if particle == "massive":
            rhs = (M / L2) + (3.0 * M * u_val * u_val)
        elif particle == "photon":
            rhs = (3.0 * M * u_val * u_val)
        else:
            raise ValueError("particle deve ser 'massive' ou 'photon'")
        return rhs - u_val

    for i in range(n - 1):
        ui = u[i]
        vi = up[i]

        k1_u = vi
        k1_v = f(ui)

        k2_u = vi + 0.5 * h * k1_v
        k2_v = f(ui + 0.5 * h * k1_u)

        k3_u = vi + 0.5 * h * k2_v
        k3_v = f(ui + 0.5 * h * k2_u)

        k4_u = vi + h * k3_v
        k4_v = f(ui + h * k3_u)

        u[i + 1] = ui + (h / 6.0) * (k1_u + 2.0 * k2_u + 2.0 * k3_u + k4_u)
        up[i + 1] = vi + (h / 6.0) * (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v)

        if u[i + 1] <= 0:
            u[i + 1] = np.nan
            up[i + 1] = np.nan
            u[i + 2 :] = np.nan
            up[i + 2 :] = np.nan
            break
        if (1.0 / u[i + 1]) <= (2.0 * M * 1.0005):
            u[i + 2 :] = np.nan
            up[i + 2 :] = np.nan
            break

    r = 1.0 / u
    return phi, r

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
    Integra órbita NC em variável u(φ)=1/r, usando a convenção:
      (1/2) (dr/dλ)^2 + V_eff(r) = E
      V_eff(r) = f(r) * (K + L²/(2r²))
    com K=1/2 (massivo) e K=0 (fóton).
    """
    if M <= 0:
        raise ValueError("M > 0")
    if theta <= 0:
        raise ValueError("theta > 0")
    if L <= 0:
        raise ValueError("L > 0")
    if r0 <= 0:
        raise ValueError("r0 > 0")
    if n < 10:
        raise ValueError("n >= 10")
    if r_stop is not None and r_stop <= 0:
        raise ValueError("r_stop > 0")

    phi = np.linspace(0.0, phi_max, n, dtype=np.float64)
    h = phi[1] - phi[0]

    if particle == "massive":
        kappa = 0.5
    elif particle == "photon":
        kappa = 0.0
    else:
        raise ValueError("particle deve ser 'massive' ou 'photon'")

    veff0 = float(veff_nc_schwarzschild(np.array([r0], dtype=np.float64), M, theta, L, particle)[0])
    if E < veff0:
        raise ValueError(
            f"Parâmetros proibidos em r0={r0:.6g}: E={E:.6g} < Veff(r0)={veff0:.6g}. "
            f"Ajuste E/L ou escolha outro r0."
        )

    sign = -1.0 if radial_sign == "in" else 1.0
    drdlambda0 = sign * np.sqrt(max(2.0 * (E - veff0), 0.0))
    u0 = 1.0 / r0
    up0 = -drdlambda0 / L

    u = np.empty(n, dtype=np.float64)
    up = np.empty(n, dtype=np.float64)
    u[0] = u0
    up[0] = up0

    L2 = L * L
    scale = max(M, np.sqrt(theta), 1.0)
    if r_outer_horizon is None:
        horizons = nc_horizons(M, theta)
        r_outer = horizons[-1] if horizons else None
    else:
        r_outer = r_outer_horizon

    def d2u_dphi2(uval: float) -> float:
        if uval <= 0.0 or not np.isfinite(uval):
            return np.nan
        rval = 1.0 / uval
        f = float(f_nc_schwarzschild(np.array([rval], dtype=np.float64), M, theta)[0])
        fp = float(fprime_nc_schwarzschild(np.array([rval], dtype=np.float64), M, theta)[0])
        # dV/dr para V = f(r) * (K + L²/(2r²))
        dVdr = fp * (kappa + (L2 / (2.0 * rval * rval))) - f * (L2 / (rval * rval * rval))
        return dVdr / (L2 * uval * uval)

    for i in range(n - 1):
        ui = u[i]
        vi = up[i]
        if not np.isfinite(ui) or not np.isfinite(vi) or ui <= 0.0:
            u[i + 1 :] = np.nan
            up[i + 1 :] = np.nan
            break

        k1_u = vi
        k1_v = d2u_dphi2(ui)
        if not np.isfinite(k1_v):
            u[i + 1 :] = np.nan
            up[i + 1 :] = np.nan
            break

        k2_u = vi + 0.5 * h * k1_v
        k2_v = d2u_dphi2(ui + 0.5 * h * k1_u)
        if not np.isfinite(k2_v):
            u[i + 1 :] = np.nan
            up[i + 1 :] = np.nan
            break

        k3_u = vi + 0.5 * h * k2_v
        k3_v = d2u_dphi2(ui + 0.5 * h * k2_u)
        if not np.isfinite(k3_v):
            u[i + 1 :] = np.nan
            up[i + 1 :] = np.nan
            break

        k4_u = vi + h * k3_v
        k4_v = d2u_dphi2(ui + h * k3_u)
        if not np.isfinite(k4_v):
            u[i + 1 :] = np.nan
            up[i + 1 :] = np.nan
            break

        u_next = ui + (h / 6.0) * (k1_u + 2.0 * k2_u + 2.0 * k3_u + k4_u)
        up_next = vi + (h / 6.0) * (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v)

        if not np.isfinite(u_next) or u_next <= 0.0:
            u[i + 1] = np.nan
            up[i + 1] = np.nan
            u[i + 2 :] = np.nan
            up[i + 2 :] = np.nan
            break

        r_next = 1.0 / u_next
        if r_next <= (1e-7 * scale):
            u[i + 1] = np.nan
            up[i + 1] = np.nan
            u[i + 2 :] = np.nan
            up[i + 2 :] = np.nan
            break

        # Só aplica corte de visualização quando a órbita já está em regime de fuga (r crescente).
        if r_stop is not None and up_next < 0.0 and r_next >= r_stop:
            u[i + 1] = u_next
            up[i + 1] = up_next
            u[i + 2 :] = np.nan
            up[i + 2 :] = np.nan
            break

        u[i + 1] = u_next
        up[i + 1] = up_next

        if r_outer is not None and r_next <= (r_outer * 1.0005):
            u[i + 2 :] = np.nan
            up[i + 2 :] = np.nan
            break

    r = 1.0 / u
    return phi, r
