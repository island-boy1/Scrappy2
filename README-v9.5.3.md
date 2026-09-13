# v9.5.3 — Pull-A-Part Deep Diagnostics

This build preserves the working v9.5.2 on-demand search trigger and adds a dedicated `/api/pullapart-diagnostics` endpoint.

New diagnostics include build version, make IDs tried, HTTP status, response content type, response size, bounded response previews, timeout/HTTP/transport counters, parsed record counts, and rows per Georgia Pull-A-Part yard.

`/api/health` now reports `version: "9.5.3"` so it is easy to confirm that the correct server is running.

Test sequence:
1. Start the app with `npm start`.
2. Open `/api/health` and confirm version `9.5.3`.
3. Search a make + model such as VOLVO + XC60.
4. Open `/api/pullapart-diagnostics`.
