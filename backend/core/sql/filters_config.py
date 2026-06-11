"""Filters configuration queries."""

FILTERS_CATEGORY_SQL = """
    SELECT f.label, f.value, d.name AS dataset, cd.fullname AS column_id
    FROM filter f
    JOIN column_definition cd ON f.column_id = cd.column_id
    JOIN dataset_column dc ON cd.column_id = dc.column_id
    JOIN dataset d ON dc.dataset_id = d.dataset_id
""".strip()

FILTERS_VIEW_SQL = """
    SELECT view_id,
        view_name,
        view_url_name AS url_name,
        category_group_id,
        category_group_name,
        category_group_is_primary,
        category_name,
        column_fullname AS column_id,
        column_name
    FROM view_categories
    ORDER BY view_id, category_group_id
""".strip()

COLUMNS_PER_VIEW_SQL = """
    SELECT
        v.name AS view_name,
        cd.fullname AS id,
        cd.label,
        cd.sortable,
        vc.rank,
        vc.enable_by_default
    FROM view AS v
        JOIN view_column vc ON v.view_id = vc.view_id
        JOIN column_definition cd ON vc.column_id = cd.column_id
    ORDER BY vc.rank
""".strip()
