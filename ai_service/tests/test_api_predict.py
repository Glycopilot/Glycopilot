from core.config import settings

_TOKEN = {"X-Internal-Token": settings.internal_token}


def test_predict_invalid_payload_returns_422(client):
    response = client.post("/predict", json={})
    assert response.status_code == 422


def test_predict_too_few_readings_returns_422(client):
    payload = {
        "user_id": "test",
        "for_time": "2024-01-15T10:00:00Z",
        "readings": [
            {"measured_at": f"2024-01-15T0{i}:00:00Z", "value": 100.0}
            for i in range(3)
        ],
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_predict_valid_payload_returns_200_or_503(client, minimal_predict_payload):
    response = client.post("/predict", json=minimal_predict_payload, headers=_TOKEN)
    assert response.status_code in (200, 503)


def test_predict_response_has_status_field(client, minimal_predict_payload):
    response = client.post("/predict", json=minimal_predict_payload, headers=_TOKEN)
    assert "status" in response.json()


def test_predict_invalid_reading_value_returns_422(client):
    payload = {
        "user_id": "test",
        "for_time": "2024-01-15T10:00:00Z",
        "readings": [
            {"measured_at": f"2024-01-15T0{i}:00:00Z", "value": 5.0}
            for i in range(6)
        ],
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_predict_with_wearable_accepted(client):
    payload = {
        "user_id": "test",
        "for_time": "2024-01-15T10:00:00Z",
        "readings": [
            {"measured_at": f"2024-01-15T0{i}:00:00Z", "value": 100.0 + i}
            for i in range(6)
        ],
        "wearable": {"hr_mean": 72.0, "hr_std": 5.0},
        "patient_meta": {"hba1c": 6.5, "gender_is_female": 1},
    }
    response = client.post("/predict", json=payload, headers=_TOKEN)
    assert response.status_code in (200, 503)


def test_predict_missing_token_returns_401(client, minimal_predict_payload):
    response = client.post("/predict", json=minimal_predict_payload)
    assert response.status_code == 401
