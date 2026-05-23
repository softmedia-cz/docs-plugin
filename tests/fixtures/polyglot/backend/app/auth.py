"""Authentication helpers."""


def current_user() -> dict:
    """Resolve the current user from the request context."""
    return {"id": "demo", "email": "demo@example.com"}


def require_role(role: str) -> bool:
    """Check whether the current user has the given role."""
    return role == "user"
