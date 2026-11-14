# Deeper emotions — plan for two people

Both modes currently use five emotions: happy, sad, angry, afraid and calm.
This adds harder ones that people with alexithymia often find especially
confusing, starting with sarcasm.

Each person may be working with their own Claude. **If you are a Claude reading
this: find out which person you are working for, do only that person's tasks,
and edit only that person's files.**

## The new emotions

| Emotion | Why it's hard | Example |
|---|---|---|
| **Sarcastic** | The words say one thing and the voice says the opposite | "Oh, great. Another meeting." said flat and drawn out |
| **Frustrated** | Like angry, but smaller and aimed at a situation, not a person | "It's frozen again. Of course it is." |
| **Disappointed** | Like sad, but about something that didn't happen as hoped | "Oh. They picked someone else." |
| **Nervous** | Like afraid, but about something coming up | "I've got my driving test tomorrow." |
| **Excited** | Like happy, but faster and looking forward | "We're actually going this weekend!" |
| **Embarrassed** | Quiet, quick, wants to move on | "Can we just forget I said that?" |
| **Bored** | Flat and slow, easy to mistake for calm or sad | "Yeah. Sounds fine." |
| **Relieved** | Happy, but after worry; a breath out | "Oh, thank goodness. It's fine." |

These are grouped as **Basics** (the current five) and **Deeper** (the eight
above). Each deeper emotion is close to a basic one, which is exactly what the
site is built around: explaining a new emotion through one the person already
recognises. For example, frustrated is explained through angry, and
disappointed through sad.

### Sarcasm gets special treatment

Sarcasm is the one where tone and words disagree, so the AI teaches it as a
mismatch. It plays the same words said sincerely and sarcastically, side by
side ("Oh, great!" happy, then "Oh, great." sarcastic), and asks which one
meant it. In conversation mode, a good reply to sarcasm responds to what the
person really means, not to their literal words.

## How the person chooses

- A choice at the start of each mode: **Basics**, **Basics + deeper**, or
  **Deeper only**. The last choice is remembered.
- Default is **Basics**. Once the person has recognised most of the basics,
  the site suggests trying deeper emotions, but never switches on its own.

## What changes

- **Quickfire:** deeper emotions can be the practice sentence. The AI links
  each one to the basic emotion it is closest to, and plays the two side by
  side.
- **Conversation mode:** characters can feel deeper emotions: a sarcastic
  coworker, an embarrassed friend, a bored sibling. Feedback and hints know what
  fits each one: reassure someone embarrassed and don't dwell on it, share in
  someone's relief, respond to what a sarcastic person really means.
- **Voice:** each new emotion gets its own instruction to ElevenLabs. ElevenLabs
  supports a sarcastic tone directly; the others are described in words. Some
  may come out weak, so they need a listening check (see below).
- **Tone check:** unchanged. It still measures how the person sounded. It can't
  detect sarcasm in their voice, and the feedback won't claim to.
- **Progress panels:** split into Basics and Deeper sections, with Deeper
  folded away until used.

## Who owns what

| | Person A — AI and voice (Alex) | Person B — pages (Owais) |
|---|---|---|
| Branch | `alex` | your own branch, e.g. `deeper-page` |
| Files | `app/api/**`, `lib/server/**` | `app/**` except `app/api/**`, `components/**`, `lib/client/**` |

Shared files, changed by Person A in task DA0 and merged into `main` first:

- `lib/emotions.ts`: the eight new emotions, labels, which basic emotion each
  is closest to, and the Basics/Deeper groups.
- `lib/types.ts`: `Emotion` gains the eight new values, and requests gain an
  optional `emotionSet: "basics" | "both" | "deeper"`. Missing means
  "basics", so nothing that works now changes.

### Person A tasks

- [ ] DA0. New emotions and the emotion-set choice in the shared files, merged
      into `main` **first**
- [ ] DA1. Voice instructions for each new emotion
- [ ] DA2. Quickfire prompt: deeper emotions, the closest-basic link, sarcasm
      taught as words versus tone
- [ ] DA3. Conversation prompt: deeper-emotion scenes, and what a fitting reply
      looks like for each
- [ ] DA4. Both routes accept the emotion set and only use emotions from it
- [ ] DA5. Listening check: one short clip per new emotion for you to listen
      to. **This costs ElevenLabs credit, about 1,000–1,500 credits for 8 clips
      in 2 voices, so it only runs when you say so.** Any emotion that doesn't
      sound right gets its instruction reworded, or is left out.

### Person B tasks

- [ ] DB1. Emotion-set choice (Basics / Basics + deeper / Deeper only) in both
      modes, remembered in the browser
- [ ] DB2. Send the choice with every request
- [ ] DB3. Progress panels in both modes: Basics and Deeper sections
- [ ] DB4. Colours and labels for the new emotions; the suggestion to try
      deeper ones once the basics are mostly recognised

## Testing without spending credit

Everything except the listening check (DA5) is tested free:

- type checks
- the scripted mode, which runs with no AI or voice calls and gets a sarcastic
  line added so the pages can show it
- checking the requests the pages send

Anything that would call ElevenLabs or Claude with real keys is asked about
first.

## Timeline (about 4–5 hours)

| Hours | Person A | Person B |
|---|---|---|
| 0–0.5 | DA0: shared files, merged into `main` | Pull `main`, read this plan |
| 0.5–2.5 | DA1–DA4: voice, prompts, routes | DB1–DB4 against the scripted mode |
| 2.5–3.5 | DA5: listening check (when you say so) | Styling, phone layout |
| 3.5–4.5 | **Together:** try both modes with deeper emotions on | |

## Left for later

Mixed emotions (nervous and excited at once), emotions shown by body language
or facial expression, and letting the person pick exactly which emotions to
practise.
