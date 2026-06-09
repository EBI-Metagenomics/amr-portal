-- =============================================================================
-- Optional DuckDB session settings (run before heavy FTS queries if needed)
-- =============================================================================
--
-- Use when you see errors like:
--   Out of Memory Error: failed to offload data block ...
--   This limit was set by the 'max_temp_directory_size' setting.
--
-- These are per-connection settings; they do not modify the .duckdb file.
-- =============================================================================

-- Reduce parallel memory pressure (try 2–4 on laptops)
PRAGMA threads = 4;

-- Cap in-memory buffers; spills to temp_directory when exceeded
PRAGMA memory_limit = '4GB';

-- Point temp spill files at a drive with plenty of *free* (not just "available") space
-- PRAGMA temp_directory = '/path/with/free/space/duckdb_tmp';

-- Raise spill limit if the temp drive has room (unlimited: '-1' or 'none')
-- PRAGMA max_temp_directory_size = '200GiB';

-- Verify current settings
SELECT name, value
FROM duckdb_settings()
WHERE name IN ('threads', 'memory_limit', 'temp_directory', 'max_temp_directory_size')
ORDER BY name;
