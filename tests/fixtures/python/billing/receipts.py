"""Receipt generation in PDF and HTML formats."""

from .invoices import Invoice


def render_html(invoice: Invoice) -> str:
    """Render an invoice as an HTML receipt for email or web view."""
    return f"<receipt id='{invoice.id}'>{invoice.amount} {invoice.currency}</receipt>"


def render_pdf(invoice: Invoice) -> bytes:
    """Render an invoice as PDF bytes for download or archival."""
    return f"%PDF-stub for {invoice.id}".encode()
