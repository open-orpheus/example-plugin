# Example Plugin

![Example Plugin icon](assets/icon.jpg)

**示例插件** is a standalone example plugin for Open Orpheus. It demonstrates
both plugin realms: a main-process module and a preload module.

- Plugin id: `io.github.yucling.example-plugin`
- Version: `1.0.0`

## What it demonstrates

### Main realm

[`src/index.ts`](src/index.ts) loads `@main/logger`, creates a child logger with
`{ realm: "main" }`, and logs activation and deactivation. The logger type comes
from the generated host registry through the `LoadedModule<"@main/logger">` type
helper, without importing the host module at type-check time.

### Preload realm

[`src/preload.ts`](src/preload.ts):

- loads the `@preload/logger` registry entry and creates a child logger with
  `{ realm: "preload" }`;
- loads `@preload/util` to read the preload channel;
- logs the channel and activation message through the preload logger facade,
  which forwards to the main process over IPC;
- calls `contextBridge.executeInMainWorld` to print
  `Hello from Example Plugin` in the renderer's main world.

The preload bundle is CommonJS because plugin preload entries are evaluated as
CJS modules.

## Layout

```text
.
├── assets/
│   └── icon.jpg
├── src/
│   ├── index.ts          main-realm entry
│   └── preload.ts        preload-realm entry
├── metadata.json         plugin manifest and realm entries
├── tsdown.config.ts      ESM main + CJS preload bundles
├── package.json
└── LICENSE
```

`metadata.json` declares both realms:

```json
"realms": {
  "main": "main/index.mjs",
  "preload": "preload/index.cjs"
}
```

## Build

This repository is self-contained. Install dependencies, then build and
type-check it locally:

```sh
pnpm install
pnpm build
pnpm check
```

The build writes a complete plugin tree to `dist/`:

```text
dist/
├── main/index.mjs
├── preload/index.cjs
├── assets/icon.jpg
└── metadata.json
```

That `dist` directory is the deployable plugin. Install it into the plugin
directory used by your Open Orpheus build, or package it as an `.asar` plugin
tree. The host treats plugins as disabled by default; enable the plugin from
the host's plugin manager after it has been installed.

## Icon

The icon is **CC0 1.0**, the same license as the rest of this repository.

- Source: [Macro Flower on StockSnap](https://stocksnap.io/photo/macro-flower-IAYL9LAQX4)
- File: [`assets/icon.jpg`](assets/icon.jpg) (512 × 512 JPEG)

## License

This example plugin is dedicated to the public domain under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). See
[`LICENSE`](LICENSE).

The icon is covered by the same CC0 1.0 dedication; see the source link above.
