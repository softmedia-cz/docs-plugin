"""Invoice generation and idempotency."""

from dataclasses import dataclass
from datetime import datetime
from uuid import uuid4


@dataclass
class Invoice:
    """A customer invoice."""

    id: str
    customer_id: str
    amount: float
    currency: str
    issued_at: datetime


def create_invoice(customer_id: str, amount: float, currency: str = "CZK") -> Invoice:
    """Generate a new invoice with a fresh UUID and current timestamp."""
    return Invoice(
        id=str(uuid4()),
        customer_id=customer_id,
        amount=amount,
        currency=currency,
        issued_at=datetime.utcnow(),
    )
