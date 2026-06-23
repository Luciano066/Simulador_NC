import numpy as np
import pytest

from app.core.config import get_cors_origins
from app.core.observables import (
    energy_nc_maple,
    f_nc_maple,
    f_schwarzschild,
    nc_horizons,
    nc_maple_horizons,
    veff2_schwarzschild,
    veff_nc_maple,
)


def test_schwarzschild_horizon_is_2m() -> None:
    value = f_schwarzschild(np.array([2.0]), M=1.0)[0]
    assert value == pytest.approx(0.0, abs=1e-12)


def test_photon_effective_potential_has_extremum_at_3m() -> None:
    M = 1.0
    L = 2.0
    h = 1e-5
    left = veff2_schwarzschild(np.array([3.0 * M - h]), M=M, E=1.0, L=L, particle="photon")[0]
    right = veff2_schwarzschild(np.array([3.0 * M + h]), M=M, E=1.0, L=L, particle="photon")[0]

    derivative = (right - left) / (2.0 * h)

    assert derivative == pytest.approx(0.0, abs=1e-8)


def test_nc_horizon_count_depends_on_theta() -> None:
    assert len(nc_horizons(M=1.0, theta=0.05)) == 2
    assert nc_horizons(M=1.0, theta=10.0) == []


def test_nc_outer_horizon_approaches_schwarzschild_limit() -> None:
    horizons = nc_horizons(M=1.0, theta=1e-6)

    assert len(horizons) == 2
    assert horizons[-1] == pytest.approx(2.0, rel=1e-3)


def test_production_cors_requires_explicit_origins(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        get_cors_origins()


def test_production_cors_rejects_wildcard(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ORIGINS", "https://example.com,*")

    with pytest.raises(RuntimeError, match="Wildcard"):
        get_cors_origins()


def test_development_cors_uses_local_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    origins = get_cors_origins()

    assert "http://localhost:5173" in origins
    assert all(origin != "*" for origin in origins)


def test_maple_energy_uses_initial_u_and_du() -> None:
    m = 0.1
    theta = 0.001
    kappa = 0.5
    L = 2.0
    u0 = 1.0
    du0 = 2.09862
    r0 = 1.0 / u0

    expected = 0.5 * L * L * du0 * du0 + veff_nc_maple(
        np.array([r0]),
        m=m,
        theta=theta,
        kappa=kappa,
        L=L,
    )[0]

    assert energy_nc_maple(m=m, theta=theta, kappa=kappa, L=L, u0=u0, du0=du0) == pytest.approx(expected)


def test_maple_horizons_are_roots_of_approximate_metric() -> None:
    horizons = nc_maple_horizons(m=0.1, theta=0.001)

    assert len(horizons) == 2
    values = f_nc_maple(np.array(horizons), m=0.1, theta=0.001)
    assert values[0] == pytest.approx(0.0, abs=1e-12)
    assert values[1] == pytest.approx(0.0, abs=1e-12)


def test_maple_orbit_equation_matches_plotted_potential_derivative() -> None:
    m = 0.1
    theta = 0.001
    kappa = 0.5
    L = 2.0
    u = 1.7
    h = 1e-6

    def potential_of_u(u_value: float) -> float:
        r = np.array([1.0 / u_value])
        return float(veff_nc_maple(r, m=m, theta=theta, kappa=kappa, L=L)[0])

    numerical_dvdu = (potential_of_u(u + h) - potential_of_u(u - h)) / (2.0 * h)
    sqrt_theta = np.sqrt(theta)
    ode_acceleration = (
        (2.0 * m * kappa) / (L * L)
        + 3.0 * m * u * u
        - (16.0 * m * sqrt_theta * u * u * u) / np.pi
        - u * (1.0 + (16.0 * m * sqrt_theta * kappa) / (np.pi * L * L))
    )

    assert ode_acceleration == pytest.approx(-numerical_dvdu / (L * L), rel=1e-6, abs=1e-8)
