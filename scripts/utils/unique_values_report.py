import sys
import csv
import duckdb


def build_report(parquet: str):
    unique_sql = "select distinct {} from amr_data where {} is not null"

    conn = duckdb.connect()
    duckdb.read_parquet(parquet)
    conn.sql(f"CREATE VIEW amr_data AS SELECT * FROM '{parquet}'")

    # get columns
    sql = "select column_name from (describe amr_data)"
    results = conn.sql(sql)
    columns = [c[0] for c in results.fetchall()]

    # get total
    sql = "select count() from amr_data"
    total = conn.sql(sql).fetchall()[0][0]
    print(f"Total rows {total}")

    # get data
    largest_count = 0
    report = {}
    for col in columns:
        results = conn.sql(unique_sql.format(col, col))
        report[col] = [str(r[0]) for r in results.fetchall()]
        if largest_count < len(report[col]):
            largest_count = len(report[col])

    # translate data
    grid = []
    for x in range(0, largest_count):
        row = {}
        for col in columns:
            if x < len(report[col]):
                row[col] = report[col][x]
            else:
                row[col] = ""
        grid.append(row)
    counts = {
        key: len(value) for key, value in report.items()
    }

    with open('report.csv', 'w') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=columns)
        writer.writeheader()
        for r in grid:
            writer.writerow(r)

    with open('counts.csv', 'w') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=columns)
        writer.writeheader()
        writer.writerow(counts)


if __name__ == "__main__":
    build_report(sys.argv[1])
