# amoore-ru — лендинг v3.0.0 «Singularity»

- Форма «Оставить заявку» — внутри блока `#start`, пишет в таблицу `leads` (счётчик новых заявок — в amoore Dev).
- Новости грузятся независимо от остальных запросов: параллельно supabase-js и REST, локальный кэш, Realtime, понятная ошибка с «Повторить».
- Подвал: «Версия 3.0.0 · история обновлений» (читает `changelog.json`).
- Дизайн Deep Glass 3.0, шрифты Inter + Manrope, кастомный курсор (только мышь), безопасные зоны iPhone.
- `landing.js` — форма, курсор, модалка версии, меню. `amoore-core.js` — общий для ru/studio/dev (идентичные копии).
- Кэш: `_headers` / `vercel.json` — CSS/JS/JSON перепроверяются, картинки кэшируются надолго; в HTML ресурсы подключены с `?v=3.0.0`.

---

# amoore — сайт (amoore-ru)

Официальный сайт ИИ-бота amoore в Telegram. Чистый HTML/CSS/JS, Liquid Glass, светлая/тёмная тема.

## Управление из админки (amoore Dev)
Всем управляет один скрипт `amoore-core.js` + Supabase. Из админки на этом сайте можно:
открыть/закрыть сайт (заставки), включить баннер под шапкой, скрыть демо-чат (`#chat`),
скрыть блок новостей (`#news`) и публиковать новости (`#news-list`). Правки видны без перезагрузки.

## Подключение (низ `index.html`, ровно три строки)
```html
<script>window.AMOORE_SITE_ID = 'landing';</script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="amoore-core.js"></script>
```
Ключи Supabase вшиты в `amoore-core.js`. Старые `news.js` и фильтры новостей удалены.
Эталон `amoore-core.js` лежит в репозитории amoore-dev (`shared/`), при его обновлении копируйте файл сюда.

God Mode для закрытого сайта: `?god=ТОКЕН`.


## Release v0.3

Сборка Global Update v0.3. См. корневой `QA_REPORT.md` в релизном архиве для изменений и ограничений тестирования.
