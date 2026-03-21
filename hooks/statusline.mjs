#!/usr/bin/env node
// Statusline — shows CWD, model name, and context window percentage

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const model = data.model?.display_name || '';
    const dir = data.workspace?.current_dir || data.cwd || '';
    const pct = Math.floor(data.context_window?.used_percentage || 0);

    // Shorten path: show only last directory name
    const shortDir = dir.split(/[/\\]/).pop() || '';

    // Build visual bar: 10-char bar using unicode block chars
    const filled = Math.floor((pct * 10) / 100);
    const bar = '\u2593'.repeat(filled) + '\u2591'.repeat(10 - filled);

    console.log(`[${model}] ${shortDir} ${bar} ${pct}%`);
  } catch (e) {
    process.exit(0);
  }
});
