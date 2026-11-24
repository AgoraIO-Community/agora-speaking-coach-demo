'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import type { LessonId, PracticeLanguage } from '@/lib/lessons';
import { LessonGuide } from './LessonPreview';
import type { ScenarioPresentation } from '@/lib/presentation';

export function ScenarioIdentity({
  scenario,
  language,
  lessonId,
  onBuild,
}: {
  scenario: ScenarioPresentation;
  language: PracticeLanguage;
  lessonId: LessonId;
  onBuild: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    const shell = header?.closest<HTMLElement>('.demo-shell');
    if (!header || !shell) return;
    const update = () =>
      shell.style.setProperty(
        '--demo-header-bottom',
        `${Math.ceil(header.getBoundingClientRect().bottom + window.scrollY)}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(header);
    update();
    return () => {
      observer.disconnect();
      shell.style.removeProperty('--demo-header-bottom');
    };
  }, []);
  return (
    <header ref={headerRef} className="demo-header">
      <a className="demo-skip" href="#main-content">
        Skip to main content
      </a>
      <div className="demo-brand-group">
        <a
          className="demo-brand"
          href="https://www.agora.io/en/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Agora website (opens in a new tab)"
        >
          <Image
            src="/agora-logo.svg"
            alt="Agora"
            width={92}
            height={32}
            priority
          />
        </a>
        <div className="demo-identity">
          <h1>{scenario.name}</h1>
          <p>{scenario.purpose}</p>
        </div>
      </div>
      <nav className="demo-header-actions" aria-label="Practice and build">
        <LessonGuide language={language} lessonId={lessonId} />
        <Button size="sm" className="demo-header-cta" onClick={onBuild}>
          Build Now
        </Button>
      </nav>
    </header>
  );
}
