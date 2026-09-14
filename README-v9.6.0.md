# Georgia Junkyard Inventory Search v9.6.0

UI polish release built on the verified v9.5.9 Pull-A-Part integration.

## Changes
- Standardizes result arrival-date display across connectors.
- Adds compact result indicators for Pull-A-Part detail/photo capability and source pages.
- Improves result scanning with clearer VIN/stock presentation and shorter View controls.
- Converts the large results table into responsive result cards on smaller screens.
- Reworks the vehicle detail modal into a two-column information/photo layout on desktop and a photo-first stacked layout on mobile.
- Adds a lightweight loading state while published vehicle photos are checked.
- Keeps the verified Pull-A-Part current Inventory Service connector and all other yard connectors unchanged.

## Verification
- `BUILD_VERSION` is `9.6.0`.
- `package.json` version is `9.6.0`.
- Run `node --check server.js` and `node --check app.js` before deployment.
