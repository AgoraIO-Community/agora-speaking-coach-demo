import { CURRICULUM, type LanguagePack, type LessonId, type Text } from './curriculum/skeleton';
import { es } from './curriculum/es';
import { fr } from './curriculum/fr';
import { de } from './curriculum/de';
import { pt } from './curriculum/pt';
import { ja } from './curriculum/ja';
import { ko } from './curriculum/ko';

export type { LessonId } from './curriculum/skeleton';

// To add a practice language, add one pack file in lib/curriculum and register
// it here. The picker, lesson chooser, phrasebook, prompt, greeting, voice and
// request validation all derive from this list.
export const PRACTICE_LANGUAGES = [es, fr, de, pt, ja, ko] as const;

export type PracticeLanguage = (typeof PRACTICE_LANGUAGES)[number]['id'];
export const DEFAULT_PRACTICE_LANGUAGE: PracticeLanguage = 'es';

export function isPracticeLanguage(value: unknown): value is PracticeLanguage {
  return PRACTICE_LANGUAGES.some(({ id }) => id === value);
}

export function getPracticeLanguage(language: PracticeLanguage): LanguagePack {
  return PRACTICE_LANGUAGES.find(({ id }) => id === language)!;
}

const LESSON_SKELETONS = CURRICULUM.flatMap((level) =>
  level.units.flatMap((unit) => unit.lessons.map((lesson) => ({ level, unit, lesson }))),
);

export const DEFAULT_LESSON_ID: LessonId = LESSON_SKELETONS[0].lesson.id;

export function isLessonId(value: unknown): value is LessonId {
  return LESSON_SKELETONS.some(({ lesson }) => lesson.id === value);
}

/** A target-language expression with its English meaning and optional reading aid. */
export type Phrase = { expression: string; reading?: string; english: string };

function phrase(text: Text, english: string): Phrase {
  return typeof text === 'string' ? { expression: text, english } : { expression: text.text, reading: text.reading, english };
}

/** One lesson with the shared English skeleton and a language pack merged. */
export function getLesson(language: PracticeLanguage, lessonId: LessonId = DEFAULT_LESSON_ID) {
  const { name, lessons } = getPracticeLanguage(language);
  const index = LESSON_SKELETONS.findIndex(({ lesson }) => lesson.id === lessonId);
  const { level, unit, lesson } = LESSON_SKELETONS[index];
  const pack = lessons[lessonId];
  const next = LESSON_SKELETONS[index + 1]?.lesson;
  return {
    id: lesson.id,
    title: lesson.title,
    level: level.title,
    unit: unit.title,
    objective: lesson.objective,
    setting: lesson.setting(name),
    vocabulary: lesson.vocabulary.map((english, i) => phrase(pack.vocabulary[i], english)),
    dialogue: lesson.dialogue.map((english, i) => ({
      speaker: i % 2 === 0 ? lesson.partner : 'You',
      ...phrase(pack.dialogue[i], english),
    })),
    prompts: lesson.prompts.map((english, i) => phrase(pack.prompts[i], english)),
    grammar: {
      point: pack.grammar.point,
      examples: pack.grammar.examples.map(({ text, english }) => phrase(text, english)),
    },
    errors: pack.errors,
    next: next ? { id: next.id, title: next.title, objective: next.objective } : null,
  };
}

export type Lesson = ReturnType<typeof getLesson>;

/** Every lesson for a language, in curriculum order. */
export function getLessons(language: PracticeLanguage): Lesson[] {
  return LESSON_SKELETONS.map(({ lesson }) => getLesson(language, lesson.id));
}

/** Levels, units and lessons for the lesson chooser. */
export function getCurriculum(language: PracticeLanguage) {
  return CURRICULUM.map((level) => ({
    id: level.id,
    title: level.title,
    units: level.units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      lessons: unit.lessons.map((lesson) => getLesson(language, lesson.id)),
    })),
  }));
}

const line = ({ expression, english }: Phrase) => `${expression} | Meaning: ${english}`;

/** Prompt material for the selected lesson only; readings are never sent to the coach. */
export function getLessonContext(
  language: PracticeLanguage = DEFAULT_PRACTICE_LANGUAGE,
  lessonId: LessonId = DEFAULT_LESSON_ID,
): string {
  const lesson = getLesson(language, lessonId);
  return [
    `## Lesson: ${lesson.title} (${lesson.level}, unit: ${lesson.unit})`,
    `Objective the learner works toward: ${lesson.objective}`,
    `Role-play setting: ${lesson.setting}`,
    '## Target vocabulary',
    ...lesson.vocabulary.map(line),
    '## Grammar or usage point',
    lesson.grammar.point,
    ...lesson.grammar.examples.map(line),
    '## Model dialogue (an example, not a script to read aloud)',
    ...lesson.dialogue.map((turn) => `${turn.speaker}: ${line(turn)}`),
    '## Questions you can ask',
    ...lesson.prompts.map(line),
    '## Common errors (illustrative ONLY, not actual learner responses)',
    ...lesson.errors.map((error) => JSON.stringify(error)),
    '## Next lesson',
    lesson.next
      ? `${lesson.next.title}. Objective: ${lesson.next.objective}`
      : 'This is the last lesson in the curriculum.',
  ].join('\n');
}
