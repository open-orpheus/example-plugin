import type { PluginModule, PluginRuntime, LoadedModule } from "@open-orpheus/plugin-api";

let logger: LoadedModule<"@main/logger">["default"];

export const activate: PluginModule["activate"] = async (runtime: PluginRuntime) => {
  logger = (await runtime.registry.load("@main/logger")).default.child({ realm: "main" });

  logger.info("Example plugin activated.");
};

export const deactivate: PluginModule["deactivate"] = () => {
  logger.info("Example plugin deactivated.");
};
