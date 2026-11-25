import type { PluginModule, PluginRuntime, LoadedModule } from "@open-orpheus/plugin-api";
import type {
  LyricLine,
  LyricsStore,
} from "@open-orpheus/plugin-api/host/src/shared/types/lyrics.js";
import { ipcMain, webContents } from "electron";

import type { PlaybackState } from "./shared/playback";

const PLAYBACK_CHANNEL = "example-plugin.playback";
const REQUEST_CHANNEL = "example-plugin.request";

let logger: LoadedModule<"@main/logger">["default"];
let lyrics: LyricsStore | null = null;
let time = 0;
let playing = false;
let playbackRate = 1;

/** Windows running this plugin's plugin-manager realm. */
const subscribers = new Set<Electron.WebContents>();

function currentLine(): string | null {
  const lines = lyrics?.regular;
  if (!lines || lines.length === 0) return null;

  // Lyric timings are milliseconds; playback time is seconds.
  const elapsed = time * 1000;
  let active: LyricLine | null = null;
  for (const line of lines) {
    if (line.start_time > elapsed) break;
    active = line;
  }
  return active ? active.words.map((word) => word.text).join("") : null;
}

function snapshot(): PlaybackState {
  return { time, playing, playbackRate, line: currentLine() };
}

function publish(): void {
  const state = snapshot();
  for (const contents of subscribers) {
    if (contents.isDestroyed()) {
      subscribers.delete(contents);
      continue;
    }
    contents.send(PLAYBACK_CHANNEL, state);
  }
}

function onRequest(event: Electron.IpcMainEvent): void {
  subscribers.add(event.sender);
  event.sender.once("destroyed", () => subscribers.delete(event.sender));
  event.sender.send(PLAYBACK_CHANNEL, snapshot());
}

const unsubscribers: Array<() => void> = [];

export const activate: PluginModule["activate"] = async (runtime: PluginRuntime) => {
  logger = (await runtime.registry.load("@main/logger")).default.child({ realm: "main" });

  const { lyricsDispatcher } = await runtime.registry.load("@main/lyrics");

  time = lyricsDispatcher.time;
  playing = lyricsDispatcher.playState;
  playbackRate = lyricsDispatcher.playbackRate;
  lyrics = lyricsDispatcher.lyrics;

  unsubscribers.push(
    lyricsDispatcher.on("timeupdate", (event) => {
      time = event.data;
      publish();
    }),
    lyricsDispatcher.on("playstateupdate", (event) => {
      playing = event.data;
      publish();
    }),
    lyricsDispatcher.on("playbackratechange", (event) => {
      playbackRate = event.data;
      publish();
    }),
    lyricsDispatcher.on("lyricsupdate", (event) => {
      lyrics = event.data;
      publish();
    }),
    lyricsDispatcher.on("sloganupdate", () => {
      publish();
    })
  );

  ipcMain.on(REQUEST_CHANNEL, onRequest);

  // A plugin-manager window may already be open when this realm activates.
  for (const contents of webContents.getAllWebContents()) {
    contents.send(PLAYBACK_CHANNEL, snapshot());
  }

  logger.info("Example plugin activated.");
};

export const deactivate: PluginModule["deactivate"] = () => {
  ipcMain.removeListener(REQUEST_CHANNEL, onRequest);
  for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
  subscribers.clear();
  logger?.info("Example plugin deactivated.");
};
