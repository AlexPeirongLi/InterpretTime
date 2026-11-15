"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeakRequest } from "@/lib/types";
import { ApiFailure, messageOf, postSpeak } from "./api";

type Segments = SpeakRequest["segments"];

/** What to play again once the browser allows sound. */
type BlockedPlay = { segments: Segments; key: string; userVoiceId?: string };

export type VoiceState = {
  /** What is happening to the clip named by `activeKey`. */
  status: "idle" | "loading" | "playing";
  activeKey: string | null;
  /** Set when the server says the voice is not set up (no ElevenLabs key). */
  unavailable: string | null;
  error: string | null;
  /** The browser blocked sound until the person clicks. Holds what to play. */
  blocked: BlockedPlay | null;
  /** The clip that last finished playing by itself, and how many have. A stop or an error does not count. */
  endedKey: string | null;
  endedCount: number;
};

/**
 * Plays segments through /api/speak. Each distinct clip is fetched once and
 * kept for replays, because every fetch uses ElevenLabs credit.
 */
export function useVoice() {
  const [state, setState] = useState<VoiceState>({
    status: "idle",
    activeKey: null,
    unavailable: null,
    error: null,
    blocked: null,
    endedKey: null,
    endedCount: 0,
  });
  const audio = useRef<HTMLAudioElement | null>(null);
  const cache = useRef(new Map<string, string>());
  const unavailable = useRef(false);
  // Each play gets a number. A slower, older request must not start talking
  // over a newer one.
  const current = useRef(0);

  const stop = useCallback(() => {
    current.current++;
    audio.current?.pause();
    setState((s) => ({ ...s, status: "idle", activeKey: null }));
  }, []);

  /** Plays a ready-made sound (a fetched clip, or a recording kept in the browser). */
  const playUrl = useCallback(async (url: string, key: string, id: number, retry: BlockedPlay | null) => {
    if (id !== current.current) return;
    const player = (audio.current ??= new Audio());
    player.src = url;
    player.onended = () => {
      if (id === current.current) {
        setState((s) => ({ ...s, status: "idle", activeKey: null, endedKey: key, endedCount: s.endedCount + 1 }));
      }
    };
    try {
      setState((s) => ({ ...s, status: "playing", activeKey: key }));
      await player.play();
    } catch (error) {
      if (id !== current.current) return;
      const blocked = error instanceof DOMException && error.name === "NotAllowedError";
      setState((s) => ({
        ...s,
        status: "idle",
        activeKey: null,
        blocked: blocked ? retry : null,
        error: blocked && retry ? null : "Could not play the sound.",
      }));
    }
  }, []);

  /**
   * Speaks segments through /api/speak. With userVoiceId, segments marked
   * voice "user" are spoken in the person's own voice copy.
   */
  const play = useCallback(async (segments: Segments, key: string, userVoiceId?: string) => {
    if (unavailable.current || segments.length === 0) return;
    const id = ++current.current;
    audio.current?.pause();
    setState((s) => ({ ...s, status: "loading", activeKey: key, error: null, blocked: null }));

    const cacheKey = JSON.stringify([userVoiceId ?? null, segments.map((s) => [s.text, s.emotion, s.voice ?? "narrator", s.delivery ?? null])]);
    let url = cache.current.get(cacheKey);
    if (!url) {
      try {
        url = URL.createObjectURL(await postSpeak(segments, userVoiceId));
        cache.current.set(cacheKey, url);
      } catch (error) {
        if (id !== current.current) return;
        if (error instanceof ApiFailure && error.status === 503) {
          unavailable.current = true;
          setState((s) => ({ ...s, status: "idle", activeKey: null, unavailable: error.message }));
        } else {
          setState((s) => ({ ...s, status: "idle", activeKey: null, error: messageOf(error) }));
        }
        return;
      }
    }
    await playUrl(url, key, id, { segments, key, userVoiceId });
  }, [playUrl]);

  /** Plays a recording kept in the browser, such as the person's own reply. */
  const playRecording = useCallback(
    (url: string, key: string) => {
      const id = ++current.current;
      audio.current?.pause();
      setState((s) => ({ ...s, error: null, blocked: null }));
      void playUrl(url, key, id, null);
    },
    [playUrl],
  );

  useEffect(() => {
    const urls = cache.current;
    return () => {
      audio.current?.pause();
      for (const url of urls.values()) URL.revokeObjectURL(url);
    };
  }, []);

  // When the browser blocked sound until the person interacts, play it on
  // their first tap or key press anywhere, instead of making them find a
  // Play button. Starting the microphone stops it again straight away.
  const { blocked } = state;
  useEffect(() => {
    if (!blocked) return;
    const resume = () => void play(blocked.segments, blocked.key, blocked.userVoiceId);
    const options = { once: true, capture: true } as const;
    window.addEventListener("pointerdown", resume, options);
    window.addEventListener("keydown", resume, options);
    return () => {
      window.removeEventListener("pointerdown", resume, options);
      window.removeEventListener("keydown", resume, options);
    };
  }, [blocked, play]);

  return { ...state, play, playRecording, stop };
}
