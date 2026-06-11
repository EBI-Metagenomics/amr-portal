"""Streaming serializers for CSV and JSON downloads."""

from __future__ import annotations

import csv
import io
import json
from collections.abc import Iterable, Iterator
from itertools import chain
from typing import Any

from core.constants import CSV_FLUSH_BYTES, CSV_FLUSH_ROW_INTERVAL


def stream_csv(rows: Iterable[dict[str, Any]]) -> Iterator[bytes]:
    """Generate CSV chunks progressively to avoid loading everything in memory."""
    iterator = iter(rows)
    try:
        first_row = next(iterator)
    except StopIteration:
        yield b"id\n"
        return

    buffer = io.StringIO()
    headers = list(first_row.keys())
    writer = csv.DictWriter(buffer, fieldnames=headers, lineterminator="\n")
    writer.writeheader()

    for index, row in enumerate(chain([first_row], iterator), start=1):
        writer.writerow(row)
        if buffer.tell() > CSV_FLUSH_BYTES or index % CSV_FLUSH_ROW_INTERVAL == 0:
            chunk = buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)
            yield chunk.encode("utf-8")

    remaining = buffer.getvalue()
    if remaining:
        yield remaining.encode("utf-8")


def stream_json_rows(rows: Iterable[dict[str, Any]]) -> Iterator[bytes]:
    """Stream JSON array chunks without loading everything into memory."""
    iterator = iter(rows)
    yield b"["
    first = True
    for row in iterator:
        chunk = json.dumps(row, ensure_ascii=False)
        if first:
            first = False
        else:
            yield b","
        yield chunk.encode("utf-8")
    yield b"]"
