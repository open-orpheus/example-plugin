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
