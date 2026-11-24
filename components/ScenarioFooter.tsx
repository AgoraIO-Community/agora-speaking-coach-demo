'use client';

import { Button } from './ui/button';
import { DialogTrigger } from './ui/dialog';
import type { ScenarioPresentation } from '@/lib/presentation';

// Secondary tools live here so the header keeps the scenario identity and one
// call to action. The FAQ trigger relies on the Dialog root in LandingPage.
export function ScenarioFooter({
  scenario,
  onInspect,
}: {
  scenario: ScenarioPresentation;
  onInspect: () => void;
}) {
  return (
    <footer className="demo-footer">
      <div className="demo-built-with">
        <span>Built with</span>
        <ul aria-label="Technology stack">
          {scenario.builtWith.map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>
      </div>
      <nav className="demo-footer-actions" aria-label="Demo tools">
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Open FAQ" title="FAQ">
            FAQ
          </Button>
        </DialogTrigger>
        <Button
          variant="ghost"
          size="sm"
          onClick={onInspect}
          aria-label="Open Inspector"
          title="Inspector"
        >
          Inspector
        </Button>
      </nav>
    </footer>
  );
}
