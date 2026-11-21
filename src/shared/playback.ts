/**
 * Snapshot sent from the main realm to the plugin-manager preload.
 *
 * This is a plugin-defined IPC payload, not a host type: the plugin-manager
 * realm's registry does not include `@main/lyrics`.
 */
export interface PlaybackState {
  /** Seconds, matching the host's playback clock. */
  time: number;
  playing: boolean;
  playbackRate: number;
  /** Text of the line active at `time`, or null when unavailable. */
  line: string | null;
}

export interface ExamplePluginApi {
  greeting: string;
  getPlaybackState(): PlaybackState;
}
