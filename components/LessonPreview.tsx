'use client';

import { useState } from 'react';
import {
  getCurriculum,
  getLesson,
  getPracticeLanguage,
  type LessonId,
  type Phrase,
  type PracticeLanguage,
} from '@/lib/lessons';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

function PhraseText({ phrase, language }: { phrase: Phrase; language: PracticeLanguage }) {
  return (
    <>
      <strong lang={language}>{phrase.expression}</strong>
      {phrase.reading ? (
        <em lang={`${language}-Latn`} className="demo-lesson-reading">{phrase.reading}</em>
      ) : null}
      <span>{phrase.english}</span>
    </>
  );
}

/** Reading material for one lesson: objective, vocabulary, usage point and model dialogue. */
export function LessonMaterial({
  language,
  lessonId,
  sections = ['vocabulary', 'grammar', 'dialogue'],
}: {
  language: PracticeLanguage;
  lessonId: LessonId;
  sections?: ('vocabulary' | 'grammar' | 'dialogue')[];
}) {
  const lesson = getLesson(language, lessonId);
  const { romanization } = getPracticeLanguage(language);
  return (
    <div className="demo-lesson-material">
      <p className="demo-lesson-objective">
        <span>Objective</span>
        {lesson.objective}
      </p>
      {romanization ? (
        <p className="demo-note">Reading aid: {romanization}.</p>
      ) : null}
      {sections.includes('vocabulary') ? (
        <>
          <h4>Vocabulary</h4>
          <ul className="demo-lesson-phrases">
            {lesson.vocabulary.map((phrase) => (
              <li key={phrase.expression}>
                <PhraseText phrase={phrase} language={language} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {sections.includes('grammar') ? (
        <>
          <h4>Usage point</h4>
          <p className="demo-lesson-point">{lesson.grammar.point}</p>
          <ul className="demo-lesson-phrases">
            {lesson.grammar.examples.map((phrase) => (
              <li key={phrase.expression}>
                <PhraseText phrase={phrase} language={language} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {sections.includes('dialogue') ? (
        <>
          <h4>Model dialogue</h4>
          <ol className="demo-lesson-phrases demo-lesson-dialogue">
            {lesson.dialogue.map((turn, index) => (
              <li key={index}>
                <small>{turn.speaker}</small>
                <PhraseText phrase={turn} language={language} />
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}

export function LessonGuide({ language, lessonId }: { language: PracticeLanguage; lessonId: LessonId }) {
  const [open, setOpen] = useState(false);
  const lesson = getLesson(language, lessonId);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="Open phrasebook">Phrasebook</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="demo-lesson-dialog">
          <DialogHeader>
            <DialogTitle>{getPracticeLanguage(language).name} phrasebook</DialogTitle>
            <DialogDescription>
              {lesson.title}. Reading support for the selected lesson; you can open this during a call.
            </DialogDescription>
          </DialogHeader>
          <LessonMaterial language={language} lessonId={lessonId} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Landing-page lesson chooser. The selected lesson is sent with the session start. */
export function LessonChooser({
  language,
  lessonId,
  disabled,
  onLessonChange,
}: {
  language: PracticeLanguage;
  lessonId: LessonId;
  disabled?: boolean;
  onLessonChange: (lessonId: LessonId) => void;
}) {
  const { name } = getPracticeLanguage(language);
  return (
    <section className="demo-lesson-chooser" aria-label={`${name} lessons`}>
      <fieldset className="demo-lesson-units" disabled={disabled}>
        <legend>Choose your lesson</legend>
        {getCurriculum(language).flatMap((level) =>
          level.units.map((unit) => (
            <div key={unit.id} className="demo-lesson-unit">
              <p>
                {level.title} · {unit.title}
              </p>
              {unit.lessons.map((lesson) => (
                <label key={lesson.id}>
                  <input
                    type="radio"
                    name="practice-lesson"
                    value={lesson.id}
                    checked={lessonId === lesson.id}
                    onChange={() => onLessonChange(lesson.id)}
                  />
                  <span>{lesson.title}</span>
                </label>
              ))}
            </div>
          )),
        )}
      </fieldset>
      <div
        className="demo-lesson-detail"
        tabIndex={0}
        role="region"
        aria-label="Selected lesson material"
      >
        <LessonMaterial language={language} lessonId={lessonId} sections={['vocabulary', 'dialogue']} />
      </div>
      <p className="demo-note">
        Your coach teaches the selected lesson. Nothing is saved between sessions.
      </p>
    </section>
  );
}
