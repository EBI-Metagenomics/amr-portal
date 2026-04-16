"""
run: python parquet_to_duckdb.py
"""
import duckdb

# Step 1: Connect to new .duckdb file
conn = duckdb.connect("../amr_data.duckdb")

# Step 2: Create table from Parquet
conn.execute("CREATE TABLE amr_table AS SELECT * FROM '../amr_v2.parquet'")

# Optional: verify the schema
print(conn.execute("PRAGMA table_info('amr_table')").fetchall())

conn.close()