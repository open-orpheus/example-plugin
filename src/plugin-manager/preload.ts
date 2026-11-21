import type {
  PluginModule,
  PluginRuntime,
  LoadedModule,
} from "@open-orpheus/plugin-api/plugin-manager";

import { contextBridge, ipcRenderer } from "electron";

import type { ExamplePluginApi, PlaybackState } from "../shared/playback";

const PLAYBACK_CHANNEL = "example-plugin.playback";
const REQUEST_CHANNEL = "example-plugin.request";

let logger: LoadedModule<"@preload/logger">["default"];
let channel: LoadedModule<"@preload/util">["channel"];

let playback: PlaybackState = {
  time: 0,
  playing: false,
  playbackRate: 1,
  line: null,
};
let received = false;

const cleanups: Array<() => void> = [];
const requestTimers: Array<ReturnType<typeof setTimeout>> = [];

export const activate: PluginModule["activate"] = async (runtime: PluginRuntime) => {
  logger = (await runtime.registry.load("@preload/logger")).default.child({
    realm: "plugin-manager",
  });
  channel = (await runtime.registry.load("@preload/util")).channel;

  logger.info({ channel }, "Example plugin activated.");

  const onPlayback = (_event: unknown, state: PlaybackState) => {
    received = true;
    playback = state;
    for (const timer of requestTimers.splice(0)) clearTimeout(timer);
  };
  ipcRenderer.on(PLAYBACK_CHANNEL, onPlayback);
  cleanups.push(() => ipcRenderer.removeListener(PLAYBACK_CHANNEL, onPlayback));

  // The main realm may still be activating when this realm starts, so retry
  // the request until the first snapshot arrives.
  const request = () => {
    if (!received) ipcRenderer.send(REQUEST_CHANNEL);
  };
  request();
  for (const delay of [250, 1000, 2500]) {
    requestTimers.push(setTimeout(request, delay));
  }

  const api: ExamplePluginApi = {
    greeting: "Hello from the plugin-manager preload!",
    getPlaybackState: () => ({ ...playback }),
  };
  contextBridge.exposeInMainWorld("examplePlugin", api);
};

export const deactivate: PluginModule["deactivate"] = () => {
  for (const timer of requestTimers.splice(0)) clearTimeout(timer);
  for (const cleanup of cleanups.splice(0)) cleanup();
  logger?.info("Example plugin deactivated.");
};
