# Archive

Session-driven log of rapid updates. Each entry (`vX.Y.Z.md`) captures one
push-to-main cycle: the change, why it was made, the files touched.

## Protocol

Each time a change lands:

1. Bump version in `package.json` and `src/version.js` (kept in sync).
2. Add a `vX.Y.Z.md` entry to this folder describing the change.
3. Commit everything and push to `main` — GitHub Pages redeploys from the
   push.

## Version bumps

- **Patch** (`0.2.0 → 0.2.1`) — default for iterative tweaks.
- **Minor** (`0.2.x → 0.3.0`) — reserved for changes flagged as "major."
- **Major** (`0.x.x → 1.0.0`) — saved for the first non-prototype release.

## Entry format

```
# vX.Y.Z — short title
Date: YYYY-MM-DD

## Summary
One-paragraph description of what changed and why.

## Changes
- `path/to/file.js` — what changed.
```
