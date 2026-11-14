# Conversation mode — plan

A second way to practise, next to the one that exists now. Kept in its own file
so it does not clash with changes Person B makes to PLAN.md. Built on the
`alex` branch.

## Two modes

| | Quickfire (exists now) | Conversation (new) |
|---|---|---|
| What happens | The AI says one sentence in a tone, you say what emotion you heard | You are dropped into a short scene with another person who is feeling something, and you talk to them |
| What it practises | Recognising an emotion | Recognising it **and** responding in a way that fits |
| Page | `/talk` (renamed to Quickfire on screen) | `/conversation` |

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
   - **What they were feeling**, and the cues that showed it (slow, quiet voice;
     the words "not very well").
   - **What went well** in your reply.
   - **One thing to try**, with an example reply that would fit better.
   The feedback is shown as text and read out by the narrator voice, so it never
   sounds like the other person talking.
5. **The scene continues.** The other person answers what you said, still in
   character, for 3 exchanges in total.
6. **Wrap-up.** A one-line summary of the scenario, then a button for the next
   one.

Scenarios rotate through the five emotions (sad, happy, afraid, angry, and a
calm/neutral one), and lean towards the emotions you have found hardest.

## Hints

- A **Hint** button is always there while it is your turn.
- First hint points at the cues without naming the feeling: "Listen to how
  slowly they are speaking, and to the word 'just'."
- Second hint names the feeling and suggests what they might need: "They sound
  sad. They might want you to notice that it was hard for them."
- Using a hint is fine. The feedback mentions it gently ("with a hint"), and it
  is counted in your progress.

## If you take a while to reply

- 20 seconds after the other person finishes speaking, if you have not started
  typing or recording, a gentle note appears: "Take your time. Want a hint?"
  with the Hint button next to it.
- It is shown, not spoken, so it does not feel like being rushed.
- It shows once per turn and disappears when you start replying.

## Progress

The side panel gains a second section for this mode: per emotion, how many
replies were In tune / Partly / Missed. Saved in the browser, separately from
Quickfire, and cleared by its own Start again button.

## What gets built

### Server (`app/api/**`, `lib/server/**`)

- `POST /api/conversation` with three actions:
  - `start`: picks the next scenario and returns the scene and the other
    person's first line.
  - `reply`: takes your reply, returns the feedback and the other person's next
    line (or the wrap-up after the third exchange).
  - `hint`: returns the next hint for the current turn.
- `/api/speak` gains an optional `voice` field, `"narrator"` or `"character"`,
  so the two are spoken in different voices. Quickfire keeps working unchanged.
- A new prompt for Claude for scenarios, feedback and hints.

### Pages (`app/**`, `components/**`, `lib/client/**`)

- Start page: choose Quickfire or Conversation.
- `/conversation`: the scene, the conversation, the feedback cards, the Hint
  button, the "want a hint?" note, and the progress section.
- Reuses the existing answer box (typing and microphone), voice player and
  saving.

### Shared (`lib/types.ts`)

New types for scenarios, feedback and hints are added. Nothing existing
changes, so Quickfire and anything Person B builds on it keep working.

## Files this touches that Person B might also be changing

Worth telling Person B before building, so you do not both edit them:

- `app/page.tsx` (the start page gets the mode choice)
- `lib/types.ts` (new types added at the end only)
- `app/api/speak/route.ts` and `lib/server/elevenlabs.ts` (the voice choice)

Everything else is new files.

## Rough time

About 4–5 hours: 2 for the server and prompt, 2 for the page, 1 for testing
and tuning by ear.

## Left for later

Choosing a specific scenario or emotion yourself, longer scenarios, mixed
emotions (for example nervous and excited), and the other person reacting to
the tone of your voice, not just your words.
