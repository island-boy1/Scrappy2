# v9.5.5 Verification

This package was rebuilt after correcting the prior mislabeled build.

Verify before starting:

```bash
grep -n "BUILD_VERSION='9.5.5'" server.js
node --check server.js
node --check app.js
```

Then run `npm start` and check `/api/health` for `"version":"9.5.5"`.
