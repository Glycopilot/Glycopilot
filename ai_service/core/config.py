from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(protected_namespaces=("settings_",), env_file=".env")

    model_version: str = "ensemble_v1.0"
    internal_token: str = "dev_secret"
    log_level: str = "INFO"
    artifacts_dir: str = "artifacts"
    sequence_length: int = 24


settings = Settings()
