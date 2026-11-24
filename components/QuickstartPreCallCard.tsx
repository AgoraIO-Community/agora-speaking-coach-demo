'use client';

import { Loader2, Mic } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import type { ScenarioPresentation } from '@/lib/presentation';

import { PRACTICE_LANGUAGES, getLesson, getLessons, getPracticeLanguage, type LessonId, type PracticeLanguage } from '@/lib/lessons';
import { LessonChooser } from './LessonPreview';
import { SavedProgress } from './SavedProgress';
import type { SaveState } from '@/lib/progress/client';
import { countCompleted, type ProgressView } from '@/lib/progress/view';

export function QuickstartPreCallCard({
  scenario,
  isLoading,
  error,
  language,
  onLanguageChange,
  lessonId,
  onLessonChange,
  progress,
  continueTarget,
  onContinue,
  onStart,
}: {
  progress: { view: ProgressView; save: SaveState; error: string | null };
  continueTarget: { language: PracticeLanguage; lessonId: LessonId } | null;
  onContinue: () => void;
  lessonId: LessonId;
  onLessonChange: (lessonId: LessonId) => void;
  scenario: ScenarioPresentation;
  isLoading: boolean;
  error: string | null;
  language: PracticeLanguage;
  onLanguageChange: (language: PracticeLanguage) => void;
  onStart: () => void;
}) {
  return (
    <section className="demo-welcome">
      <h2>{scenario.name}</h2>
      <p className="demo-lead">{scenario.summary}</p>
      <div className="demo-setup">
        <div className="demo-setup-start">
          <fieldset className="demo-practice-language" disabled={isLoading}>
            <legend>Choose your practice language</legend>
            {PRACTICE_LANGUAGES.map(({ id, name, nativeName }) => (
              <label key={id}>
                <input
                  type="radio"
                  name="practice-language"
                  value={id}
                  checked={language === id}
                  onChange={() => onLanguageChange(id)}
                />
                <strong lang={id}>{nativeName}</strong>
                <span>
                  {name}
                  {progress.view.languages[id]
                    ? ` · ${countCompleted(progress.view, id)}/${getLessons(id).length} complete`
                    : ''}
                </span>
              </label>
            ))}
          </fieldset>
          <Button
            size="lg"
            disabled={isLoading}
            aria-busy={isLoading}
            onClick={onStart}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Mic data-icon="inline-start" />
            )}
            {isLoading ? 'Connecting…' : scenario.startLabel}
          </Button>
          <div className="demo-progress-row">
            {continueTarget ? (
              continueTarget.language === language && continueTarget.lessonId === lessonId ? (
                <p className="demo-note" role="status">
                  Picking up where you left off: {getPracticeLanguage(language).name} · {getLesson(language, lessonId).title}
                </p>
              ) : (
                <Button variant="outline" size="sm" disabled={isLoading} onClick={onContinue}>
                  Continue: {getPracticeLanguage(continueTarget.language).name} · {getLesson(continueTarget.language, continueTarget.lessonId).title}
                </Button>
              )
            ) : null}
            <SavedProgress view={progress.view} save={progress.save} error={progress.error} />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <LessonChooser
          language={language}
          lessonId={lessonId}
          disabled={isLoading}
          onLessonChange={onLessonChange}
          progress={progress.view}
        />
      </div>
    </section>
  );
}
