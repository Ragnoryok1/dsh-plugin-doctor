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
