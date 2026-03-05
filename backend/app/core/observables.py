import numpy as np

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

def veff_nc_schwarzschild(r: np.ndarray, M: float, theta: float, L: float, particle: str) -> np.ndarray:
    """
    Potencial efetivo na convenção do TCC:
      (1/2) (dr/dλ)^2 + V_eff(r) = E
      V_eff = f(r) * (K + L^2/(2r^2))
    com K=1/2 (massivo) e K=0 (fóton).
    """
    f = f_nc_schwarzschild(r, M, theta)
    L2_over_2r2 = (L * L) / (2.0 * r * r)
    if particle == "massive":
        return f * (0.5 + L2_over_2r2)
    if particle == "photon":
        return f * L2_over_2r2
    raise ValueError("particle deve ser 'massive' ou 'photon'")

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
