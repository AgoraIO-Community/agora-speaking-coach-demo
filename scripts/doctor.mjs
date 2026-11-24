import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, '.env.local');
const envExamplePath = path.join(projectRoot, 'env.local.example');

function fail(message) {
  console.error(message);
  process.exit(1);
}

const majorVersion = Number.parseInt(process.versions.node.split('.')[0], 10);
if (Number.isNaN(majorVersion) || majorVersion !== 24) {
  fail(`Node.js 24 is required. Current version: ${process.versions.node}`);
}

if (!process.env.npm_config_user_agent?.includes('pnpm')) {
  fail('Run this repo with pnpm so installs and scripts stay consistent.');
}

if (!fs.existsSync(envExamplePath)) {
  fail('Missing env.local.example. Restore the tracked template before continuing.');
}

if (!fs.existsSync(envPath)) {
  fail('Missing .env.local. Copy env.local.example to .env.local before running the app.');
}

const envContents = fs.readFileSync(envPath, 'utf8');
for (const key of ['NEXT_PUBLIC_AGORA_APP_ID', 'NEXT_AGORA_APP_CERTIFICATE']) {
  const matcher = new RegExp(`^${key}=.+$`, 'm');
  if (!matcher.test(envContents)) {
    fail(`.env.local is missing a value for ${key}`);
  }
}

// Saved progress and conversation logging status. Values are never printed.
const has = (key) => new RegExp(`^${key}=.+$`, 'm').test(envContents);
const store = envContents.match(/^PROGRESS_STORE=(.+)$/m)?.[1]?.trim() || 'file';
console.log(`Progress store: ${store}${store === 'postgres' && !has('DATABASE_URL') ? ' (DATABASE_URL is missing)' : ''}`);
console.log(has('COACH_PUBLIC_BASE_URL')
  ? 'Coach tools: on (COACH_PUBLIC_BASE_URL is set; Agora must be able to reach it)'
  : 'Coach tools: off (COACH_PUBLIC_BASE_URL not set); the browser reports progress');
console.log(has('COACH_PUBLIC_BASE_URL') && has('AGORA_WEBHOOK_SECRET')
  ? 'Conversation logging: configured. Check that the Agora project delivers "agent history" events to <COACH_PUBLIC_BASE_URL>/api/agora-webhook'
  : 'Conversation logging: off (needs COACH_PUBLIC_BASE_URL and AGORA_WEBHOOK_SECRET). Conversations are not stored.');

console.log('Doctor checks passed');
