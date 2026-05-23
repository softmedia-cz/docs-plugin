"""Shipping carrier integrations (DHL, UPS, Czech Post)."""

from enum import Enum


class Carrier(str, Enum):
    """Supported shipping carriers."""

    DHL = "dhl"
    UPS = "ups"
    CESKA_POSTA = "cp"


def quote(carrier: Carrier, weight_kg: float, country: str) -> float:
    """Get a shipping quote for a given carrier, weight, and destination country."""
    base = {Carrier.DHL: 100.0, Carrier.UPS: 120.0, Carrier.CESKA_POSTA: 50.0}[carrier]
    return base + weight_kg * 10.0 + (50.0 if country != "CZ" else 0.0)
