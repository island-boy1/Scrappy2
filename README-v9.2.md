# Georgia Junkyard Inventory Search v9.2

## Connector Verification & Data Quality

v9.2 keeps the working v9.1 Codespaces inventory search and connector endpoint, then adds data-quality diagnostics designed to catch misleading connector results before more yards are added.

### New in v9.2
- Connector dashboard now shows **source type** for every yard.
- Adds **VIN, row, and arrival-date coverage percentages** for each live feed.
- Adds a **quality rating**: GOOD, REVIEW, NEEDS ATTENTION, or MANUAL.
- Adds a fifth dashboard counter for **quality warnings**.
- Detects high cross-yard vehicle overlap and flags **Possible duplicate feed overlap** when at least five vehicle signatures overlap and the overlap is at least 75% of the smaller feed.
- Clearly labels **third-party fallback** inventory.
- Flags low record counts and configured connectors that return zero parsed vehicles.
- GO Pull-It empty feeds are explicitly identified as **search-driven** because they load after make + model searches.
- `Refresh status` now forces a full inventory refresh using `/api/inventory?refresh=1` before recalculating connector quality.
- `/api/connectors` reuses a fresh inventory cache instead of immediately performing a second full scrape, making the dashboard much faster after an inventory refresh.

### Test in Codespaces
1. Replace the repository files with the contents of the v9.2 ZIP.
2. Stop the existing Node process with `Ctrl+C`.
3. Run `npm start`.
4. Verify `/api/health`.
5. Verify `/api/connectors`.
6. Open the main interface and click **Refresh status**.

### What to look for
The most important v9.2 signal is the **Quality** column. Any yard marked REVIEW or NEEDS ATTENTION should be verified before its inventory is treated as fully trustworthy. A duplicate-feed warning is based on overlapping vehicle signatures, not merely identical vehicle counts.
