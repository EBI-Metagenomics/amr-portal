import os
import json
import duckdb

KNOWN_SPECIAL_ATTRIBUTES = ["type", "sortable", "label", "hidden"]


def map_type(col_name: str, col_type: str, specials: dict) -> str:
    if col_name in specials and "type" in specials[col_name]:
        return specials[col_name]["type"]

    return "string"


def map_sortable(col_name: str, col_type: str, specials: dict) -> bool:
    if col_name in specials and "sortable" in specials[col_name]:
        return True if specials[col_name]["sortable"] else False
    return True


def format_column_name(col_name: str, specials: dict) -> str:
    if col_name in specials and "label" in specials[col_name]:
        return specials[col_name]["label"]
    col_name = col_name.replace('_', ' ')
    col_name = col_name[0].upper() + col_name[1:]
    return col_name


def build_dataset(parquet: str, table: str, release_path: str, specials: dict) -> dict:

    conn = duckdb.connect()
    duckdb.read_parquet(parquet)
    # get columns
    sql = f"select column_name,column_type from (describe '{parquet}')"
    results = conn.sql(sql)

    dataset = {
        'table': table,
        'columns': []
    }

    # get data
    for col in results.fetchall():
        col_data = {
            'id': col[0],
            'label': format_column_name(col[0], specials),
            'type': map_type(col[0], col[1], specials),
            'sortable': map_sortable(col[0], col[1], specials),
        }

        # append additional data
        if col[0] in specials:
            if "hidden" in specials[col[0]] and specials[col[0]]["hidden"]:
                continue

            for key, val in specials[col[0]].items():
                if key in KNOWN_SPECIAL_ATTRIBUTES:
                    continue
                col_data[key] = val
        dataset["columns"].append(col_data)

    return dataset


def build_datasets(datasets: dict, special_columns: dict, release_path: str) -> (bool, str, list[dict]):
    for dataset in datasets:
        dset = build_dataset(
            dataset["parquet"],
            dataset["name"],
            release_path,
            special_columns.get(dataset["name"], {})
            )
        save_path = os.path.join(
            release_path,
            f"dataset-{dataset['name']}.json"
        )
        dataset["column_meta"] = save_path
        with open(save_path, 'w') as dset_out:
            json.dump(dset, dset_out, indent=4)
    return (True, "success", datasets)

"""
if __name__ == "__main__":

    if len(sys.argv) <= 1:
        print("Requires config!")
        sys.exit(-1)

    with open(sys.argv[1], 'r') as config_in:
        config = json.load(config_in)

    if "special_columns_path" in config:
        with open(config["special_columns_path"], 'r') as special_in:
            special_cases = json.load(special_in)
    else:
        special_cases = {}

    for dataset in config["datasets"]:
        dset = build_dataset(
            dataset["path"],
            dataset["name"],
            special_cases["special_columns"].get('phenotype', {})
            )
        with open(f"{dataset['name']}.json", 'w') as dset_out:
            json.dump(dset, dset_out, indent=4)
"""