/**
 * Diagnostics panel, browser half.
 *
 * Everything reported here comes from supported services: the plugin inventory
 * (or, failing that, the `pluginManager` Remote) for plugin state, bundles for
 * rows that never went live, and version exemptions for warnings. Nothing reads
 * another package's files or internals, so the panel keeps working across
 * harness updates.
 *
 * Rendered with createElement rather than JSX: the bundle then needs no JSX
 * toolchain, and the plugin stays buildable with the same tsdown setup as the
 * locale pack.
 */
import * as React from 'react'
import { NS, en, ru, zh } from './locales.ts'

/** Minimal shape of what this plugin consumes, declared locally on purpose. */
interface DoctorContext {
  effect(fn: () => unknown, label: string): void
  locale: {
    register(ns: string, locale: string, dict: Record<string, string>): () => void
    bind(ns: string): Translate
  }
  slots: {
    inject(name: string, register: () => unknown): void
    register(options: Record<string, unknown>, component: unknown): unknown
  }
  remote?: { pluginManager?: PluginManagerFace }
}

type Translate = (key: string, params?: Record<string, unknown>) => string

/** A Remote answer: a result envelope, or the bare value on other transports. */
interface RemoteResult<T> {
  ok?: boolean
  value?: T
  error?: { code?: string; message?: string }
}

/** The subset of the plugin manager Remote this panel calls. */
interface PluginManagerFace {
  listPlugins?(): Promise<RemoteResult<PluginRow[]> | PluginRow[]>
  listBundles?(): Promise<RemoteResult<BundleRow[]> | BundleRow[]>
  listVersionExemptions?(): Promise<RemoteResult<{ warnings?: string[] }> | { warnings?: string[] }>
}

interface PluginRow {
  entryId?: string
  moduleName?: string
  enabled?: boolean
  fiberPhase?: string
  readOnlyReason?: string
  patchId?: string
  meta?: { title?: unknown; error?: string }
}

interface BundleRow {
  name?: string
  enabled?: boolean
  rows?: { rowId?: string; moduleName?: string; entryId?: string }[]
}

type Severity = 'error' | 'warn' | 'info'

interface Finding {
  severity: Severity
  section: string
  title: string
  detail: string
  hint: string
}

interface Report {
  findings: Finding[]
  failure: string | null
  /** How much the check actually saw: "no problems" is only meaningful with these. */
  plugins: number
  rows: number
}

/** Required services: the slot registry, the locale registry and the Remote bridge. */
export const inject = ['slots', 'locale', 'remote', 'remote.pluginManager']

/**
 * Client plugin body: register the panel's own dictionaries, then contribute the
 * Diagnostics tab to the Plugins settings section. The context is captured in a
 * closure and handed to the panel as a ready-made check function, so no module
 * state is involved.
 * @param ctx - client root context.
 */
export function apply(ctx: DoctorContext): void {
  ctx.effect(() => ctx.locale.register(NS, 'en', en), 'plugin-doctor: en dictionary')
  ctx.effect(() => ctx.locale.register(NS, 'ru', ru), 'plugin-doctor: ru dictionary')
  ctx.effect(() => ctx.locale.register(NS, 'zh', zh), 'plugin-doctor: zh dictionary')

  const t = ctx.locale.bind(NS)
  const check = (): Promise<Report> => diagnose(ctx, t)

  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'doctor',
    // After the built-in inventory tab, which registers at order 10.
    order: 20,
    label: () => t('tab'),
    locale: NS,
    inject: () => ({ t, check }),
  }, DoctorPanel))
}

/**
 * Unwrap a Remote answer.
 *
 * Remote methods answer with a result envelope (`{ ok, value } | { ok, error }`),
 * not with the bare value, which is why checking `Array.isArray` on the response
 * silently produced "0 plugins". A refused call is surfaced instead of being
 * flattened into an empty list.
 */
function unwrap<T>(result: unknown, what: string): T {
  if (result !== null && typeof result === 'object' && 'ok' in result) {
    const envelope = result as { ok?: boolean; value?: T; error?: { code?: string; message?: string } }
    if (envelope.ok !== true) {
      const code = envelope.error?.code ?? 'unknown'
      const message = envelope.error?.message ?? ''
      throw new Error(`${what} refused: ${code}${message === '' ? '' : ` — ${message}`}`)
    }
    return envelope.value as T
  }
  // Tolerate a transport that hands back the bare value.
  return result as T
}

