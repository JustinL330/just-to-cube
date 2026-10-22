#!/usr/bin/env bash
set -euo pipefail
# Hosting adapter only. Application changes belong in JustinL330/cubing.pro.
# Never merge this deployment branch into just-to-cube/main.
build_root="$PWD"
source_dir="$(mktemp -d)"
trap 'rm -rf "$source_dir"' EXIT
git clone --depth 1 --branch main https://github.com/JustinL330/cubing.pro.git "$source_dir/app"
cd "$source_dir/app"
source_sha="$(git rev-parse HEAD)"
echo "Building JustinL330/cubing.pro main at $source_sha"
# Use the official registry and the original HowToCook repository in Cloudflare.
npm install --registry=https://registry.npmjs.org --no-audit --no-fund
git clone --depth 1 https://github.com/Anduin2017/HowToCook.git "$source_dir/howtocook"
export HOWTOCOOK_SOURCE_DIR="$source_dir/howtocook"
export NEXT_TELEMETRY_DISABLED=1
npm run howtocook:prepare
node scripts/prepare-static-export.mjs
# Run each step explicitly: upstream build:static can hide a failed build behind restore.
NEXT_OUTPUT_EXPORT=1 ./node_modules/.bin/next build
node scripts/post-static-export.mjs
node scripts/restore-static-export.mjs
test -f dist/index.html
mkdir -p dist/__fallbacks
cp dist/competition/__dynamic__/index.html dist/__fallbacks/competition.html
cp dist/player/__dynamic__/index.html dist/__fallbacks/player.html
cp dist/wca/player/__dynamic__/index.html dist/__fallbacks/wca-player.html
cp dist/admin/organizers/__dynamic__/comp/__dynamic__/result/index.html dist/__fallbacks/organizer-result.html
cat > dist/_redirects <<'REDIRECTS'
/competition/:id /__fallbacks/competition.html 200
/competition/:id/ /__fallbacks/competition.html 200
/player/:id /__fallbacks/player.html 200
/player/:id/ /__fallbacks/player.html 200
/wca/player/:id /__fallbacks/wca-player.html 200
/wca/player/:id/ /__fallbacks/wca-player.html 200
/admin/organizers/:org/comp/:comp/result /__fallbacks/organizer-result.html 200
/admin/organizers/:org/comp/:comp/result/ /__fallbacks/organizer-result.html 200
REDIRECTS
printf '{"repository":"JustinL330/cubing.pro","branch":"main","commit":"%s","environment":"unofficial test deployment"}\n' "$source_sha" > dist/deployment-info.json
cp -a dist "$build_root/dist"
