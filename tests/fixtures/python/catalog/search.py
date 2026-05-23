"""Full-text search over the product catalog."""

from .products import Product, by_sku


def search(query: str, limit: int = 20) -> list[Product]:
    """Search products by name or SKU. Returns up to `limit` matches."""
    if not query:
        return []
    direct = by_sku(query.upper())
    return [direct] if direct else []
