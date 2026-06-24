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


def test_veff_classical_changes_when_l_or_m_changes() -> None:
    payload = {
        "metric": "schwarzschild",
        "particle": "massive",
        "M": 1.0,
        "E": 1.7606816862,
        "L": 4.2,
        "r_min": 2.2,
        "r_max": 20.0,
        "n": 200,
    }

    base = client.post("/veff", json=payload)
    changed_l = client.post("/veff", json={**payload, "L": 5.0})
    changed_m = client.post("/veff", json={**payload, "M": 0.8})

    assert base.status_code == 200
    assert changed_l.status_code == 200
    assert changed_m.status_code == 200
    assert base.json()["U_eff"] != changed_l.json()["U_eff"]
    assert base.json()["U_eff"] != changed_m.json()["U_eff"]


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
    assert data["meta"]["physical_model"] == "nc-tcc-eq47"
    assert data["meta"]["K"] == pytest.approx(0.5)
    assert data["meta"]["forbidden_fraction"] == pytest.approx(0.0)
    assert data["meta"]["delta_min"] >= -1.0e-8
    assert data["meta"]["trajectory_warning"] is None


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
    assert data["meta"]["physical_model"] == "nc-tcc-eq47"
    assert data["meta"]["K"] == pytest.approx(0.5)
    assert data["meta"]["mass_concentration_radius"] == pytest.approx(3.0 * (0.05**0.5))
    assert data["meta"]["critical_points"] is not None


def test_veff_nc_tcc_presets_match_expected_qualitative_shapes() -> None:
    small_l = client.post(
        "/veff_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "massive",
            "M": 0.09,
            "theta": 0.001,
            "K": 0.5,
            "E": 0.3,
            "L": 0.05,
            "r_min": 0.001,
            "r_max": 3.0,
            "n": 5000,
        },
    )
    large_l = client.post(
        "/veff_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "massive",
            "M": 0.09,
            "theta": 0.001,
            "K": 0.5,
            "E": 0.7100083242019234,
            "L": 0.4,
            "r_min": 0.001,
            "r_max": 3.0,
            "n": 5000,
        },
    )
    light = client.post(
        "/veff_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "photon",
            "M": 0.09,
            "theta": 0.001,
            "K": 0.0,
            "E": 1.2521302276292332,
            "L": 0.6,
            "r_min": 0.001,
            "r_max": 3.0,
            "n": 5000,
        },
    )

    assert small_l.status_code == 200
    assert large_l.status_code == 200
    assert light.status_code == 200

    small_meta = small_l.json()["meta"]
    large_meta = large_l.json()["meta"]
    light_meta = light.json()["meta"]

    assert small_meta["V_min"] < 0.0
    assert len(small_meta["critical_points"]["minima"]) >= 1

    assert len(large_meta["critical_points"]["maxima"]) >= 1
    assert len(large_meta["critical_points"]["minima"]) >= 2
    assert large_meta["circular_orbit"] == "unstable"
    assert large_meta["r_at_V_max"] > large_meta["r_outer_horizon"]
    assert large_meta["r_at_V_min"] > large_meta["r_outer_horizon"]

    assert len(light_meta["critical_points"]["maxima"]) >= 1
    assert light_meta["circular_orbit"] == "unstable"
    assert light_meta["K"] == pytest.approx(0.0)


def test_veff_nc_tcc_identifies_stable_circular_energy() -> None:
    payload = {
        "metric": "nc-schwarzschild",
        "particle": "massive",
        "M": 0.09,
        "theta": 0.001,
        "K": 0.5,
        "E": 0.71,
        "L": 0.4,
        "r_min": 0.001,
        "r_max": 3.0,
        "n": 5000,
    }
    base = client.post("/veff_nc", json=payload)
    assert base.status_code == 200

    stable_energy = base.json()["meta"]["V_min"]
    stable = client.post("/veff_nc", json={**payload, "E": stable_energy})

    assert stable.status_code == 200
    assert stable.json()["meta"]["circular_orbit"] == "stable"


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


def test_simulate_nc_captures_when_crossing_r_stop() -> None:
    response = client.post(
        "/simulate_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "theta": 0.05,
            "E": 0.7,
            "L": 4.0,
            "r0": 20.0,
            "r_stop": 2.0,
            "radial_sign": "in",
            "phi_max": 37.69911184,
            "n": 4000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["captured"] is True
    assert data["meta"]["stopped_at_r_stop"] is True
    assert data["meta"]["termination_reason"] == "captured"
    assert data["meta"]["r_capture"] == pytest.approx(2.0)
    assert min(data["r"]) == pytest.approx(2.0)


def test_veff_nc_complete_changes_when_l_or_theta_changes() -> None:
    payload = {
        "metric": "nc-schwarzschild",
        "particle": "massive",
        "M": 1.0,
        "theta": 0.05,
        "E": 0.3,
        "L": 4.0,
        "r_min": 2.2,
        "r_max": 8.0,
        "n": 200,
    }
    base = client.post("/veff_nc", json=payload)
    changed_l = client.post("/veff_nc", json={**payload, "L": 5.0})
    changed_theta = client.post("/veff_nc", json={**payload, "theta": 0.1})
    changed_k = client.post("/veff_nc", json={**payload, "K": 0.0})

    assert base.status_code == 200
    assert changed_l.status_code == 200
    assert changed_theta.status_code == 200
    assert changed_k.status_code == 200
    assert base.json()["V_eff"] != changed_l.json()["V_eff"]
    assert base.json()["V_eff"] != changed_theta.json()["V_eff"]
    assert base.json()["V_eff"] != changed_k.json()["V_eff"]


def test_veff_nc_and_orbit_nc_report_same_physical_model() -> None:
    potential = client.post(
        "/veff_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "theta": 0.05,
            "E": 0.3,
            "L": 4.0,
            "r_min": 2.2,
            "r_max": 8.0,
            "n": 200,
        },
    )
    orbit = client.post(
        "/simulate_nc",
        json={
            "metric": "nc-schwarzschild",
            "particle": "massive",
            "M": 1.0,
            "theta": 0.05,
            "E": 0.7,
            "L": 4.0,
            "r0": 20.0,
            "r_stop": 2.0,
            "radial_sign": "in",
            "phi_max": 37.69911184,
            "n": 4000,
        },
    )

    assert potential.status_code == 200
    assert orbit.status_code == 200
    assert potential.json()["meta"]["physical_model"] == orbit.json()["meta"]["physical_model"]


