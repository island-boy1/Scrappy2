# GitHub Codespaces

1. Create a GitHub repository and upload this project's files.
2. Open the repository and choose **Code → Codespaces → Create codespace on main**.
3. Codespaces will use `.devcontainer/devcontainer.json` and forward port 3000.
4. Run `npm start` in the terminal.
5. Open the forwarded port in the browser.

The forwarded port is private by default. Use the Ports panel if you need a shareable preview.

## Quick health test

After `npm start`, open `/api/health` on the forwarded port. A working server returns JSON with `"ok": true`.
