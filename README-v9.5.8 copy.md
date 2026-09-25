# v9.5.8 — Current Pull-A-Part Inventory Service

This build replaces the legacy Pull-A-Part `AdvancedVehicleSearch` probing connector with the current official Inventory Service used by Pull-A-Part's website.

## Verified current Pull-A-Part flow

- Base: `https://inventoryservice.pullapart.com`
- Make catalog: `GET /Make/`
- Model catalog: `GET /Model?makeID=<id>`
- Inventory: `POST /Vehicle/Search`
- Georgia location IDs: Atlanta East `21`, Atlanta North `4`, Atlanta South `3`, Augusta `9`
- Search body: `{ "Locations": [...], "MakeID": <id>, "Models": [<modelID>], "Years": [] }`

The connector now resolves make and model IDs from the current official catalogs. It does not scan numeric IDs or invent model mappings. Search results are normalized from the API's `exact` and `other` collections, then strictly filtered back to the requested make/model before being exposed as official inventory.

## Verified Volvo example

On the live service, Volvo resolves to make ID `58`, XC60 resolves to model ID `1791`, and the Georgia XC60 query returned vehicles at Atlanta East and Atlanta North during verification.

## Diagnostics

`/api/pullapart-diagnostics` now reports `/Vehicle/Search` as the endpoint and includes the resolved current make/model IDs. `/api/pullapart-model-catalog?make=VOLVO&model=XC60` now uses the current official `/Make/` and `/Model` catalogs rather than an observed-only catalog.

All other yard connectors remain unchanged from v9.5.7.
