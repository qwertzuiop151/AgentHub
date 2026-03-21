// validate-merge.mjs -- Tests for the settings.json deep-merge algorithm.
// Run from repo root: node tests/validate-merge.mjs

// ---------------------------------------------------------------------------
// Reference implementation: mergeSettings(existing, template)
// This is the canonical merge algorithm described in SETUP.md Step 7d.
// ---------------------------------------------------------------------------

function mergeSettings(existing, template) {
  const result = {};

  // Collect all keys from both objects
  const allKeys = new Set([...Object.keys(existing), ...Object.keys(template)]);

  for (const key of allKeys) {
    if (key === '$schema') {
      // Keep existing $schema if present, otherwise use template
      result.$schema = existing.$schema || template.$schema;
    } else if (key === 'permissions') {
      result.permissions = mergePermissions(
        existing.permissions || {},
        template.permissions || {}
      );
    } else if (key === 'hooks') {
      result.hooks = mergeHooks(
        existing.hooks || {},
        template.hooks || {}
      );
    } else if (key === 'statusLine') {
      // Keep existing statusLine if present
      result.statusLine = existing.statusLine != null
        ? existing.statusLine
        : template.statusLine;
    } else {
      // All other keys: keep existing, add template if missing
      result[key] = key in existing ? existing[key] : template[key];
    }
  }

  return result;
}

function mergePermissions(existing, template) {
  const result = {};

  // Merge allow arrays: existing first, then template, deduplicate
  if (existing.allow || template.allow) {
    const combined = [...(existing.allow || [])];
    for (const entry of (template.allow || [])) {
      if (!combined.includes(entry)) {
        combined.push(entry);
      }
    }
    result.allow = combined;
  }

  // Merge deny arrays: same approach
  if (existing.deny || template.deny) {
    const combined = [...(existing.deny || [])];
    for (const entry of (template.deny || [])) {
      if (!combined.includes(entry)) {
        combined.push(entry);
      }
    }
    result.deny = combined;
  }

  return result;
}

function mergeHooks(existing, template) {
  const result = { ...existing };
  const allEvents = new Set([...Object.keys(existing), ...Object.keys(template)]);

  for (const event of allEvents) {
    if (event in existing && event in template) {
      // Both have this event -- combine hook entries, deduplicate by command string
      const existingHooks = existing[event];
      const templateHooks = template[event];
      const merged = [...existingHooks];

      for (const tEntry of templateHooks) {
        const tCommands = extractCommands(tEntry);
        const isDuplicate = merged.some(eEntry => {
          const eCommands = extractCommands(eEntry);
          return tCommands.length > 0 &&
            tCommands.every(cmd => eCommands.includes(cmd));
        });
        if (!isDuplicate) {
          merged.push(tEntry);
        }
      }
      result[event] = merged;
    } else if (event in template) {
      // Only in template -- add it
      result[event] = template[event];
    }
    // If only in existing, it's already in result via spread
  }

  return result;
}

