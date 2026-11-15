// Ready-made example states for the /demo page, so a presentation can jump
// straight to any feature instead of playing through whole conversations.
// They are written in the same shapes the real pages save, and opening them
// makes no AI or voice calls. Only the play buttons on the pages use credit.

import type { ConversationProgress, Feedback, Profile, Scenario, Turn } from "./types";

const feedback = (f: Omit<Feedback, "usedHint"> & { usedHint?: boolean }): Feedback => ({ usedHint: false, ...f });

/** Progress with a bit of everything, so the progress panel has something to show. */
export const demoProgress: ConversationProgress = {
  results: [
    { emotion: "happy", fit: "in_tune", usedHint: false },
    { emotion: "happy", fit: "in_tune", usedHint: false, toneFit: "in_tune" },
    { emotion: "sad", fit: "partly", usedHint: true },
    { emotion: "sad", fit: "in_tune", usedHint: false, toneFit: "partly" },
    { emotion: "sad", fit: "in_tune", usedHint: false, toneFit: "in_tune" },
    { emotion: "angry", fit: "missed", usedHint: false },
    { emotion: "angry", fit: "missed", usedHint: true },
    { emotion: "angry", fit: "partly", usedHint: false },
    { emotion: "afraid", fit: "missed", usedHint: false },
    { emotion: "afraid", fit: "in_tune", usedHint: false, toneFit: "partly" },
    { emotion: "afraid", fit: "in_tune", usedHint: false, toneFit: "in_tune" },
    { emotion: "neutral", fit: "partly", usedHint: false },
    { emotion: "sarcastic", fit: "missed", usedHint: false },
    { emotion: "frustrated", fit: "in_tune", usedHint: false },
    { emotion: "relieved", fit: "in_tune", usedHint: false, toneFit: "in_tune" },
  ],
  stepIns: { copied: 1, skipped: 1 },
};

/** Mid-scene, with a hint showing, waiting for the next reply. */
export const demoMidScene: Scenario = {
  id: "demo-mid-scene",
  title: "After the interview",
  characterName: "Sam",
  emotion: "sad",
  length: "quick",
  emotionSet: "basics",
  exchanges: 1,
  done: false,
  turns: [
    { role: "narrator", text: "Your friend Sam has just come back from a job interview. Sam sits down next to you and puts their bag on the floor." },
    { role: "character", text: "I don't think it went very well.", emotion: "sad" },
    { role: "user", text: "Oh no, what happened?" },
    {
      role: "feedback",
      feedback: feedback({
        fit: "in_tune",
        feeling: "sad",
        cues: ["quiet, low voice", "the words 'not very well'"],
        wentWell: "You asked what happened, which showed Sam you wanted to hear about it.",
        tryThis: "You could also name the feeling, like saying that sounds disappointing.",
        exampleReply: "Oh no, that sounds disappointing. What happened?",
      }),
    },
    { role: "character", text: "I just kept forgetting what I wanted to say. My mind went completely blank.", emotion: "sad" },
    { role: "hint", level: 1, text: "Listen to how Sam's voice drops at the end, and to the words 'completely blank'." },
  ],
};

/** Two misses in a row: the scene is paused and a step-in waits to be copied. */
export const demoStepIn: Scenario = {
  id: "demo-step-in",
  title: "The group chat",
  characterName: "Jordan",
  emotion: "angry",
  length: "medium",
  emotionSet: "basics",
  exchanges: 2,
  done: false,
  turns: [
    { role: "narrator", text: "You're sitting with your friend Jordan, who has just looked up from their phone." },
    { role: "character", text: "Can't believe they made the plans without me. Again.", emotion: "angry" },
    { role: "user", text: "lol ok" },
    {
      role: "feedback",
      feedback: feedback({
        fit: "missed",
        feeling: "angry",
        cues: ["the word 'again'", "short, clipped sentences"],
        wentWell: "You answered straight away.",
        tryThis: "Take the problem seriously before joking.",
        exampleReply: "That's really annoying. Being left out like that isn't fair.",
      }),
    },
    { role: "character", text: "Yeah, really funny. Apparently nobody thought to ask me.", emotion: "angry" },
    { role: "user", text: "whatever, it's just a chat" },
    {
      role: "feedback",
      feedback: feedback({
        fit: "missed",
        feeling: "angry",
        cues: ["'really funny' said flatly", "the word 'apparently'"],
        wentWell: "You kept the conversation going.",
        tryThis: "Acknowledge how left out Jordan feels instead of brushing it off.",
        exampleReply: "That sounds really frustrating. Being left out like that isn't fair.",
      }),
    },
    {
      role: "practice",
      intro: "Let's pause for a moment. Jordan seems angry. Here's one way you could reply. Listen, then say it back the same way.",
      line: "That sounds really frustrating. Being left out like that isn't fair.",
      delivery: "calm, even and warm",
      feeling: "angry",
      tries: 0,
      outcome: "pending",
      heldLine: { text: "Right. Thanks for the support.", emotion: "angry" },
    },
  ],
};

