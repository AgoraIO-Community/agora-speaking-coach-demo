'use client';

import { useState } from 'react';
import { lessons } from '@/lib/lessons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

export function LessonGuide() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="Open phrasebook">Phrasebook</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="demo-lesson-dialog">
          <DialogHeader>
            <DialogTitle>Mandarin phrasebook</DialogTitle>
            <DialogDescription>Reading support for your conversation. You can open this during a call.</DialogDescription>
          </DialogHeader>
          <LessonPreview />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LessonPreview() {
  return (
    <section className="mandarin-lessons" aria-label="Mandarin practice material">
      <h3>Pick a conversation to try</h3>
      <p className="demo-note">Browse a topic, then tell your coach what you want to practice. These cards are reading aids, not saved progress.</p>
      <Tabs defaultValue="introductions">
        <TabsList variant="line" aria-label="Practice topics">
          <TabsTrigger value="introductions">Introductions</TabsTrigger>
          <TabsTrigger value="restaurant">Dining</TabsTrigger>
          <TabsTrigger value="workplace">At work</TabsTrigger>
        </TabsList>
        {lessons.map((lesson) => (
          <TabsContent value={lesson.id} key={lesson.id}>
            <p className="demo-note">Try saying: “{lesson.request}”</p>
            <ul className="mandarin-phrases">
              {lesson.phrases.map((phrase) => (
                <li key={phrase.chinese}>
                  <strong lang="zh-Hans">{phrase.chinese}</strong>
                  <span lang="zh-Latn-pinyin">{phrase.pinyin}</span>
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
