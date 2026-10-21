# just-to-cube

A responsive, independently built cubing timer and WCA data explorer, inspired by csTimer and DCTimer.

## Live website

**[Open just-to-cube](https://jus-to-cube.pages.dev)** — the deployed app is public and does not require GitHub repository access or a GitHub account.

Source repository: [JustinL330/just-to-cube](https://github.com/JustinL330/just-to-cube)

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
- AI coach with DeepSeek → NVIDIA → Next Router fallback, seven UI languages, conversation context, suggested questions, cancellation and opt-in session summaries.
- Self-hosted scripts, styles and scramble workers; offline caching through a service worker. No Google fonts, runtime CDN or telemetry. Accounts are optional for cloud sync and private messaging.

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

For Git integration, connect **JustinL330/just-to-cube**, production branch `main`, to the **Cloudflare Pages** project named `jus-to-cube`:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root

`wrangler.jsonc` configures Pages. `functions/api/[[path]].js` routes `/api/*` to `worker.js`. `wrangler.worker.jsonc` also supports standalone Workers deployment with `npx wrangler deploy --config wrangler.worker.jsonc`. The timer and WCA search need no secrets or database bindings. The optional AI coach uses the provider configuration below. Subsequent pushes to `main` trigger builds through Cloudflare's Git integration.

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
2. In Cloudflare **Workers & Pages → jus-cubing → Settings → Variables and Secrets**, add **Secret** `NVIDIA_API_KEY` with your key. Add **Plaintext** `NVIDIA_MODEL` with the exact model ID from NVIDIA's generated API example. The default is `nvidia/nemotron-3.5-lightning-30b-a3b`; `NVIDIA_MODEL` overrides it. Check model availability for your account.
3. Deploy/redeploy the updated package so the configuration is active. Open **AI coach → Check again**. Readiness confirms configuration is present; send a short question to verify the actual provider connection.

For standalone Workers, use `npx wrangler secret put NVIDIA_API_KEY --config wrangler.worker.jsonc`, configure `NVIDIA_MODEL` in Worker settings/vars, and deploy. For local Pages testing, create an ignored `.dev.vars` with these two variables. Never put a key in source, browser storage, public assets or a GitHub issue.

The chat uses built-in guides until at least one provider key is configured. Provider authentication, unavailable-model, quota and timeout errors are reported; there are no fabricated fallback answers. Provider attempts share a 42-second timeout budget, 1,200 output-token cap, limited history, request-size validation, same-origin browser enforcement and no caching. Output is rendered as plain text. AI has no live web search; use Explore for current WCA data.

Messages stay in tab memory (not localStorage) until New chat or closing/reloading. Chat context is sent to the first successful configured provider in the fallback order described below. Session summary sharing is off by default; enabling it reveals the exact event/statistics/recent-times summary attached to the next question. Names, full backups and scrambles are not attached automatically. Stopping a request cancels the browser's wait; an already submitted provider request may still count toward quota.

Best-effort rate limiting allows six requests per minute per IP per Worker isolate. It is not a global quota guarantee. The handler optionally uses a Cloudflare rate-limiting binding named `AI_RATE_LIMITER` when configured. Before opening a shared developer key to significant public traffic, configure distributed edge limits and monitor NVIDIA usage; there is no automatic paid upgrade. Fallback requests use the configured provider accounts and can consume their balances.

Reference: https://docs.api.nvidia.com/nim/docs/api-quickstart and https://docs.api.nvidia.com/nim/docs/product

## Accounts and daily check-ins

Cloudflare D1 binding `DB` stores accounts, salted PBKDF2-SHA256 password hashes (600,000 iterations), versioned password records with algorithm/work-factor metadata, hashed session tokens, versioned private practice data and public daily check-ins. The schema is in `migrations/0001_accounts.sql`. The configured database is `jus-cubing-accounts`; run migrations with `npx wrangler d1 migrations apply jus-cubing-accounts --remote`. In a Pages Direct Upload project, add the D1 binding `DB` in Settings → Bindings and redeploy.

Registration/login uses a unique name and password (8–128 characters, with no required mix of uppercase letters, numbers or symbols), with an editable display name and short bio. All password and passphrase fields have a translated Show/Hide control, start hidden, and are hidden again on submission, form reset, navigation or tab hiding. Password changes revoke existing sessions. No email or password recovery is offered. Sessions use Secure, HttpOnly, SameSite cookies. All writes enforce same-origin JSON requests, prepared statements, account ownership and persistent login-attempt limits. Private API responses are never cached.

Signed-in practice auto-saves, including solve timestamps, scramble types, scrambles, penalties, sessions and settings. Local per-account caches queue pending changes. A revision check prevents silent overwrites between devices; conflicts offer an explicit account reload or merge. Merge unions solve IDs and keeps the chosen local version of edited solves; a deleted solve may reappear when merging an older device copy. Guest practice stays separate and is imported only when the user chooses to add it. Cloud payloads are limited to 1.5 MB and 50,000 solves; export backups for larger archives. Closing before saving finishes can leave pending local changes; the account screen shows saved/pending status.

Anyone can read the latest 50 check-ins. Only logged-in users can post or delete their own posts. Posts contain a public display name, bio and up to 500 characters; one post per account-local day is enforced in the database. Optional shared results are calculated server-side from that account's saved results for that day. All other results remain private. The account time zone is set from the browser at registration. The site references https://dctimer.cn/ for timer/training experience; no DCTimer source or branding is copied.

## Password hash security

Passwords are never stored as plaintext. New registrations and password changes use PBKDF2-HMAC-SHA256 with 600,000 iterations, a fresh 32-byte cryptographic salt and a 256-bit derived hash. Records explicitly include the algorithm, version, work factor, salt and hash so they can be upgraded. Existing accounts using the previous raw PBKDF2 hash format continue to log in and upgrade automatically after successful verification; no database migration is needed. Failed logins do not rewrite hashes. Stored parameters and encodings are validated before expensive derivation. Hash comparisons use Cloudflare's native timing-safe operation, with a native Web Crypto MAC-verification fallback for other runtimes. Password changes still revoke prior sessions. Session tokens are random and only their SHA-256 digests are stored in the database.

`deployment/SHA256SUMS.txt` provides the SHA-256 digest of the direct-upload ZIP. Compare it before uploading to check the downloaded file's integrity. Hashing does not replace HTTPS or encrypt users' saved practice data at the application layer.

## Coach and custom statistics

Without NVIDIA configuration, the coach offers curated guides locally in all seven languages. These are explicitly labeled as built-in guides, not generative AI. Questions in guide mode are not sent to NVIDIA. When NVIDIA is configured, normal chat is available; failed AI requests offer a labeled guide fallback. Live AI still requires NVIDIA_API_KEY and NVIDIA_MODEL.

Sessions includes an ao/mo selector and sample size. The default is ao5. aoN removes ceil(N × 5%) results from each end; moN uses all N results. +2 penalties count and untrimmed DNFs make the statistic DNF. Sizes are 3–1000 for ao and 1–1000 for mo. The selection affects the rolling table column and first timer average, and is saved in account settings (or on this device for guests). Both timer average titles open an editor for aoN, moN or Daily count. Daily count includes all sessions and DNFs for the local calendar day in the selected IANA time zone, defaulting to the account time zone or device time zone. The next midnight is calculated in that zone, including DST, and refreshes the counter automatically. The table shows the count for each row’s local date when Daily count is selected.

Long algorithms use their natural height with adaptive text sizing, a smaller timer, and a full-screen expansion button. The mobile navigation is more compact. A separate cube-preview button opens a 2D diagram without occupying the timer layout; cubing.js puzzle geometry supports big-cube previews through 11×11.

## Phase timing and session statistics

Open Training on the Timer, or Statistics in Sessions. Phase timing is off by default. Users explicitly enable it and choose 2–8 phases. Phases are numbered; no method names or custom names are required. Hold and release Space/touch to start, then press Space or tap the timer at every phase boundary; the final phase stops the solve. Escape cancels without saving. Splits use the same monotonic clock as the total, and are saved with the solve in cloud accounts, backups and CSV exports. Phase averages group complete non-DNF solves by their saved phase sequence (new sessions use numbered phases), and exclude inspection time and +2 penalties. Manual entries have no inferred splits.

Session statistics show best, slowest, mean of completed solves, median, population standard deviation and DNF count. The distribution histogram includes all completed solves, including +2; the trend view shows the last 200 attempts and leaves gaps at DNFs. These additions are inspired by the functionality listed at https://dctimer.cn/; they are an independent implementation.

## DeepSeek AI configuration

The Worker reads `DEEPSEEK_API_KEY` or the existing Cloudflare Secret named `jus-cubing` shown in the user's dashboard. DeepSeek is selected when either is present, with default model `deepseek-flash`; optional `DEEPSEEK_MODEL` overrides it. The endpoint is fixed to https://api.deepseek.com/chat/completions. Non-thinking mode keeps chat latency and token use bounded. NVIDIA is the second provider, followed by Next Router. Secrets are used only on the server and are never included in status responses, browser assets, exports, or commits. Runtime configuration takes effect on a new Cloudflare deployment. Requests try configured providers in the order DeepSeek → NVIDIA → Next Router. A successful reply ends the chain. If all providers fail, the UI offers a clearly labelled local guide.

DeepSeek is not advertised as free: usage draws on the site owner's provider account. An insufficient-balance response is shown explicitly. Existing per-IP limits, request bounds, origin checks and output limits apply to all providers. A question counts once toward the site rate limit, including its fallback attempts.

## AI fallback order

The fixed order is **DeepSeek → NVIDIA → Next Router**. Missing keys are skipped. Authentication, balance/quota, unavailable-model, server/network errors, empty or malformed replies, and timeouts try the next configured provider. After the first successful reply, no lower-priority provider is called. Each answer labels the actual provider. The privacy notice explains that the same chat context and any opted-in summary may reach subsequent providers after failures.

- DeepSeek: Secret `DEEPSEEK_API_KEY`, with `jus-cubing` supported as a legacy alias. Optional `DEEPSEEK_MODEL` (default `deepseek-flash`).
- NVIDIA: Secret `NVIDIA_API_KEY`. Optional `NVIDIA_MODEL` (default `nvidia/nemotron-3.5-lightning-30b-a3b`).
- Next Router: Secret `NEXT_ROUTER_API_KEY` or the existing Secret `NEXT_ROUTER`. Optional `NEXT_ROUTER_MODEL` (default `deepseek-v4-flash`). The fixed endpoint is `https://next-router.com/v1/chat/completions`, as shown in Next Router’s model API example at https://next-router.com/models.

Keys stay in Cloudflare Secrets and are never returned by `/api/ai`. Add secrets to the project serving the domain (currently the `jus-to-cube` Pages production project) and deploy after changes. GET `/api/ai` lists the configured providers in order without making paid generation calls or exposing keys. Each attempt gets an equal share of a 42-second upstream budget, so the chain fits the browser’s 50-second wait. Site rate-limit rejections do not trigger upstream fallback. Client cancellation stops any further attempts when the server observes it. Accounts may still charge for an attempt already received.

### Public and private forum zones

Open `/#forum` (the existing `/#checkins` address still works). The original check-in feed is the public zone; records stay in `checkins`, and are read together with new forum posts. Daily check-ins and optional practice summaries remain available. New posts can contain text, up to three images, or both. Images are resized in the browser and limited to 512 KiB each (JPG, PNG or WebP). They are stored in the existing D1 database, with no external image CDN or extra storage binding.

A logged-in user can create a private zone with a 12–128 character password. The creator can add existing accounts by exact username immediately, remove members, change the zone password, and delete the zone. Members may leave themselves; the creator must delete rather than leave their own zone. Password rotation does not change existing memberships. Leaving or removal revokes access; a fresh invitation or the current password permits re-entry. Removal is not a permanent ban against someone who still knows the password.

Private zones are listed only for their members. Knowing a zone ID or image URL is insufficient to read private posts or images. All reads and writes check membership on the server. Only the creator manages the membership list. Authors can delete their own posts; creators can moderate posts in their private zones. Deleting a zone cascades to its posts, attachments and memberships. The interface requires explicit confirmation before deletion.

#### Password and content protection

Zone passwords use the existing salted PBKDF2-SHA256 password record format (600,000 iterations), and are never returned by the API. Password joining is rate limited. Private text and images use authenticated AES-256-GCM encryption at rest, with a random nonce for each item and a zone-specific HKDF-derived key. A password change does not re-encrypt content, so it cannot lock out existing members.

Set **`FORUM_ENCRYPTION_KEY`** as an encrypted Cloudflare Pages **Production** secret before deploying this feature: a cryptographically random 32-byte value encoded as Base64. This key must remain stable and must not be committed to Git, exposed to browsers, reused from an AI provider key, or replaced when changing a zone password. Preserve it securely along with database backups. Changing or losing it without a data migration makes existing private content unreadable. Configure a separate key/database for any isolated preview or staging environment; do not share production data with untrusted previews.

This is server-side encryption, **not end-to-end encryption**: the Worker decrypts authorized responses, and a server administrator with the key can access content. Public posts remain public. Zone names, authors, membership and timestamps are metadata stored unencrypted. Private APIs and attachments use `Cache-Control: no-store, private`, vary by cookie, and bypass the offline service worker. Revocation blocks subsequent requests; it cannot retract content someone has already viewed or saved.

The idempotent forum schema bootstrap (`src/forum-schema.js`, matching `migrations/0002_forum.sql`) creates only the new forum tables and indexes on first use, leaving existing accounts and posts intact. Account tables must already exist. No manual production SQL step is needed for this existing deployment.

Validation: `node --test test/forum.test.mjs` checks real Worker/D1 authorization, direct invitations, password joining, membership removal and exit, password rotation, encryption and tamper rejection, original public-feed preservation, image access, ownership, and cascading deletion. `npm test` runs the full suite.

## Encrypted direct messages

Open **Messages**, sign in, and choose a separate messaging passphrase of at least 12 characters. Both users must enable Messages before starting a chat. Find a contact by their exact login username, then send text (up to 4,000 characters). New messages sync every 10 seconds while unlocked and visible, or with **Sync now**. Messages composed offline are encrypted and queued locally, then retried when online. A message is queued only after its encrypted local copy is saved successfully. Failed or rate-limited uploads stay in the outbox; retry with **Sync now**.

- Ciphertext and passphrase-encrypted key vaults persist in browser IndexedDB, scoped by account. The same ciphertext and encrypted key vaults are stored online in the existing Cloudflare D1 `DB`. Use the same messaging passphrase on another device to recover the private key and fetch message history. Passphrases and decrypted private keys are never sent to the server; plaintext drafts are not persisted. Locking or logging out removes the unlocked key and displayed messages from memory/UI. Retained local ciphertext can be unlocked only with the passphrase.
- Web Crypto uses P-256 ECDH, HKDF-SHA-256 and AES-256-GCM with random 96-bit nonces. Message IDs, sender and recipient IDs are authenticated as additional data. Private-key vaults use AES-256-GCM with PBKDF2-SHA-256 (600,000 iterations and random salts), bound to the account ID. Public keys are immutable through the API, locally pinned and shown as SHA-256 fingerprints for comparison over another trusted channel.
- This is a basic end-to-end encryption design, **not an independently audited secure messenger**. It has no forward secrecy: compromise of a private key can expose past messages. The server sees participants, timestamps and ciphertext lengths. A malicious server can substitute keys on first contact or serve modified client code. Fingerprints help verify contact identity; they do not protect against a compromised device or client. Use a strong, unique messaging passphrase. There is no forgotten-passphrase recovery or automatic key reset, so losing it loses access to old messages. Login password changes do not alter the messaging passphrase.
- HTTPS and Web Crypto are required. The app must be open and unlocked to sync its outbox; it does not send in the background after the tab closes. Local copies depend on browser storage availability and may be cleared by the browser. The timer backup does not include messages. Online history remains available with the account and messaging passphrase.
- `migrations/0003_messages.sql` defines the tables and indexes. The messaging Worker also initializes these idempotently on first authenticated use, allowing existing Pages databases to receive this feature through the usual Git deployment. Requests require the existing HttpOnly session, same-origin writes, ownership checks, size limits and a per-account send rate limit. Inbox queries include only the authenticated sender or recipient, use monotonic sequence cursors and return at most 100 records per page. Message IDs make retries idempotent.

Tests cover vault recovery on a second device, wrong passphrases, ciphertext/identity tampering, unrelated keys, real D1 participant isolation, CSRF, input validation, immutable public keys, encrypted storage and retry deduplication.

## Search results and region filters

Explore searches competitor names and WCA IDs (including prefixes), competition names/cities, and WCA countries/represented regions. Choose a region to search it alone or combine it with a name/ID. Full region names and common aliases such as Hong Kong, 香港, UK and USA also work in the query field. The Personal records mode requires a full WCA ID; competitor cards offer a Personal records button.

Searches with 0–20 matches display immediately. Searches with 21–100 matches show the count and ask whether to show all matches; cancelling returns to refining the criteria. More than 100 matches produces a narrowing prompt and no long result list. Exactly 100 still permits confirmation. Changing any criteria clears pending results and invalidates old requests. All seven interface languages include these controls and warnings.

The backend uses the WCA person directory JSON endpoint (`/persons.json`, with `search`, `region`, `limit` and `offset`) for totals and represented-region filtering, rather than the capped autocomplete endpoint. Region IDs are from the public WCA countries catalogue. The directory can contain historical representations, which are retained as distinct entries with the corresponding region. Competitions use the paginated v0 API, its Total/Per-Page headers, and additional pages when necessary; incomplete upstream results return an error instead of claiming to show all matches. Data remains cached for five minutes.

