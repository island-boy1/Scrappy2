# v9.5.6 — Pull-A-Part Model Catalog Verification

This build keeps the working v9.5.5 Persistent Make Catalog and adds safer model-catalog diagnostics.

## What changed

- Build version is 9.5.6.
- Pull-A-Part model lists learned from vehicle results are now explicitly labeled **observed official inventory**, not a complete master catalog.
- A missing model is reported as `MODEL_NOT_IN_RETURNED_INVENTORY`, rather than implying the model does not exist in Pull-A-Part's master catalog.
- New endpoint: `/api/pullapart-model-catalog?make=VOLVO&model=XC60`.
- Diagnostics now include a `modelCatalog` assessment showing whether the requested model has actually been observed and whether a model ID is known.

## Important

The public Pull-A-Part search form exposes Make and Model selectors, but the currently verified legacy service only gives us authoritative vehicle rows. v9.5.6 therefore does **not** invent a model ID or falsely label the observed list as complete.
