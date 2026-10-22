# Cubing Pro test deployment

Hosting-only branch for https://cubpro.jus-to-cube.pages.dev.

App source: https://github.com/JustinL330/cubing.pro (fork of guojia99/cubing.pro).
Application changes and upstream pull requests belong in that fork. Do not merge this branch into just-to-cube/main.

Cloudflare runs npm run build, which fetches the fork's main branch and exports it to dist. Retry this branch's deployment in Cloudflare after updating the fork. No GitHub Actions minutes are used.

This frontend uses the upstream default API at https://cubing.pro/v3/cube-api; it is not an isolated backend. Avoid write tests against production data. Cross-origin login and API access depend on upstream CORS settings.
