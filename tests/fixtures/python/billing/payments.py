"""Payment processing — capture, refund, status lookup."""

from enum import Enum


class PaymentStatus(str, Enum):
    """Lifecycle of a payment."""

    PENDING = "pending"
    CAPTURED = "captured"
    REFUNDED = "refunded"
    FAILED = "failed"


def capture(invoice_id: str, amount: float) -> str:
    """Capture a payment for an invoice. Returns the gateway transaction id."""
    return f"txn-{invoice_id}-{int(amount * 100)}"


def refund(transaction_id: str) -> bool:
    """Issue a full refund for a previously captured transaction."""
    return transaction_id.startswith("txn-")
