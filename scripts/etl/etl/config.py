import os
import json

from jsonschema import validate
from jsonschema.exceptions import ValidationError


def validate_config(config: dict, schema_path: str) -> (bool, str):
    # Validate JSON

    with open(schema_path, 'r') as schema_stream:
        schema = json.load(schema_stream)

    try:
        validate(instance=config, schema=schema)
    except ValidationError as err:
        return (False, f"SCHEMA ERROR: {err.message}")

    hasCheckFailed = False
    err = ""
    filter_ids = [f['id'] for f in config["filterCategories"]]
    used_filters = {
        f:False for f in filter_ids
    }

    # Check filter names
    for view in config["views"]:
        for cat_grp in view["categoryGroups"]:
            for cat in cat_grp["categories"]:
                if cat not in filter_ids:
                    err = f"Unknown Category: {cat} found for {view['name']}"
                    hasCheckFailed = True
                else:
                    used_filters[cat] = True
        for other in view["otherCategoryGroups"]:
            for cat in other["categories"]:
                if cat not in filter_ids:
                    err = f"Unknown Category: {cat} found for {view['name']}"
                    hasCheckFailed = True
                else:
                    used_filters[cat] = True
    # check for unused filter
    for f,used in used_filters.items():
        if not used:
            err = f"Category {f} is not used by any of the views!"
            hasCheckFailed = True
            break

    # check datasets
    if hasCheckFailed:
        return (False, err)
    return (True, "success")


def validate_dataset(datasets: dict, schema_path: str) -> (bool, str):
    # Validate JSON

    with open(schema_path, 'r') as schema_stream:
        schema = json.load(schema_stream)

    try:
        validate(instance=datasets, schema=schema)
    except ValidationError as err:
        return (False, f"SCHEMA ERROR: {err.message}")

    for dataset in datasets:
        if not os.path.exists(dataset['path']):
            return (False, f"Unable to access {dataset['path']}")

    return (True, "Success")
