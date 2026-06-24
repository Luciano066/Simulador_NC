import numpy as np
from scipy.signal import find_peaks

def f_schwarzschild(r: np.ndarray, M: float) -> np.ndarray:
    return 1.0 - (2.0 * M) / r

def veff2_schwarzschild(r: np.ndarray, M: float, E: float, L: float, particle: str) -> np.ndarray:
    """
    Retorna V_eff^2 na forma compatível com a equação radial:

    Massive (timelike):
      (dr/dτ)^2 + V_eff^2(r) = E^2
      V_eff^2 = f(r) * (1 + L^2/r^2)

    Photon (null):
      (dr/dλ)^2 + V_eff^2(r) = E^2
      V_eff^2 = f(r) * (L^2/r^2)
      e b = L/E
    """
    f = f_schwarzschild(r, M)
    L2_over_r2 = (L * L) / (r * r)

    if particle == "massive":
        return f * (1.0 + L2_over_r2)
    if particle == "photon":
        return f * L2_over_r2

    raise ValueError("particle deve ser 'massive' ou 'photon'")

def _mass_nc(r: np.ndarray, M: float, theta: float) -> np.ndarray:
    """
    Massa difusa m(r) do modelo Lorentziano usado no TCC (Eq. 23).
    """
    sqrt_theta = np.sqrt(theta)
    term = np.arctan(r / sqrt_theta) - (r * sqrt_theta) / (r * r + theta)
    return (2.0 * M / np.pi) * term

def _mass_prime_nc(r: np.ndarray, M: float, theta: float) -> np.ndarray:
    sqrt_theta = np.sqrt(theta)
    return (4.0 * M * sqrt_theta * (r * r)) / (np.pi * (r * r + theta) ** 2)

def f_nc_schwarzschild(r: np.ndarray, M: float, theta: float) -> np.ndarray:
    m = _mass_nc(r, M, theta)
    return 1.0 - (2.0 * m) / r

def fprime_nc_schwarzschild(r: np.ndarray, M: float, theta: float) -> np.ndarray:
    """
    Derivada radial f'(r) da métrica NC inspirada em Schwarzschild.
    """
    m = _mass_nc(r, M, theta)
    mp = _mass_prime_nc(r, M, theta)
    return (2.0 * m) / (r * r) - (2.0 * mp) / r

def kappa_from_particle(particle: str) -> float:
    if particle == "massive":
        return 0.5
    if particle == "photon":
        return 0.0
    raise ValueError("particle deve ser 'massive' ou 'photon'")


def veff_nc_schwarzschild(
    r: np.ndarray,
    M: float,
    theta: float,
    L: float,
    particle: str,
    K: float | None = None,
) -> np.ndarray:
    """
    Potencial efetivo da Eq. 47 do TCC:
      (1/2) (dr/dlambda)^2 + V_eff(r) = E
      V_eff = f_nc(r) * (K + L^2/(2r^2)).
    """
    f = f_nc_schwarzschild(r, M, theta)
    L2_over_2r2 = (L * L) / (2.0 * r * r)
    kappa = kappa_from_particle(particle) if K is None else K
    return f * (kappa + L2_over_2r2)


def dveff_nc_schwarzschild_dr(
    r: np.ndarray,
    M: float,
    theta: float,
    L: float,
    particle: str,
    K: float | None = None,
) -> np.ndarray:
    """
    Derivada radial do mesmo V_eff usado em veff_nc_schwarzschild.
    """
    f = f_nc_schwarzschild(r, M, theta)
    fp = fprime_nc_schwarzschild(r, M, theta)
    kappa = kappa_from_particle(particle) if K is None else K
    l_term = (L * L) / (2.0 * r * r)
    dl_term_dr = -(L * L) / (r * r * r)

    return fp * (kappa + l_term) + f * dl_term_dr


def legacy_rst_massive(L: float) -> float:
    """
    Radius scale used by the old Streamlit simulator for massive NC orbits.

    The legacy UI chose a multiplier s from L and then used rst = s / L.
    """
    if L <= 0:
        raise ValueError("L > 0")

    if L < 0.6:
        s = 5.0
    elif L < 2.9:
        s = 12.0
    elif L < 3.9:
        s = 70.0
    elif L <= 4.8:
        s = 100.0
    elif L < 5.9:
        s = 200.0
    elif L < 6.9:
        s = 300.0
    elif L < 7.9:
        s = 450.0
    elif L < 8.4:
        s = 550.0
    elif L < 9.9:
        s = 850.0
    else:
        s = 1000.0

    return s / L


def potencial_massiva_nc(r: np.ndarray, L: float, theta: float) -> np.ndarray:
    """
    Legacy polynomial NC effective potential for massive particles.

    V(r) = -u + 0.5 L^2 u^2 - L^2 u^3 + (8 sqrt(theta)/pi) L^2 u^4,
    with u = 1/r.
    """
    u = 1.0 / r
    return -u + 0.5 * L * L * u * u - L * L * u**3 + (8.0 * np.sqrt(theta) / np.pi) * L * L * u**4


def potencial_foton_nc(r: np.ndarray, theta: float) -> np.ndarray:
    """
    Legacy NC photon effective potential from the old simulator.
    """
    sqrt_theta = np.sqrt(theta)
    u = 1.0 / r
    term = 1.0 - (4.0 / np.pi) * (np.arctan(r / sqrt_theta) - (r * sqrt_theta) / (r * r + theta))
    return term * u * u - 2.0 * u**3


