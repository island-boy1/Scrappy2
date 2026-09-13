# Georgia Junkyard Inventory Search v9.5

## Pull-A-Part connector repair

v9.5 removes the four questionable static/fallback Pull-A-Part inventory sets from the normal inventory load. Pull-A-Part Atlanta East, Atlanta North, Atlanta South, and Augusta are now treated as **SEARCH DRIVEN** official connectors.

When a user supplies both make and model, the server queries Pull-A-Part's public inventory service on demand, filters the response to the requested make/model and the four Georgia locations, and records per-yard telemetry. Pull-A-Part records are only returned when they come from the official service. No third-party Pull-A-Part fallback records are mixed into ordinary search results.

This avoids the previous condition where each Georgia Pull-A-Part yard appeared to contain exactly 16 vehicles.

## Test

1. Start with `npm start`.
2. Open `/api/health`.
3. Open `/api/connectors` and confirm the four Pull-A-Part yards show `SEARCH_DRIVEN`.
4. Search a make + model, such as `VOLVO` + `XC60`.
5. Re-open `/api/connectors` to inspect Pull-A-Part `searchTelemetry` counts, response times, and errors.
