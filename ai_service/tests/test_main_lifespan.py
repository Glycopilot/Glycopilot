import pytest
from unittest.mock import MagicMock


@pytest.mark.asyncio
async def test_lifespan_loads_models_and_starts_scheduler(monkeypatch):
    import main

    scheduler = MagicMock()
    model = MagicMock()
    monkeypatch.setattr(main, "ensemble_model", model)
    monkeypatch.setattr(main, "start_scheduler", MagicMock(return_value=scheduler))
    monkeypatch.setattr(main.settings, "django_internal_token", "token")

    async with main.lifespan(MagicMock()):
        model.load.assert_called_once_with()
        main.start_scheduler.assert_called_once_with()

    scheduler.shutdown.assert_called_once_with(wait=False)


@pytest.mark.asyncio
async def test_lifespan_handles_missing_scheduler(monkeypatch):
    import main

    monkeypatch.setattr(main, "ensemble_model", MagicMock())
    monkeypatch.setattr(main, "start_scheduler", MagicMock(return_value=None))
    monkeypatch.setattr(main.settings, "django_internal_token", "")

    async with main.lifespan(MagicMock()):
        pass

    main.start_scheduler.assert_called_once_with()
