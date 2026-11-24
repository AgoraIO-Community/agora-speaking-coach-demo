import { getConversationContext } from '../lib/prompt-context';
import { getScenarioConfig, getScenarioPrompt } from '../lib/agent-config';
import assert from 'node:assert/strict';
import { getScenarioTools } from '../lib/agent-tools';
import { getScenarioPresentation } from '../lib/presentation';
import { DEFAULT_LESSON_ID, PRACTICE_LANGUAGES, getCurriculum, getLessons, getLessonContext, isLessonId } from '../lib/lessons';
import { RUNTIME_PROFILE } from '../lib/runtime-profile';
import { DeepgramSTT, MiniMaxTTS } from 'agora-agents';
const config = getScenarioConfig();
if (config.id !== '06-speaking-coach') throw new Error(`Expected 06-speaking-coach, got ${config.id}`);
for (const field of ['role', 'workflow', 'guardrails']) { if (!config[field as keyof typeof config]) throw new Error(`Missing ${field}`); }
if (!getScenarioPrompt().includes('# Goal and conversation flow')) throw new Error('Scenario prompt was not formatted');
assert.deepEqual(getScenarioTools(), [], 'The generic starter must not register business actions.');
assert.equal(getScenarioPresentation().id, config.id, 'Presentation and Agent must identify the same demo.');
const prompt = getScenarioPrompt();
assert.match(prompt, /English-speaking learners/);
assert.match(prompt, /Do not score or assess pronunciation, accent/);
assert.match(prompt, /Do not invent learner utterances/);
assert.match(prompt, /at most one useful vocabulary or grammar correction/);
assert.match(prompt, /one strength, up to two improvements grounded in actual learner turns/);
assert.match(prompt, /Ask for repetition when recognition is unclear/);
assert.match(prompt, /change topic, simplify or increase difficulty/);
assert.match(prompt, /Spanish-only role-play only after an explicit request/);
assert.match(prompt, /Do not invent a score, CEFR level or lesson completion/);
assert.match(prompt, /do not ask for a level or topic first/);
assert.match(prompt, /do not read romanization/);
assert.equal(isLessonId(DEFAULT_LESSON_ID), true);
assert.equal(isLessonId('not-a-lesson'), false);

