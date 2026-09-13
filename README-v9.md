# v9 — Connector Status Dashboard

Adds a live connector-health dashboard to the Georgia Junkyard Inventory Search.

Statuses:
- LIVE — source reachable and vehicles parsed
- EMPTY — source reachable but zero vehicles parsed
- CONNECTION ERROR — request failed
- PARSER ERROR — source reachable but parsing failed (reserved for adapters that classify this separately)
- DIRECT LINK ONLY — yard configured without a machine-readable connector
- UNTESTED — configured live yard not yet checked

New endpoint:
- `/api/connectors`

The dashboard shows vehicle count, response time, last successful refresh, and the last connector error.