/** A finished conversation: the review, tone feedback, "Hear it in your voice" and a practised line. */
export const demoReview: Scenario = {
  id: "demo-review",
  title: "The night before the swim",
  characterName: "Robin",
  emotion: "afraid",
  length: "quick",
  emotionSet: "basics",
  exchanges: 3,
  done: true,
  turns: [
    { role: "narrator", text: "Your friend Robin has signed up for a charity swim across the lake this Saturday. You've met for coffee on Thursday afternoon." },
    { role: "character", text: "So I went down to look at the lake yesterday. It's a lot wider than I remembered.", emotion: "afraid" },
    { role: "user", text: "Oh, ok. What do you want for dinner?" },
    {
      role: "feedback",
      feedback: feedback({
        fit: "missed",
        feeling: "afraid",
        cues: ["'a lot wider than I remembered'", "going to look at the lake early", "a quick, tight voice"],
        wentWell: "You answered Robin straight away.",
        tryThis: "Before changing the subject, say something about what Robin just told you.",
        exampleReply: "That sounds a bit scary to see up close. Are you nervous about Saturday?",
      }),
    },
    { role: "character", text: "Oh. Um, anything is fine. I guess I just thought you'd say something about the swim.", emotion: "sad" },
    { role: "user", text: "Wait, are you alright? You sound a bit off." },
    {
      role: "feedback",
      feedback: feedback({
        fit: "in_tune",
        feeling: "sad",
        cues: ["the hesitant 'oh, um'", "'I just thought you'd say something'"],
        wentWell: "You noticed Robin sounded off and asked about it directly.",
        tryThis: "You could also mention the swim, since that's what is on Robin's mind.",
        exampleReply: "Sorry, I changed the subject. Is the swim worrying you?",
        tone: {
          fit: "partly",
          heard: "seemed quick and a little louder than usual",
          tip: "Try slowing down and softening your voice, so Robin feels calmer.",
          better: "softer, slower and calm",
        },
      }),
    },
    { role: "character", text: "Yeah, sort of. What if I get halfway and can't make it back?", emotion: "afraid" },
    { role: "user", text: "That makes sense. There'll be boats out there the whole time, so you won't be on your own." },
    {
      role: "feedback",
      feedback: feedback({
        fit: "in_tune",
        feeling: "afraid",
        cues: ["'what if I can't make it back'", "a higher, quicker voice"],
        wentWell: "You said the worry made sense and reassured Robin about the exact thing they were scared of.",
        tryThis: "Keep doing this: name the worry, then reassure.",
        exampleReply: "That makes sense. There'll be boats the whole way, so you won't be on your own.",
        tone: { fit: "in_tune", heard: "seemed slow and steady", tip: "Your calm voice really helped here. Keep it up.", better: null },
      }),
    },
    {
      role: "wrapup",
      text: "Robin was nervous about the swim the whole way through, and felt a bit hurt when the subject changed. Once you noticed Robin sounded off, you got it right, and your reassurance about the boats was exactly what Robin needed. Next time, respond to the worry before changing the subject. Your calm voice at the end helped too.",
    },
  ],
};

