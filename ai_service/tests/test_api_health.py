def test_health_returns_200(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_health_response_structure(client):
    data = response = client.get("/health").json()
    assert "status" in data
    assert "models_loaded" in data
    assert "model_version" in data


def test_health_models_loaded_is_dict(client):
    data = client.get("/health").json()
    assert isinstance(data["models_loaded"], dict)


def test_health_status_is_string(client):
    data = client.get("/health").json()
    assert isinstance(data["status"], str)
