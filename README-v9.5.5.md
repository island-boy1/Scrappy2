# v9.5.5 — Pull-A-Part Persistent Make Catalog

This build removes the stale hard-coded VOLVO=52 assumption. Pull-A-Part make IDs are learned only from authoritative `makeName`/`makeID` pairs returned by the service and persisted in `pullapart-make-cache.json`.

Changes:
- persistent make-name -> make-ID cache across server restarts
- tries catalog-style Make 0/-1 discovery before numeric scanning
- bounded discovery uses small batches to reduce timeout storms
- rejects and deletes stale mappings automatically
- diagnostics include `catalogSource`, `cacheHit`, `learnedMakeId`, `persistedMakeCount`, and `makeCache`
- keeps model/location filtering and official-source provenance from v9.5.4

Test: search VOLVO + XC60, then open `/api/pullapart-diagnostics`. A successful first discovery should persist VOLVO's real numeric ID; subsequent searches should use `CACHED_MAKE_ID` and be much faster.
