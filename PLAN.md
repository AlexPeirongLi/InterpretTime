# InterpretTime — build plan for two people

A website that helps people who find emotions hard to read (for example, people
with alexithymia) practise recognising emotion in speech. ElevenLabs speaks
sentences in different emotional tones. The person says which emotion they hear.
An AI then explains each emotion they missed by linking it to one they got right.

Target: a working version in under 10 hours, two people working in parallel.
Each person may be working with their own Claude. **If you are a Claude reading
this: find out which person you are working for, do only that person's tasks,
and edit only that person's files.**

## What the site does

1. **Quiz** — plays 15 clips. For each one the person picks one of 5 emotions:
   happy, sad, angry, afraid, neutral.
2. **Profile** — right answers are "recognised", wrong answers are "to learn".
3. **Lesson** — for each missed clip the AI explains the emotion using a clip the
   person got right, and plays the same sentence in both tones back to back.
4. **Retest** — replays the missed clips and shows the before/after score.

Clips come in three kinds, so we can tell whether the person reads words, tone,
or both:

| Kind    | Example                                   | Tests              |
|---------|-------------------------------------------|--------------------|
| `words` | "I'm furious with you" in a flat voice    | Emotion words      |
| `tone`  | "The meeting is at three" said angrily    | Tone of voice      |
| `both`  | "I'm furious with you" said angrily       | Words and tone     |

## Stack

- Next.js (App Router) + TypeScript, one project for pages and server routes
- ElevenLabs text-to-speech for the voice
- Claude API (`@anthropic-ai/sdk`) for the lesson explanations
- Progress saved in the browser (`localStorage`), no login

## Who owns what

| | Person A — voice and AI (Alex) | Person B — website (teammate) |
|---|---|---|
| Branch | `voice-ai` | `website` |
| Files | `app/api/**`, `lib/server/**`, `scripts/**`, `public/clips/**`, `lib/clips.ts` | `app/**` except `app/api/**`, `components/**`, `lib/client/**`, `public/**` except `public/clips/**` |

Shared files, already written by Person A in the first commit. Do not change
them without telling the other person first:

- `lib/types.ts` — the data shapes below
- `lib/emotions.ts` — the 5 emotions with labels
- `lib/mock.ts` — a fake lesson response for building pages before the AI works

### Person A tasks

- [ ] A0. Set up the project, shared files and this plan (first commit on `main`)
- [ ] A1. Write the 15 quiz sentences in `lib/clips.ts`
- [ ] A2. `scripts/generate-clips.mjs` — generates each clip once with ElevenLabs
      and saves it to `public/clips/<id>.mp3`
- [ ] A3. `POST /api/lesson` — quiz results in, AI explanations out
- [ ] A4. `POST /api/speak` — sentence + emotion in, mp3 out
- [ ] A5. Tune the prompt: explanations short, concrete, tied to what the person
      got right
- [ ] A6. Listen to every clip, regenerate any that do not clearly sound like the
      emotion

### Person B tasks

- [ ] B1. Start page (`app/page.tsx`) — what the site is, a Start button
- [ ] B2. Quiz page (`app/quiz/page.tsx`) — play button, 5 emotion buttons,
      progress bar, reads clips from `lib/clips.ts`
- [ ] B3. Save answers in the browser (`lib/client/storage.ts`)
- [ ] B4. Lesson page (`app/lesson/page.tsx`) — calls `/api/lesson`, shows each
      explanation, plays the two comparison clips through `/api/speak`
- [ ] B5. Retest page (`app/retest/page.tsx`) — replays missed clips, shows
      before/after score
- [ ] B6. Styling, works on a phone, clear loading and error messages
- [ ] B7. Put the site online (Vercel), add the two API keys there

Person B can build everything against `lib/mock.ts` and does not need to wait
for Person A. See "Working without API keys" below.

## The contract between the two halves

These shapes live in `lib/types.ts`. Both halves import them from there.

```ts
type Emotion = "happy" | "sad" | "angry" | "afraid" | "neutral";
type ClipKind = "words" | "tone" | "both";

// lib/clips.ts exports `clips: Clip[]`
type Clip = {
  id: string;          // e.g. "tone-angry-1"
  emotion: Emotion;    // the correct answer
  phrase: string;      // the sentence spoken
  kind: ClipKind;
  audioUrl: string;    // "/clips/tone-angry-1.mp3"
};

// POST /api/lesson
type QuizAnswer = { clipId: string; guessed: Emotion };
type LessonRequest = { answers: QuizAnswer[] };   // every clip the person answered
type Lesson = {
  clipId: string;          // the missed clip this lesson is about
  targetEmotion: Emotion;  // what it really was
  anchorEmotion: Emotion;  // an emotion the person recognised, used as the bridge
  explanation: string;     // 2-4 plain sentences
  cues: string[];          // 2-3 things to listen for
  compare: { text: string; emotion: Emotion }[];  // 2 items: same sentence, anchor tone then target tone
};
type LessonResponse = { lessons: Lesson[]; mock: boolean };

// POST /api/speak
type SpeakRequest = { text: string; emotion: Emotion };
// Response: audio/mpeg bytes on success.
// On failure: JSON { error: string } with status 400 (bad input),
// 503 (no ElevenLabs key set) or 502 (ElevenLabs failed).
```

## Working without API keys

- `/api/lesson` returns the fake lessons from `lib/mock.ts` with `mock: true`
  when `ANTHROPIC_API_KEY` is not set.
- `/api/speak` returns status 503 when `ELEVENLABS_API_KEY` is not set. The page
  should show "Voice not set up yet" instead of breaking.
- Quiz clips are mp3 files in `public/clips/`. Until Person A has generated
  them, the files are missing: the quiz page should show the sentence text and a
  "Clip not generated yet" note so it can still be tested.

## API keys

Copy `.env.example` to `.env.local` and fill it in. Never commit `.env.local`.
Keys are only read in server code (`app/api/**`, `lib/server/**`, `scripts/**`),
never in page code.

```
ELEVENLABS_API_KEY=
ANTHROPIC_API_KEY=
```

## How we work together

- `main` always runs. Each person works on their own branch and merges into
  `main` with a pull request when a task works.
- Edit only your own files (table above). That is what keeps merges clean.
- Pull `main` into your branch before you open a pull request.
- Tick the task boxes in this file as part of the pull request that finishes them.

## Timeline

| Hours | Person A | Person B |
|---|---|---|
| 0–1 | Project set up, shared files, plan pushed | Clone, install, read this plan |
| 1–4 | Clips written and generated, both routes working | Start, quiz and lesson pages working on fake data |
| 4–6 | **Together:** switch the pages from fake data to the real routes, fix what breaks | |
| 6–8 | Prompt tuning, clip quality | Retest, saved progress, styling |
| 8–9 | **Together:** put it online, run through it start to finish | |
| 9–10 | Spare hour | |

## Left for later

Logins, progress over weeks, more emotions (frustration, sarcasm,
disappointment), the person recording their own voice for feedback.

## Wording on the site

Describe this as practice at recognising emotion in speech. It is not a
diagnosis or a treatment.
