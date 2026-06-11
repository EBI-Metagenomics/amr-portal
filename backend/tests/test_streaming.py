import json

from core.streaming import stream_csv, stream_json_rows


def test_stream_csv_emits_header_and_rows():
    chunks = list(stream_csv([{"a": "1", "b": "2"}, {"a": "3", "b": "4"}]))
    text = b"".join(chunks).decode("utf-8")
    assert text.startswith("a,b\n")
    assert "1,2" in text
    assert "3,4" in text


def test_stream_json_rows_emits_array():
    chunks = list(stream_json_rows([{"id": 1}, {"id": 2}]))
    payload = json.loads(b"".join(chunks).decode("utf-8"))
    assert payload == [{"id": 1}, {"id": 2}]
