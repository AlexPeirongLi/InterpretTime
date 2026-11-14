# Conversation mode — plan for two people

A second way to practise, next to the one that exists now. Kept in its own file
so it does not clash with changes to PLAN.md.

Each person may be working with their own Claude. **If you are a Claude reading
this: find out which person you are working for, do only that person's tasks,
and edit only that person's files.**

## Two modes

| | Quickfire (exists now) | Conversation (new) |
|---|---|---|
| What happens | The AI says one sentence in a tone, you say what emotion you heard | You are dropped into a short scene with another person who is feeling something, and you talk to them |
| What it practises | Recognising an emotion | Recognising it **and** responding in a way that fits |
| Page | `/talk` (called Quickfire on screen) | `/conversation` |

The start page offers both, with one line explaining each.

## How a conversation scenario goes

1. **The scene.** A narrator sets it up in a calm voice, in one or two sentences.
   Example: "Your friend Sam has just come back from a job interview. They sit
   down next to you."
2. **The other person speaks**, in their emotion, in a different voice from the
   narrator. Example, sad: "I don't think it went very well."
3. **You reply** as yourself, by speaking or typing, as you would to a real
   person.
4. **Feedback.** After each reply, a short feedback card:
   - **How well your reply fitted:** In tune / Partly / Missed the feeling.
   - **What they were feeling**, and the cues that showed it.
   - **What went well** in your reply.
   - **One thing to try**, with an example reply that would fit better.

   The feedback is shown as text and read out by the narrator voice, so it never
   sounds like the other person talking.
5. **The scene continues.** The other person answers what you said, still in
   character, for 3 exchanges in total.
6. **Wrap-up.** A one-line summary of the scenario, then a button for the next
   one.

Scenarios rotate through the five emotions (sad, happy, afraid, angry, and a
calm one), and lean towards the emotions the person has found hardest.

## Hints

- A **Hint** button is there whenever it is the person's turn.
- First hint points at the cues without naming the feeling: "Listen to how
  slowly they are speaking, and to the word 'just'."
- Second hint names the feeling and what they might need: "They sound sad. They
  might want you to notice that it was hard for them."
- Using a hint is fine. The feedback mentions it gently, and it is counted in
  progress.

## If the person takes a while to reply

- 20 seconds after the other person finishes speaking, if the person has not
  started typing or recording, a gentle note appears: "Take your time. Want a
  hint?" with the Hint button next to it.
- It is shown, not spoken, so it does not feel like being rushed.
- It shows once per turn and disappears when they start replying.

## Who owns what

| | Person A — server and AI (Alex) | Person B — pages (teammate) |
|---|---|---|
| Branch | `alex` | your own branch, e.g. `conversation-page` |
| Files | `app/api/**`, `lib/server/**` | `app/**` except `app/api/**`, `components/**`, `lib/client/**` |

Shared files, written by Person A in task CA0 and merged into `main` first, so
Person B can start straight away:

- `lib/types.ts` — the new types below, added at the end. Nothing existing
  changes.
- `lib/mock-conversation.ts` — a scripted fake scenario, used by
  `/api/conversation` when there is no Claude key, so the page can be built
  before the AI works.
- `lib/conversation.ts` — small rules both halves need: how many hints are
  left, and which emotion a reply is judged against.

### Person A tasks

- [x] CA0. Add the new types and the fake scenario, open a pull request and
      merge it into `main` **first** (about 30 minutes)
- [x] CA1. `POST /api/conversation`, action `start`: picks the next scenario,
      returns the scene and the other person's first line
- [x] CA2. Action `reply`: returns feedback on the person's reply and the other
      person's next line, or the wrap-up after the third exchange
- [x] CA3. Action `hint`: returns the next hint (first cues, then the feeling)
- [x] CA4. Two voices: `/api/speak` accepts a `voice` on each segment
      (`narrator` or `character`) and joins them into one mp3. Quickfire keeps
      working unchanged, because a missing `voice` means narrator.
- [x] CA5. Tune the prompt and the character voice by ear: scenarios feel real,
      feedback is short, kind and specific

### Person B tasks

- [x] CB1. Start page: choose Quickfire or Conversation. Call `/talk`
      "Quickfire" on screen.
- [x] CB2. `/conversation` page: shows the scene and the conversation, and
      plays each new turn out loud through `/api/speak`
