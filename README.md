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

1. Change `metadata.json`'s `id`, `name`, and realm entry paths as needed.
2. Update the id in `src/plugin-manager/ui.ts` and
   `src/plugin-manager/preload.ts`, which register and unregister the settings
   panel.
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

Runs only while the plugin manager window is open. It sets up logging and removes
the configuration panel on deactivation. The panel itself is a renderer script,
[`src/plugin-manager/ui.ts`](src/plugin-manager/ui.ts), built to
`dist/assets/ui.cjs` and injected in the plugin manager's main world through the
plugin's `assets://` URL.

## Configuration panel

The plugin manager exposes `window.pluginManager` in its main world:

```ts
manager.register(id, {
  configuration: {
    mount(element) {
      element.textContent = "Settings";
      return () => {
        // optional cleanup
      };
    },
  },
});
```

Important behavior:

- `register` **throws** if the id is already registered. It never overwrites
  another plugin's panel.
- `unregister(id)` is idempotent. The plugin must call it in `deactivate()`;
  [`preload.ts`](src/plugin-manager/preload.ts) does this with
  `contextBridge.executeInMainWorld`.
- Because the renderer script can be injected again after re-enabling the
  plugin, [`ui.ts`](src/plugin-manager/ui.ts) calls `unregister` before
  `register`. This makes the script safe to re-run.
- `mount` may return an unmount callback, invoked when the panel closes or the
  registration is removed.
- The `[all:initial]`-style reset in the host is presentation only; it is not a
  security boundary.

The configuration script is served as an asset:

```ts
s.src = "assets://plugins/io.github.yucling.example-plugin/ui.cjs";
```

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
- Re-enabling the main realm reuses the cached ESM module instance. Preload and
  plugin-manager bundles are re-evaluated after a full disable. Keep per-run
  setup in `activate()` and teardown in `deactivate()`.
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
│   └── plugin-manager/
│       ├── preload.ts              plugin-manager realm entry
│       └── ui.ts                   renderer configuration panel
├── metadata.json                   manifest and realm entries
├── tsdown.config.ts                ESM main + CJS preload/renderer bundles
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
│   └── ui.cjs
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
- Then enable it in the plugin manager.

Duplicate ids are rejected: both conflicting plugins are disabled and appear as
an unavailable conflict in the plugin manager. Remove one and restart.

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
