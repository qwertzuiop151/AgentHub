// validate-templates.mjs — Automated validation for all four template files.
// Run from repo root: node tests/validate-templates.mjs

import { readFileSync, existsSync } from 'node:fs';

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
  } else {
    console.log(`  FAIL: ${name}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// TMPL-01: templates/claude-md-global.md
// ---------------------------------------------------------------------------
console.log('\n[TMPL-01] templates/claude-md-global.md');

const globalPath = 'templates/claude-md-global.md';
const globalExists = existsSync(globalPath);
check('File exists', globalExists);

if (globalExists) {
  const globalContent = readFileSync(globalPath, 'utf8');
  const globalLines = globalContent.split('\n');

  check('Line count <= 80', globalLines.length <= 80, `got ${globalLines.length} lines`);

  // Personal data patterns that must NOT appear
  const personalPatterns = [
    /\/Users\/Dominik/i,
    /F:\\\\?CLAUDECODE/i,
    /qwertzuiop/i,
    /ResearchGraph/i,
    /AgentHub/i,
    /ThesisCompanion/i,
    /GelEstimator/i,
    /MultifunctionalHotkey/i,
    /LoLMonitor/i,
    /PaperSummary/i,
    /PresentationBuilder/i,
    /seqaligner/i,
    /seqeditor/i,
    /digestion/i,
    /RemoteControl/i,
    /DNAI/i,
    /Metaplaner/i,
  ];
  const foundPersonal = personalPatterns.filter(p => p.test(globalContent));
  check(
    'No personal data patterns',
    foundPersonal.length === 0,
    foundPersonal.length > 0 ? `found: ${foundPersonal.map(p => p.source).join(', ')}` : undefined
  );

  // Must contain at least one ## header
  check('Contains ## header', /^## /m.test(globalContent));

  // ASCII-safe: no emojis (common emoji ranges)
  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{231A}\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}]/u;
  check('ASCII-safe (no emojis)', !emojiPattern.test(globalContent));
} else {
  // Skip dependent checks
  check('Line count <= 80', false, 'file missing');
  check('No personal data patterns', false, 'file missing');
  check('Contains ## header', false, 'file missing');
  check('ASCII-safe (no emojis)', false, 'file missing');
}

// ---------------------------------------------------------------------------
// TMPL-02: templates/settings.json
// ---------------------------------------------------------------------------
console.log('\n[TMPL-02] templates/settings.json');

const settingsPath = 'templates/settings.json';
const settingsExists = existsSync(settingsPath);
check('File exists', settingsExists);

if (settingsExists) {
  const settingsRaw = readFileSync(settingsPath, 'utf8');
  let settings;
  try {
    settings = JSON.parse(settingsRaw);
    check('Valid JSON', true);
  } catch (e) {
    check('Valid JSON', false, e.message);
  }

  if (settings) {
    check('Has $schema key', typeof settings.$schema === 'string' && settings.$schema.includes('schemastore.org'));
    check('Has hooks.UserPromptSubmit array', Array.isArray(settings?.hooks?.UserPromptSubmit));
    check('Has statusLine key', settings.statusLine != null);
    check(
      'permissions.allow has >= 5 entries',
      Array.isArray(settings?.permissions?.allow) && settings.permissions.allow.length >= 5,
      settings?.permissions?.allow ? `got ${settings.permissions.allow.length}` : 'missing'
    );
    check('permissions.deny array exists', Array.isArray(settings?.permissions?.deny));

    // Collect all hook/statusline command strings for path checks
    const allCommands = [];
    for (const [, eventHooks] of Object.entries(settings.hooks || {})) {
      if (Array.isArray(eventHooks)) {
        for (const entry of eventHooks) {
          if (entry.hooks) {
            for (const h of entry.hooks) {
              if (h.command) allCommands.push(h.command);
            }
          }
        }
      }
    }
    // Also check statusLine command
    if (settings.statusLine?.command) allCommands.push(settings.statusLine.command);

    // Hook command paths use forward slashes only (no backslashes as path separators)
    const hookPathsForwardSlash = allCommands.length > 0 && allCommands.every(cmd => {
      // Extract file paths from the command (after "node"), strip quotes
      const pathPart = cmd.replace(/^node\s+/, '').replace(/"/g, '');
      return !pathPart.includes('\\');
    });
    check('Hook paths use forward slashes', hookPathsForwardSlash, `commands: ${allCommands.join('; ')}`);

    const hookPathsUseTilde = allCommands.length > 0 && allCommands.every(cmd => cmd.includes('~/'));
    check('Hook/statusline paths use ~/ prefix', hookPathsUseTilde, `commands: ${allCommands.join('; ')}`);
  } else {
    check('Has $schema key', false, 'parse failed');
    check('Has hooks.UserPromptSubmit array', false, 'parse failed');
    check('Has statusLine key', false, 'parse failed');
    check('permissions.allow has >= 5 entries', false, 'parse failed');
    check('permissions.deny array exists', false, 'parse failed');
    check('Hook paths use forward slashes', false, 'parse failed');
    check('Hook/statusline paths use ~/ prefix', false, 'parse failed');
  }
} else {
  check('Valid JSON', false, 'file missing');
  check('Has $schema key', false, 'file missing');
  check('Has hooks.UserPromptSubmit array', false, 'file missing');
  check('Has statusLine key', false, 'file missing');
  check('permissions.allow has >= 5 entries', false, 'file missing');
  check('permissions.deny array exists', false, 'file missing');
  check('Hook paths use forward slashes', false, 'file missing');
  check('Hook/statusline paths use ~/ prefix', false, 'file missing');
}

// ---------------------------------------------------------------------------
// TMPL-03: templates/memory-starter.md
// ---------------------------------------------------------------------------
console.log('\n[TMPL-03] templates/memory-starter.md');

const memoryPath = 'templates/memory-starter.md';
const memoryExists = existsSync(memoryPath);
check('File exists', memoryExists);

if (memoryExists) {
  const memoryContent = readFileSync(memoryPath, 'utf8');
  check('Contains ## User header', /^## User/m.test(memoryContent));
  check('Contains ## Feedback header', /^## Feedback/m.test(memoryContent));
  check('Contains ## Project header', /^## Project/m.test(memoryContent));
  check('Contains ## Tools header', /^## Tools/m.test(memoryContent));
  check('Contains at least one example entry (- )', /^- /m.test(memoryContent));
} else {
  check('Contains ## User header', false, 'file missing');
  check('Contains ## Feedback header', false, 'file missing');
  check('Contains ## Project header', false, 'file missing');
  check('Contains ## Tools header', false, 'file missing');
  check('Contains at least one example entry (- )', false, 'file missing');
}

// ---------------------------------------------------------------------------
// TMPL-04: templates/claude-md-project.md
// ---------------------------------------------------------------------------
console.log('\n[TMPL-04] templates/claude-md-project.md');

const projectPath = 'templates/claude-md-project.md';
const projectExists = existsSync(projectPath);
check('File exists', projectExists);

if (projectExists) {
  const projectContent = readFileSync(projectPath, 'utf8');
  check('Contains ## header', /^## /m.test(projectContent));
} else {
  check('Contains ## header', false, 'file missing');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
process.exit(failed > 0 ? 1 : 0);
