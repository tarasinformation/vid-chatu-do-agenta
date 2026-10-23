# Інтерфейс застосунку Claude для макетів (жовтень 2026)

Джерела: [desktop](https://code.claude.com/docs/en/desktop), [quickstart](https://code.claude.com/docs/en/desktop-quickstart), [permission modes](https://code.claude.com/docs/en/permission-modes). Макети на сторінці в `engine.js` (масив `MOCK`).

Підтверджено документацією:
- Вкладка Code вгорі бічної панелі. Кнопка «+ New» (Cmd/Ctrl+N), список сесій.
- Під полем вводу: вибір середовища (Local, Cloud, SSH), поруч вибір папки з пунктом «Open folder…», вибір режиму дозволів, вибір моделі праворуч.
- Режими дозволів: Manual (питає перед кожною зміною), Accept edits, Plan, Auto (коли доступний), Bypass permissions (лише з окремим дозволом у налаштуваннях).
- Кнопка Changes у заголовку й лічильник «+12 −1»; клік по рядку диффу відкриває коментар.
- «/» у полі вводу або «+» → Slash commands показує навички.
- Для Claude Code потрібен план Pro, Max, Team або Enterprise. Node і термінал не потрібні.

Не підтверджено (на макетах стоїть позначка):
- точні назви й порядок вкладок Chat і Cowork;
- підписи кнопок погодження змін;
- як саме в об'єднаному Claude підключається локальна папка для Cowork.
