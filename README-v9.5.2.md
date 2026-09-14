# v9.5.2 — Pull-A-Part connector diagnostics and latency repair

This release keeps Pull-A-Part search-driven and official-source-only, while improving the legacy service connector.

## Changes

- Replaces the unbounded 60-ID scan with bounded 12-request discovery batches.
- Adds a 6.5-second timeout to every Pull-A-Part service request.
- Learns and caches the numeric Pull-A-Part make ID after the first successful lookup, making repeat searches much faster.
- Adds detailed telemetry fields: `stage`, `makeId`, `attempts`, `successfulResponses`, `httpErrors`, `timeouts`, `transportErrors`, `rawRecords`, `targetMakeRecords`, `targetModelRecords`, and `diagnostic`.
- Distinguishes legitimate zero-model results from transport failures, stale make IDs, and parser/location-mapping failures.
- Continues to exclude the old 16-record third-party Pull-A-Part fallback from normal inventory results.

## Test

1. Start the app with `npm start`.
2. Search `VOLVO` + `XC60`.
3. Open `/api/connectors` and inspect any Pull-A-Part `searchTelemetry` object.
4. Repeat the same make/model search. If the service is responsive, the second search should use `stage: "CACHED_MAKE_ID"` during execution and require far fewer service requests.
