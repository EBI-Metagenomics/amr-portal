import os

import duckdb

DATASET_PREFIX = "dataset-"
SQL_CREATE_DATASET_COLUMNS = """
CREATE TEMP TABLE column_dump AS (
SELECT "table" AS dataset, unnest(columns, recursive:=true)
FROM read_json([{}])
);

CREATE TEMP TABLE unique_datasets AS (
    SELECT DISTINCT dataset from column_dump
);

CREATE SEQUENCE sq_column_id START 1;
CREATE TABLE column_definition AS
    SELECT nextval('sq_column_id') as column_id,
           concat(dataset,'-',id) as fullname,
           id as name,
           COLUMNS([
               c for c in (*) if
               c in [
                    'label',
                    'type',
                    'sortable',
                    'url',
                    'delimiter'
               ]
           ])

    FROM column_dump;

ALTER TABLE column_definition ADD PRIMARY KEY (column_id);

CREATE SEQUENCE sq_dataset_id START 1;
CREATE TABLE dataset AS (
    SELECT nextval('sq_dataset_id') as dataset_id, dataset as name
    FROM unique_datasets
);

ALTER TABLE dataset ADD PRIMARY KEY (dataset_id);

CREATE TABLE dataset_column AS (
    SELECT d.dataset_id, cd.column_id
    FROM dataset as d
    JOIN column_definition as cd
    ON cd.fullname.starts_with(d.name)
);

"""

SQL_DATASET_COLUMN_MAP = """
SELECT map_from_entries(LIST(cols)) as col_map
FROM (
    SELECT ROW(fullname, {'id':column_id, 'name':name}) as cols
    FROM column_definition
);
"""

SQL_CATEGORY_MAP = """
SELECT map_from_entries(LIST(cats)) as cat_map
FROM (
    SELECT ROW(name, {'id':category_id}) as cats
    FROM category
);
"""

FILTER_PREFIX = "filters-"
SQL_CREATE_FILTERS = """
CREATE TEMP TABLE filter_dump as (
    SELECT id, dataset,
           title, unnest(filters, recursive:=true)
    FROM read_json([{}]));

CREATE TEMP TABLE category_dump as (
    SELECT
    distinct id, title, dataset
    FROM filter_dump
);

CREATE SEQUENCE sq_category_id START 1;
CREATE TABLE category AS (
    SELECT
        nextval('sq_category_id') as category_id,
        dc.dataset_id,
        cd.column_id,
        cat_d.title,
        CONCAT(cat_d.dataset,'-',cat_d.id) as name
    FROM category_dump as cat_d
    JOIN column_definition as cd
    ON (cd.fullname = CONCAT(cat_d.dataset,'-',cat_d.id))
    JOIN dataset_column as dc
    ON (cd.column_id = dc.column_id)
);

ALTER TABLE category ADD PRIMARY KEY (category_id);

CREATE TABLE filter AS (
    SELECT cd.column_id, value, fd.label
    FROM filter_dump as fd
    JOIN column_definition as cd
    ON (cd.fullname = CONCAT(fd.dataset,'-',fd.id))
);
"""

SQL_DATASETS = """
CREATE TABLE {} AS (
    SELECT * FROM '{}'
)
"""

SQL_GET_DATASET_COLUMNS = """
select column_name from (describe {});
"""

SQL_CREATE_VIEW_TABLES = """
CREATE TABLE view (
    view_id INTEGER PRIMARY KEY,
    url_name VARCHAR,
    name VARCHAR
);

CREATE TABLE view_column (
  view_id INTEGER REFERENCES view(view_id),
  column_id BIGINT REFERENCES column_definition(column_id),
  rank INTEGER,
  enable_by_default BOOL
);

CREATE TABLE category_group (
    category_group_id INTEGER PRIMARY KEY,
    name VARCHAR,
    is_primary BOOL,
    view_id INTEGER REFERENCES view(view_id)
);

CREATE TABLE category_group_category (
    category_group_id INTEGER REFERENCES category_group(category_group_id),
    category_id BIGINT REFERENCES category(category_id)
);
"""

SQL_ADD_VIEW = """
INSERT INTO view (view_id, name, url_name) VALUES (?,?,?)
"""

SQL_ADD_CATEGORY_GROUPS = """
INSERT INTO category_group (category_group_id, name, is_primary, view_id)
VALUES (?,?,?,?)
"""

SQL_LINK_CATEGORY_GROUP_AND_CATEGORY = """
INSERT INTO category_group_category (category_group_id, category_id)
VALUES (?,?)
"""

SQL_VIEW_COLUMN = """
INSERT INTO view_column (view_id, column_id, rank, enable_by_default)
VALUES (?,?,?,?)
"""

SQL_CREATE_CATEGORIES_VIEW = """
CREATE VIEW view_categories as (
    SELECT views.view_id, categories.* FROM views
    JOIN categories_to_views ON views.view_id = categories_to_views.view_id
    JOIN categories ON categories.column_id = categories_to_views.column_id
)
"""