/** Read the plugin rows through the Remote, unwrapping the result envelope. */
async function readPlugins(ctx: DoctorContext): Promise<PluginRow[]> {
  const answer = await ctx.remote?.pluginManager?.listPlugins?.()
  const value = unwrap<unknown>(answer, 'pluginManager.listPlugins')
  return Array.isArray(value) ? value as PluginRow[] : []
}

/** Run every check and return the findings, plus a hard failure message when the run itself broke. */
async function diagnose(ctx: DoctorContext, t: Translate): Promise<Report> {
  const findings: Finding[] = []
  let plugins = 0
  let rows = 0
  try {
    const manager = ctx.remote?.pluginManager
    // Optional chaining here would turn a misconfigured service into "no
    // problems", which is the one answer a diagnostic must never invent.
    if (manager === undefined) {
      throw new Error('remote.pluginManager is not available in this profile')
    }
    if (typeof manager.listPlugins !== 'function') {
      throw new Error(`pluginManager.listPlugins is missing; available: ${Object.keys(manager).join(', ')}`)
    }

    const pluginRows = await readPlugins(ctx)
    plugins = pluginRows.length
    for (const row of pluginRows) {
      const name = typeof row.meta?.title === 'string'
        ? row.meta.title
        : (row.moduleName ?? row.entryId ?? '?')

      if (row.meta?.error !== undefined && row.meta.error !== '') {
        findings.push({
          severity: 'error', section: 'sectionFailed', title: name,
          detail: row.meta.error, hint: t('hintFailed'),
        })
        continue
      }
      if (row.readOnlyReason !== undefined) {
        findings.push({
          severity: 'info', section: 'sectionReadOnly', title: name,
          detail: `${t('phase')}: ${row.readOnlyReason}`, hint: t('hintReadOnly'),
        })
        continue
      }
      if (row.enabled === false) {
        findings.push({
          severity: 'info', section: 'sectionDisabled', title: name,
          detail: `${t('moduleLabel')}: ${row.moduleName ?? '?'}`, hint: t('hintDisabled'),
        })
      }
    }

    const bundles = unwrap<unknown>(await manager.listBundles?.(), 'pluginManager.listBundles')
    for (const bundle of Array.isArray(bundles) ? bundles as BundleRow[] : []) {
      if (bundle.enabled === false) continue
      for (const row of bundle.rows ?? []) {
        rows += 1
        if (row.entryId !== undefined) continue
        findings.push({
          severity: 'error', section: 'sectionRowMissing',
          title: `${row.rowId ?? '?'} (${bundle.name ?? '?'})`,
          detail: `${t('moduleLabel')}: ${row.moduleName ?? '?'}`,
          hint: t('hintRowMissing'),
        })
      }
    }

    const exemptions = unwrap<{ warnings?: string[] }>(await manager.listVersionExemptions?.(), 'pluginManager.listVersionExemptions')
    for (const warning of exemptions?.warnings ?? []) {
      findings.push({
        severity: 'warn', section: 'sectionWarnings', title: warning,
        detail: '', hint: t('hintWarnings'),
      })
    }

    return { findings, failure: null, plugins, rows }
  } catch (error) {
    return { findings, failure: error instanceof Error ? error.message : String(error), plugins, rows }
  }
}

const DOT: Record<Severity, string> = {
  error: '#f87171',
  warn: '#fbbf24',
  info: '#94a3b8',
}

const styles = {
  wrap: { padding: '4px 0', fontSize: 13, lineHeight: 1.5 } as React.CSSProperties,
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 } as React.CSSProperties,
  title: { fontWeight: 600, fontSize: 14, margin: 0 } as React.CSSProperties,
  intro: { opacity: 0.75, margin: '0 0 12px' } as React.CSSProperties,
  button: {
    marginLeft: 'auto', padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
    border: '1px solid rgba(148,163,184,0.35)', background: 'transparent', color: 'inherit',
  } as React.CSSProperties,
  summary: { fontWeight: 600, margin: '10px 0 4px' } as React.CSSProperties,
  checked: { opacity: 0.6, fontSize: 12, marginTop: 8 } as React.CSSProperties,
  failure: { color: '#f87171', marginTop: 10 } as React.CSSProperties,
  ok: { color: '#4ade80', fontWeight: 600, margin: '10px 0' } as React.CSSProperties,
  section: { marginTop: 14, fontWeight: 600 } as React.CSSProperties,
  row: { display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-start' } as React.CSSProperties,
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flex: '0 0 auto' } as React.CSSProperties,
  name: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } as React.CSSProperties,
  detail: { opacity: 0.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' } as React.CSSProperties,
  hint: { opacity: 0.65, marginTop: 2 } as React.CSSProperties,
}

