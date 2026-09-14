# v9.5.9 — Pull-A-Part vehicle details

Adds richer Pull-A-Part vehicle detail support on top of the verified v9.5.8 current Inventory Service connector.

- New `/api/pullapart-vehicle` endpoint.
- Fetches official `VehicleExtendedInfo/{locID}/{ticketID}/{lineID}` data.
- Queries Pull-A-Part image service using the same identifiers used by the current website.
- Pull-A-Part View Vehicle modal can show available official vehicle metadata and photo.
- Graceful fallback when extended info or image is unavailable.
- Other yard connectors remain unchanged.
