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
    question: 'How long does a session last?',
    answer: 'Each session ends automatically after 10 minutes; choose Start again to continue.',
  },
  {
    "question": "How do I start a conversation?",
    "answer": "Choose Practice Mandarin and allow microphone access when your browser asks. Speak in Mandarin or ask for English guidance. You can mute the microphone or end the conversation with the voice controls."
  },
  {
    "question": "What should I say?",
    "answer": "Tell the coach your level and goal, for example: “I am a beginner. Help me introduce myself in Mandarin.” The coach guides you in English, gives a short Chinese phrase and its English meaning, then invites you to try."
  },
  {
    "question": "Will the coach switch entirely to Chinese?",
    "answer": "English remains the default for instructions, corrections, encouragement and summaries throughout the lesson. Answering in Chinese or asking for harder practice does not switch the lesson to Mandarin-only. Ask explicitly for immersion if you want it; say “I do not understand” or “English, please” to return to English guidance immediately."
  },
  {
    "question": "How do I use the Phrasebook?",
    "answer": "Open Phrasebook in the header to read Chinese characters, pinyin and English meanings. Topic tabs are reading aids; tell the coach by voice to change the topic or difficulty. Pinyin is for reading and is not spoken aloud."
  },
  {
    "question": "Can it grade my pronunciation or save my progress?",
    "answer": "Feedback uses recognized text, not acoustic analysis. The coach can model a standard phrase and help with expressions, but cannot score pronunciation, tones or accent, certify proficiency or save progress across sessions."
  },
  {
    "question": "Can I change what I said?",
    "answer": "Yes. Tell the assistant which detail to correct, ask it to repeat or clarify an answer, or request a verbal recap. Details are used within the current conversation; this demo does not save business results or remember them across sessions."
  },
  {
    "question": "What if my microphone does not work?",
    "answer": "Check that microphone access is allowed for this page and that the correct input device is selected in your browser or system settings. Make sure the microphone is not muted, then try Practice Mandarin again."
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
