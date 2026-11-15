import { API } from "@open-orpheus/plugin-api/plugin-manager";

const manager = (window as unknown as { pluginManager: API }).pluginManager;

manager.register("io.github.yucling.example-plugin", {
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
