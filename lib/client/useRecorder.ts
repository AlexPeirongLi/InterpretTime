"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DeliveryMeter } from "@/lib/delivery";
import type { Delivery } from "@/lib/types";
import { postTranscribe } from "./api";

// Anything shorter is almost certainly an accidental tap.
const MIN_BYTES = 2000;

export type Recording = {
  /** What the person said. Empty when transcribing was skipped. */
  text: string;
  /** How their voice sounded (see lib/delivery.ts). Null if it could not be measured. */
  delivery: Delivery | null;
  /** The recording itself, kept in the browser (to play back, or to make a voice copy). */
  audio: Blob | null;
};

/** Measures the voice while recording, from the same microphone stream. */
type Metering = { context: AudioContext; meter: DeliveryMeter; nodes: AudioNode[] };

function startMetering(stream: MediaStream): Metering | null {
  try {
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    // ScriptProcessorNode is old but works in every browser without a
    // separate worklet file. It only reads the audio; its output is silent.
    const processor = context.createScriptProcessor(2048, 1, 1);
    const meter = new DeliveryMeter(context.sampleRate);
    processor.onaudioprocess = (event) => meter.push(event.inputBuffer.getChannelData(0));
    source.connect(processor);
    processor.connect(context.destination);
    return { context, meter, nodes: [source, processor] };
  } catch {
    // No measuring in this browser: recording and transcribing still work.
    return null;
  }
}

function stopMetering(metering: Metering | null): Delivery | null {
  if (!metering) return null;
  for (const node of metering.nodes) node.disconnect();
  void metering.context.close();
  return metering.meter.result();
}

/** Records from the microphone, measures the voice, and turns the recording into text. */
export function useRecorder() {
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing">("idle");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const metering = useRef<Metering | null>(null);

  const release = useCallback(() => {
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
    recorder.current = null;
    const m = metering.current;
    metering.current = null;
    return stopMetering(m);
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
    metering.current = startMetering(stream);
    r.start();
    setStatus("recording");
  }, []);

  /**
   * Stops recording. Returns what the person said and how their voice
   * sounded. With transcribe: false, only measures (for the normal-voice step).
   */
  const finish = useCallback(
    async ({ transcribe = true }: { transcribe?: boolean } = {}): Promise<Recording> => {
      const r = recorder.current;
      if (!r) return { text: "", delivery: null, audio: null };
      const audio = await new Promise<Blob>((resolve) => {
        r.onstop = () => resolve(new Blob(chunks.current, { type: r.mimeType || "audio/webm" }));
        r.stop();
      });
      const delivery = release();
      if (audio.size < MIN_BYTES) {
        setStatus("idle");
        throw new Error("That recording was too short. Tap the microphone, speak, then tap it again.");
      }
      if (!transcribe) {
        setStatus("idle");
        return { text: "", delivery, audio };
      }
      setStatus("transcribing");
      try {
        return { text: await postTranscribe(audio), delivery, audio };
      } finally {
        setStatus("idle");
      }
    },
    [release],
  );

  useEffect(() => () => void release(), [release]);

  return { status, start, finish };
}
