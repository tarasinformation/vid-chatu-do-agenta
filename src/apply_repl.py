"""Застосовує список точних замін [{"file","old","new"}] до файлів у src/. Пропускає ті, що не знайдено рівно один раз."""
import json, sys, os
D = os.path.dirname(os.path.abspath(__file__))
items = json.load(open(sys.argv[1], encoding='utf-8'))
ok = skip = 0
for it in items:
    p = os.path.join(D, it['file']); s = open(p, encoding='utf-8').read()
    n = s.count(it['old'])
    if n != 1: print('SKIP', n, it['file'], it['old'][:70]); skip += 1; continue
    open(p, 'w', encoding='utf-8').write(s.replace(it['old'], it['new'])); ok += 1
print(f'застосовано {ok}, пропущено {skip}')
