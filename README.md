# Example Plugin

![Example Plugin icon](assets/icon.jpg)

**示例插件** is a complete, buildable Open Orpheus plugin and the reference
template for plugin development. It exercises all three plugin realms and a
configuration panel.

This repository is a **GitHub template repository**:
<https://github.com/open-orpheus/example-plugin>. Start a plugin from it rather
than scaffolding a package by hand.

- Plugin id: `io.github.yucling.example-plugin`
- Version: `1.0.0`

> **Experimental.** The plugin system is under active development. Expect
> breaking changes at any time, including the generated API and lifecycle
> semantics.

See the full [plugin development guide](../../docs/PLUGIN_DEVELOPMENT_en.md) for
the manifest reference, lifecycle semantics, and packaging rules.

## Create a plugin from this template

Create a repository from the template, then clone it:

```sh
gh repo create my-plugin --template open-orpheus/example-plugin --public --clone
cd my-plugin
```

On GitHub, click **Use this template → Create a new repository** instead of
forking.

Then:

1. Change `metadata.json`'s `id`, `name`, realm entry paths, and `configuration`
   as needed.
2. Update any plugin id you hardcoded yourself, such as in IPC channel names or
   `assets://` URLs.
3. Install dependencies, build, and type-check:

   ```sh
   pnpm install
   pnpm build
   pnpm check
   ```

4. Install `dist/` into the host's plugin directory and enable the plugin in
   **Manage Open Orpheus → Plugin Manager**.

The repository root **is** the plugin package; the build writes a deployable tree
to `dist/`. User plugins are disabled by default, and the plugin manager has no
installer: copy the tree (or an `.asar`) into the plugin directory yourself.

When working inside the Open Orpheus monorepo, this template is vendored at
`packages/plugin-builtin-example-plugin` and the same commands apply.

## What it demonstrates

### Manifest

[`metadata.json`](metadata.json) declares all three realms:

```json
"realms": {
  "main": "main/index.mjs",
  "preload": "preload/index.cjs",
  "plugin-manager": "plugin-manager/index.cjs"
}
```

`main` must be an `.mjs` file. `preload` and `plugin-manager` must be `.cjs`
files because their bundles are evaluated as CommonJS in a preload context.
Paths are relative to the plugin root and cannot escape it.

### Main realm — [`src/index.ts`](src/index.ts)

Loads `@main/logger` from the generated host registry, creates a child logger
with `{ realm: "main" }`, and logs activation/deactivation.

- `runtime.registry.load(key)` imports a host module on demand.
- The `LoadedModule<"@main/logger">` type helper gives the module's type without
  importing host code at build time.
- The entry is ESM and runs in the Electron main process with full host
  authority.

```ts
export const activate: PluginModule["activate"] = async (runtime) => {
  logger = (await runtime.registry.load("@main/logger")).default.child({ realm: "main" });
};
```

### Preload realm — [`src/preload.ts`](src/preload.ts)

Runs in every host preload context:

- loads `@preload/logger` and `@preload/util`;
- logs the preload channel through the preload logger facade;
- calls `contextBridge.executeInMainWorld` to print a message in the renderer
  main world.

`executeInMainWorld` receives a serialized function: it cannot capture variables
from the preload scope, so pass values explicitly.

### Plugin-manager realm — [`src/plugin-manager/preload.ts`](src/plugin-manager/preload.ts)

Runs only while the plugin manager window is open. It is a privileged support
realm: this example uses it to read host playback state over `ipcRenderer` and
expose a small API through `contextBridge`. The panel itself is separate browser
ESM, [`src/configuration.ts`](src/configuration.ts), built to
`dist/assets/configuration/index.mjs`.

## Configuration panel

Declare the panel at the top level of `metadata.json`, relative to `assets/` and
as an `.mjs` file:

```json
"configuration": "configuration/index.mjs"
```

The host imports that module and calls its exported `mount()`:

```ts
import type { ConfigurationModule } from "@open-orpheus/plugin-api/configuration";

export const mount: ConfigurationModule["mount"] = (root, context) => {
  root.textContent = "Settings";
  return () => {
    root.replaceChildren();
  };
};
```

Important behavior:

- There is no registration API and no plugin id to repeat. The host creates the
  root element and decides when to mount.
