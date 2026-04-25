"""Shipping order lifecycle."""

from dataclasses import dataclass


@dataclass
class ShippingOrder:
    """An order ready for shipping. Created after payment is captured."""

    id: str
    address: str
    weight_kg: float


def create_shipping_order(invoice_id: str, address: str, weight_kg: float) -> ShippingOrder:
    """Create a shipping order linked to a paid invoice."""
    return ShippingOrder(id=f"ship-{invoice_id}", address=address, weight_kg=weight_kg)
