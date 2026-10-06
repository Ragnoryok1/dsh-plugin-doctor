# @ragnoryok1/dsh-plugin-doctor

![Diagnostics for DeepSeek Harness plugins](images/banner.jpg)

[Русский](README.md) | [中文](README.zh.md) | **English**

A diagnostics panel for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web GUI (`dsh`).

## What it checks

| Section | What it means |
|---|---|
| **Failed to load** | The plugin reported an error while starting. Its own message is shown. |
| **Declared but not running** | A bundle declares a row, but no live entry carries it — the trace a failed update leaves behind. |
| **Not manageable from here** | The entry exists but cannot be toggled here. The reason is shown: `management-required`, `unaddressable` and others. |
| **Disabled** | Switched off on purpose. |
| **Version warnings** | Not fatal, but worth reading before the next update. |

Only errors count as problems. Reference sections stay visible but never make a
healthy profile look broken.

## What it looks like

![The Diagnostics tab next to the plugin inventory](images/doctor-ru.png)

## Install

```
dsh plugin --profile web add @ragnoryok1/dsh-plugin-doctor
```

Then open **Settings → Built-in plugins → Diagnostics**.

## Why it keeps working across updates

The plugin never reads another package's files or internals. Everything it shows
comes from **supported services**: the plugin manager reports state over the
Remote protocol (`remote.pluginManager`), and the answers are unwrapped from
their `{ ok, value }` envelope.

Two features follow from that, and both are easy to get wrong:

- **"No problems" always comes with a count** of what was checked — otherwise it
  is indistinguishable from "the check saw nothing";
- **reference information is not a problem**: built-in modules the profile itself
  owns are normal, not a fault.

## How it was verified

A claim like "finds broken plugins" is worth nothing without a real break, so it
was verified on a live harness with a deliberately broken plugin: `fixtures/canary/`
holds a fixture whose `apply()` always throws.

| Profile state | What the panel showed |
|---|---|
| canary installed | **"1 problem found"** → "Declared but not running (1): `doctor-canary`", with the module and the advice |
| canary removed | **"No problems found. All plugins are loaded and compatible."** |

The steps to repeat it are in [fixtures/canary/README.md](fixtures/canary/README.md).

One detail worth knowing: a row that fails **on the host** never reaches the list
of live plugins, so there is nobody left to carry `meta.error` — the bundle-row
check is what catches it. Both checks are needed, and practice confirmed it.

## Two halves: the panel and the disk scan

The panel reads plugin state through supported services — but those live in the
browser and **cannot see the filesystem**. The failures we keep untangling by
hand live on disk, so a separate script reports them:

```
node bin/doctor-scan.mjs
# or, when the package is installed on its own: npx dsh-doctor
```

| What it looks for | Why it matters |
|---|---|
| `*.parked` directories | a plugin copy set aside — the trace of getting past a locked rename during an update |
| `_tmp_*` directories | the leftover of a failed install; it is what makes updates fail with `EPERM` |
| broken `file:` links | the profile points at a file that is gone: the install fails with `ENOENT` before it starts |
| failed boot reports | `logs/startup-*.log`: the launcher itself names the plugins that did not activate, with their package, their error and the number of plugins waiting on them |

**Verified on real debris.** The script was run on a clean profile, then on one
with deliberately created leftovers (it found both), then clean again — no
findings. Along the way it found a real `*.parked` directory left in the profile
by working around `EPERM` during a plugin update; that one was removed.

**Why the leftovers are not in the panel.** Showing them in the interface would
need a remote service of the plugin's own, and the names under `ctx.remote.*` are
**generated** by the harness build pipeline. The generator
(`@deepseek-ai/dsh-typert-generator`) is published, so the path exists — but that
is separate work, and it is not presented as done.

## What it does not do

- **does not repair** anything: it only reports;
- **sends nothing anywhere**: everything is computed locally.

## Why the peer range is so long

`peerDependencies` carries nine branches with explicit prerelease tags rather than one short range. That is not decoration: node-semver lets a prerelease version satisfy a range only if some comparator in it sits on the **same** `major.minor.patch` tuple and itself carries a prerelease tag. So the broad-looking `>=0.1.0-rc.2 <0.3.0` matches **neither** `0.1.7-alpha.2` nor `0.2.1-alpha.1`, and the user gets an `ERESOLVE`. Checked against npm itself: the short range resolves to `0.1.0-rc.2 … 0.1.0-rc.8` only, the long one to every version we need.

## Build

```
npm install
npm run build     # tsdown -> lib/index.js (host half) + lib/client.js (client bundle)
npm pack
```

`lib/client.js` is built in the format the `dsh` client loader understands
(`__ModuleLoader__.load`) and exports `inject`/`apply`. React and the harness
packages stay external and are resolved by the loader.

## Contents

- `src/client/index.ts` — the panel, the checks and the tab registration;
- `src/client/locales.ts` — the `ru`, `zh` and `en` dictionaries for this plugin's own interface;
- `src/index.ts` — the empty host half (it exists as a loadable node entry point);
- `cordis.patch.yml` — the profile patch (`- insert:` for the `plugin-doctor` client row);
- `bin/doctor-scan.mjs` — the disk scan (leftovers and broken links);
- `fixtures/canary/` — the canary fixture used to verify the panel.

## License

MIT. A community package, **not affiliated with DeepSeek**.
