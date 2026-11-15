import { defineConfig } from "tsdown";

export default defineConfig({
  outDir: "dist",
  format: {
    esm: {
      entry: {
        "main/index": "src/index.ts",
      },
    },
    cjs: {
      entry: {
        "preload/index": "src/preload.ts",
        "plugin-manager/index": "src/plugin-manager/preload.ts",
        "assets/ui": "src/plugin-manager/ui.ts",
      },
    },
  },
  fixedExtension: true,
  platform: "node",
  dts: false,
  clean: true,
  copy: ["assets", "metadata.json"],
  deps: {
    neverBundle: ["electron", "@open-orpheus/plugin-api"],
  },
});