- [x] CB3. Reply box: reuse `components/AnswerBox.tsx` (typing and microphone)
- [x] CB4. Feedback cards: fit (In tune / Partly / Missed), the feeling and
      cues, what went well, what to try, example reply. Read out in the
      narrator voice.
- [x] CB5. Hint button, and the "Take your time. Want a hint?" note after 20
      seconds of no typing or recording
- [x] CB6. Progress section for this mode (per emotion: In tune / Partly /
      Missed counts), saved in the browser, with its own Start again button
- [x] CB7. Wrap-up and "Next scenario" button, styling, works on a phone

## The contract between the two halves

Added to `lib/types.ts` in CA0. Both halves import them from there.

```ts
type Voice = "narrator" | "character";

// SpeakRequest segments gain an optional voice. Missing means "narrator".
type SpeakRequest = { segments: { text: string; emotion: Emotion; voice?: Voice }[] };

type Fit = "in_tune" | "partly" | "missed";

type Feedback = {
  fit: Fit;
  feeling: Emotion;        // what the other person was feeling
  cues: string[];          // 1-3 things that showed it, e.g. "slow, quiet voice"
  wentWell: string;        // one sentence
  tryThis: string;         // one sentence
  exampleReply: string;    // a reply that would have fitted better
  usedHint: boolean;
};

type ScenarioTurn =
  | { role: "narrator"; text: string }                       // calm voice
  | { role: "character"; text: string; emotion: Emotion }    // character voice
  | { role: "user"; text: string }
  | { role: "feedback"; feedback: Feedback }
  | { role: "hint"; level: 1 | 2; text: string }
  | { role: "wrapup"; text: string };

type Scenario = {
  id: string;
  title: string;           // e.g. "After the interview". Safe to show.
  characterName: string;   // e.g. "Sam"
  emotion: Emotion;        // what the character feels. DO NOT SHOW until feedback.
  turns: ScenarioTurn[];
  exchanges: number;       // replies so far, 0-3
  done: boolean;           // true after the wrap-up
};

type ConversationProgress = {
  results: { emotion: Emotion; fit: Fit; usedHint: boolean }[];
};

// POST /api/conversation (JSON)
type ConversationRequest =
  | { action: "start"; progress: ConversationProgress }
  | { action: "reply"; scenario: Scenario; text: string; progress: ConversationProgress }
  | { action: "hint"; scenario: Scenario; progress: ConversationProgress };

// Always returns the whole updated scenario. The page replaces its copy.
type ConversationResponse = {
  scenario: Scenario;
  progress: ConversationProgress;
  mock: boolean;
};

// On failure: JSON { error: string } with status 400, 503 or 502, as before.
```

Rules for the page:

- The server keeps nothing. Send the whole scenario and progress each time and
  replace them with what comes back.
- `scenario.emotion` is the answer. Never show it before the first feedback
  card.
- New turns are the ones at the end of `scenario.turns` that you did not have
  before. Play those: narrator turns with `voice: "narrator"`, character turns
  with `voice: "character"` and their emotion, feedback read as narrator.
- A hint does not count as a reply and does not change `exchanges`.
- Up to 2 hints per reply. `canHint(scenario)` in `lib/conversation.ts` says
  whether another is allowed; use it to disable the Hint button. Asking for a
  third returns 400.
- `reply` and `hint` on a scenario where `done` is true return 400. Start a new
  one with `start`.

## How we work together

- Person A does CA0 first and merges it into `main`. Person B pulls `main`
  before starting.
- Each person works on their own branch and merges into `main` with a pull
  request when a task works.
- Edit only your own files. Pull `main` into your branch before opening a pull
  request.
- Tick the boxes here in the pull request that finishes each task.

## Timeline (about 5 hours)

| Hours | Person A | Person B |
|---|---|---|
| 0–0.5 | CA0: types and fake scenario, merged into `main` | Pull `main`, read this plan |
| 0.5–2.5 | CA1–CA4: the route, feedback, hints, two voices | CB1–CB5 against the fake scenario |
| 2.5–3.5 | **Together:** switch the page to the real AI, fix what breaks | |
| 3.5–4.5 | CA5: prompt and voice tuning | CB6–CB7: progress, wrap-up, styling |
| 4.5–5 | **Together:** play through a few scenarios start to finish | |

## Left for later

Choosing a specific scenario or emotion yourself, longer scenarios, mixed
emotions (for example nervous and excited), and the other person reacting to
the tone of your voice, not just your words.
