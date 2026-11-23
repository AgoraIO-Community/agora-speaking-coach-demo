'use client';

import { Loader2, Mic } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import type { ScenarioPresentation } from '@/lib/presentation';

import { isPracticeLanguage, PRACTICE_LANGUAGES, type PracticeLanguage } from '@/lib/lessons';
import { LessonPreview } from './LessonPreview';

function ScenarioFeatures({ scenario }: { scenario: ScenarioPresentation }) {
  return (
    <>
      {scenario.features.length ? (
        <section
          className="demo-features"
          aria-label={scenario.featuresHeading}
        >
          <h3>
            <span className="demo-feature-comparison">
              {scenario.featuresHeading}
            </span>
          </h3>
          <ul>
            {scenario.features.map((feature) => (
              <li key={feature.title}>
                <span className="demo-feature-emoji" aria-hidden="true">
                  {feature.emoji}
                </span>
                {feature.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="demo-built-with">
        <span>Built with</span>
        <ul aria-label="Technology stack">
          {scenario.builtWith.map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function QuickstartPreCallCard({
  scenario,
  isLoading,
  error,
  language,
  onLanguageChange,
  onStart,
  onBuild,
}: {
  scenario: ScenarioPresentation;
  isLoading: boolean;
  error: string | null;
  language: PracticeLanguage;
  onLanguageChange: (language: PracticeLanguage) => void;
  onStart: () => void;
  onBuild: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <section className="demo-welcome">
      <h2>{scenario.name}</h2>
      <p className="demo-lead">{scenario.summary}</p>
      <ScenarioFeatures scenario={scenario} />
      <label className="demo-practice-language text-sm font-medium">
        Practice language
        <select
          className="h-11 rounded-md border border-input bg-background px-3 pr-8"
          value={language}
          disabled={isLoading}
          onChange={({ target: { value } }) => {
            if (isPracticeLanguage(value)) onLanguageChange(value);
          }}
        >
          {PRACTICE_LANGUAGES.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
      </label>
      <div className="demo-welcome-actions">
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
        <Button size="lg" variant="outline" onClick={onBuild}>Build Now</Button>
      </div>
      <p className="demo-note">Microphone access required. Sessions end automatically after 10 minutes.</p>
      <p className="demo-note">{scenario.boundaryShort}</p>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <LessonPreview language={language} />
    </section>
  );
}
