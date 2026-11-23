'use client';

import { useState } from 'react';
import { getLessons, getPracticeLanguage, type PracticeLanguage } from '@/lib/lessons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

export function LessonGuide({ language }: { language: PracticeLanguage }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="Open phrasebook">Phrasebook</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="demo-lesson-dialog">
          <DialogHeader>
            <DialogTitle>{getPracticeLanguage(language).name} phrasebook</DialogTitle>
            <DialogDescription>Reading support for your conversation. You can open this during a call.</DialogDescription>
          </DialogHeader>
          <LessonPreview language={language} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LessonPreview({ language }: { language: PracticeLanguage }) {
  return (
    <section className="spanish-lessons" aria-label={`${getPracticeLanguage(language).name} practice material`}>
      <h3>Pick a conversation to try</h3>
      <p className="demo-note">Browse a topic, then tell your coach what you want to practice. These cards are reading aids, not saved progress.</p>
      <Tabs defaultValue="introductions">
        <TabsList variant="line" aria-label="Practice topics">
          <TabsTrigger value="introductions">Introductions</TabsTrigger>
          <TabsTrigger value="restaurant">Dining</TabsTrigger>
          <TabsTrigger value="workplace">At work</TabsTrigger>
        </TabsList>
        {getLessons(language).map((lesson) => (
          <TabsContent value={lesson.id} key={lesson.id}>
            <p className="demo-note">Try saying: “{lesson.request}”</p>
            <ul className="spanish-phrases">
              {lesson.phrases.map((phrase) => (
                <li key={phrase.expression}>
                  <strong lang={language}>{phrase.expression}</strong>
                  <span>{phrase.english}</span>
                </li>
              ))}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
