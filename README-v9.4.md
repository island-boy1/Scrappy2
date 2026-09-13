# Georgia Junkyard Inventory Search v9.4

## Connector accuracy + provenance

This release builds on v9.3 and focuses on trustworthy inventory attribution.

### Changes
- Adds a Source column to every vehicle result with OFFICIAL / FALLBACK / PUBLIC INDEX provenance.
- The **Live inventory sources only** filter now excludes third-party fallback records.
- Pull-A-Part and other fallback-only connectors display **FALLBACK REVIEW** instead of being counted as authoritative LIVE feeds.
- Adds GO Pull-It on-demand query telemetry (query, result count, timing/error) to connector diagnostics.
- Expands Pick Your Part Fayetteville/Savannah pagination coverage to 20 pages per yard with throttled concurrency.
- Keeps fallback inventory visible by default, but clearly warns users to verify before traveling.
- Improves the vehicle detail modal with source provenance.
- Preserves v9.3 health, connector dashboard, VIN decoder, parts interchange and Codespaces support.

### Verification
After starting with `npm start`:
1. Open `/api/health`.
2. Open `/api/connectors`.
3. Click **Refresh status**.
4. Search **Volvo XC60**.
5. Confirm each result shows a Source badge.
6. Turn on **Live inventory sources only** and verify FALLBACK records disappear.
