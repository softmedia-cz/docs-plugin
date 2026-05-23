"""Thin database wrapper."""


def fetch_one(query: str, *params) -> dict | None:
    """Run a query and return the first row, or None."""
    return None


def execute(query: str, *params) -> int:
    """Run a query and return affected row count."""
    return 0
