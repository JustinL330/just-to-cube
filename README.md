# jus-cubing

A responsive, independently built cubing timer and WCA data explorer, inspired by csTimer and DCTimer.

## Features

- Flag-labelled language picker and a light/dark toggle beside it, with a polished hand-held cube app icon.
- English (default), Traditional Chinese (Hong Kong), Simplified Chinese, Japanese, Korean, French and German.
- Fixed viewport timer layout; Space controls the timer without scrolling the page. Long lists use internal panels.
- Millisecond display (three decimal places) for the live timer, solves, averages and exports; official WCA results retain their source precision.
- Spacebar/touch timer: hold for 300 ms and release to start, then press a key or touch to stop.
- Optional 15-second inspection; +2 from 15 seconds and DNF from 17 seconds. Escape cancels inspection.
- Scrambles and 2D puzzle previews for 2×2–7×7, Clock, Megaminx, Pyraminx, Skewb, Square-1, one-handed and blindfolded events, using self-hosted cubing.js.
- Grouped selector with all 17 WCA event types, FTO, Baby FTO, Master Tetraminx, Kilominx and Redi Cube. Additional 8×8–11×11 and R U / R U L / M U training use explicitly labelled random-move practice scrambles. Large-cube previews are not available. Multi-Blind practice generates one cube at a time.
- Multiple sessions, best single, mean, ao5/ao12 (trimmed averages), history, graph, manual entry, +2/DNF editing and undoable solve removal.
- JSON backup export and additive import; CSV session export. Data remains in localStorage on the current device/browser.
- WCA competitor, competition and WCA-ID personal record search through a fixed-source Worker endpoint. WCA is an external dependency; failures are shown explicitly. Other website searches open external websites, with some using Bing site search.
- NVIDIA AI coach with seven UI languages, conversation context, suggested questions, cancellation and opt-in session summaries.
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

`wrangler.jsonc` configures Pages. `functions/api/[[path]].js` routes `/api/*` to `worker.js`. `wrangler.worker.jsonc` also supports standalone Workers deployment with `npx wrangler deploy --config wrangler.worker.jsonc`. The timer and WCA search need no secrets or database bindings. The optional AI coach needs the NVIDIA configuration below. Subsequent pushes to `main` trigger builds through Cloudflare's Git integration.

## Mainland China access

The app avoids dependencies often unavailable in mainland China. All app and puzzle assets are served from the same host. After offline caching finishes (check Settings), practice works without the network. An initial successful HTTPS visit is required.

**A pages.dev or workers.dev address does not guarantee accessibility from mainland China.** A custom domain or a domestic mirror and testing on mainland networks may be necessary. WCA/Bing/Bilibili and other external websites have their own availability. The Worker retrieves WCA data server-side with a 12-second timeout and a 5-minute edge cache, so the visitor's browser does not connect directly to WCA for embedded search.

## Data and limitations

This is a practice tool, not an official WCA scrambling program. WCA data is public website data and its endpoints may change. It is cached for 5 minutes; no claim is made of complete results or availability. Export regular backups before changing browser/device or clearing site data. Signed-in users can save their sessions, dates, results, penalties and settings to their private account. Guest data remains local.

## Credits and licensing

Original app code: MIT (see LICENSE). cubing.js 0.66.1: MPL-2.0 OR GPL-3.0-or-later; used here under MPL-2.0, with notices distributed in `dist/vendor`. Its unchanged source is available from the pinned npm package and https://github.com/cubing/cubing.js. Other dependencies retain their licenses. No csTimer source is copied. csTimer is an inspiration/reference only. Not affiliated with WCA, csTimer, or Rubik's brand owners.

For direct upload, run `npm run build`, zip the contents of `dist` (with index.html at the archive root), and upload it to a Cloudflare Pages Direct Upload project. `_worker.js` and `_routes.json` contain the search backend and its API routes. `deployment/jus-cubing-cloudflare.zip` is the prebuilt upload package. Direct Upload does not automatically deploy future GitHub pushes.

## NVIDIA AI coach

The AI coach uses `/api/ai` on the same host. Cloudflare calls the fixed NVIDIA endpoint `https://integrate.api.nvidia.com/v1/chat/completions`; visitors never receive your key or connect directly to NVIDIA. This avoids an extra browser-side external dependency, but mainland accessibility still needs testing on actual mainland networks and a reachable site domain.

