# Data provision for the client, and its consequences for architecture

Date: 2025-07-16

## Context
For a very early prototype, as data exploration, Jon ran an instance of DuckDB in the broweser. This prompted a discussion about how the website should be architected

## Discussion

For the overall architecture of this site, we considered a choice between:
  - A traditional client/server model, where data is provided by a backend server
  - A client-only model, in which the client runs its own copy of the database (DuckDB), and retrieves from it all the data required to drive the UI

The focus of discussion was specifically the feasibility of the client-only model.

Upsides:
- Avoids load on our infrastructure (all compute required for data processing is offloaded onto the user)
- As a consequence, enables easy scaling
- Allows for fast prototyping

Downsides:
- Large payload size
  - DuckDB wasm binary (shell.duckdb.org loads a 7.5MB wasm file)
  - Database itself (depending on queries, may need to load a significant fraction of the database file)
    - The database is likely to grow going forward
  - Might be somewhat mitigated by moving files closer to users via CDNs
- Higher demands on users' devices: cpu, memory, browser versions
- Reduced observability
  - This could be mitigated by client-side reporting of errors or load times
- Reduced debuggability
  - DuckDB wasm binary is a black box

## Decisions
Having acknowledged the downsides of the client-only architecture; we agree to proceed with it in order to speed up the development

## Update 2025-10-03
The client was developed in a way that allowed switching between different data providers. For a while, we had a client-side data provider (a DuckDB instance running in the browser); then, for comparison, we introduced a dedicated python backend. Since the payload for the client-only approach (size of DuckDB wasm plus the size of the database it had to load) looked prohibitively large, and the complexity of data querying grew, we scrapped the client-side code that was responsible for pulling data from DuckDB running in the browser.