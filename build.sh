#!/bin/sh
# Builds _site/ for GitHub Pages: one index.html plus the data files.
# Order matches the v10 build, with the GitHub storage script loaded before the app.
set -e
cd "$(dirname "$0")"
mkdir -p _site/data
{
  cat src/head.html
  cat src/app.css
  cat src/shell.html
  echo '<script>'; cat src/store-github.js; echo '</script>'
  echo '<script>'; cat src/core.js src/views.js src/detail.js src/actions.js src/main.js; echo '</script>'
  echo '</body></html>'
} > _site/index.html
cp data/tv-radar.json _site/data/
[ -f data/inbox.json ] && cp data/inbox.json _site/data/
if command -v node >/dev/null 2>&1; then
  node -e "const h=require('fs').readFileSync('_site/index.html','utf8');const parts=h.split('<script>').slice(1).map(s=>s.split('</script>')[0]);parts.forEach(s=>new Function(s));JSON.parse(require('fs').readFileSync('data/tv-radar.json','utf8'));console.log('build ok',h.length,'bytes,',parts.length,'scripts')"
else
  echo "build done (node not found, syntax check skipped)"
fi
