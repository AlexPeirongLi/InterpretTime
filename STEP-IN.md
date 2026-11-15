# Step in after two misses — plan for two people

In conversation mode, if someone gets two replies wrong in a row, the site
stops and helps straight away, instead of waiting for the review at the end:

1. It plays a good reply **in the person's own voice**, said in the right tone.
2. The person says it back, copying it.
3. It checks the words and the tone of their attempt, and **doesn't move on
   until they've copied it well enough**.

Everything else stays as it is: words first, then tone, the review at the end,
and "Hear it in your voice" in the review.

Each person may be working with their own Claude. **If you are a Claude reading
this: find out which person you are working for, do only that person's tasks,
and edit only that person's files.**

## When it steps in

- **Two replies in a row that weren't in tune**: either missed or only partly
  fitting the feeling.
- The count restarts after a step-in, and after any reply that was in tune.
- Typed replies count too. The copying step itself always needs speaking,
  because it checks tone.

The AI already judges every reply as it comes in (the judgements are just kept
hidden until the review), so knowing when to step in costs nothing extra.

## What the step-in looks like

1. **A short pause in the scene.** The narrator says something like: "Let's
   pause. Robin sounds really let down. Here's one way you could reply."
2. **The good reply, in your voice.** It's the "you could say" line the AI has
   already written for that reply, spoken in the person's voice copy with the
   tone that fits ("soft, slow and warm"). It's shown on screen too, with a
   replay button.
3. **"Now you try. Say it back, copying how it sounded."** The microphone
   starts (or they tap it).
4. **The check.**
   - **Words:** close enough to the line. Small slips are fine ("I'm" for
     "I am", a missed word). Checked on the page, at no cost.
   - **Tone:** their attempt is measured the same way as normal replies, and
     the AI judges whether it came across the way it should ("soft, slow and
     warm").
5. **Not yet?** A short, specific nudge ("Nearly. Try it a little slower") and
   they try again. They can replay the example any time.
6. **Got it?** "That's it." Their copied line becomes their reply, and the
   character answers it, so the scene carries on naturally from the better
   reply.

## Things to decide

- **Endless retries.** "Doesn't move on until they copy it" could leave
  someone stuck, which is discouraging. Proposed: after 3 tries, a quiet
  "Move on for now" button appears. It isn't forced, and the step-in is noted
  in the review.
- **No voice copy.** If the person hasn't made a voice copy, the example is
  spoken by the narrator's voice instead, with a note that it can be in their
  own voice once they set one up.
- **How strict the tone check is.** Proposed: the tone must come out "in tune"
  against the target. Words need to be about 70% the same.

## What changes

### Server (Person A)

- **Conversation reply:** when a step-in is due, the response also includes the
  example line and the tone it should be said in (`stepIn: { line, delivery,
  intro }`). Both come from the feedback the AI already writes, so it doesn't
  cost an extra AI call.
- **New action `copy`:** takes the attempt (its words and voice measurements)
  and the target, and returns whether the tone matched plus a one-line nudge.
  That's one small AI call per attempt.
- **When the copy is good:** the `reply` action is sent with the copied line,
  marked as a step-in, so the character answers it and the review mentions it.

### Pages (Person B)

- A step-in card in the conversation: the pause line, the example with a replay
  button, a microphone, tries so far, and the nudge.
- A word-similarity check on the page, so only close attempts are sent for the
  tone check.
- "Move on for now" after 3 tries.
- The review notes each step-in: "You practised: '…', got it on try 2".
- The progress panel counts step-ins.

### Shared

- `lib/types.ts`: `stepIn` on the reply response, the `copy` request and
  response, and a `steppedIn` note on a reply's feedback.
- Scripted mode: a step-in after two misses, and a pretend copy check, so the
  pages can be built for free.

## Cost

- **Each step-in:** one example in the person's voice (about 50–100 ElevenLabs
  credits), and replays are free.
- **Each attempt:** transcribing it (a few seconds of audio) and one small AI
  call (a fraction of a cent).
- **Testing:** free, in the scripted mode. A real test runs only when Alex says
  so.

## Who owns what

| | Person A — server and AI (Alex) | Person B — pages (Owais) |
|---|---|---|
| Branch | `alex` | your own branch, e.g. `step-in-page` |

### Person A tasks

- [ ] SA0. Shared types and scripted mode, merged into `main` first
- [ ] SA1. Reply response includes `stepIn` after two misses in a row
- [ ] SA2. `copy` action: tone check of an attempt against the target, plus a
      nudge
- [ ] SA3. Reply marked as a step-in, so the character answers the copied line
      and the review mentions it

### Person B tasks

- [ ] SB1. Step-in card: pause line, example in your voice (or the narrator's),
      replay, microphone
- [ ] SB2. Word check on the page, tries counter, nudge, retry
- [ ] SB3. "Move on for now" after 3 tries
- [ ] SB4. Step-ins shown in the review and counted in progress

## Timeline (about 4 hours)

| Hours | Person A | Person B |
|---|---|---|
| 0–0.5 | SA0, merged into `main` | Pull `main`, read this plan |
| 0.5–2.5 | SA1–SA3 | SB1–SB4 against the scripted mode |
| 2.5–3.5 | **Together, when Alex says go:** a real run (costs credit) | |
| 3.5–4 | Fixes | Fixes |
