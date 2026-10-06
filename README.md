<!-- deepseek-harness-meta
{
  "name": "Diagnostics for DeepSeek Harness plugins",
  "version": "0.1.0",
  "tags": ["diagnostics", "plugins", "troubleshooting", "web-gui", "utilities"],
  "description": "A Diagnostics tab in the Plugins settings: finds plugins that failed to load, bundle rows that never started (the trace a failed update leaves), entries that cannot be managed and version warnings — and says what to do about each one. Reads only supported services, never other packages' internals.",
  "compatible_versions": ["v0.2.1-alpha.1", "v0.2.0-rc.2", "v0.1.7-rc.2", "v0.1.7-rc.1"],
  "install_method": "dsh plugin --profile web add @ragnoryok1/dsh-plugin-doctor"
}
-->

# @ragnoryok1/dsh-plugin-doctor

Панель диагностики плагинов для веб-интерфейса [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`).

**In English.** A Diagnostics tab inside Settings → Built-in plugins. It lists every plugin the running harness knows about and explains anything that is not working: plugins that failed to load (with their own error message), bundle rows that are declared but never went live — the trace a failed update leaves behind — entries that cannot be managed from the interface with the reason why, disabled plugins, and version warnings. Each section carries one piece of advice instead of repeating it per row, and the panel always states how many plugins it actually checked, so "no problems" can be told apart from "the check saw nothing". It reads only supported services (`remote.pluginManager` over the Remote protocol) and never another package's files or internals, so it survives harness updates. Results below are in Russian.

## Что он проверяет

| Раздел | Что означает |
|---|---|
| **Не загрузились** | Плагин сообщил об ошибке при запуске. Показывается само сообщение. |
| **Объявлены, но не запущены** | Бандл объявляет строку, но живой записи у неё нет — так выглядит след неудачного обновления. |
| **Не управляются из интерфейса** | Запись есть, но переключить её отсюда нельзя. Указывается причина: `management-required`, `unaddressable` и другие. |
| **Выключены** | Отключены намеренно. |
| **Предупреждения о версиях** | Не смертельно, но стоит прочитать перед обновлением. |

Проблемами считаются только ошибки. Справочные разделы видны, но не делают
здоровый профиль сломанным.

## Как выглядит

![Вкладка «Диагностика» рядом с инвентарём плагинов](images/doctor-ru.png)

## Установка

```
dsh plugin --profile web add @ragnoryok1/dsh-plugin-doctor
```

Затем откройте **Настройки → Встроенные плагины → Диагностика**.

## Почему это работает после обновлений

Плагин не читает чужие файлы и не лезет во внутренности пакетов. Всё, что он
показывает, приходит из **штатных сервисов**: плагин-менеджер отдаёт состояние
через Remote-протокол (`remote.pluginManager`), а ответы распаковываются из
конверта `{ ok, value }`.

Отсюда же две особенности, которые легко сделать неправильно и которые здесь
сделаны намеренно:

- **ответ «проблем нет» всегда сопровождается счётчиком** проверенного, иначе он
  неотличим от «проверка ничего не увидела»;
- **справочное не считается проблемой**: встроенные модули, которыми управляет
  сам профиль, — это норма, а не поломка.

## Как это проверялось

Утверждение «находит неработающие плагины» ничего не стоит без настоящей поломки,
поэтому проверка сделана на живом харнессе с заведомо сломанным плагином:
в `fixtures/canary/` лежит фикстура, чей `apply()` всегда падает.

| Состояние профиля | Что показала панель |
|---|---|
| канарейка установлена | **«Найдена 1 проблема»** → «Объявлены, но не запущены (1): `doctor-canary`», с модулем и советом |
| канарейка удалена | **«Проблем нет: все плагины загружены и совместимы.»** |

Порядок повторения — в [fixtures/canary/README.md](fixtures/canary/README.md).

Отдельно стоит знать: упавшая **на хосте** строка не попадает в список живых
плагинов, поэтому `meta.error` показать некому — срабатывает проверка строк
бандлов. Обе проверки нужны, и это подтвердилось на практике.

## Две половины: панель и проверка диска

Панель читает состояние плагинов через штатные сервисы — но они живут в браузере и **файловой системы не видят**. Отказы, которые мы раз за разом разбираем руками, лежат именно на диске, поэтому о них сообщает отдельный скрипт:

```
node bin/doctor-scan.mjs
# или, если пакет установлен отдельно: npx dsh-doctor
```

| Что ищет | Почему это важно |
|---|---|
| Каталоги `*.parked` | отложенная копия плагина — след обхода заблокированного переименования при обновлении |
| Каталоги `_tmp_*` | остаток неудачной установки; именно из-за него обновления падают с `EPERM` |
| Битые ссылки `file:` | профиль указывает на файл, которого больше нет: установка падает с `ENOENT` ещё до начала |

**Проверено на настоящем мусоре.** Скрипт запускался на чистом профиле, затем на профиле с намеренно созданными остатками (нашёл оба), затем снова на чистом — замечаний нет. Попутно он нашёл и настоящий `*.parked`, оставшийся в профиле от обхода `EPERM` при обновлении плагина, — тот был убран.

**Почему остатки не в панели.** Чтобы показать их в интерфейсе, плагину нужен собственный remote-сервис, а имена в `ctx.remote.*` **генерируются** сборочным конвейером харнесса. Генератор (`@deepseek-ai/dsh-typert-generator`) опубликован, так что путь существует — но это отдельная работа, и она не выдаётся за сделанную.

## Чего он не делает

- **не чинит** ничего сам: только сообщает;
- **не отправляет данные наружу**: всё считается локально.

## Сборка

```
npm install
npm run build     # tsdown -> lib/index.js (host half) + lib/client.js (client bundle)
npm pack
```

`lib/client.js` собирается в формате, который понимает клиентский загрузчик `dsh`
(`__ModuleLoader__.load`), и экспортирует `inject`/`apply`. React и пакеты
харнесса остаются внешними и резолвятся загрузчиком.

## Содержимое

- `src/client/index.ts` — панель, проверки и регистрация вкладки;
- `src/client/locales.ts` — словари `ru` и `en` для собственного интерфейса;
- `src/index.ts` — пустая host-половина (нужна как загружаемая node-точка входа);
- `cordis.patch.yml` — профиль-патч (`- insert:` клиентской строки `plugin-doctor`);
- `bin/doctor-scan.mjs` — проверка диска (остатки и битые ссылки);
- `fixtures/canary/` — фикстура-канарейка для проверки панели.

## Лицензия

MIT. Пакет сообщества, **не связан с DeepSeek**.
