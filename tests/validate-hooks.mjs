#!/usr/bin/env node
// Validate hook scripts — runs auto-memory.mjs and statusline.mjs with mock stdin

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}`);
    failed++;
  }
}

function readFile(relPath) {
  const full = join(ROOT, relPath);
  if (!existsSync(full)) return null;
  return readFileSync(full, 'utf8');
}

function runHook(relPath, stdinData) {
  const full = join(ROOT, relPath);
  try {
    const out = execSync(`node "${full}"`, {
      input: stdinData,
      encoding: 'utf8',
      timeout: 10000,
    });
    return out;
  } catch (e) {
    return null;
  }
}

// ── HOOK-01: auto-memory.mjs ──────────────────────────────────────

console.log('\nHOOK-01: auto-memory.mjs');

const amPath = 'hooks/auto-memory.mjs';
const amContent = readFile(amPath);

check('File exists', amContent !== null);
check('Has shebang line', amContent !== null && amContent.startsWith('#!/usr/bin/env node'));
check('Has stdin timeout pattern', amContent !== null && /setTimeout.*process\.exit/s.test(amContent));

const amOutput = runHook(amPath, '{}');
let amJson = null;
if (amOutput !== null) {
  try { amJson = JSON.parse(amOutput); } catch { amJson = null; }
}

check('Output parses as valid JSON', amJson !== null);
check('hookEventName === "UserPromptSubmit"',
  amJson?.hookSpecificOutput?.hookEventName === 'UserPromptSubmit');
check('additionalContext is non-empty string',
  typeof amJson?.hookSpecificOutput?.additionalContext === 'string' &&
  amJson.hookSpecificOutput.additionalContext.length > 0);
check('additionalContext mentions memory',
  /memory/i.test(amJson?.hookSpecificOutput?.additionalContext || ''));

// ── HOOK-02: statusline.mjs ──────────────────────────────────────

console.log('\nHOOK-02: statusline.mjs');

const slPath = 'hooks/statusline.mjs';
const slContent = readFile(slPath);

check('File exists', slContent !== null);
check('Has shebang line', slContent !== null && slContent.startsWith('#!/usr/bin/env node'));
check('Has stdin timeout pattern', slContent !== null && /setTimeout.*process\.exit/s.test(slContent));

const mockSession = JSON.stringify({
  model: { display_name: 'Opus' },
  workspace: { current_dir: '/home/user/project' },
  context_window: { used_percentage: 42 },
});

const slOutput = runHook(slPath, mockSession);

check('Output is non-empty string', typeof slOutput === 'string' && slOutput.trim().length > 0);
check('Output contains model name "Opus"', (slOutput || '').includes('Opus'));
check('Output contains percentage "42"', (slOutput || '').includes('42'));

// ── Summary ──────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed} checks`);
process.exit(failed > 0 ? 1 : 0);
