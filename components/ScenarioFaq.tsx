'use client';

import { ChevronDown } from 'lucide-react';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const questions = [
  {
    "question": "How long does a session last?",
    "answer": "Each session ends automatically after 10 minutes; choose Start again to continue."
  },
  {
    "question": "How do I start a conversation?",
    "answer": "Select Spanish, French, German, Portuguese, Japanese or Korean, pick a lesson, choose Start practice and allow microphone access. The coach teaches the lesson you picked. You can mute or end the conversation with the voice controls."
  },
  {
    "question": "What should I say?",
    "answer": "Yes, I’m ready. Please go slowly."
  },
  {
    "question": "Can I try immersion or switch languages or lessons?",
    "answer": "Ask for immersion in the selected language. Say “English, please” to restore English guidance. Start a new practice to select a different language or lesson."
  },
  {
    "question": "How do I use the Phrasebook?",
    "answer": "Open Phrasebook for the selected lesson’s vocabulary, usage point and model dialogue with English meanings. Japanese and Korean include a romanized reading aid. Ask the coach by voice to simplify or increase difficulty."
  },
  {
    "question": "Can it grade my pronunciation?",
    "answer": "No. Feedback uses recognized text, not acoustic analysis. The coach helps with vocabulary and grammar but cannot score pronunciation or certify a CEFR level. Saved progress is practice history, not a grade."
  },
  {
    "question": "What is saved, and how do I continue on another device?",
    "answer": "The lessons you practice, their dates, your turn counts and the lessons you mark complete are saved without an account. Transcripts and audio are not saved by this app. Open Saved progress on the start page to see your learner code, enter a code from another device, or delete your saved progress. Keep the code private: anyone with it can see and change that progress."
  },
  {
    "question": "Can I change what I said?",
    "answer": "Yes. Correct a detail, ask for clarification or request a verbal recap. Details you say stay in the current conversation; only practice history is saved."
  },
  {
    "question": "What if my microphone does not work?",
    "answer": "Check microphone permission, your selected input device and mute status, then try Start practice again."
  }
];

export function ScenarioFaq() {
  return (
    <DialogContent className="demo-inspector demo-faq-drawer">
      <DialogHeader className="demo-faq-heading">
        <DialogTitle>Frequently asked questions</DialogTitle>
        <DialogDescription>How to get started, what to ask, and what to expect.</DialogDescription>
      </DialogHeader>
      <div className="demo-faq-list">
        {questions.map(({ question, answer }) => (
          <details className="demo-faq-item" key={question}>
            <summary>
              <span>{question}</span>
              <ChevronDown className="demo-faq-chevron" size={16} aria-hidden="true" />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </DialogContent>
  );
}
