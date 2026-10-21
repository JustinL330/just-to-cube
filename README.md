# jus-cubing

A responsive, independently built cubing timer and WCA data explorer, inspired by csTimer.

## Features

- English (default), Traditional Chinese (Hong Kong), Simplified Chinese, Japanese, Korean, French and German.
- Spacebar/touch timer: hold for 300 ms and release to start, then press a key or touch to stop.
- Optional 15-second inspection; +2 from 15 seconds and DNF from 17 seconds. Escape cancels inspection.
- Scrambles and 2D puzzle previews for 2×2–7×7, Clock, Megaminx, Pyraminx, Skewb, Square-1, one-handed and blindfolded events, using self-hosted cubing.js.
- Multiple sessions, best single, mean, ao5/ao12 (trimmed averages), history, graph, manual entry, +2/DNF editing and undoable solve removal.
- JSON backup export and additive import; CSV session export. Data remains in localStorage on the current device/browser.
- WCA competitor, competition and WCA-ID personal record search through a fixed-source Worker endpoint. WCA is an external dependency; failures are shown explicitly. Other website searches open external websites, with some using Bing site search.
- Self-hosted scripts, styles and scramble workers; offline caching through a service worker. No Google fonts, runtime CDN, telemetry or accounts.

## Development

Requires Node.js 22.3+ (Cloudflare build defaults are suitable).

```sh
npm ci
npm test
npm run build
npx wrangler pages dev dist
```

Build copies the app and bundles npm dependencies locally while preserving cubing.js's worker/module paths. No runtime assets come from npm or third-party CDNs.

## Cloudflare deployment

For Git integration, connect **justinfromhkg/jus-cubing**, production branch `main`, to a new **Cloudflare Pages** project named `jus-cubing`:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

`wrangler.jsonc` configures Pages. `functions/api/[[path]].js` routes `/api/*` to `worker.js`. `wrangler.worker.jsonc` also supports standalone Workers deployment with `npx wrangler deploy --config wrangler.worker.jsonc`. No secrets or database bindings are required. Subsequent pushes to `main` trigger builds through Cloudflare's Git integration.

## Mainland China access

The app avoids dependencies often unavailable in mainland China. All app and puzzle assets are served from the same host. After offline caching finishes (check Settings), practice works without the network. An initial successful HTTPS visit is required.

**A pages.dev or workers.dev address does not guarantee accessibility from mainland China.** A custom domain or a domestic mirror and testing on mainland networks may be necessary. WCA/Bing/Bilibili and other external websites have their own availability. The Worker retrieves WCA data server-side with a 12-second timeout and a 5-minute edge cache, so the visitor's browser does not connect directly to WCA for embedded search.

## Data and limitations

This is a practice tool, not an official WCA scrambling program. WCA data is public website data and its endpoints may change. It is cached for 5 minutes; no claim is made of complete results or availability. Export regular backups before changing browser/device or clearing site data. No cloud synchronization is provided.

## Credits and licensing

Original app code: MIT (see LICENSE). cubing.js 0.66.1: MPL-2.0 OR GPL-3.0-or-later; used here under MPL-2.0, with notices distributed in `dist/vendor`. Its unchanged source is available from the pinned npm package and https://github.com/cubing/cubing.js. Other dependencies retain their licenses. No csTimer source is copied. csTimer is an inspiration/reference only. Not affiliated with WCA, csTimer, or Rubik's brand owners.

For direct upload, run `npm run build`, zip the contents of `dist` (with index.html at the archive root), and upload it to a Cloudflare Pages Direct Upload project. `_worker.js` and `_routes.json` contain the search backend and its API routes. `deployment/jus-cubing-cloudflare.zip` is the prebuilt upload package. Direct Upload does not automatically deploy future GitHub pushes.
