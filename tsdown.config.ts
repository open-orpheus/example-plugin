import { defineConfig } from "tsdown";

export default defineConfig({
  outDir: "dist",
  format: {
    esm: {
      entry: {
        "main/index": "src/index.ts",
        "assets/configuration/index": "src/configuration.ts",
      },
    },
    cjs: {
      entry: {
        "preload/index": "src/preload.ts",
        "plugin-manager/index": "src/plugin-manager/preload.ts",
      },
    },
  },
  fixedExtension: true,
  platform: "node",
  dts: false,
  clean: true,
  copy: [{ from: "assets/**/*", to: "dist/assets", flatten: false }, "metadata.json"],
  deps: {
    neverBundle: ["electron", "@open-orpheus/plugin-api"],
  },
});
