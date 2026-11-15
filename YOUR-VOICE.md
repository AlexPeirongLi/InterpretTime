# Hear it in your voice — plan for two people

In conversation mode, when someone says the right thing in the wrong tone, the
site plays **their own sentence, in their own voice, said in a tone that would
have fitted**. Hearing yourself say it the right way is much closer to what you
would actually do than hearing a stranger's voice.

Each person may be working with their own Claude. **If you are a Claude reading
this: find out which person you are working for, do only that person's tasks,
and edit only that person's files.**

## How it works

1. **Words first.** After a spoken reply, the AI first judges what they said,
   as it does now.
   - If the words **missed** or only **partly** fitted, the feedback is about
     the words only. Tone isn't judged, so the person works on one thing at a
     time.
   - If the words were **in tune**, it goes on to judge the tone.
2. **Then tone.** If the tone fitted, the feedback says so. If it didn't
   (partly or missed), the AI also decides how it should have sounded, e.g.
   "softer, slower and warm" for a sad friend, or "calm and even" for an
   annoyed one.
3. **Hear it in your voice.** The feedback card gets a button: **▶ Hear it in
   your voice**. It plays the person's exact sentence, in a copy of their voice,
   with the better tone, next to their own original recording.
   - The clip is only made when the button is pressed, so unplayed suggestions
     cost nothing.
   - Once made, it's kept for replays.

Example, replying to a nervous friend:

> **Your words:** In tune. "That sounds scary, but you'll do great."
> **Your tone:** Partly. It came across quick and a bit loud.
> **▶ Hear it in your voice**, said softer and slower: "That sounds scary, but
> you'll do great."

## The voice copy

- **A longer sample.** The current "normal voice" step is a 5-second sentence.
  A good copy needs more, so the step becomes a short passage of about 45–60
  seconds, read once. It's used both for the tone baseline (as now) and for the
  voice copy. ElevenLabs suggests one to two minutes for the best quality, so
  the passage can grow if a minute isn't enough.
- **Clear consent first.** The step explains that it will make a copy of the
  person's voice with ElevenLabs, used only to play their own sentences back,
  and asks them to tick a box.
  - Without ticking, they still get tone feedback, just no "in your voice"
    clips.
  - It is only ever for the person's own voice.
- **Where it lives.** The copy is stored in the ElevenLabs account behind the
  site's key, under a random name with nothing identifying. The browser keeps
  its ID.
- **Deleting it.** A **Delete my voice copy** button removes it from ElevenLabs
  for good. Redoing the normal-voice step replaces the old copy.

## Before this can work: two things to check in ElevenLabs

1. **Your plan includes Instant Voice Cloning.** Paid plans usually do. It's on
   the Subscription page.
2. **Your API key is allowed to create and delete voices.** Earlier, the key
   couldn't even list voices, so this permission is probably off. In
   ElevenLabs, under API Keys, edit the key and turn on **Voices** (read and
   write). This needs to be done by you.

## Cost

- **Making the voice copy:** as far as the ElevenLabs docs show, it doesn't use
  character credit. It does use one of your plan's custom voice slots.
- **Each "Hear it in your voice" clip:** about one sentence of credit, usually
  50–100 characters. Only spent when the button is pressed.
- **Testing:** done in the free scripted mode, which fakes the voice copy and
  makes no real one. A real test (making your voice copy and a couple of clips)
  only runs when you say so.

## Before putting the site online

Every visitor who records a sample would get a voice copy in **your**
ElevenLabs account, and plans limit how many custom voices you can have. Before
going public, this needs a limit or automatic clean-up (for example, deleting
copies after a day). Fine as is while it's just the two of you.

## Who owns what

| | Person A — AI and voice (Alex) | Person B — pages (Owais) |
|---|---|---|
| Branch | `alex` | your own branch, e.g. `your-voice-page` |
| Files | `app/api/**`, `lib/server/**` | `app/**` except `app/api/**`, `components/**`, `lib/client/**` |

Shared changes, made by Person A first (task YA0) and merged into `main`:

- `lib/types.ts`:
  - `ToneFeedback` gains `better: string | null`, a short description of the
    tone that would have fitted, set only when the tone didn't fit.
  - Speak segments can use `voice: "user"` with a `userVoiceId`, and an
    optional `delivery` that replaces the emotion's usual instruction.
- `lib/mock-conversation.ts`: the scripted mode returns a `better` suggestion
  and pretends to make a voice copy, so the page can be built for free.

### Person A tasks

- [ ] YA0. Shared types and scripted-mode changes, merged into `main` first
- [ ] YA1. `POST /api/voice-copy`: sample recording in, voice ID out (ElevenLabs
      "add voice"). `DELETE /api/voice-copy`: removes it.
- [ ] YA2. Conversation reply: words first, then tone only if the words were in
      tune, and `better` when the tone didn't fit
- [ ] YA3. `/api/speak` speaks in the user's voice copy with the `better`
      delivery
- [ ] YA4. Safety limits: delivery text short and plain, only the user's own
      voice ID, sample size limits

### Person B tasks

- [ ] YB1. Longer normal-voice step (about a minute), with the consent tick box,
      sending the sample to `/api/voice-copy` when ticked
- [ ] YB2. Keep the original recording of each spoken reply in the browser, so
      it can be played next to the improved version
- [ ] YB3. Feedback card: "Hear it in your voice" (made on tap, then kept),
      plus "Your recording" for comparison
- [ ] YB4. "Delete my voice copy" button, and redo replaces the old copy

## Timeline (about 4 hours)

| Hours | Person A | Person B |
|---|---|---|
| 0–0.5 | YA0: shared changes, merged into `main` | Pull `main`, read this plan |
| 0.5–2.5 | YA1–YA4 | YB1–YB4 against the scripted mode |
| 2.5–3.5 | **Together, when Alex says go:** real voice copy and a few clips (costs credit) | |
| 3.5–4 | Fixes from the real test | Fixes from the real test |

## Left for later

Hearing it in your voice in Quickfire, letting the person try again and compare
their second attempt, and the clean-up needed before going public.