SQL_CREATE_VIEW_CATEGORIES = """
CREATE VIEW view_categories as (
    SELECT
    v.view_id,
    v.url_name AS view_url_name,
    v.name AS view_name,
    cg.category_group_id,
    cg.name AS category_group_name,
    cg.is_primary as category_group_is_primary,
    c.title as category_name,
    c.column_id,
    cd.name as column_name,
    cd.fullname as column_fullname,
    d.name as dataset_name
    FROM category_group as cg
    JOIN category_group_category as cgc
    ON (cgc.category_group_id = cg.category_group_id)
    JOIN category AS c ON (cgc.category_id = c.category_id)
    JOIN view_column AS vc
    ON (cg.view_id = vc.view_id AND c.column_id = vc.column_id)
    JOIN view AS v on (vc.view_id = v.view_id)
    JOIN column_definition AS cd on (c.column_id = cd.column_id)
    JOIN dataset as d on (d.dataset_id = c.dataset_id)
    ORDER BY v.view_id, cg.category_group_id
)
"""

SQL_CREATE_VIEW_CATEGORIES_JSON = """
CREATE VIEW view_categories_json as (
    SELECT
    {view_id: view_id,
    view_url_name: view_url_name,
    category_group_id: category_group_id,
    view_name: view_name,
    category_group_name: category_group_name,
    category_group_is_primary: category_group_is_primary,
    category_name: category_name,
    column_id: column_id,
    column_name: column_name,
    column_fullname: column_fullname,
    dataset_name: dataset_name
    }::JSON as json
    FROM view_categories
);
"""

SQL_CREATE_RELEASE = """
CREATE TABLE release AS (
    SELECT strftime(current_date(),'%Y-%m') as release_label
);
"""


def find_files(target_path: str, prefix: str, extension: str) -> [str]:
    return [
        os.path.join(target_path, f) for f in os.listdir(target_path)
        if f.startswith(prefix) and f.endswith(extension)
    ]


def find_parquets(target_path: str) -> [dict]:
    return [
        {
            "dataset": f.split('.')[0],
            "path": os.path.join(target_path, f)
        } for f in os.listdir(target_path)
        if f.endswith('.parquet')
    ]


def amr_release_to_duckdb(
        release_path: str,
        views: dict,
        release: str
        ) -> (bool, str):
    # create db
    db_path = os.path.join(release_path, f"amr_{release}.duckdb")
    conn = duckdb.connect(db_path)

    # load dataset meta
    dataset_meta = [f"'{f}'" for f in find_files(
        release_path,
        DATASET_PREFIX,
        "json"
    )]

    if len(dataset_meta) == 0:
        return (False, "No dataset metadata found!")

    # load column data and build map
    conn.execute(
        SQL_CREATE_DATASET_COLUMNS.format(",".join(dataset_meta))
        )
    col_map = conn.query(SQL_DATASET_COLUMN_MAP).fetchone()[0]

    # load filters
    filters = [f"'{f}'" for f in find_files(
        release_path,
        FILTER_PREFIX,
        "json"
    )]

    conn.execute(
        SQL_CREATE_FILTERS.format(
            ",".join(filters))
        )

    # get category map
    cat_map = conn.query(SQL_CATEGORY_MAP).fetchone()[0]

    # create views and other tables
    schema_sql = [
        SQL_CREATE_VIEW_TABLES,
        SQL_CREATE_VIEW_CATEGORIES,
        SQL_CREATE_VIEW_CATEGORIES_JSON,
        SQL_CREATE_RELEASE
    ]

    for sql in schema_sql:
        conn.execute(sql)

    # load datasets
    datasets = find_parquets(
        release_path,
    )
    for d in datasets:
        print(
            SQL_DATASETS.format(
                d['dataset'],
                d['path']
            )
        )

        conn.execute(
            SQL_DATASETS.format(
                d['dataset'],
                d['path']
            )
        )

    # setup views
    category_index = 1
    view_index = 1
    for v in views:
        conn.execute(
            SQL_ADD_VIEW,
            [view_index, v["name"], v["url_name"]]
        )

        # filter groups
        groups = [
            (True, c) for c in v["categoryGroups"]
        ]
        groups.extend([
            (False, c) for c in v["otherCategoryGroups"]
        ])

        for (is_prime, cat) in groups:
            conn.execute(
                SQL_ADD_CATEGORY_GROUPS,
                [category_index, cat['name'], is_prime, view_index]
            )

            for c in cat["categories"]:
                cat_id = f"{v['dataset']}-{c}"
                category_id = cat_map[cat_id]['id']
                conn.execute(
                    SQL_LINK_CATEGORY_GROUP_AND_CATEGORY,
                    [category_index, category_id]
                )
            category_index += 1
        # setup columns
        columns_added = []
        highest_rank = 0
        for c in v["columns"]:
            column_fullname = f"{v['dataset']}-{c['name']}"
            column_id = col_map[column_fullname]['id']
            conn.execute(
                SQL_VIEW_COLUMN,  # COLUMN ID
                [view_index, column_id, c['rank'], c['enabled']]
            )
            if c['rank'] > highest_rank:
                highest_rank = c['rank']
            columns_added.append(column_fullname)
        # pull in columns not detailed
        for dataset in v["other_columns"]:
            columns = conn.query(
                SQL_GET_DATASET_COLUMNS.format(dataset)
            ).fetchall()

            # loop through dataset, ommit
            for c in columns:
                column_fullname = f"{dataset}-{c[0]}"
                if column_fullname not in columns_added and column_fullname in col_map:
                    column_id = col_map[column_fullname]['id']
                    highest_rank += 1
                    conn.execute(
                        SQL_VIEW_COLUMN,   # COLUMN ID
                        [view_index, column_id, highest_rank, False]
                    )
        view_index += 1

    return (True, "Success")