def test_veff_nc_legacy_massive_success() -> None:
    response = client.post(
        "/veff_nc_legacy",
        json={
            "metric": "nc-legacy",
            "particle": "massive",
            "theta": 0.05,
            "L": 1.0,
            "E": 0.1,
            "b": 5.0,
            "r_min": 0.001,
            "n": 1000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["r"]) == 1000
    assert len(data["V_eff"]) == 1000
    assert data["meta"]["mode"] == "nc-legado"
    assert data["meta"]["rst"] == pytest.approx(12.0)
    assert data["meta"]["r_max"] == pytest.approx(24.0)
    assert data["meta"]["mass_concentration_radius"] == pytest.approx(3.0 * (0.05**0.5))
    assert data["meta"]["V_min"] < data["meta"]["energy_level"]


def test_simulate_nc_legacy_massive_captures_at_legacy_inner_radius() -> None:
    response = client.post(
        "/simulate_nc_legacy",
        json={
            "metric": "nc-legacy",
            "particle": "massive",
            "theta": 0.05,
            "L": 1.0,
            "E": 0.1,
            "b": 5.0,
            "norbit": 50.0,
            "capture_radius": 2.0,
            "n": 1000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["captured"] is True
    assert data["meta"]["termination_reason"] == "captured"
    assert min(data["r"]) == pytest.approx(2.0)
    assert data["meta"]["points_returned"] == len(data["r"])
    assert data["meta"]["energy_line_convention"] == "E"
    assert data["meta"]["forbidden_fraction"] == pytest.approx(0.0)
    assert data["meta"]["delta_min"] > 0.0
    assert data["meta"]["r_min_orbit"] == pytest.approx(min(data["r"]))
    assert data["meta"]["r_max_orbit"] == pytest.approx(max(data["r"]))
    assert data["meta"]["V_min_on_orbit"] <= data["meta"]["V_max_on_orbit"]
    assert data["meta"]["warning"] is None


def test_simulate_nc_legacy_photon_uses_impact_parameter_energy_level() -> None:
    response = client.post(
        "/simulate_nc_legacy",
        json={
            "metric": "nc-legacy",
            "particle": "photon",
            "theta": 0.05,
            "L": 1.0,
            "E": 0.1,
            "b": 5.0,
            "capture_radius": 2.0,
            "n": 1000,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["meta"]["energy_level"] == pytest.approx(1.0 / 25.0)
    assert data["meta"]["energy_line_convention"] == "1/b^2"
    assert data["meta"]["captured"] is True
    assert data["meta"]["points_returned"] == len(data["r"])


def test_veff_nc_legacy_changes_when_l_or_theta_changes() -> None:
    payload = {
        "metric": "nc-legacy",
        "particle": "massive",
        "theta": 0.05,
        "L": 1.0,
        "E": 0.1,
        "b": 5.0,
        "rst": 12.0,
        "r_min": 0.5,
        "r_max": 5.0,
        "n": 200,
    }
    base = client.post("/veff_nc_legacy", json=payload)
    changed_l = client.post("/veff_nc_legacy", json={**payload, "L": 2.0})
    changed_theta = client.post("/veff_nc_legacy", json={**payload, "theta": 0.1})

    assert base.status_code == 200
    assert changed_l.status_code == 200
    assert changed_theta.status_code == 200
    assert base.json()["V_eff"] != changed_l.json()["V_eff"]
    assert base.json()["V_eff"] != changed_theta.json()["V_eff"]


def test_veff_nc_legacy_energy_level_tracks_massive_energy() -> None:
    payload = {
        "metric": "nc-legacy",
        "particle": "massive",
        "theta": 0.05,
        "L": 1.0,
        "E": 0.1,
        "b": 5.0,
        "r_min": 0.05,
        "n": 200,
    }
    base = client.post("/veff_nc_legacy", json=payload)
    changed_e = client.post("/veff_nc_legacy", json={**payload, "E": 0.2})

    assert base.status_code == 200
    assert changed_e.status_code == 200
    assert base.json()["meta"]["energy_level"] == pytest.approx(0.1)
    assert changed_e.json()["meta"]["energy_level"] == pytest.approx(0.2)


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
