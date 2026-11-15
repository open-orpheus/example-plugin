import type {
  PreloadPluginModule,
  PreloadPluginRuntime,
  LoadedModule,
} from "@open-orpheus/plugin-api/preload";

import { contextBridge } from "electron";

let logger: LoadedModule<"@preload/logger">["default"];
let channel: LoadedModule<"@preload/util">["channel"];

export const activate: PreloadPluginModule["activate"] = async (runtime: PreloadPluginRuntime) => {
  logger = (await runtime.registry.load("@preload/logger")).default.child({ realm: "preload" });
  channel = (await runtime.registry.load("@preload/util")).channel;

  logger.info({ channel }, "Example plugin activated.");

  contextBridge.executeInMainWorld({
    func: function () {
      console.log("Hello from Example Plugin");
    },
  });
};

export const deactivate: PreloadPluginModule["deactivate"] = () => {
  logger.info("Example plugin deactivated.");
};
