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
  'sectionReadOnly': 'Cannot be managed from the interface',
  'sectionDisabled': 'Disabled',
  'sectionWarnings': 'Version warnings',
  'hintFailed': 'The plugin reported an error while starting. Read the message below; if it mentions a missing module, the package is probably not installed.',
  'hintRowMissing': 'The bundle declares this row, but no live entry carries it. This is the shape a failed update leaves behind: reinstall the plugin.',
  'hintReadOnly': 'The entry exists but cannot be toggled from here, usually because it comes from the profile configuration itself.',
  'hintDisabled': 'Switched off on purpose. Turn it on in the plugin list if it should be running.',
  'hintWarnings': 'Not fatal, but worth reading before the next update.',
  'phase': 'State',
  'moduleLabel': 'Module',
  'checked': 'Checked {plugins} plugins and {rows} bundle rows.',
  'sawNothing': 'The check saw no plugins at all. That is suspicious: the plugin list may be unavailable right now.',
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
  'sectionReadOnly': 'Не управляются из интерфейса',
  'sectionDisabled': 'Выключены',
  'sectionWarnings': 'Предупреждения о версиях',
  'hintFailed': 'Плагин сообщил об ошибке при запуске. Прочитайте сообщение ниже: если речь о ненайденном модуле, скорее всего пакет не установлен.',
  'hintRowMissing': 'Бандл объявляет эту строку, но живой записи у неё нет. Так выглядит последствие неудачного обновления — переустановите плагин.',
  'hintReadOnly': 'Запись есть, но переключить её отсюда нельзя: обычно потому, что она задана самой конфигурацией профиля.',
  'hintDisabled': 'Выключен намеренно. Включите в списке плагинов, если он должен работать.',
  'hintWarnings': 'Не смертельно, но стоит прочитать перед следующим обновлением.',
  'phase': 'Состояние',
  'moduleLabel': 'Модуль',
  'checked': 'Проверено плагинов: {plugins}, строк бандлов: {rows}.',
  'sawNothing': 'Проверка не увидела ни одного плагина. Это подозрительно: возможно, список плагинов сейчас недоступен.',
  'error': 'Сама проверка не удалась: {message}',
}

/**
 * Simplified Chinese copy.
 *
 * Chinese marks no plural category, so `problemCount.one` and
 * `problemCount.other` are the same string: the contract still asks for both
 * keys by count, and both answer identically.
 */
export const zh: Record<keyof typeof en, string> = {
  'tab': '诊断',
  'title': '插件诊断',
  'intro': '检查运行中的 harness 上每个插件的状态，并说明哪里出了问题。',
  'run': '重新检查',
  'running': '检查中…',
  'healthy': '没有问题：所有插件均已加载且兼容。',
  'problemCount.one': '发现 {count} 个问题',
  'problemCount.other': '发现 {count} 个问题',
  'sectionFailed': '加载失败',
  'sectionRowMissing': '已声明但未运行',
  'sectionReadOnly': '无法从界面管理',
  'sectionDisabled': '已禁用',
  'sectionWarnings': '版本警告',
  'hintFailed': '插件启动时报告了错误。请看下面的消息；如果其中提到找不到模块，通常说明该包没有安装。',
  'hintRowMissing': '包声明了这一行，但没有任何运行中的条目承载它。这正是更新失败后留下的痕迹：重新安装该插件。',
  'hintReadOnly': '条目存在，但无法在这里切换，通常是因为它来自配置档自身的配置。',
  'hintDisabled': '这是有意关闭的。如果它应当运行，请在插件列表中启用。',
  'hintWarnings': '不致命，但值得在下次更新前读一读。',
  'phase': '状态',
  'moduleLabel': '模块',
  'checked': '已检查 {plugins} 个插件、{rows} 条包记录。',
  'sawNothing': '检查没有看到任何插件。这很可疑：插件列表现在可能不可用。',
  'error': '检查本身失败：{message}',
}
