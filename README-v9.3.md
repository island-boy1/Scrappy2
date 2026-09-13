# v9.3 — Empty Connector Repair & Source Provenance

This release builds on v9.2.

## Changes
- Adds EZ Pull N Pay Columbus to the normal EZ Pull N Pay connector path.
- Adds a clearly-labelled public-index fallback for Columbus when the official landing page does not expose server-rendered inventory.
- Reworks Pick Your Part Fayetteville/Savannah parsing around each vehicle heading and extracts VIN, stock, section/row/space, and arrival date when published.
- Adds Pick-N-Pull Jefferson public-index fallback when its official client-rendered search returns no parseable rows.
- GO Pull-It Atlanta East and Gainesville are now **SEARCH DRIVEN** instead of incorrectly appearing as EMPTY. They activate when a make + model query is supplied.
- Connector dashboard now exposes source trust as OFFICIAL, FALLBACK, or MANUAL.
- Search-driven connectors no longer count as quality warnings simply because no make/model search has run.
- Improves horizontal scrolling / final columns in the connector table.
- Retains v9.2 duplicate-feed overlap detection and all v8/v9 search, VIN, yard, detail, alerts, and interchange features.

## Codespaces test
1. Replace repository files with this release.
2. Stop the existing server with Ctrl+C.
3. Run `npm start`.
4. Test `/api/health`.
5. Test `/api/connectors`.
6. Open the main UI and click **Refresh status**.
7. Run a make + model search (for example Volvo XC60) to exercise the GO Pull-It on-demand connectors.

Fallback inventory is intentionally labelled. It is not represented as an official yard API.