/** Props the slot injects: the bound translator and a ready-made check function. */
interface DoctorPanelProps {
  t?: Translate
  check?: () => Promise<Report>
}

/**
 * The Diagnostics tab. Runs the checks on mount and on demand, then groups the
 * findings by section so the answer reads as "what is wrong, and what to do".
 * @param props - injected translator and check function.
 */
function DoctorPanel(props: DoctorPanelProps): React.ReactElement {
  const t = props?.t ?? ((key: string) => key)
  const check = props?.check
  const [state, setState] = React.useState<Report | null>(null)
  const [busy, setBusy] = React.useState(true)

  const run = React.useCallback(() => {
    setBusy(true)
    const pending = check !== undefined ? check() : Promise.resolve({ findings: [], failure: null, plugins: 0, rows: 0 } as Report)
    void pending.then(result => {
      setState(result)
      setBusy(false)
    })
  }, [check])

  React.useEffect(() => { run() }, [run])

  const children: React.ReactNode[] = [
    React.createElement('div', { key: 'header', style: styles.header },
      React.createElement('h3', { style: styles.title }, t('title')),
      React.createElement('button', { style: styles.button, onClick: run, disabled: busy }, busy ? t('running') : t('run')),
    ),
    React.createElement('p', { key: 'intro', style: styles.intro }, t('intro')),
  ]

  const findings = state?.findings ?? []

  if (state !== null && state.failure !== null) {
    children.push(React.createElement('div', { key: 'failure', style: styles.failure },
      t('error', { message: state.failure })))
  }
  if (state !== null) {
    children.push(React.createElement('div', { key: 'checked', style: styles.checked },
      t('checked', { plugins: state.plugins, rows: state.rows })))
    if (state.plugins === 0 && state.failure === null) {
      children.push(React.createElement('div', { key: 'nothing', style: styles.failure }, t('sawNothing')))
    }
  }
  if (state !== null && state.failure === null && state.plugins > 0 && findings.every(finding => finding.severity !== 'error')) {
    children.push(React.createElement('div', { key: 'ok', style: styles.ok }, t('healthy')))
  }
  // Problems are what needs action: only the error severity counts. Reference
  // sections (disabled entries, entries the profile owns) stay visible but must
  // not make a healthy profile look broken.
  const problems = findings.filter(finding => finding.severity === 'error').length
  if (problems > 0) {
    const key = problems === 1 ? 'problemCount.one' : 'problemCount.other'
    children.push(React.createElement('div', { key: 'summary', style: styles.summary },
      t(key, { count: problems })))
  }

  const sections = [...new Set(findings.map(finding => finding.section))]
  for (const section of sections) {
    const inSection = findings.filter(finding => finding.section === section)
    children.push(React.createElement('div', { key: `s-${section}`, style: styles.section },
      `${t(section)} (${inSection.length})`))
    // Every finding in a section carries the same advice, so it is stated once
    // under the heading instead of being repeated under every single row.
    const advice = inSection[0]?.hint ?? ''
    if (advice !== '') {
      children.push(React.createElement('div', { key: `h-${section}`, style: styles.hint }, advice))
    }
    for (const [index, finding] of inSection.entries()) {
      children.push(React.createElement('div', { key: `f-${section}-${index}`, style: styles.row },
        React.createElement('span', { style: { ...styles.dot, background: DOT[finding.severity] } }),
        React.createElement('div', null,
          React.createElement('div', { style: styles.name }, finding.title),
          finding.detail !== '' ? React.createElement('div', { style: styles.detail }, finding.detail) : null,
        ),
      ))
    }
  }

  return React.createElement('div', { style: styles.wrap }, children)
}
