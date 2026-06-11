import math

import numpy as np

from core.serialization import normalize_value


def test_normalize_value_handles_nullish_scalars():
    assert normalize_value(None) is None
    assert normalize_value("nan") is None
    assert normalize_value("NaN") is None
    assert normalize_value(float("nan")) is None
    assert normalize_value(np.nan) is None
    assert normalize_value(math.inf) is None
    assert normalize_value(-math.inf) is None
    assert normalize_value(np.inf) is None


def test_normalize_value_preserves_valid_values():
    assert normalize_value("") == ""
    assert normalize_value("hello") == "hello"
    assert normalize_value(0) == 0
    assert normalize_value(1.5) == 1.5
