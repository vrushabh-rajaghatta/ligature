"""Application settings, mirroring the env contract of the Next.js app."""
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # .env ships with empty values by design — treat "" as "use the default"
    @field_validator("*", mode="before")
    @classmethod
    def _empty_string_uses_default(cls, value, info):
        if value == "" and cls.model_fields[info.field_name].annotation is not str:
            return cls.model_fields[info.field_name].default
        return value

    # Database
    database_url: str = ""

    # Auth (mirrors src/config/auth-config.ts)
    jwt_secret: str = ""
    jwt_issuer: str = "ligature"
    jwt_audience: str = "ligature-app"
    session_cookie_name: str = "ligature-session"
    session_max_age_seconds: int = 8 * 3600

    # Feature flags
    demo_mode: bool = False
    oq_mode_enabled: bool = False
    oq_bypass_token: str = ""
    pgvector_enabled: bool = False

    # AI
    ai_provider: str = ""
    anthropic_api_key: str = ""
    voyage_api_key: str = ""
    allow_mock_fallback: bool = True

    # Storage (R2 / S3-compatible)
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_public_url: str = ""

    # Integrations
    redis_url: str = ""
    resend_api_key: str = ""
    invite_from_email: str = ""
    cron_secret: str = ""
    webhook_secret: str = ""

    # Monitoring
    sentry_dsn: str = ""
    log_level: str = "info"

    # App
    app_url: str = "http://localhost:5173"
    app_version: str = "0.126.17"

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def is_demo_mode(self) -> bool:
        """Demo mode if explicitly set OR no database configured (parity with login route)."""
        return self.demo_mode or not self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
