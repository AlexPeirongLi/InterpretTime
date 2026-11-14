# Tone check — plan for two people

In conversation mode, the feedback currently judges only **what** the person
said. This adds **how they said it**: the tone and pace of their voice, when
they reply by speaking.

Each person may be working with their own Claude. **If you are a Claude reading
this: find out which person you are working for, do only that person's tasks,
and edit only that person's files.**

## The idea

When the person speaks a reply, the page measures their voice while they
talk: how high or low it is, how much it rises and falls, how loud it is, how
fast they speak, and where they pause. Those numbers are compared with the
person's own normal voice and turned into plain words, such as "a bit faster
and louder than usual, with a flat pitch". Claude reads that alongside the words
and gives feedback on both.

Example, replying to a sad friend:

> **What you said:** In tune. You asked how they were feeling.
> **How you sounded:** Partly. Your voice was quick and quite loud, which can
> come across as rushed. Try slowing down and speaking a little softer.

### Why measure it in the browser

Claude reads text and cannot hear audio. A specialist emotion service would
need a new account and paid usage, so this measures the voice on the page
instead: free, and nothing new to sign up for.

### What it can and can't tell

- **Good at:** loud or quiet, fast or slow, lively or flat pitch, long pauses.
  These are the main things that make a voice sound calm, warm, tense or sharp.
- **Weak at:** telling apart emotions that use the voice in similar ways, like
  afraid and excited (both fast and high). It also judges against the person's
  own normal voice, so it needs a short sample of that first.
- So the feedback always says how they **seemed** to sound, never that they
  definitely sounded a certain way. A noisy room or a poor microphone can throw
  it off.

### Only spoken replies

Typed replies get the same feedback as now, with no tone part. The page says
so once: "Speak your reply to get feedback on your tone too."

## How it works

1. **Your normal voice (once).** The first time the person speaks a reply in
   conversation mode, the page asks them to read one short, plain sentence in
   their everyday voice, about five seconds long. This is saved in the browser
   as their baseline, with a button to redo it any time (new microphone, new
   room).
2. **While they speak a reply**, the page measures their voice. The audio is
   still sent to ElevenLabs to turn it into text, as now. The measurements are
   numbers only.
3. **The reply goes to the server** with the measurements and the baseline.
4. **The server turns the numbers into words** ("a little higher than usual",
   "much faster"), so Claude judges plain descriptions, not raw numbers.
5. **Claude gives tone feedback** next to the word feedback: how well the tone
   fitted (In tune / Partly / Missed), how they seemed to sound, and one tip.
6. **Progress** records the tone result too, so the panel can show how often
   their tone fitted, per emotion.

What fits each feeling, roughly: a sad or afraid person is helped by a slower,
softer, steady voice; a happy person by a lively, warmer voice that shares the
mood; an angry person by a calm, even voice that does not rise to meet theirs;
a calm person by an ordinary relaxed voice.

## Who owns what

| | Person A — measuring and AI (Alex) | Person B — pages (Owais) |
|---|---|---|
| Branch | `alex` | your own branch, e.g. `tone-page` |
| Files | `app/api/**`, `lib/server/**`, `lib/delivery.ts` | `app/**` except `app/api/**`, `components/**`, `lib/client/**` |

`lib/delivery.ts` holds the measuring: plain functions that take raw audio
samples and return the numbers. Person A writes and tests it; Person B calls it
from the microphone code.

Shared files, written by Person A in task TA0 and merged into `main` first:

- `lib/types.ts`: the new types below, added at the end. Existing types only
  gain optional fields, so nothing that works now breaks.
- `lib/delivery.ts`: first version of the measuring, with the same inputs and
  outputs as the final one.

Status: all tasks were built together by Alex's Claude on the `alex` branch,
instead of being split, and tested with stand-in recordings fed through the
microphone code. Not yet tried with a real person's voice.

### Person A tasks

- [x] TA0. Add the types and a first `lib/delivery.ts`, merge into `main`
      **first** (about 45 minutes)
- [x] TA1. Measuring: pitch, pitch range, loudness, loudness variation, pauses
      and speaking speed from raw samples
