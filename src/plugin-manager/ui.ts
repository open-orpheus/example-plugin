import { API } from "@open-orpheus/plugin-api/plugin-manager";

const manager = (window as unknown as { pluginManager: API }).pluginManager;
const id = "io.github.yucling.example-plugin";

// The renderer script can be injected again after re-enabling the plugin, so
// clear any previous registration before claiming the id. `unregister` is
// idempotent; `register` would throw on a duplicate id.
manager.unregister(id);

manager.register(id, {
  configuration: {
    mount(element) {
      console.log("Plugin configuration UI mounted", element);
      element.innerHTML = `<p style="text-decoration: underline;">Hello World!</p>`;
      return () => {
        console.log("Plugin configuration UI unmounting", element);
      };
    },
  },
});
