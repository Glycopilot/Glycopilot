import pytest


@pytest.mark.asyncio
async def test_health_returns_200(client):
    response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_response_structure(client):
    data = (await client.get("/health")).json()
    assert "status" in data
    assert "models_loaded" in data
    assert "model_version" in data


@pytest.mark.asyncio
async def test_health_models_loaded_is_dict(client):
    data = (await client.get("/health")).json()
    assert isinstance(data["models_loaded"], dict)


@pytest.mark.asyncio
async def test_health_status_is_string(client):
    data = (await client.get("/health")).json()
    assert isinstance(data["status"], str)
