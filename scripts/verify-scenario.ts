import { getConversationContext } from '../lib/prompt-context';
import { getScenarioConfig, getScenarioPrompt } from '../lib/agent-config';
import assert from 'node:assert/strict';
import { getScenarioTools } from '../lib/agent-tools';
import { getScenarioPresentation } from '../lib/presentation';
import { PRACTICE_LANGUAGES, getLessons, getLessonContext } from '../lib/lessons';
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
for (const { id, name, voice } of PRACTICE_LANGUAGES) {
  const localizedPrompt = getScenarioPrompt(config.id, id);
  assert.ok(localizedPrompt.includes(`# Bundled ${name} teaching material`));
  assert.ok(getScenarioConfig(id).greeting.includes(name));
  const lessons = getLessons(id);
  assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, 3);
  for (const lesson of lessons) {
    assert.equal(lesson.phrases.length, 3);
    for (const { expression, english } of lesson.phrases) {
      assert.ok(expression && english);
      assert.ok(getLessonContext(id).includes(expression));
      assert.ok(localizedPrompt.includes(expression) && localizedPrompt.includes(english));
    }
  }
  const synthesis = new MiniMaxTTS({ model: RUNTIME_PROFILE.synthesis.model, voiceId: voice }).toConfig();
  assert.deepEqual(synthesis.params?.voice_setting, { voice_id: voice });
}
const recognition = new DeepgramSTT({ model: RUNTIME_PROFILE.recognition.model, language: RUNTIME_PROFILE.recognition.language }).toConfig();
assert.equal(recognition.params?.language, 'multi');
assert.match(getScenarioPresentation().boundaryShort, /No pronunciation scores or saved learning progress/);
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
