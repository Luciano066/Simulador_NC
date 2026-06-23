import numpy as np
import pytest

from app.core.config import get_cors_origins
from app.core.observables import f_schwarzschild, nc_horizons, veff2_schwarzschild


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
