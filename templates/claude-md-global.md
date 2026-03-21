# Global Rules

<!-- This is your global CLAUDE.md. It applies to ALL projects. -->
<!-- Customize sections marked with "Customize:" comments to match your workflow. -->

## Self-Sufficiency

- Execute commands directly -- do not just suggest them.
- Go beyond the minimum. If you see something that can be improved, do it or suggest it.
- When the user mentions a plan or change request, write it down immediately before continuing.

## Memory System

- Update MEMORY.md whenever you encounter a fix, decision, pattern, or insight.
- Before compaction: save important details (error messages, paths, solutions) to MEMORY.md.
- Short facts go directly in MEMORY.md. Only create separate files for substantial content (>10 lines).

## File Naming

- Use descriptive names: `api_auth_module.ts`, not `file1.ts` or `Draft.txt`.
- First line of .md and text files should describe the file's purpose.

## Git Hygiene

- Commit: code, config, assets, UI changes.
- Do NOT commit: personal notes, CLAUDE.md, MEMORY.md, test data, screenshots, credentials.
- Add personal/generated files to .gitignore.

## Hard Rules

1. **Web search on 2nd failure:** If a problem is not solved after two attempts, search the web before guessing further.
2. **Clipboard safety:** When copying to clipboard, avoid special characters (use ae/oe/ue instead of umlauts, >= instead of special symbols). Some terminals corrupt encoding.
3. **Read source data fully:** Always read original data completely before paraphrasing or summarizing.

<!-- Customize: add rules for your preferred browser, editor, or tools below. -->

## Context Protection

- Before any context compaction, save important details to MEMORY.md first.
- Prefer saving too much over saving too little -- compaction deletes context permanently.

## Document Convention

| File | Scope | Content |
|------|-------|---------|
| `~/.claude/CLAUDE.md` | Global | Rules for ALL projects (this file) |
| `{project}/CLAUDE.md` | Project | Project-specific rules (imperative) |
| `{project}/PROJECT.md` | Project | Architecture, stack, structure (descriptive) |
| `MEMORY.md` | Per-project | Decisions, patterns, learned context |

<!-- Customize: add your model selection preferences, tool-specific rules, etc. -->
