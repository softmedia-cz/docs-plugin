"""Category tree — hierarchy of product categories."""

from dataclasses import dataclass, field


@dataclass
class Category:
    """A product category. Categories form a tree via the children field."""

    id: str
    name: str
    parent_id: str | None = None
    children: list["Category"] = field(default_factory=list)


def root_categories() -> list[Category]:
    """Return all top-level categories (those without a parent)."""
    return [
        Category(id="electronics", name="Electronics"),
        Category(id="books", name="Books"),
    ]
