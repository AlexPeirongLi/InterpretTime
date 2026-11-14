# InterpretTime

Practice at recognising emotion in speech. An AI talks with you out loud
through an ElevenLabs voice in different emotional tones, and links the
emotions you already recognise to the ones you do not.

**Read [PLAN.md](PLAN.md) first.** It says who builds what and how the two
halves fit together.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

It runs without API keys: the AI is replaced by a scripted conversation and
the voice is off. To turn on the real AI and voice, copy `.env.example` to
`.env.local` and fill in the two keys.

## Where things are

| Path | What | Owner |
|---|---|---|
| `app/api/**` | Server routes: chat, speak, transcribe | Person A |
| `lib/server/**` | ElevenLabs and Claude code | Person A |
| `app/**` (not `api`) | Pages | Person B |
| `components/**`, `lib/client/**` | Page building blocks | Person B |
| `lib/types.ts`, `lib/emotions.ts`, `lib/profile.ts`, `lib/mock.ts` | Shared | Agree before changing |
