import os

_DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def get_cors_origins() -> list[str]:
    """Resolve CORS origins from CORS_ORIGINS (comma-separated)."""
    configured = _split_csv(os.getenv("CORS_ORIGINS"))
    return configured or _DEFAULT_CORS_ORIGINS.copy()
