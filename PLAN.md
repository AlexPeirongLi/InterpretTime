# InterpretTime — build plan for two people

A website that helps people who find emotions hard to read (for example, people
with alexithymia) practise recognising emotion in speech. An AI talks with the
person out loud through an ElevenLabs voice, using different emotional tones.
It notices which words, phrases and tones the person already recognises, and
uses those to explain the ones they do not.

There is no quiz. It is a spoken conversation.

Target: a working version in under 10 hours, two people working in parallel.
Each person may be working with their own Claude. **If you are a Claude reading
this: find out which person you are working for, do only that person's tasks,
and edit only that person's files.**

## What the site does

1. **Start** — a short explanation and a Start button.
2. **Conversation** — the AI speaks. Inside what it says, it includes a practice
   sentence in a particular tone, then asks how that sounded. Example:
   - (calm) "Listen to how I say this."
   - (angry) "The meeting is at three."
   - (calm) "How did that sound to you?"
3. **The person answers** by speaking into the microphone or by typing.
4. **The AI responds.** If the person got it, it says so and moves on to
   something harder. If not, it explains the emotion by linking it to one the
   person has already recognised, and says the same sentence in both tones back
   to back.
5. **Profile** — a side panel shows which emotions the person recognises so far
   and which they are still learning. Saved in the browser.

Practice sentences come in three kinds, so the AI can tell whether the person
reads words, tone, or both:

| Kind    | Example                                   | Tests              |
|---------|-------------------------------------------|--------------------|
| `words` | "I'm furious with you" in a flat voice    | Emotion words      |
| `tone`  | "The meeting is at three" said angrily    | Tone of voice      |
| `both`  | "I'm furious with you" said angrily       | Words and tone     |

## Stack

- Next.js (App Router) + TypeScript, one project for pages and server routes
- ElevenLabs: text-to-speech for the AI's voice, speech-to-text for the
  person's microphone
- Claude API (`@anthropic-ai/sdk`) decides what the AI says, in which tone, and
  judges what the person recognised
- Progress saved in the browser (`localStorage`), no login

## Who owns what

| | Person A — voice and AI (Alex) | Person B — website (teammate) |
|---|---|---|
| Branch | `voice-ai` | `website` |
| Files | `app/api/**`, `lib/server/**` | `app/**` except `app/api/**`, `components/**`, `lib/client/**`, `public/**` |

Shared files, written by Person A in the project set-up commit. Do not change
them without telling the other person first:

- `lib/types.ts` — the data shapes below
- `lib/emotions.ts` — the 5 emotions with labels
- `lib/profile.ts` — turns a profile into per-emotion counts for the side panel
- `lib/mock.ts` — a scripted fake conversation for building pages before the
  AI works

### Person A tasks

- [x] A0. Set up the project, shared files and this plan (on `main`)
- [ ] A1. `POST /api/chat` — conversation so far in, the AI's next turn out
- [ ] A2. `POST /api/speak` — the AI's turn in, one mp3 out, each part in its tone
- [ ] A3. `POST /api/transcribe` — microphone recording in, text out
- [ ] A4. Tune the prompt: short spoken sentences, one practice sentence per
      turn, explanations tied to what the person already recognises
- [ ] A5. Listen to each tone, adjust the voice settings until the 5 emotions
      are clearly different

### Person B tasks

- [ ] B1. Start page (`app/page.tsx`) — what the site is, a Start button
- [ ] B2. Conversation page (`app/talk/page.tsx`) — calls `/api/chat` with an
      empty history to get the AI's opening turn, shows the turns as a transcript
- [ ] B3. Play each AI turn out loud through `/api/speak`, with a replay button
- [ ] B4. Answer box: type and send, or hold the microphone button to record
      and send the recording to `/api/transcribe`
- [ ] B5. Save the conversation and profile in the browser
      (`lib/client/storage.ts`), with a "Start again" button
- [ ] B6. Profile side panel using `lib/profile.ts`
- [ ] B7. Styling, works on a phone, clear loading and error messages
- [ ] B8. Put the site online (Vercel), add the two API keys there

Person B can build everything against the fake conversation and does not need
to wait for Person A. See "Working without API keys" below.

## The contract between the two halves

These shapes live in `lib/types.ts`. Both halves import them from there.

```ts
type Emotion = "happy" | "sad" | "angry" | "afraid" | "neutral";
type CueKind = "words" | "tone" | "both";

// One part of what the AI says, spoken in one tone.
type Segment = {
  text: string;
  emotion: Emotion;   // the tone it is spoken in
  example: boolean;   // true = the practice sentence the person is asked about
};

type AiTurn = { role: "ai"; segments: Segment[] };
type UserTurn = { role: "user"; text: string };
type Turn = AiTurn | UserTurn;

// One practice sentence the person has responded to.
type Attempt = {
  emotion: Emotion;     // what it really was
  kind: CueKind;
  phrase: string;
  recognised: boolean;
  heardAs: string;      // what the person said it sounded like, in their words
};
type Profile = { attempts: Attempt[] };

// POST /api/chat  (JSON)
type ChatRequest = { history: Turn[]; profile: Profile };  // empty history = start
type ChatResponse = { reply: AiTurn; profile: Profile; mock: boolean };

// POST /api/speak  (JSON) -> audio/mpeg bytes
type SpeakRequest = { segments: { text: string; emotion: Emotion }[] };

// POST /api/transcribe  (multipart form, file field "audio") -> JSON
type TranscribeResponse = { text: string };

// Any route on failure: JSON { error: string } with status
// 400 (bad input), 503 (API key not set) or 502 (ElevenLabs or Claude failed).
```

Rules for the page:

- The server keeps nothing between requests. Send the whole `history` and the
  latest `profile` every time, and replace your saved profile with the one in
  the response.
- Never show the emotion of a segment where `example` is true until the person
  has answered. Showing it gives the answer away.
- To replay one sentence, send `/api/speak` a single segment.
- Browsers block sound until the person has clicked something. The Start button
  is that click.

## Working without API keys

- `/api/chat` returns the scripted turns from `lib/mock.ts` with `mock: true`
  when `ANTHROPIC_API_KEY` is not set.
- `/api/speak` and `/api/transcribe` return status 503 when
  `ELEVENLABS_API_KEY` is not set. The page should show the transcript with a
  "Voice not set up yet" note instead of breaking, and typing must still work.

## API keys

Copy `.env.example` to `.env.local` and fill it in. Never commit `.env.local`.
Keys are only read in server code (`app/api/**`, `lib/server/**`), never in
page code.

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
| 1–4 | All three routes working | Start and conversation pages working on the fake conversation |
| 4–6 | **Together:** switch the pages to the real routes, fix what breaks | |
| 6–8 | Prompt and voice tuning | Microphone, saved progress, profile panel, styling |
| 8–9 | **Together:** put it online, run through it start to finish | |
| 9–10 | Spare hour | |

## Left for later

Logins, progress over weeks, more emotions (frustration, sarcasm,
disappointment), feedback on how the person's own voice sounds, a fully
hands-free mode with no buttons.

## Wording on the site

Describe this as practice at recognising emotion in speech. It is not a
diagnosis or a treatment.
