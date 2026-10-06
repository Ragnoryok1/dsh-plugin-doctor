#!/usr/bin/env node
/**
 * Disk-side half of the diagnostics.
 *
 * The settings panel reads plugin state through supported services, which live
 * in the browser and cannot see the filesystem. Two failures we reproduce by
 * hand over and over are purely on disk, so they are reported here instead:
 *
 *   — leftovers from a failed update: a `*.parked` directory (the old copy this
 *     tool moved aside to get past a locked rename) and `_tmp_*` directories the
 *     package manager leaves behind when it cannot rename one into place;
 *   — a profile that points at a file which no longer exists, which is how an
 *     update fails with ENOENT before it even starts.
 *
 * Usage:
 *   node bin/doctor-scan.mjs [--home <dshHome>]
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const homeFlag = args.indexOf('--home')
const DSH_HOME = homeFlag >= 0 ? args[homeFlag + 1] : (process.env.DSH_HOME ?? join(homedir(), '.dsh'))
const PROFILES = join(DSH_HOME, 'profiles')

/** Read a JSON file, or null when it is missing or unreadable. */
function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}

/**
 * Read the launcher's own account of a failed boot.
 *
 * When a start fails, the harness writes `$DSH_HOME/logs/startup-<iso>-<uuid>.log`
 * — a `util.inspect` dump of a structured object, so it is laid out in fixed
 * indentation rather than free prose, and it names the plugins that did not
 * activate together with their package and their error. That is the ground
 * truth our panel cannot reach: a row that dies on the host never appears in
 * the live plugin list.
 *
 * The parser is bounded by the counts the file states in its own headers
 * ("Failed plugins (1):"), because long error strings are wrapped across several
 * lines and would otherwise be counted as extra rows. Checked against three real
 * logs in this profile.
 */
