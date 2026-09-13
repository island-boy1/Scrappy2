# Georgia Junkyard Inventory Search — v3

This version aggregates public vehicle inventory from verified Georgia self-service yards.

## Live connectors
- Pull-A-Part Atlanta East, Atlanta North, Atlanta South, Augusta — direct JSON inventory service used by Pull-A-Part's public inventory search.
- Cagle's U Pull It
- S&W U Pull
- Cash N Carry Pull Your Part
- EZ Pull N Pay Atlanta
- EZ Pull N Pay Stockbridge
- EZ Pull N Pay Warner Robins
- Pick Your Part Fayetteville (first 12 public inventory pages per refresh)
- Pick Your Part Savannah (first 12 public inventory pages per refresh)

## Public inventory verified, connector not yet automated
- GO Pull-It Atlanta East
- GO Pull-It Gainesville
- EZ Pull N Pay Columbus
- Pick-N-Pull Jefferson
- Fenix U-Pull Moultrie

## Direct-link only / not yet verified
- Highway 82 Pick & Pay
- Southern Pik-A-Part Augusta
- Southern Pik-A-Part Columbus

## Pull-A-Part connector
The Pull-A-Part public site states that its inventory is updated every evening from each location's unique inventory database. The connector uses the public JSON inventory service documented by an open-source implementation and filters the returned records to the four Georgia locations. If the service changes, the connector will fail gracefully without inventing inventory.

## Run
Node.js 18+:

```bash
node server.js
```

Then open http://localhost:3000

Inventory is cached for 10 minutes to reduce requests. Respect each site's terms, robots rules and rate limits.

## v5 connector status

- Pull-A-Part Georgia: official inventory search is the primary connector. If the official endpoint is unavailable from the server runtime, the app falls back to the current public inventory index for each of the four Georgia yards. The fallback is clearly tagged in the returned record.
- Highway 82 Pick & Pay: added from its official public Search Inventory page; it publishes year, make, model, row, arrival date and location.
- Cagle's, S&W, Cash N Carry, EZ Pull N Pay and other existing connectors remain enabled.

The app intentionally does not claim an XML feed exists when only HTML/JSON is publicly exposed. Each record has a source URL and source type so the aggregator can be audited.


## v6 normalization and deduplication layer

The aggregator now normalizes common make/model variants (for example `XC 60`, `XC-60`, and `XC60`) before filtering and de-duplicates repeated vehicles across overlapping public sources. VIN is the preferred unique key; records without a VIN use yard/year/make/model/submodel/row/arrival as a fallback key. When the same vehicle is found through more than one source, the record retains the source count instead of appearing twice.

This is intentionally normalization rather than VIN inference: the app never invents a VIN or trim that a source did not provide.


## Parts Interchange

Version 8 adds a Parts Interchange module. Pull-A-Part's official interchange workflow is used as the authoritative fitment source. The aggregator also offers a donor-candidate search against its current Georgia vehicle inventory, but those candidates are explicitly labeled as unverified until fitment is confirmed. Pull-A-Part's public interchange workflow asks for location, make, model, year, style, part category, part and fitment and returns vehicles currently on the yard.
