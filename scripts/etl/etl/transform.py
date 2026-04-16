"""
Helper methods used to transform dataset inputs into parquet files
"""
import os

import duckdb

"""
# Step 1: Connect to new .duckdb file
conn = duckdb.connect("../amr_data.duckdb")

# Step 2: Create table from Parquet
conn.execute("CREATE TABLE amr_table AS SELECT * FROM '../amr_v2.parquet'")

# Optional: verify the schema
print(conn.execute("PRAGMA table_info('amr_table')").fetchall())

conn.close()
"""

DATASET_VIEW = """
create view dataset as
select {} from
read_csv('{}', header=true, all_varchar=true, delim =',', quote='"');
"""

DATASET_PARQUET_VIEW = """
create view dataset as
select {} from
read_parquet('{}');
"""

FILTER_VIEW = """
create view filter as
select * from read_csv('{}',header=false, columns = {{ '{}': 'VARCHAR'}});
"""

FILTERED_DATASET_VIEW = """
create view filtered_dataset as
select dataset.* from dataset right join filter on dataset.{} = filter.{}
"""

OUTPUT = """
COPY {} TO '{}'
"""


def transform_dataset(data: dict, release_path: str) -> (bool, str):
    # load data set
    target = "dataset"
    conn = duckdb.connect()
    # custom columns
    dataset_cols = ['*']
    if "create_columns" in data:
        print("Creating new columns")
        for c in data["create_columns"]:
            dataset_cols.append(
                f"{c['command']} as {c['name']}"
                )

    if '.parquet' in data['path']:
        conn.execute(DATASET_PARQUET_VIEW.format(", ".join(dataset_cols), data['path']))
    else:
        conn.execute(DATASET_VIEW.format(", ".join(dataset_cols), data['path']))
    # filter
    if "filter" and "filter_column" in data:
        print(f"Filtering {data['name']}")
        target = "filtered_dataset"
        col = data["filter_column"]
        conn.execute(FILTER_VIEW.format(data['filter'], col))
        conn.execute(FILTERED_DATASET_VIEW.format(col, col))

    # output as parquet
    name = f"{data['name']}.parquet"
    save_path = os.path.join(release_path, name)
    conn.execute(OUTPUT.format(target, save_path))
    conn.close()

    return (True, save_path)


def transform_datasets(
            datasets: list[dict],
            release_path: str
            ) -> (bool, str, list[dict]):
    for dataset in datasets:
        result = transform_dataset(
            dataset,
            release_path
        )

        if not result[0]:
            return (result[0], result[1], [])
        else:
            dataset['parquet'] = result[1]
    return (True, "Success", datasets)