### Activate

1. Sign in to https://build.nvidia.com and choose a text-chat model with API access available to your account. Generate a key. Check the current model availability, quota and applicable service terms; some older free endpoints have been deprecated. Free developer access is intended for prototyping/testing, not an unlimited free public production service.
2. In Cloudflare **Workers & Pages → jus-cubing → Settings → Variables and Secrets**, add **Secret** `NVIDIA_API_KEY` with your key. Add **Plaintext** `NVIDIA_MODEL` with the exact model ID from NVIDIA's generated API example. There is deliberately no hardcoded model that might have lost free access.
3. Deploy/redeploy the updated package so the configuration is active. Open **AI coach → Check again**. Readiness confirms configuration is present; send a short question to verify the actual provider connection.

For standalone Workers, use `npx wrangler secret put NVIDIA_API_KEY --config wrangler.worker.jsonc`, configure `NVIDIA_MODEL` in Worker settings/vars, and deploy. For local Pages testing, create an ignored `.dev.vars` with these two variables. Never put a key in source, browser storage, public assets or a GitHub issue.

The chat shows its unavailable state until both values are set. Provider authentication, unavailable-model, quota and timeout errors are reported; there are no fabricated fallback answers. NVIDIA requests have a 45-second timeout, 1,200 output-token cap, limited history, request-size validation, same-origin browser enforcement and no caching. Output is rendered as plain text. AI has no live web search; use Explore for current WCA data.

Messages stay in tab memory (not localStorage) until New chat or closing/reloading. Only text the visitor sends is sent to NVIDIA. Session summary sharing is off by default; enabling it reveals the exact event/statistics/recent-times summary attached to the next question. Names, full backups and scrambles are not attached automatically. Stopping a request cancels the browser's wait; an already submitted provider request may still count toward quota.

Best-effort rate limiting allows six requests per minute per IP per Worker isolate. It is not a global quota guarantee. The handler optionally uses a Cloudflare rate-limiting binding named `AI_RATE_LIMITER` when configured. Before opening a shared developer key to significant public traffic, configure distributed edge limits and monitor NVIDIA usage; there is no automatic paid upgrade or secondary paid provider.

Reference: https://docs.api.nvidia.com/nim/docs/api-quickstart and https://docs.api.nvidia.com/nim/docs/product

## Accounts and daily check-ins

Cloudflare D1 binding `DB` stores accounts, salted PBKDF2-SHA256 password hashes (600,000 iterations), hashed session tokens, versioned private practice data and public daily check-ins. The schema is in `migrations/0001_accounts.sql`. The configured database is `jus-cubing-accounts`; run migrations with `npx wrangler d1 migrations apply jus-cubing-accounts --remote`. In a Pages Direct Upload project, add the D1 binding `DB` in Settings → Bindings and redeploy.

Registration/login uses a unique name and password (12–128 characters), with an editable display name and short bio. Password changes revoke existing sessions. No email or password recovery is offered. Sessions use Secure, HttpOnly, SameSite cookies. All writes enforce same-origin JSON requests, prepared statements, account ownership and persistent login-attempt limits. Private API responses are never cached.

Signed-in practice auto-saves, including solve timestamps, scramble types, scrambles, penalties, sessions and settings. Local per-account caches queue pending changes. A revision check prevents silent overwrites between devices; conflicts offer an explicit account reload or merge. Merge unions solve IDs and keeps the chosen local version of edited solves; a deleted solve may reappear when merging an older device copy. Guest practice stays separate and is imported only when the user chooses to add it. Cloud payloads are limited to 1.5 MB and 50,000 solves; export backups for larger archives. Closing before saving finishes can leave pending local changes; the account screen shows saved/pending status.

Anyone can read the latest 50 check-ins. Only logged-in users can post or delete their own posts. Posts contain a public display name, bio and up to 500 characters; one post per account-local day is enforced in the database. Optional shared results are calculated server-side from that account's saved results for that day. All other results remain private. The account time zone is set from the browser at registration. The site references https://dctimer.cn/ for timer/training experience; no DCTimer source or branding is copied.
