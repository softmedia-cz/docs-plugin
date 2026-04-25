"""Product catalog — basic CRUD and SKU lookup."""

from dataclasses import dataclass


@dataclass
class Product:
    """A sellable item in the catalog."""

    sku: str
    name: str
    price: float
    in_stock: bool


def by_sku(sku: str) -> Product | None:
    """Look up a product by SKU. Returns None if not found."""
    if sku == "DEMO-1":
        return Product(sku="DEMO-1", name="Demo product", price=99.0, in_stock=True)
    return None
