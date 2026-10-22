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

# Demo identity belongs only to this test deployment, not the upstream application.
python3 - <<'DEMO_PY'
from pathlib import Path
p = Path("src/app/layout.tsx")
s = p.read_text()
needle = "<Provider>{children}</Provider>"
assert s.count(needle) == 1, "Root layout changed; review demo banner placement"
banner = """<Provider>
          <aside aria-label="Unofficial demo notice" style={{position:"relative",zIndex:2147483647,background:"#ffdf00",color:"#171717",borderBottom:"6px solid #171717",padding:"18px 20px",textAlign:"center",fontFamily:"system-ui, sans-serif",lineHeight:1.5}}>
            <strong style={{display:"block",fontSize:"clamp(22px, 4vw, 34px)",fontWeight:900}}>DEMO · 非官方測試網站</strong>
            <p style={{margin:"4px 0 12px",fontSize:"16px",fontWeight:700}}>僅供修改展示與測試，非 Cubing Pro 官方網站，亦不代表原作者背書。<br />Unofficial modified demo for testing only. Not affiliated with or endorsed by the original project.</p>
            <a href="https://cubing.pro/" style={{display:"inline-block",background:"#171717",color:"#fff",padding:"10px 20px",borderRadius:"8px",fontSize:"20px",fontWeight:800,textDecoration:"underline"}}>前往原站 / Original website: cubing.pro ↗</a>
            <p style={{margin:"10px 0 0",fontSize:"14px"}}>原專案及素材權利歸各自權利人所有。 / Original project and assets belong to their respective rights holders.</p>
          </aside>
          {children}
        </Provider>"""
s = s.replace(needle, banner)
s = s.replace('default: "Cubing Pro"', 'default: "DEMO · Cubing Pro"').replace('template: "%s · Cubing Pro"', 'template: "%s · DEMO · Cubing Pro"')
s = s.replace('export const metadata: Metadata = {', 'export const metadata: Metadata = {\n  robots: { index: false, follow: false },')
p.write_text(s)
DEMO_PY
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
/competition/:id /__fallbacks/competition 200
/competition/:id/ /__fallbacks/competition 200
/player/:id /__fallbacks/player 200
/player/:id/ /__fallbacks/player 200
/wca/player/:id /__fallbacks/wca-player 200
/wca/player/:id/ /__fallbacks/wca-player 200
/admin/organizers/:org/comp/:comp/result /__fallbacks/organizer-result 200
/admin/organizers/:org/comp/:comp/result/ /__fallbacks/organizer-result 200
REDIRECTS
printf '{"repository":"JustinL330/cubing.pro","branch":"main","commit":"%s","environment":"unofficial test deployment"}\n' "$source_sha" > dist/deployment-info.json
cp -a dist "$build_root/dist"

# Preview refresh: Korean, language icon and fixed timer viewport (e59add8).