/** A finished deeper-emotions conversation: sarcasm, taken literally, then read correctly. */
export const demoSarcasm: Scenario = {
  id: "demo-sarcasm",
  title: "The printer again",
  characterName: "Chris",
  emotion: "sarcastic",
  length: "quick",
  emotionSet: "both",
  exchanges: 3,
  done: true,
  turns: [
    { role: "narrator", text: "You share an office with Chris. Chris has just come back from the printer holding a crumpled sheet of paper." },
    { role: "character", text: "Printer's jammed again. Perfect timing, really.", emotion: "sarcastic" },
    { role: "user", text: "Oh good, glad it's working!" },
    {
      role: "feedback",
      feedback: feedback({
        fit: "missed",
        feeling: "sarcastic",
        cues: ["'perfect timing' said flatly", "a jam right before a meeting", "a dry, flat voice"],
        wentWell: "You replied quickly and kept things friendly.",
        tryThis: "When the words sound nicer than the situation, answer the real feeling behind them.",
        exampleReply: "Ugh, again? That's so annoying. Want me to take a look?",
      }),
    },
    { role: "character", text: "Working? It's eaten my handout. The meeting's in five minutes.", emotion: "frustrated" },
    { role: "user", text: "Oh no, that's really annoying. Want me to try fixing it?" },
    {
      role: "feedback",
      feedback: feedback({
        fit: "in_tune",
        feeling: "frustrated",
        cues: ["'it's eaten my handout'", "a tense, clipped voice"],
        wentWell: "You named how annoying it was and offered real help.",
        tryThis: "Keep doing this.",
        exampleReply: "Oh no, that's so annoying. Want me to try fixing it?",
      }),
    },
    { role: "character", text: "Would you? Thanks, that'd be a lifesaver.", emotion: "relieved" },
    { role: "user", text: "Of course, let's have a look." },
    {
      role: "feedback",
      feedback: feedback({
        fit: "in_tune",
        feeling: "relieved",
        cues: ["'that'd be a lifesaver'", "a warmer, slower voice"],
        wentWell: "You followed through straight away, which matched Chris's relief.",
        tryThis: "You could share the relief too, like saying you're glad it's sorted.",
        exampleReply: "Of course! Let's sort it before your meeting.",
      }),
    },
    {
      role: "wrapup",
      text: "Chris was being sarcastic at first: saying 'perfect timing' while really being fed up. Taking it literally didn't land, but once you named how annoying it was and offered help, Chris relaxed and was relieved. The trick is noticing when the words are nicer than the situation.",
    },
  ],
};

/** Quickfire part-way through, with deeper emotions on and a sarcastic sentence waiting. */
export const demoQuickfire: { history: Turn[]; profile: Profile } = {
  history: [
    {
      role: "ai",
      segments: [
        { text: "Hi, I'll say a sentence, and you tap the emotion you hear.", emotion: "neutral", example: false },
        { text: "I just found out I got the job!", emotion: "happy", example: true },
        { text: "Which emotion did that sound like?", emotion: "neutral", example: false },
      ],
    },
    { role: "user", text: "Happy" },
    {
      role: "ai",
      segments: [
        { text: "Yes, that was happy. Now a harder one. The words are fine, so listen to the voice.", emotion: "neutral", example: false },
        { text: "Yeah, that went really well.", emotion: "sarcastic", example: true },
        { text: "Which emotion did that sound like?", emotion: "neutral", example: false },
      ],
    },
  ],
  profile: {
    attempts: [
      { emotion: "happy", kind: "both", phrase: "We won the trip!", recognised: true, heardAs: "Happy" },
      { emotion: "sad", kind: "both", phrase: "I'll miss you.", recognised: true, heardAs: "Sad" },
      { emotion: "sad", kind: "tone", phrase: "I'll be home late tonight.", recognised: true, heardAs: "Sad" },
      { emotion: "angry", kind: "tone", phrase: "The meeting is at three.", recognised: false, heardAs: "Afraid" },
      { emotion: "afraid", kind: "both", phrase: "Someone's at the door.", recognised: true, heardAs: "Afraid" },
      { emotion: "afraid", kind: "tone", phrase: "The lights just went off.", recognised: true, heardAs: "Afraid" },
      { emotion: "happy", kind: "both", phrase: "I just found out I got the job!", recognised: true, heardAs: "Happy" },
    ],
  },
};

// The demo page sets this just before opening a saved conversation, so the
// conversation page opens straight into it instead of asking "Resume?".
const OPEN_DIRECTLY_KEY = "interprettime:demo-open-directly";

export function markOpenDirectly(): void {
  try {
    window.sessionStorage.setItem(OPEN_DIRECTLY_KEY, "1");
  } catch {
    // Without it, the page just asks to resume first.
  }
}

export function opensDirectly(): boolean {
  try {
    return window.sessionStorage.getItem(OPEN_DIRECTLY_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearOpenDirectly(): void {
  try {
    window.sessionStorage.removeItem(OPEN_DIRECTLY_KEY);
  } catch {
    // Nothing to clear.
  }
}
