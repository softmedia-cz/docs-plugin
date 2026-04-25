"""HTTP API routes."""

from .auth import current_user
from .db import fetch_one


def get_user(user_id: str) -> dict:
    """Return a user dict by id, or raise if not found."""
    row = fetch_one("SELECT * FROM users WHERE id = $1", user_id)
    if not row:
        raise LookupError(user_id)
    return row


def whoami() -> dict:
    """Return the currently authenticated user."""
    return current_user()
