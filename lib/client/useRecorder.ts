"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postTranscribe } from "./api";

// Anything shorter is almost certainly an accidental tap.
const MIN_BYTES = 2000;

/** Records from the microphone and turns the recording into text. */
export function useRecorder() {
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing">("idle");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const release = useCallback(() => {
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
    recorder.current = null;
  }, []);

  /** Starts recording. Throws an Error with a message for the person. */
  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("This browser can't record sound. Type your answer instead.");
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      throw new Error("The microphone is blocked. Allow it in your browser settings, or type your answer.");
    }
    const r = new MediaRecorder(stream);
    chunks.current = [];
    r.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };
    recorder.current = r;
    r.start();
    setStatus("recording");
  }, []);

  /** Stops recording and returns what the person said. */
  const finish = useCallback(async (): Promise<string> => {
    const r = recorder.current;
    if (!r) return "";
    const audio = await new Promise<Blob>((resolve) => {
      r.onstop = () => resolve(new Blob(chunks.current, { type: r.mimeType || "audio/webm" }));
      r.stop();
    });
    release();
    if (audio.size < MIN_BYTES) {
      setStatus("idle");
      throw new Error("That recording was too short. Tap the microphone, speak, then tap it again.");
    }
    setStatus("transcribing");
    try {
      return await postTranscribe(audio);
    } finally {
      setStatus("idle");
    }
  }, [release]);

  useEffect(() => release, [release]);

  return { status, start, finish };
}