function extractCommands(hookEntry) {
  if (!hookEntry || !hookEntry.hooks || !Array.isArray(hookEntry.hooks)) return [];
  return hookEntry.hooks
    .filter(h => h.command)
    .map(h => h.command);
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

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

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------------------------------------------------------------------
// Scenario 1: Fresh install (no existing) -- template written as-is
// ---------------------------------------------------------------------------
console.log('\n[MERGE-01] Fresh install -- no existing settings');

const template = {
  $schema: 'https://json.schemastore.org/claude-code-settings.json',
  permissions: {
    allow: ['Read', 'Glob', 'Grep', 'Bash(git status)'],
    deny: ['Read(./.env)'],
  },
  hooks: {
    UserPromptSubmit: [
      {
        hooks: [
          { type: 'command', command: 'node "~/.claude/hooks/auto-memory.mjs"' },
        ],
      },
    ],
  },
  statusLine: {
    type: 'command',
    command: 'node ~/.claude/hooks/statusline.mjs',
  },
};

const result1 = mergeSettings({}, template);

check('Result matches template', deepEqual(result1, template));
check('All permissions preserved', result1.permissions.allow.length === 4);
check('StatusLine present', result1.statusLine != null);
check('Hooks present', result1.hooks.UserPromptSubmit != null);

// ---------------------------------------------------------------------------
// Scenario 2: Merge with existing hooks -- existing preserved, new added
// ---------------------------------------------------------------------------
console.log('\n[MERGE-02] Merge with existing hooks -- both preserved');

const existingWithHook = {
  $schema: 'https://json.schemastore.org/claude-code-settings.json',
  permissions: {
    allow: ['Read', 'Bash(pip *)'],
    deny: [],
  },
  hooks: {
    UserPromptSubmit: [
      {
        hooks: [
          { type: 'command', command: 'node "~/.claude/hooks/my-custom-hook.mjs"' },
        ],
      },
    ],
  },
  statusLine: {
    type: 'command',
    command: 'node ~/.claude/hooks/my-statusline.mjs',
  },
};

const result2 = mergeSettings(existingWithHook, template);

check(
  'Existing hook preserved',
  result2.hooks.UserPromptSubmit.some(entry =>
    extractCommands(entry).includes('node "~/.claude/hooks/my-custom-hook.mjs"')
  )
);
check(
  'Template hook added',
  result2.hooks.UserPromptSubmit.some(entry =>
    extractCommands(entry).includes('node "~/.claude/hooks/auto-memory.mjs"')
  )
);
check(
  'Total hook entries = 2',
  result2.hooks.UserPromptSubmit.length === 2
);
check(
  'Existing permissions kept',
  result2.permissions.allow.includes('Bash(pip *)')
);
check(
  'Template permissions added',
  result2.permissions.allow.includes('Glob')
);
check(
  'No duplicate Read',
  result2.permissions.allow.filter(p => p === 'Read').length === 1
);

// ---------------------------------------------------------------------------
// Scenario 3: Duplicate hook detection -- no duplicate added
// ---------------------------------------------------------------------------
console.log('\n[MERGE-03] Duplicate hook detection');

const existingWithSameHook = {
  permissions: { allow: ['Read'], deny: [] },
  hooks: {
    UserPromptSubmit: [
      {
        hooks: [
          { type: 'command', command: 'node "~/.claude/hooks/auto-memory.mjs"' },
        ],
      },
    ],
  },
};

const result3 = mergeSettings(existingWithSameHook, template);

check(
  'No duplicate auto-memory hook',
  result3.hooks.UserPromptSubmit.length === 1,
  `got ${result3.hooks.UserPromptSubmit.length} entries`
);
check(
  'The single entry has correct command',
  extractCommands(result3.hooks.UserPromptSubmit[0]).includes('node "~/.claude/hooks/auto-memory.mjs"')
);

// ---------------------------------------------------------------------------
// Scenario 4: Permission merge -- old + new rules, no exact dupes
// ---------------------------------------------------------------------------
console.log('\n[MERGE-04] Permission merge');

const existingPerms = {
  permissions: {
    allow: ['Read', 'Glob', 'Bash(cargo *)', 'Bash(git status)'],
    deny: ['Read(./.env)', 'Read(./credentials.json)'],
  },
};

const templatePerms = {
  permissions: {
    allow: ['Read', 'Glob', 'Grep', 'Bash(git status)', 'Bash(node *)'],
    deny: ['Read(./.env)', 'Read(./.env.*)', 'Read(./secrets/**)'],
  },
};

const result4 = mergeSettings(existingPerms, templatePerms);

check(
  'Existing-only permission kept (cargo)',
  result4.permissions.allow.includes('Bash(cargo *)')
);
check(
  'Template-only permission added (Grep)',
  result4.permissions.allow.includes('Grep')
);
check(
  'Template-only permission added (node)',
  result4.permissions.allow.includes('Bash(node *)')
);
check(
  'No duplicate Read',
  result4.permissions.allow.filter(p => p === 'Read').length === 1
);
check(
  'No duplicate Glob',
  result4.permissions.allow.filter(p => p === 'Glob').length === 1
);
check(
  'No duplicate git status',
  result4.permissions.allow.filter(p => p === 'Bash(git status)').length === 1
);
check(
  'Existing deny kept (credentials)',
  result4.permissions.deny.includes('Read(./credentials.json)')
);
check(
  'Template deny added (.env.*)',
  result4.permissions.deny.includes('Read(./.env.*)')
);
check(
  'No duplicate .env deny',
  result4.permissions.deny.filter(p => p === 'Read(./.env)').length === 1
);
check(
  'Total allow = 6 (4 existing + 2 new)',
  result4.permissions.allow.length === 6,
  `got ${result4.permissions.allow.length}: ${JSON.stringify(result4.permissions.allow)}`
);

// ---------------------------------------------------------------------------
// Scenario 5: StatusLine preservation -- existing not overwritten
// ---------------------------------------------------------------------------
console.log('\n[MERGE-05] StatusLine preservation');

const existingStatus = {
  statusLine: {
    type: 'command',
    command: 'node ~/.claude/hooks/my-fancy-statusline.mjs',
  },
};

const templateStatus = {
  statusLine: {
    type: 'command',
    command: 'node ~/.claude/hooks/statusline.mjs',
  },
};

const result5 = mergeSettings(existingStatus, templateStatus);

check(
  'Existing statusLine preserved',
  result5.statusLine.command === 'node ~/.claude/hooks/my-fancy-statusline.mjs'
);
check(
  'Template statusLine NOT used',
  result5.statusLine.command !== 'node ~/.claude/hooks/statusline.mjs'
);

// Also test: no existing statusLine -> template used
const result5b = mergeSettings({}, templateStatus);
check(
  'Template statusLine used when none exists',
  result5b.statusLine.command === 'node ~/.claude/hooks/statusline.mjs'
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
process.exit(failed > 0 ? 1 : 0);
