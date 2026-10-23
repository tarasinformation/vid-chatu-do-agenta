#!/bin/bash
# Автотест: збирає сторінку, проганяє src/qa_test.js у headless Chrome на 1280 і 390 px.
# Потрібен запущений локальний сервер: python3 -m http.server 8765 (з кореня проєкту).
set -e
cd "$(dirname "$0")/.."
python3 src/build.py
node -e "const s=require('fs').readFileSync('vid-chatu-do-agenta.html','utf8');new Function(s.split('<script>')[1].split('</script>')[0]);console.log('синтаксис ok')"
python3 - <<'PY'
s=open('vid-chatu-do-agenta.html',encoding='utf-8').read(); t=open('src/qa_test.js',encoding='utf-8').read()
open('.qa_test.html','w',encoding='utf-8').write(s+'\n<script>\n'+t+'\n</script>\n')
PY
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for w in 1280 390; do echo "== ширина $w"; "$C" --headless=new --window-size=$w,900 --virtual-time-budget=200000 --dump-dom http://localhost:8765/.qa_test.html 2>/dev/null | grep -o '<pre id="testout">.*</pre>' | sed 's/&quot;/"/g'; done
rm -f .qa_test.html
