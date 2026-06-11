"""AMR record filter and facet queries."""

VIEW_DATASET_MAP_SQL = "SELECT DISTINCT view_id, dataset_name FROM view_categories"

DISPLAY_COLUMNS_FOR_VIEW_SQL = """
    SELECT cd.fullname, cd.name, cd.label, cd.type, cd.sortable, cd.url, cd.delimiter
    FROM view AS v
        JOIN view_column vc ON v.view_id = vc.view_id
        JOIN column_definition cd ON vc.column_id = cd.column_id
    WHERE v.view_id = ?
    ORDER BY vc.rank
""".strip()

VIEW_FACET_DEFINITIONS_SQL = """
    SELECT
        vc.column_fullname AS id,
        vc.category_name AS label,
        vc.category_group_is_primary AS is_primary,
        vc.category_group_id AS group_id
    FROM view_categories vc
    WHERE vc.view_id = ?
    ORDER BY vc.category_group_is_primary DESC, vc.category_group_id, vc.column_fullname
""".strip()

_FACET_OPTION_LABELS_SQL = """
    SELECT cd.fullname AS facet_id, f.value, f.label
    FROM filter f
    JOIN column_definition cd ON f.column_id = cd.column_id
    WHERE cd.fullname IN ({placeholders})
""".strip()

LIST_VIEWS_SQL = "SELECT view_id, name FROM view ORDER BY view_id"


def facet_option_labels_sql(facet_id_count: int) -> str:
    """Return facet option label SQL with the correct number of bind placeholders."""
    placeholders = ", ".join(["?"] * facet_id_count)
    return _FACET_OPTION_LABELS_SQL.format(placeholders=placeholders)