- [x] TA2. Check the measuring against known voices: run it on ElevenLabs clips
      of the same sentence said angry, sad, happy, afraid and calm, and confirm
      the numbers differ the way they should (angry louder, sad slower and
      lower, and so on)
- [x] TA3. Server: `/api/conversation` reply accepts the measurements, turns
      them into words compared with the baseline, and asks Claude for tone
      feedback. Typed replies are unchanged.
- [x] TA4. Tune the prompt so tone feedback is short, careful ("seemed",
      "came across as") and gives one concrete tip

### Person B tasks

- [x] TB1. Microphone: while recording, feed the audio to `lib/delivery.ts` and
      keep the measurements with the reply
- [x] TB2. "Your normal voice" step: shown before the first spoken reply, with
      the sentence to read, saved in the browser, and a Redo button
- [x] TB3. Send the measurements and baseline with spoken replies
- [x] TB4. Feedback card: a "How you sounded" part (fit, what was heard, tip),
      read out by the narrator, and the note that typing skips it
- [x] TB5. Progress panel: tone results per emotion next to the word results

## The contract between the two halves

Added to `lib/types.ts` in TA0.

```ts
// What lib/delivery.ts measures from one recording.
type Delivery = {
  seconds: number;               // whole recording
  speechSeconds: number;         // time actually speaking, pauses removed
  pitchHz: number | null;        // typical pitch; null if too little voice
  pitchRange: number | null;     // how much it rises and falls, in semitones
  loudnessDb: number;            // typical loudness (relative to the mic)
  loudnessRange: number;         // how much loudness changes, in dB
  pauses: number;                // pauses longer than half a second
  longestPause: number;          // seconds
};

// The same measurements from the "normal voice" sentence, plus its speed.
type Baseline = Delivery & { wordsPerSecond: number };

// ConversationRequest "reply" gains an optional delivery. Typed replies leave
// it out. words is the number of words in that recording (from its transcript),
// which the server uses with speechSeconds to work out the pace.
type ReplyDelivery = { measured: Delivery; words: number; baseline: Baseline | null };
//   { action: "reply"; scenario; text; progress; delivery?: ReplyDelivery }

// Feedback gains an optional tone part. Missing or null for typed replies.
type ToneFeedback = {
  fit: Fit;
  heard: string;   // how they seemed to sound, e.g. "quick and fairly loud"
  tip: string;     // one sentence
};
//   Feedback: { ...; tone?: ToneFeedback | null }

// ConversationResult gains an optional tone result.
//   ConversationResult: { emotion; fit; usedHint; toneFit?: Fit }

// lib/delivery.ts exports:
//   measure(samples: Float32Array, sampleRate: number): Delivery
//   new DeliveryMeter(sampleRate) with push(samples) and result(): Delivery,
//   for measuring while recording without keeping all the audio.
```

Rules for the page:

- Measure the same audio that is sent for transcription.
- If `measured.pitchHz` is null (too short, too quiet, or mostly noise), send
  the reply without `delivery`, and show "I couldn't hear your tone clearly
  that time."
- Without a baseline, still send the measurements: the server then judges more
  cautiously, against typical voices.

## How we work together

- Person A does TA0 first and merges it into `main`. Person B pulls `main`
  before starting.
- Each person works on their own branch and merges into `main` with a pull
  request when a task works.
- Edit only your own files. Pull `main` into your branch before opening a pull
  request.

## Timeline (about 5 hours)

| Hours | Person A | Person B |
|---|---|---|
| 0–0.75 | TA0: types and first `lib/delivery.ts`, merged into `main` | Pull `main`, read this plan |
| 0.75–3 | TA1–TA3: measuring, checking it on known voices, server | TB1–TB4 with the first `lib/delivery.ts` |
| 3–4 | **Together:** speak real replies, compare what it says with how you meant to sound | |
| 4–5 | TA4: prompt tuning | TB5 and styling |

## Left for later

Tone checks in Quickfire (a "say it angrily" exercise), a specialist emotion
service for more accurate readings, and feedback while the person is still
speaking.
