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
