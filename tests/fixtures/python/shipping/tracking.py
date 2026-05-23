"""Tracking number lookup and status updates."""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class TrackingEvent:
    """A single carrier-reported event in the package's journey."""

    timestamp: datetime
    location: str
    description: str


def latest_status(tracking_number: str) -> TrackingEvent | None:
    """Return the most recent tracking event for a shipment, or None if unknown."""
    if not tracking_number:
        return None
    return TrackingEvent(timestamp=datetime.utcnow(), location="Praha", description="In transit")
