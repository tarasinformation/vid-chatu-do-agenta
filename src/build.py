"""Збирає src/* в одну сторінку ../vid-chatu-do-agenta.html.
Порядок: head.html + body.html + <script> (SRC_LINES, track_*.js, engine.js, deck.js).
Запуск: python3 src/build.py"""
import os, json
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(D), 'vid-chatu-do-agenta.html')
r = lambda n: open(os.path.join(D, n), encoding='utf-8').read()
FILES = ['head.html', 'body.html', 'engine.js', 'deck.js', 'track_pm.js', 'track_an.js', 'track_law.js', 'build.py']
js = 'var TRACKS = {};' + ''.join('\n' + r(f'track_{k}.js') for k in ['pm', 'an', 'law'] if os.path.exists(os.path.join(D, f'track_{k}.js')))
lines = {n: len(r(n).splitlines()) for n in FILES}
def page(l): return r('head.html') + r('body.html') + '\n<script>\nvar SRC_LINES=' + json.dumps(l, ensure_ascii=False) + ';\n' + js + '\n' + r('engine.js') + '\n' + r('deck.js') + '\n</script>\n'
out = page(lines)
lines['vid-chatu-do-agenta.html'] = len(out.splitlines())
out = page(lines)
open(OUT, 'w', encoding='utf-8').write(out)
open(os.path.join(os.path.dirname(D), 'index.html'), 'w', encoding='utf-8').write(out)
print(f'{OUT}: {len(out)} байт, {lines["vid-chatu-do-agenta.html"]} рядків')