- `context` provides `pluginId`, `assetsBaseUrl` (the plugin's `assets/` root),
  and an `AbortSignal`. `mount()` may be async; the host awaits it and awaits the
  cleanup function it returns, if any.
- The host appends a `?t=<timestamp>-<rand>` query to the entry URL, so each
  enable/disable cycle re-evaluates it. Closing the panel only runs the returned
  cleanup. Keep module top level declarative; put behavior in `mount()`.
- Only the entry is cache-busted. Imported modules are shared for the life of
  the window document; keep per-panel state in `mount()` and clean it up in the
  returned callback.
- The panel runs as browser ESM with no direct Node or Electron access. To use
  host data, expose it from the plugin-manager preload realm through
  `contextBridge`; the host activates that realm first when the plugin declares
  it.
- The `[all:initial]`-style reset in the host is presentation only; it is not a
  security boundary.

Assets are addressed as `assets://plugins/<plugin-id>/<path-inside-assets>`, and
the path is contained to the plugin's `assets/` directory.

## Lifecycle notes

- `activate()` runs for each realm instance. `deactivate()` is optional and
  should be idempotent.
- The host serializes activation and cleanup; it never calls `deactivate()`
  while `activate()` is still running.
- Activation that exceeds the host deadline is reported as **hung**. Cleanup
  begins only after activation settles, so synchronously blocking code cannot be
  forcibly stopped.
- Disabling during activation is applied once activation finishes.
- A failed activation is not retried automatically; the plugin manager exposes a
  retry action.
- Main-realm entries are imported with a cache-busting `?t=<timestamp>-<rand>`
  query, so each enable/disable cycle re-evaluates the entry. Within one epoch,
  activation and cross-plugin `load()` share one evaluation. Preload and
  plugin-manager bundles are re-evaluated after a full disable (not on retry).
  Keep per-run setup in `activate()` and teardown in `deactivate()`.
- Only the entry is cache-busted. Imported modules resolve without the query and
  keep their first evaluation, so module-level state in a helper survives a
  disable/enable and its top-level listeners are not re-registered. Never create
  listeners, timers, IPC handlers, or `contextBridge` APIs at an imported
  module's top level, and clean up explicitly in `deactivate()`. Shared chunks
  and lazy-import chunks are also uncached; disable code splitting if you want
  all of an entry's code to re-evaluate.
- Editing plugin files requires restarting the plugin; there is no hot reload.

## Cross-plugin exports

Plugins can consume each other's entry exports:

```ts
await runtime.plugins.load("other-plugin"); // evaluate exports, no activation wait
await runtime.plugins.whenActive("other-plugin"); // wait until the plugin is running
```

Use `whenActive` when you depend on initialized services. Readiness cycles are
rejected with an `Activation readiness cycle` error.

## Layout

```text
.
├── assets/
│   └── icon.jpg
├── src/
│   ├── index.ts                    main-realm entry
│   ├── preload.ts                  preload-realm entry
│   ├── configuration.ts            browser ESM configuration panel
│   └── plugin-manager/
│       └── preload.ts              plugin-manager realm entry
├── metadata.json                   manifest and realm entries
├── tsdown.config.ts                ESM main/panel + CJS preload bundles
├── package.json
└── LICENSE
```

## Build

This repository is self-contained. Install dependencies, then build and
type-check it locally:

```sh
pnpm install
pnpm build
pnpm check
```

`tsdown.config.ts` produces:

```text
dist/
├── main/index.mjs
├── preload/index.cjs
├── plugin-manager/index.cjs
├── assets/
│   ├── icon.jpg
│   └── configuration/index.mjs
└── metadata.json
```

`dist/` is the deployable plugin tree. Pack it as an archive if preferred:

```sh
pnpm bundle   # asar pack dist dist.asar
```

### Install

- Development: copy the tree into `data/plugins/` (relative to the working
  directory) or override the data directory with
  `OPEN_ORPHEUS_CUSTOM_DATA_DIR`.
- Packaged: copy it into `{userData}/plugins/`.
- Restart the application after copying — plugin discovery runs at startup —
  then enable it in the plugin manager.

Two user plugins with the same id are both rejected and appear as an unavailable
conflict in the plugin manager. Remove one and restart. If the id collides with a
plugin shipped with the application, the shipped plugin keeps the id and the
other copy is ignored with a warning.

## Debugging

- Activation and cleanup failures are logged by the main process.
- The plugin manager shows main and per-window secondary realm state, the failure
  stage (`load`, `activate`, `deactivate`), and error messages.
- Disable plugins entirely with `OPEN_ORPHEUS_DISABLE_PLUGINS=1`.
- If the plugin is missing from the manager, check the manifest first: invalid
  metadata, a missing entry, or a duplicate id prevents loading.

## Icon

The icon is **CC0 1.0**, the same license as the rest of this repository.

- Source: [Macro Flower on StockSnap](https://stocksnap.io/photo/macro-flower-IAYL9LAQX4)
- File: [`assets/icon.jpg`](assets/icon.jpg) (512 × 512 JPEG)

## License

This example plugin is dedicated to the public domain under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). See
[`LICENSE`](LICENSE).

The icon is covered by the same CC0 1.0 dedication; see the source link above.
