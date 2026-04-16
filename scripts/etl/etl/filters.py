import os
import json

import duckdb


def generate_filters(
    datasets: list[dict],
    filter_config: dict,
    release_path: str,
) -> dict:
    print("Generating filters")

    # connect to database
    conn = duckdb.connect()

    filter_sql = """
    SELECT DISTINCT {} as value, {} as label
    FROM '{}'
    WHERE {} is not null
    ORDER BY label ASC"""

    for dataset in datasets:
        # generate filter values
        filters = []
        for f in filter_config:
            if f['dataset'] != dataset['name']:
                continue


            filter = dict(f)
            # rename label to prevent using label to mean multiple things
            filter["title"] = filter["label"]
            del filter["label"]

            sql = filter_sql.format(
                f["id"],
                f["filter_label"],
                dataset["parquet"],
                f["id"]
                )
            results = conn.sql(sql)
            cols = results.columns
            filter_values = results.fetchall()

            filter["filters"] = [
                {cols[0]: str(r[0]), cols[1]: str(r[1])} for r in filter_values
                ]
            value_count = len(filter["filters"])
            if value_count == 0:
                print(f"Warning! {f['id']} has no values")

            if value_count > 60:
                print(f"Warning! {f['id']} has over 60 ({value_count}) values")
            del filter["filter_label"]
            filters.append(filter)

        # save
        save_path = os.path.join(
            release_path,
            f"filters-{dataset['name']}.json"
        )
        with open(save_path, "w") as results_out:
            json.dump(filters, results_out, indent=2)
            dataset["filters"] = save_path
    return (True, "Success", datasets)
