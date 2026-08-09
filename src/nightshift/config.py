"""Runtime configuration for Nightshift.

Everything is read from the environment so the same code runs against a local
`datahub docker quickstart` and against a hosted instance, with no secret ever
written to the repo.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


class ConfigError(RuntimeError):
    """Raised when the environment is missing something Nightshift needs."""


@dataclass(frozen=True)
class Settings:
    gms_url: str
    gms_token: str | None

    @property
    def graphql_url(self) -> str:
        return f"{self.gms_url.rstrip('/')}/api/graphql"

    @property
    def openapi_url(self) -> str:
        return f"{self.gms_url.rstrip('/')}/openapi"

    def auth_headers(self) -> dict[str, str]:
        if not self.gms_token:
            return {}
        return {"Authorization": f"Bearer {self.gms_token}"}


def load_settings() -> Settings:
    gms_url = os.environ.get("DATAHUB_GMS_URL", "http://localhost:8080")
    token = os.environ.get("DATAHUB_GMS_TOKEN") or None
    if not gms_url:
        raise ConfigError("DATAHUB_GMS_URL is empty")
    return Settings(gms_url=gms_url, gms_token=token)
