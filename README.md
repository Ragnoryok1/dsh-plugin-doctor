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
| **Несовместимы** | Плагин не принимает эту версию харнесса. |
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
- **справочное не считается проблемой**: восемнадцать встроенных модулей,
  которыми управляет сам профиль, — это норма, а не поломка.

## Чего он не делает

- **не чинит** ничего сам: только сообщает;
- **не читает файловую систему**: остатки вида `*.parked` и `_tmp_*` после
  неудачного обновления требуют хостовой половины и пока не проверяются;
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
- `cordis.patch.yml` — профиль-патч (`- insert:` клиентской строки `plugin-doctor`).

## Лицензия

MIT. Пакет сообщества, **не связан с DeepSeek**.
