"""Record value normalization and serialization helpers."""

from __future__ import annotations

import math
from typing import Any

import numpy as np

from core.constants import KNOWN_COLUMN_ATTRIBUTES


def normalize_value(value: Any) -> Any:
    """Normalize scalar values so NaN/inf do not leak into serialized output."""
    if value is None:
        return None
    if isinstance(value, str) and value.lower() == "nan":
        return None
    if value in (np.inf, -np.inf):
        return None
    if isinstance(value, (float, np.floating)):
        if math.isnan(value) or math.isinf(value):
            return None
    return value


def build_columns_metadata(display_column_details: dict) -> list[dict[str, Any]]:
    """Build response-level column metadata from DB display column details."""
    columns_meta: list[dict[str, Any]] = []
    for column_id, details in display_column_details.items():
        column_type = details.get("type") or "string"

        column_meta: dict[str, Any] = {
            "id": column_id,
            "label": details.get("label") or details.get("name") or column_id,
            "type": column_type,
            "sortable": bool(details.get("sortable")),
        }
        if column_type in {"link", "array-link"} and details.get("url"):
            column_meta["url_template"] = details["url"]
        columns_meta.append(column_meta)
    return columns_meta


def serialize_record_row(
    row: dict[str, Any],
    columns_meta: list[dict[str, Any]],
    display_column_details: dict,
) -> dict[str, Any]:
    """Serialize one DB row into {column_id: value} for the paginated records API."""
    result: dict[str, Any] = {}

    for column in columns_meta:
        column_id = column["id"]
        value = normalize_value(row.get(column_id))
        column_type = column["type"]

        if value is None:
            result[column_id] = None
            continue

        if column_type == "array-link":
            delimiter = display_column_details[column_id].get("delimiter")
            if delimiter and isinstance(value, str):
                result[column_id] = [entry for entry in value.split(delimiter) if entry]
            else:
                result[column_id] = []
            continue

        result[column_id] = value

    return result


def _cell_attributes(column_details: dict) -> dict[str, Any]:
    """Extract known column-detail fields for per-cell API payloads."""
    cell_obj = {
        key: column_details[key]
        for key in KNOWN_COLUMN_ATTRIBUTES
        if key in column_details and column_details[key] is not None
    }
    cell_obj["type"] = cell_obj.get("type") or "string"
    return cell_obj


def _serialize_link_cell(cell_obj: dict[str, Any], value: Any) -> None:
    if cell_obj.get("url") and value:
        cell_obj["url"] = cell_obj["url"].format(value)
    else:
        cell_obj["url"] = None
    cell_obj["value"] = value


def _serialize_labelled_link_cell(cell_obj: dict[str, Any], value: Any) -> None:
    cell_obj["type"] = "link"
    cell_obj["value"] = value
    if value:
        parts = str(value).split("|")
        if len(parts) >= 2:
            cell_obj["value"] = parts[0]
            cell_obj["url"] = parts[1]


def _serialize_array_link_cell(cell_obj: dict[str, Any], value: Any) -> None:
    delimiter = cell_obj.get("delimiter")
    url_template = cell_obj.get("url")
    if delimiter and url_template and value:
        cell_obj["values"] = [
            {"value": part, "url": url_template.format(part)}
            for part in str(value).split(delimiter)
        ]
    else:
        cell_obj["values"] = []
    cell_obj.pop("url", None)
    cell_obj.pop("delimiter", None)


def serialize_amr_record(
    row: dict[str, Any],
    column_details: dict,
) -> list[dict[str, Any]]:
    """Serialize a row into a list of per-cell objects (legacy cell-array format)."""
    result: list[dict[str, Any]] = []

    for column_id in row:
        value = normalize_value(row.get(column_id))

        if column_id in column_details:
            cell_obj = _cell_attributes(column_details[column_id])
            column_type = cell_obj["type"]

            if column_type == "link":
                _serialize_link_cell(cell_obj, value)
            elif column_type == "labelled-link":
                _serialize_labelled_link_cell(cell_obj, value)
            elif column_type == "array-link":
                _serialize_array_link_cell(cell_obj, value)
            else:
                cell_obj["value"] = value

            cell_obj["column_id"] = column_id
            result.append(cell_obj)
        else:
            result.append(
                {
                    "type": "string",
                    "column_id": column_id,
                    "value": value,
                }
            )

    return result
