# v9.5.7 — Pull-A-Part Live Site Discovery

This build keeps v9.5.6 behavior and adds `/api/pullapart-site-discovery`.

The endpoint fetches Pull-A-Part’s current public inventory pages and first-party JavaScript from the running Codespace, then reports candidate inventory/search API URLs and route names. This is used to replace the legacy `AdvancedVehicleSearch` connector with the same service the current website uses.

No candidate endpoint is promoted to production inventory until its returned rows are verified against the public website.
