import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_ok() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_simulate_success() -> None:
    response = client.post(
        "/simulate",
        json={
            "metric": "schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "E": 1.7606816862,
            "L": 4.2,
            "r0": 20.0,
            "radial_sign": "in",
            "phi_max": 37.69911184,
            "n": 4000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["r"]) > 0
    assert data["meta"]["points_returned"] == len(data["r"])


def test_veff_success() -> None:
    response = client.post(
        "/veff",
        json={
            "metric": "schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "E": 1.7606816862,
            "L": 4.2,
            "r_min": 2.2,
            "r_max": 50.0,
            "n": 2000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["r"]) == 2000
    assert len(data["U_eff"]) == 2000


def test_simulate_nc_success() -> None:
    response = client.post(
        "/simulate_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "theta": 0.05,
            "E": 0.52,
            "L": 4.0,
            "r0": 20.0,
            "radial_sign": "in",
            "phi_max": 37.69911184,
            "n": 4000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["r"]) > 0
    assert data["meta"]["points_returned"] == len(data["r"])


def test_simulate_nc_invalid_params() -> None:
    response = client.post(
        "/simulate_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "theta": 0.05,
            "E": 0.01,
            "L": 4.0,
            "r0": 20.0,
            "radial_sign": "in",
            "phi_max": 37.69911184,
            "n": 4000,
        },
    )

    assert response.status_code == 400
    assert "Forbidden parameters at r0" in response.json()["detail"]


def test_veff_nc_success() -> None:
    response = client.post(
        "/veff_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "theta": 0.05,
            "E": 0.3,
            "L": 4.0,
            "r_min": 0.02,
            "r_max": 50.0,
            "n": 2000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["r"]) == 2000
    assert len(data["V_eff"]) == 2000


def test_simulate_nc_bound_orbit_keeps_all_points() -> None:
    n = 4000
    response = client.post(
        "/simulate_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "theta": 0.05,
            "E": 0.55,
            "L": 4.0,
            "r0": 20.0,
            "radial_sign": "in",
            "phi_max": 37.69911184,
            "n": n,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["points_returned"] > 200
    assert data["meta"]["points_returned"] == len(data["r"])
    assert data["meta"]["has_horizon"] is True
    assert data["meta"]["r_outer_horizon"] is not None
    assert data["meta"]["captured"] is False


def test_veff_nc_allows_sampling_below_outer_horizon() -> None:
    response = client.post(
        "/veff_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "theta": 0.05,
            "E": 0.3,
            "L": 4.0,
            "r_min": 0.02,
            "r_max": 50.0,
            "n": 2000,
        },
    )

    assert response.status_code == 200


def test_simulate_nc_applies_r_stop_to_escape_branch() -> None:
    response = client.post(
        "/simulate_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "theta": 0.05,
            "E": 0.55,
            "L": 4.0,
            "r0": 20.0,
            "r_stop": 120.0,
            "radial_sign": "in",
            "phi_max": 37.69911184,
            "n": 4000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["clipped_by_r_stop"] is True
    assert max(data["r"]) <= 125.0


def test_simulate_rejects_classically_forbidden_initial_radius() -> None:
    response = client.post(
        "/simulate",
        json={
            "metric": "schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "E": 0.9,
            "L": 4.2,
            "r0": 20.0,
            "radial_sign": "in",
            "phi_max": 37.69911184,
            "n": 4000,
        },
    )

    assert response.status_code == 400
    assert "E^2" in response.json()["detail"]


def test_rejects_excessive_response_points() -> None:
    response = client.post(
        "/veff",
        json={
            "metric": "schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "E": 1.0,
            "L": 4.2,
            "r_min": 2.2,
            "r_max": 50.0,
            "n": 50001,
        },
    )

    assert response.status_code == 422


def test_simulate_nc_maple_success() -> None:
    response = client.post(
        "/simulate_nc_maple",
        json={
            "metric": "nc-maple",
            "m": 0.1,
            "theta": 0.001,
            "kappa": 0.5,
            "L": 2.0,
            "u0": 1.0,
            "du0": 2.09862,
            "phi_max": 6.283185307179586,
            "r_stop": 3.0,
            "capture_radius": 0.1,
            "n": 1000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["r"]) > 0
    assert len(data["u"]) == len(data["r"])
    assert data["meta"]["E"] > 0
    assert data["meta"]["has_horizon"] is True
    assert data["meta"]["termination_reason"] == "phi_max"
    assert data["meta"]["points_returned"] == len(data["r"])


def test_simulate_nc_maple_captures_when_crossing_horizon() -> None:
    response = client.post(
        "/simulate_nc_maple",
        json={
            "metric": "nc-maple",
            "m": 0.1,
            "theta": 0.001,
            "kappa": 0.5,
            "L": 2.0,
            "u0": 1.0,
            "du0": 2.5,
            "phi_max": 6.283185307179586,
            "r_stop": 3.0,
            "capture_radius": 0.1,
            "n": 1000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["captured"] is True
    assert data["meta"]["termination_reason"] == "captured"
    assert data["meta"]["points_returned"] < 1000
    assert min(data["r"]) == pytest.approx(data["meta"]["capture_radius_effective"])


def test_veff_nc_maple_success() -> None:
    response = client.post(
        "/veff_nc_maple",
        json={
            "metric": "nc-maple",
            "m": 0.1,
            "theta": 0.001,
            "kappa": 0.5,
            "L": 0.25,
            "u0": 1.0,
            "du0": 1.3,
            "r_min": 0.1,
            "r_max": 2.0,
            "n": 1000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["r"]) == 1000
    assert len(data["V_eff"]) == 1000
    assert data["meta"]["E"] > 0


def test_simulate_nc_maple_applies_r_stop_on_escape_branch() -> None:
    response = client.post(
        "/simulate_nc_maple",
        json={
            "metric": "nc-maple",
            "m": 0.1,
            "theta": 0.001,
            "kappa": 0.5,
            "L": 2.0,
            "u0": 1.0,
            "du0": -0.8,
            "phi_max": 6.283185307179586,
            "r_stop": 1.4,
            "capture_radius": 0.1,
            "n": 1000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["clipped_by_r_stop"] is True
    assert data["meta"]["termination_reason"] == "r_stop"
    assert max(data["r"]) == pytest.approx(1.4)
