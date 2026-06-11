"""Encoding and decoding helpers."""

from __future__ import annotations

import base64


def b64url_decode_to_str(value: str) -> str:
    """Decode a URL-safe Base64 string to UTF-8 text.

    Adds missing padding characters when required.
    """
    padded = value.strip()
    padded += "=" * (-len(padded) % 4)
    return base64.urlsafe_b64decode(padded).decode("utf-8")
