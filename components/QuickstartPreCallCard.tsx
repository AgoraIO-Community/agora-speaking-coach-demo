'use client';

import { Loader2, Mic } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import type { ScenarioPresentation } from '@/lib/presentation';

import { PRACTICE_LANGUAGES, type LessonId, type PracticeLanguage } from '@/lib/lessons';
import { LessonChooser } from './LessonPreview';

export function QuickstartPreCallCard({
  scenario,
  isLoading,
  error,
  language,
  onLanguageChange,
  lessonId,
  onLessonChange,
  onStart,
}: {
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
                <span>{name}</span>
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
        />
      </div>
    </section>
  );
}
