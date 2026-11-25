import { CURRICULUM, NAME_PLACEHOLDER, type LanguagePack, type LessonId, type Text } from './curriculum/skeleton';
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

/** True when the lesson's flag in the curriculum skeleton says it practices the learner's own name. */
export function lessonTakesLearnerName(lessonId: LessonId): boolean {
  const lesson = LESSON_SKELETONS.find((entry) => entry.lesson.id === lessonId)?.lesson;
  return Boolean(lesson && 'takesLearnerName' in lesson && lesson.takesLearnerName);
}

export const LEARNER_NAME_MAX_LENGTH = 40;

/**
 * Reduces learner-typed text to a short single-line name: letters, marks,
 * digits, spaces and name punctuation only. Control characters, line breaks,
 * quotes and other symbols are dropped so the value cannot shape the prompt.
 * Returns null when nothing usable is left. The name is never transliterated.
 */
export function sanitizeLearnerName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N} '’.\-・·]/gu, ' ')
    .replace(/ +/g, ' ')
    .trim();
  const name = Array.from(cleaned).slice(0, LEARNER_NAME_MAX_LENGTH).join('').trim();
  return /[\p{L}\p{N}]/u.test(name) ? name : null;
}

/** A target-language expression with its English meaning and optional reading aid. */
export type Phrase = { expression: string; reading?: string; english: string };

/**
 * One lesson with the shared English skeleton and a language pack merged.
 *
 * For a lesson flagged takesLearnerName, every {name} placeholder (target
 * text, reading aid, English meaning and error fixtures) shows the sanitized
 * learnerName as typed, or the lesson's sample name when none is given. The
 * landing page, Phrasebook, practice summary and coaching prompt all read the
 * lesson through here, so they always agree.
 */
export function getLesson(language: PracticeLanguage, lessonId: LessonId = DEFAULT_LESSON_ID, learnerName?: string | null) {
  const { name, lessons } = getPracticeLanguage(language);
  const index = LESSON_SKELETONS.findIndex(({ lesson }) => lesson.id === lessonId);
  const { level, unit, lesson } = LESSON_SKELETONS[index];
  const pack = lessons[lessonId];
  const typed = lessonTakesLearnerName(lessonId) ? sanitizeLearnerName(learnerName) : null;
  const sample = pack.sampleName ?? '';
  const names = {
    english: typed ?? ('sampleName' in lesson ? lesson.sampleName : ''),
    text: typed ?? (typeof sample === 'string' ? sample : sample.text),
    reading: typed ?? (typeof sample === 'string' ? sample : sample.reading),
  };
  const fill = (value: string, as: keyof typeof names) => value.replaceAll(NAME_PLACEHOLDER, names[as]);
  const phrase = (text: Text, english: string): Phrase =>
    typeof text === 'string'
      ? { expression: fill(text, 'text'), english: fill(english, 'english') }
      : { expression: fill(text.text, 'text'), reading: fill(text.reading, 'reading'), english: fill(english, 'english') };
  const next = LESSON_SKELETONS[index + 1]?.lesson;
  return {
    id: lesson.id,
    title: lesson.title,
    level: level.title,
    unit: unit.title,
    objective: lesson.objective,
    setting: lesson.setting(name),
    takesLearnerName: lessonTakesLearnerName(lesson.id),
    vocabulary: lesson.vocabulary.map((english, i) => phrase(pack.vocabulary[i], english)),
    dialogue: lesson.dialogue.map((english, i) => ({
      speaker: i % 2 === 0 ? lesson.partner : 'You',
      ...phrase(pack.dialogue[i], english),
    })),
    prompts: lesson.prompts.map((english, i) => phrase(pack.prompts[i], english)),
    grammar: {
      point: fill(pack.grammar.point, 'text'),
      examples: pack.grammar.examples.map(({ text, english }) => phrase(text, english)),
    },
    errors: pack.errors.map(({ learner, alternative, explanation }) => ({
      learner: fill(learner, 'text'),
      alternative: fill(alternative, 'text'),
      explanation,
    })),
    /** The name shown in this lesson's phrases: the learner's, else the sample; null when the lesson has none. */
    practiceName: lessonTakesLearnerName(lessonId) ? names.text : null,
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

/** ARES accepts up to 128 keywords; a lesson supplies far fewer. */
export const RECOGNITION_TERM_LIMIT = 64;

/**
 * Recognition keywords for one session: the selected lesson's target-language
 * phrases (vocabulary, model dialogue, questions and grammar examples) without
 * sentence punctuation, showing the learner's practice name where the lesson
 * has one. Error fixtures are never included. The recognizer is nudged toward
 * these phrases, so a transcript can show the expected phrase when the learner
 * was only close to it.
 */
export function getRecognitionTerms(
  language: PracticeLanguage,
  lessonId: LessonId = DEFAULT_LESSON_ID,
  learnerName?: string | null,
): string[] {
  const lesson = getLesson(language, lessonId, learnerName);
  const terms = [...lesson.vocabulary, ...lesson.dialogue, ...lesson.prompts, ...lesson.grammar.examples]
    .map(({ expression }) => expression.replace(/[¿?¡!.,;:、。？！]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return [...new Set(terms)].slice(0, RECOGNITION_TERM_LIMIT);
}

const line = ({ expression, english }: Phrase) => `${expression} | Meaning: ${english}`;

/** Prompt material for the selected lesson only; readings are never sent to the coach. */
export function getLessonContext(
  language: PracticeLanguage = DEFAULT_PRACTICE_LANGUAGE,
  lessonId: LessonId = DEFAULT_LESSON_ID,
  learnerName?: string | null,
): string {
  const lesson = getLesson(language, lessonId, learnerName);
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
