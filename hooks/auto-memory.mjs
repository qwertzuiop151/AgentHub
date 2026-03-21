#!/usr/bin/env node
// Auto-Memory Reminder — UserPromptSubmit hook
// Reminds Claude to update MEMORY.md when decisions, fixes, patterns, or insights emerge.

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const output = {
      hookSpecificOutput: {
        hookEventName: 'UserPromptSubmit',
        additionalContext:
          'AUTO-MEMORY: Before responding, check if your response involves a fix, decision, pattern, or insight. ' +
          'If yes, update MEMORY.md BEFORE your text response. If purely conversational, skip.',
      },
    };
    process.stdout.write(JSON.stringify(output));
  } catch (e) {
    process.exit(0);
  }
});
