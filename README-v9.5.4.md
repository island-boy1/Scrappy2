# v9.5.4 — Pull-A-Part Make / Model / Location Mapping

This build replaces repeated 60-ID brute-force probing for Volvo with the verified Pull-A-Part make mapping (`VOLVO = 52`) learned from v9.5.3 diagnostics. Unknown makes still use bounded discovery and are cached in memory.

## Pull-A-Part changes
- Direct make-ID path for known/learned makes (Volvo seeded at ID 52).
- Fuzzy compact model matching so `XC60`, `XC 60`, `XC-60`, and trim-suffixed model labels can match.
- Dynamic make/model/location catalog learned from official API responses.
- Flexible Georgia yard mapping from `locationName` / learned `locationID`.
- Correct parsing when `vinInformation` is a JSON string.
- Rich diagnostics now include `modelsSeen`, `locationsSeen`, `georgiaModelRecords`, and catalog metadata.
- Diagnostic stages distinguish `MODEL_NOT_PRESENT`, `LOCATION_MAPPING_ZERO`, `MAKE_ID_STALE`, and `PARSED_RESULTS`.

Test: search `VOLVO` + `XC60`, then open `/api/pullapart-diagnostics`.