function parseStartupLog(text) {
  const head = /^\s{2}error:\s*(.+)$/mu.exec(text)
  if (head === null) return null
  const field = name => new RegExp(`^\\s{2}${name}:\\s*'([^']*)'`, 'mu').exec(text)?.[1]
  const lines = text.split('\n').map(line => line.replace(/\r$/u, ''))
  const failedHead = /^\s*Failed plugins \((\d+)\):/mu.exec(text)
  const waitingHead = /^\s*Plugins waiting for services \((\d+)\):/mu.exec(text)
  const failedAt = lines.findIndex(line => /^\s*Failed plugins \(\d+\):/u.test(line))
  const waitingAt = lines.findIndex(line => /^\s*Plugins waiting for services \(\d+\):/u.test(line))

  const failed = []
  if (failedAt !== -1) {
    const end = waitingAt > failedAt ? waitingAt : lines.length
    let current = null
    for (const line of lines.slice(failedAt + 1, end)) {
      const entry = /^\s{4}(\S+) \((required|optional)\)\s*$/u.exec(line)
      if (entry !== null) {
        if (failed.length >= Number(failedHead?.[1] ?? 0)) break
        current = { name: entry[1], required: entry[2] === 'required', package: null, error: null }
        failed.push(current)
        continue
      }
      if (current === null) continue
      const pkg = /^\s{6}Package:\s*(.+?)\s*$/u.exec(line)
      if (pkg !== null) { current.package = pkg[1]; continue }
      const err = /^\s{6}Error:\s*(.+?)\s*$/u.exec(line)
      if (err !== null && current.error === null) current.error = err[1]
    }
  }

  const waiting = []
  if (waitingAt !== -1) {
    for (const line of lines.slice(waitingAt + 1)) {
      if (waiting.length >= Number(waitingHead?.[1] ?? 0)) break
      const row = /^\s{4}(\S+(?: \((?:required|optional)\))?)\s{2,}([^\s'].*?)\s*$/u.exec(line)
      if (row === null || row[1] === 'Plugin') continue
      waiting.push({ name: row[1], missing: row[2] })
    }
  }

  return {
    timestamp: field('timestamp'),
    dshVersion: field('dshVersion'),
    profile: field('profile'),
    headline: head[1].replace(/^StartupError:\s*/u, ''),
    failed,
    waiting,
  }
}

/** Every directory one level under node_modules, scoped names included. */
function packageDirs(modules) {
  const out = []
  if (!existsSync(modules)) return out
  for (const entry of readdirSync(modules)) {
    if (entry.startsWith('.')) continue
    const path = join(modules, entry)
    if (!statSync(path).isDirectory()) continue
    if (entry.startsWith('@')) {
      for (const inner of readdirSync(path)) out.push({ name: `${entry}/${inner}`, path: join(path, inner) })
    } else out.push({ name: entry, path })
  }
  return out
}

const findings = []
if (!existsSync(PROFILES)) {
  console.log(`профилей не найдено: ${PROFILES}`)
  console.log('укажите каталог вручную: node bin/doctor-scan.mjs --home <каталог .dsh>')
  process.exit(0)
}

for (const profile of readdirSync(PROFILES)) {
  // The profiles directory also holds a shared node_modules store; a profile is
  // a directory that carries a manifest of its own.
  if (profile === 'node_modules' || profile.startsWith('.')) continue
  const dir = join(PROFILES, profile)
  if (!statSync(dir).isDirectory()) continue
  const manifestPath = join(dir, 'package.json')
  if (!existsSync(manifestPath)) continue
  const manifest = readJson(manifestPath)
  if (manifest === null) {
    findings.push({ profile, kind: 'manifest', detail: 'package.json не читается — профиль повреждён' })
    continue
  }

  // 1. A dependency pointing at a file that is gone: the update will fail with ENOENT.
  for (const [name, spec] of Object.entries(manifest.dependencies ?? {})) {
    if (typeof spec !== 'string' || !spec.startsWith('file:')) continue
    const target = spec.slice('file:'.length).replaceAll('\\', '/').replace(/^([A-Za-z]):\/?/u, '$1:/')
    if (!existsSync(target)) {
      findings.push({
        profile, kind: 'missing-file', subject: name,
        detail: `зависимость указывает на несуществующий файл: ${target}`,
        advice: 'обновите путь в package.json профиля или опубликуйте пакет заново и установите его по имени',
      })
    }
  }

  // 2. Leftovers in node_modules, the shape a failed update leaves behind.
  for (const pkg of packageDirs(join(dir, 'node_modules'))) {
    if (/\.parked$/u.test(pkg.name)) {
      findings.push({
        profile, kind: 'parked', subject: pkg.name,
        detail: 'отложенная копия плагина: обычно её оставляет обход заблокированного переименования при обновлении',
        advice: 'если плагин работает — удалите каталог; если нет — установите плагин заново',
      })
    } else if (/_tmp_\d+/u.test(pkg.name)) {
      findings.push({
        profile, kind: 'tmp', subject: pkg.name,
        detail: 'остаток неудачной установки: пакетный менеджер не смог переименовать временный каталог',
        advice: 'удалите каталог и повторите установку — из-за него обновления падают с EPERM',
      })
    }
  }
}

// 3. Failed boots, as the launcher itself recorded them.
const LOGS = join(DSH_HOME, 'logs')
if (existsSync(LOGS)) {
  const logs = readdirSync(LOGS)
    .filter(name => name.startsWith('startup-') && name.endsWith('.log'))
    .map(name => ({ name, at: statSync(join(LOGS, name)).mtimeMs }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 3)
  for (const log of logs) {
    const parsed = parseStartupLog(readFileSync(join(LOGS, log.name), 'utf8'))
    if (parsed === null || parsed.failed.length === 0) continue
    const who = parsed.failed
      .map(item => `${item.name}${item.required ? ' (обязательный)' : ''}`
        + (item.package === null ? '' : ` — ${item.package}`)
        + (item.error === null ? '' : `: ${item.error}`))
      .join('; ')
    findings.push({
      profile: parsed.profile ?? '—',
      kind: 'startup-failure',
      subject: log.name,
      detail: `харнесс не запустился ${parsed.timestamp ?? ''} (dsh ${parsed.dshVersion ?? '?'}): ${parsed.headline}\n`
        + `      не активировались (${parsed.failed.length}): ${who}`
        + (parsed.waiting.length === 0 ? '' : `\n      ждут сервисов: ${parsed.waiting.length} — обычно они не запускаются, пока не поднимется отказавший`),
      advice: 'начните с ошибки первого плагина из списка: остальные чаще всего ждут его сервис',
    })
  }
}

console.log(`каталог DSH: ${DSH_HOME}`)
if (findings.length === 0) {
  console.log('остатков не найдено: отложенных копий, временных каталогов и битых ссылок нет')
  process.exit(0)
}

console.log(`найдено замечаний: ${findings.length}\n`)
for (const finding of findings) {
  console.log(`  [${finding.kind}] профиль «${finding.profile}»${finding.subject === undefined ? '' : `, ${finding.subject}`}`)
  console.log(`      ${finding.detail}`)
  if (finding.advice !== undefined) console.log(`      что делать: ${finding.advice}`)
}
process.exit(1)
