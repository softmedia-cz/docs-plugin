"""Internal helper — should NOT be picked up as a candidate (only 1 file)."""


def _hash(s: str) -> int:
    return hash(s)
