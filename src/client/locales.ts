/**
 * Dictionaries for the panel's own copy, in the `plugin-doctor` namespace.
 *
 * Flat keys, exactly like every other client locale namespace: the plural form
 * is a separate `.one`/`.other` key that the client picks by count, since the
 * contract carries no plural categories.
 */

/** Namespace owned by this plugin. */
export const NS = 'plugin-doctor'

/** English copy, the key source of truth. */
export const en = {
  'tab': 'Diagnostics',
  'title': 'Plugin diagnostics',
  'intro': 'Checks every plugin against the running harness and explains anything that is not working.',
  'run': 'Check again',
  'running': 'Checking…',
  'healthy': 'No problems found. All plugins are loaded and compatible.',
  'problemCount.one': '{count} problem found',
  'problemCount.other': '{count} problems found',
  'sectionFailed': 'Failed to load',
  'sectionRowMissing': 'Declared but not running',
  'sectionIncompatible': 'Incompatible',
  'sectionReadOnly': 'Cannot be managed from the interface',
  'sectionDisabled': 'Disabled',
  'sectionWarnings': 'Version warnings',
  'hintFailed': 'The plugin reported an error while starting. Read the message below; if it mentions a missing module, the package is probably not installed.',
  'hintRowMissing': 'The bundle declares this row, but no live entry carries it. This is the shape a failed update leaves behind: reinstall the plugin.',
  'hintIncompatible': 'The plugin does not accept this harness version. Install a version that matches, or update the harness.',
  'hintReadOnly': 'The entry exists but cannot be toggled from here, usually because it comes from the profile configuration itself.',
  'hintDisabled': 'Switched off on purpose. Turn it on in the plugin list if it should be running.',
  'hintWarnings': 'Not fatal, but worth reading before the next update.',
  'phase': 'State',
  'version': 'Version',
  'moduleLabel': 'Module',
  'checked': 'Checked {plugins} plugins and {rows} bundle rows.',
  'sawNothing': 'The check saw no plugins at all. That is suspicious: the plugin list may be unavailable right now.',
  'empty': 'Nothing to show.',
  'error': 'The check itself failed: {message}',
}

/** Russian copy. */
export const ru: Record<keyof typeof en, string> = {
  'tab': 'Диагностика',
  'title': 'Диагностика плагинов',
  'intro': 'Проверяет каждый плагин на работающем харнессе и объясняет, что именно не работает.',
  'run': 'Проверить снова',
  'running': 'Проверяем…',
  'healthy': 'Проблем нет: все плагины загружены и совместимы.',
  'problemCount.one': 'Найдена {count} проблема',
  'problemCount.other': 'Найдено проблем: {count}',
  'sectionFailed': 'Не загрузились',
  'sectionRowMissing': 'Объявлены, но не запущены',
  'sectionIncompatible': 'Несовместимы',
  'sectionReadOnly': 'Не управляются из интерфейса',
  'sectionDisabled': 'Выключены',
  'sectionWarnings': 'Предупреждения о версиях',
  'hintFailed': 'Плагин сообщил об ошибке при запуске. Прочитайте сообщение ниже: если речь о ненайденном модуле, скорее всего пакет не установлен.',
  'hintRowMissing': 'Бандл объявляет эту строку, но живой записи у неё нет. Так выглядит последствие неудачного обновления — переустановите плагин.',
  'hintIncompatible': 'Плагин не принимает эту версию харнесса. Поставьте подходящую версию плагина или обновите харнесс.',
  'hintReadOnly': 'Запись есть, но переключить её отсюда нельзя: обычно потому, что она задана самой конфигурацией профиля.',
  'hintDisabled': 'Выключен намеренно. Включите в списке плагинов, если он должен работать.',
  'hintWarnings': 'Не смертельно, но стоит прочитать перед следующим обновлением.',
  'phase': 'Состояние',
  'version': 'Версия',
  'moduleLabel': 'Модуль',
  'checked': 'Проверено плагинов: {plugins}, строк бандлов: {rows}.',
  'sawNothing': 'Проверка не увидела ни одного плагина. Это подозрительно: возможно, список плагинов сейчас недоступен.',
  'empty': 'Показывать нечего.',
  'error': 'Сама проверка не удалась: {message}',
}
