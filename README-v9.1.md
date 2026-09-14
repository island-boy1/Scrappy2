# v9.1 — Codespaces connector endpoint fix

This build fixes the missing `GET /api/connectors` backend route and makes the initial page load request connector status after inventory initializes.

## Verify

1. Run `npm start`.
2. Open `/api/health` — it should return `ok: true`.
3. Open `/api/connectors` — it should return JSON with a `statuses` array.
4. Open the main page and use **Refresh status**.

Connector status in this build is based on vehicles successfully parsed during a full inventory refresh. A configured source with zero parsed vehicles is reported as `EMPTY`; yards without a machine-readable connector are `DIRECT_LINK_ONLY`.
