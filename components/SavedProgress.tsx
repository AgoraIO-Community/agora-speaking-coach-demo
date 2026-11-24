'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { progressActions, type SaveState } from '@/lib/progress/client';
import type { ProgressView } from '@/lib/progress/view';

/** Inline save feedback. A failed save is always visible and can be retried. */
export function SaveStatus({ save, error }: { save: SaveState; error: string | null }) {
  if (save === 'error') {
    return (
      <Alert variant="destructive" className="demo-save-status">
        <AlertDescription>
          Not saved yet: {error ?? 'progress could not be saved'}.
          <Button variant="outline" size="sm" className="mt-2" onClick={() => void progressActions.retry()}>
            Retry saving
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (save === 'idle') return null;
  return (
    <p className="demo-note" role="status">
      {save === 'saving' ? 'Saving…' : 'Saved to your practice history.'}
    </p>
  );
}

/**
 * Learner code, device switch and reset. Opens only on an explicit click and
 * never starts a session or asks for the microphone.
 */
export function SavedProgress({ view, save, error }: { view: ProgressView; save: SaveState; error: string | null }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const run = async (task: () => Promise<string | null>, success: string) => {
    setBusy(true);
    setMessage(null);
    const failure = await task();
    setBusy(false);
    setMessage(failure ? { kind: 'error', text: failure } : { kind: 'ok', text: success });
    return !failure;
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => { setMessage(null); setConfirmReset(false); setOpen(true); }}>
        Saved progress
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="demo-lesson-dialog demo-progress-dialog">
          <DialogHeader>
            <DialogTitle>Saved progress</DialogTitle>
            <DialogDescription>
              Practice history is saved without an account. It records lessons, dates and turn counts, not scores.
            </DialogDescription>
          </DialogHeader>

          <p className="demo-note">
            {view.logging
              ? `Conversation logging is on: the text of each finished conversation is saved with your progress (${view.conversations.length} stored, newest 20 kept for up to 90 days). Audio is never saved.`
              : 'Conversation logging is off: conversations are not stored, only the practice history above.'}
          </p>

          <section aria-labelledby="learner-code-heading">
            <h3 id="learner-code-heading">Your learner code</h3>
            {view.code ? (
              <>
                <p className="demo-learner-code">
                  <code>{view.code}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void navigator.clipboard?.writeText(view.code!).then(
                      () => setMessage({ kind: 'ok', text: 'Code copied.' }),
                      () => setMessage({ kind: 'error', text: 'Could not copy. Select the code and copy it manually.' }),
                    )}
                  >
                    Copy
                  </Button>
                </p>
                <p className="demo-note">
                  Enter this code on another device to continue there. Keep it private: anyone with the code can see and change this progress.
                </p>
              </>
            ) : (
              <>
                <p className="demo-note">
                  {view.saved
                    ? 'Show the code for the progress saved on this browser.'
                    : 'Nothing is saved yet. A code is created with your first practice, or you can create one now.'}
                </p>
                <Button variant="outline" size="sm" disabled={save === 'saving'} onClick={() => void progressActions.ensureCode()}>
                  {view.saved ? 'Show my code' : 'Create my learner code'}
                </Button>
              </>
            )}
          </section>

          <form
            aria-labelledby="switch-device-heading"
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => progressActions.redeem(code), 'This browser now uses that saved progress.').then((ok) => ok && setCode(''));
            }}
          >
            <h3 id="switch-device-heading">Continue from another device</h3>
            <label className="demo-code-entry">
              <span>Enter a learner code</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="ABCDE-FGHJK"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={24}
                className="h-10 w-full rounded-md border border-input bg-background px-3"
              />
            </label>
            <p className="demo-note">This replaces the progress shown on this browser with the progress for that code.</p>
            <Button type="submit" size="sm" disabled={busy || !code.trim()}>Use this code</Button>
          </form>

          <section aria-labelledby="reset-progress-heading">
            <h3 id="reset-progress-heading">Reset</h3>
            {confirmReset ? (
              <div className="demo-progress-actions">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(progressActions.reset, 'Saved progress deleted.').then(() => setConfirmReset(false))}
                >
                  Delete my saved progress
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" disabled={!view.saved} onClick={() => setConfirmReset(true)}>
                Reset my progress
              </Button>
            )}
            <p className="demo-note">Deletes the saved lessons, sessions and recorded corrections for this learner. This cannot be undone.</p>
          </section>

          {message ? (
            message.kind === 'error' ? (
              <Alert variant="destructive"><AlertDescription>{message.text}</AlertDescription></Alert>
            ) : (
              <p className="demo-note" role="status">{message.text}</p>
            )
          ) : null}
          <SaveStatus save={save === 'saved' ? 'idle' : save} error={error} />
        </DialogContent>
      </Dialog>
    </>
  );
}