def critical_points_legacy(r: np.ndarray, V: np.ndarray, distance: int = 10) -> dict[str, list[dict[str, float]]]:
    """
    Peak detection compatible with the old Streamlit plot.
    """
    finite = np.isfinite(r) & np.isfinite(V)
    r_finite = r[finite]
    V_finite = V[finite]
    if len(r_finite) < 3:
        return {"maxima": [], "minima": []}

    maxima_ids, _ = find_peaks(V_finite, distance=distance)
    minima_ids, _ = find_peaks(-V_finite, distance=distance)

    def serialize(indexes: np.ndarray) -> list[dict[str, float]]:
        return [
            {"r": float(r_finite[index]), "V_eff": float(V_finite[index])}
            for index in indexes
            if np.isfinite(r_finite[index]) and np.isfinite(V_finite[index])
        ]

    return {"maxima": serialize(maxima_ids), "minima": serialize(minima_ids)}


def f_nc_maple(r: np.ndarray, m: float, theta: float) -> np.ndarray:
    """
    Approximate NC metric factor used by the Maple/TCC model.

    f(r) = 1 - 2m/r + 8m sqrt(theta)/(pi r^2)
    """
    sqrt_theta = np.sqrt(theta)
    return 1.0 - (2.0 * m) / r + (8.0 * m * sqrt_theta) / (np.pi * r * r)


def veff_nc_maple(r: np.ndarray, m: float, theta: float, kappa: float, L: float) -> np.ndarray:
    """
    Effective potential used by the Maple/TCC approximation.

    V(r) = f_nc_maple(r) * (kappa + L^2/(2r^2))
    """
    return f_nc_maple(r, m, theta) * (kappa + (L * L) / (2.0 * r * r))


def energy_nc_maple(m: float, theta: float, kappa: float, L: float, u0: float, du0: float) -> float:
    """
    Initial energy for the Maple/TCC approximation.

    E = 0.5 L^2 (du0)^2 + V(r0), with r0 = 1/u0.
    """
    r0 = 1.0 / u0
    v0 = float(veff_nc_maple(np.array([r0], dtype=np.float64), m, theta, kappa, L)[0])
    return 0.5 * L * L * du0 * du0 + v0


def nc_maple_horizons(m: float, theta: float) -> list[float]:
    """
    Real positive roots of the approximate Maple/TCC horizon equation.
    """
    if m <= 0 or theta <= 0:
        return []

    constant = (8.0 * m * np.sqrt(theta)) / np.pi
    discriminant_term = (m * m) - constant
    if discriminant_term < 0.0:
        return []

    root = float(np.sqrt(discriminant_term))
    roots = [m - root, m + root]
    return [float(value) for value in roots if value > 0.0 and np.isfinite(value)]


def ueff_schwarzschild(r: np.ndarray, M: float, L: float, particle: str) -> np.ndarray:
    """
    Energia potencial efetiva U_eff na forma:
      (L^2/2) (du/dφ)^2 + U_eff(u) = (E^2 - 1)/2   (massivo)
      (du/dφ)^2 + U_eff(u) = 1/b^2               (fóton)
    com u = 1/r e unidades G=c=1.
    """
    u = 1.0 / r
    if particle == "massive":
        return (-M * u) + 0.5 * (L * L) * (u * u) - (M * L * L) * (u * u * u)
    if particle == "photon":
        return (u * u) - 2.0 * M * (u * u * u)
    raise ValueError("particle deve ser 'massive' ou 'photon'")

def nc_horizons(M: float, theta: float, n_samples: int = 6000) -> list[float]:
    """
    Retorna os horizontes reais (r_- e r_+, quando existirem) da métrica NC.
    """
    if M <= 0 or theta <= 0:
        return []

    scale = max(M, np.sqrt(theta), 1.0)
    r_min = max(1e-6 * scale, 1e-8)
    r_max = 30.0 * scale
    r = np.linspace(r_min, r_max, n_samples, dtype=np.float64)
    f = f_nc_schwarzschild(r, M, theta)

    roots: list[float] = []

    def bisect_root(a: float, b: float, fa: float, fb: float) -> float:
        for _ in range(80):
            c = 0.5 * (a + b)
            fc = float(f_nc_schwarzschild(np.array([c], dtype=np.float64), M, theta)[0])
            if fa * fc <= 0.0:
                b, fb = c, fc
            else:
                a, fa = c, fc
        return 0.5 * (a + b)

    for i in range(len(r) - 1):
        a = float(r[i])
        b = float(r[i + 1])
        fa = float(f[i])
        fb = float(f[i + 1])

        if not np.isfinite(fa) or not np.isfinite(fb):
            continue

        if abs(fa) < 1e-8:
            roots.append(a)
            continue
        if fa * fb < 0.0:
            roots.append(bisect_root(a, b, fa, fb))

    roots.sort()
    dedup: list[float] = []
    tol = 1e-5 * scale
    for rr in roots:
        if not dedup or abs(rr - dedup[-1]) > tol:
            dedup.append(rr)

    if dedup:
        return dedup

    # Caso extremal: o horizonte toca f=0 sem trocar sinal.
    idx = int(np.argmin(np.abs(f)))
    if abs(float(f[idx])) < 2e-4:
        return [float(r[idx])]

    return []
