import base64
import binascii

import pytest

from core.encoding import b64url_decode_to_str


def test_b64url_decode_to_str_round_trip():
    raw = '{"view_id": 1, "selected_filters": []}'
    encoded = base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8").rstrip("=")
    assert b64url_decode_to_str(encoded) == raw


def test_b64url_decode_to_str_rejects_invalid_input():
    with pytest.raises((binascii.Error, UnicodeDecodeError)):
        b64url_decode_to_str("not-valid-base64!!!")
