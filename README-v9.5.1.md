# v9.5.1 — On-demand Search Trigger Fix

This patch fixes the front-end path that previously discarded Make/Model when the wrapped `load()` function was called.

## Fixes
- Search Inventory now requests `/api/inventory?make=...&model=...` whenever both Make and Model are present.
- Pull-A-Part and GO Pull-It on-demand connectors are therefore actually invoked.
- The wrapped `load()` function now forwards its arguments instead of silently dropping them.
- The selected yard is preserved after a backend inventory refresh.
- Search-driven yards show a clear Make + Model requirement rather than a misleading ordinary zero-results state.
- Search button displays a live-query progress state.
- Connector status refreshes after an on-demand query so `searchTelemetry` is immediately visible.

## Verification
After installing, search `VOLVO` + `XC60`, then open `/api/connectors`. Pull-A-Part and GO Pull-It rows should have non-null `searchTelemetry`, even if their result count is zero.
