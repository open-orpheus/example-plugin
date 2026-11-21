import type { ConfigurationModule } from "@open-orpheus/plugin-api/configuration";

import type { ExamplePluginApi, PlaybackState } from "./shared/playback";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.0";
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${rest}`;
}

export const mount: ConfigurationModule["mount"] = (root) => {
  // The host waits for the plugin-manager preload realm before mounting this
  // module, so the API it exposed is already available here.
  const api = (window as unknown as { examplePlugin?: ExamplePluginApi }).examplePlugin;

  const greeting = document.createElement("p");
  greeting.style.fontWeight = "bold";
  greeting.textContent = api?.greeting ?? "Example configuration";

  const timeRow = document.createElement("p");
  const lineRow = document.createElement("p");
  const stateRow = document.createElement("p");
  for (const row of [timeRow, lineRow, stateRow]) {
    row.style.margin = "4px 0";
  }

  const timeValue = document.createElement("span");
  const lineValue = document.createElement("span");
  const stateValue = document.createElement("span");
  timeRow.append("当前时间：", timeValue);
  lineRow.append("当前歌词：", lineValue);
  stateRow.append("状态：", stateValue);

  root.append(greeting, timeRow, lineRow, stateRow);

  let lastReported = Number.NaN;
  let baseTime = 0;
  let baseAt = 0;

  const sample = (): PlaybackState | null => {
    const state = api?.getPlaybackState?.();
    if (!state) return null;

    // Interpolate between host time updates so the clock keeps moving.
    if (state.time !== lastReported) {
      lastReported = state.time;
      baseTime = state.time;
      baseAt = performance.now();
    }
    const elapsed = state.playing ? ((performance.now() - baseAt) / 1000) * state.playbackRate : 0;
    return { ...state, time: baseTime + elapsed };
  };

  const update = () => {
    const state = sample();
    if (!state) {
      timeValue.textContent = "不可用";
      lineValue.textContent = "不可用";
      stateValue.textContent = "插件管理器运行环境未就绪";
      return;
    }

    timeValue.textContent = formatTime(state.time);
    lineValue.textContent = state.line ?? "（无歌词）";
    stateValue.textContent = state.playing ? `播放中 ×${state.playbackRate}` : "已暂停或停止";
  };

  update();
  const timer = window.setInterval(update, 100);

  return () => {
    window.clearInterval(timer);
    root.replaceChildren();
  };
};