// Curriculum: every language has the same lessons with complete material, and
// the prompt carries the selected lesson only.
const lessonIds = getLessons('es').map((lesson) => lesson.id);
assert.ok(lessonIds.length >= 4, 'The curriculum needs at least four lessons.');
assert.equal(new Set(lessonIds).size, lessonIds.length, 'Lesson ids must be unique.');
const NON_LATIN = /[Ͱ-Ͽऀ-ॿ぀-ヿ一-鿿가-힯]/;
for (const { id, name, voice, romanization } of PRACTICE_LANGUAGES) {
  const lessons = getLessons(id);
  assert.deepEqual(lessons.map((lesson) => lesson.id), lessonIds, `${name} must cover the same lessons in the same order.`);
  const units = getCurriculum(id).flatMap((level) => level.units);
  assert.ok(units.length >= 2 && units.every((unit) => unit.lessons.length >= 2), `${name} needs at least two units of two lessons.`);
  for (const lesson of lessons) {
    const label = `${name} / ${lesson.id}`;
    const localizedPrompt = getScenarioPrompt(config.id, id, lesson.id);
    assert.ok(localizedPrompt.includes(`# Bundled ${name} teaching material`));
    assert.ok(getScenarioConfig(id, lesson.id).greeting.includes(name), label);
    assert.ok(getScenarioConfig(id, lesson.id).greeting.includes(lesson.title), label);
    assert.ok(lesson.objective.startsWith('I can '), `${label}: objective must be a can-do statement.`);
    assert.ok(lesson.setting.includes(name), label);
    assert.equal(lesson.vocabulary.length, 5, label);
    assert.equal(lesson.dialogue.length, 4, label);
    assert.equal(lesson.prompts.length, 2, label);
    assert.ok(lesson.grammar.point && lesson.grammar.examples.length >= 1 && lesson.grammar.examples.length <= 2, label);
    assert.equal(lesson.errors.length, 2, label);
    for (const { learner, alternative, explanation } of lesson.errors) {
      assert.ok(learner && alternative && explanation && learner !== alternative, label);
      assert.ok(localizedPrompt.includes(alternative), label);
    }
    const phrases = [...lesson.vocabulary, ...lesson.dialogue, ...lesson.prompts, ...lesson.grammar.examples];
    for (const { expression, english, reading } of phrases) {
      assert.ok(expression && english, label);
      assert.ok(getLessonContext(id, lesson.id).includes(expression), label);
      assert.ok(localizedPrompt.includes(expression) && localizedPrompt.includes(english), label);
      if (NON_LATIN.test(expression)) {
        assert.ok(romanization, `${name} uses a non-Latin script and must name its romanization system.`);
        assert.ok(reading && !NON_LATIN.test(reading), `${label}: "${expression}" needs a romanized reading aid.`);
        assert.ok(!localizedPrompt.includes(reading), `${label}: readings must not be sent to the coach.`);
      } else {
        assert.equal(reading, undefined, label);
      }
    }
    // Only the selected lesson is injected: no other lesson's vocabulary leaks in.
    const own = new Set(phrases.map((phrase) => phrase.expression));
    for (const other of lessons) {
      if (other.id === lesson.id) continue;
      for (const { expression } of other.vocabulary) {
        if (own.has(expression) || [...own].some((mine) => mine.includes(expression))) continue;
        assert.ok(!localizedPrompt.includes(expression), `${label}: prompt must not include "${expression}" from ${other.id}.`);
      }
      assert.ok(!localizedPrompt.includes(other.setting), `${label}: prompt must not include the ${other.id} setting.`);
    }
    assert.ok(lesson.next ? localizedPrompt.includes(lesson.next.objective) : localizedPrompt.includes('last lesson in the curriculum'), label);
  }
  const synthesis = new MiniMaxTTS({ model: RUNTIME_PROFILE.synthesis.model, voiceId: voice }).toConfig();
  assert.deepEqual(synthesis.params?.voice_setting, { voice_id: voice });
}
const recognition = new DeepgramSTT({ model: RUNTIME_PROFILE.recognition.model, language: RUNTIME_PROFILE.recognition.language }).toConfig();
assert.equal(recognition.params?.language, 'multi');
assert.match(getScenarioPresentation().boundaryShort, /No pronunciation scores or proficiency grades/);
assert.doesNotMatch(JSON.stringify([config, getScenarioPresentation()]), /it-support|FAQ|troubleshoot|printer|needs-human/i);
console.log(`Scenario config passed: ${config.id}`);

// Calendar regressions: U.S. dates can differ from UTC and offsets change with DST.
const localNight = getConversationContext('America/New_York', new Date('2026-11-05T02:30:00Z'));
assert.match(localNight, /Current local date: 2026-11-04/);
assert.match(localNight, /UTC-05:00/);
assert.match(getConversationContext('America/New_York', new Date('2026-03-08T06:30:00Z')), /UTC-05:00/);
assert.match(getConversationContext('America/New_York', new Date('2026-03-08T07:30:00Z')), /UTC-04:00/);
assert.match(getConversationContext('America/Chicago', new Date('2026-07-01T03:30:00Z')), /Current local date: 2026-06-30/);
assert.match(getConversationContext('America/New_York', new Date('2026-12-31T17:00:00Z')), /2027-01-01 Friday/);
assert.match(getConversationContext('America/New_York', new Date('2028-02-28T17:00:00Z')), /2028-02-29 Tuesday; 2028-03-01 Wednesday/);
console.log('Prompt local-date, DST and calendar regressions passed.');
