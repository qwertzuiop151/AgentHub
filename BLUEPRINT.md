
# Self-Improving Multi-Agent Blueprint

## Quick Start — Copy this prompt into Claude Code:

> "Read this entire blueprint document. I want to build a self-improving multi-session system like this for my work as a [YOUR DOMAIN]. Start by setting up the global CLAUDE.md and the auto-memory-reminder hook. Then help me create my first project with CLAUDE.md + PROJECT.md + MEMORY.md following the conventions described here. Adapt everything to MY specific needs and workflow."

---

**This blueprint is a launchpad, not a destination.** It gives you escape velocity — the architecture, patterns, and conventions to get a working multi-project system off the ground fast instead of starting from zero. Once you're airborne, you steer.

**Adapting this blueprint is not optional — it's expected.** Blindly copying this setup would give you a system optimized for someone else's brain. Every rule, every convention, every pattern here was born from a specific person's specific problems. Your problems are different. Change what doesn't fit. Remove what you don't need. Add what's missing for your domain. The original system was built by a molecular biology researcher — yours will look completely different, and that's the point.

A reproducible blueprint for building a systematically human-improved, multi-project AI assistant system with Claude Code. Built and battle-tested over 20 days by a non-programmer researcher.

**What this is:** Multiple isolated Claude Code sessions, each specialized for one project, coordinated through shared files and a central orchestrator. A built-in audit system identifies drift, stale knowledge, and optimization opportunities — the human decides what to fix. This is NOT an autonomous multi-agent framework — it's an augmented workflow system where you stay in control.

**What this is NOT:** Not a fully autonomous agent swarm. Not a replacement for validation and testing. Not a magic system that produces correct outputs just because it's well-organized. Structure helps, but does not guarantee quality — you must still verify results.

**For whom:** Anyone using Claude Code who wants to scale from single-project usage to a coordinated multi-session ecosystem.
**Requirements:** Claude Code CLI, Max Plan recommended (Opus 4.6, 1M context).

---

## 1. Architecture Principles

**Hub-and-Spoke with file-based communication:**
- One orchestrator project (the "Hub") coordinates all others
- Each project runs in its own terminal session with its own context
- Projects communicate through shared files (MEMORY.md, METAPLAN.md), not directly
- Human-in-the-loop: every action is manually triggered and reviewed

**One agent = one domain.** Each agent is a specialist for exactly one project or topic. You don't need 10 agents working on the same thing — that creates coordination overhead without benefit. Instead: one agent per project, each with its own CLAUDE.md, its own memory, its own rules. This keeps agents focused and lightweight. Small tasks don't need an agent ecosystem — just use a single Claude Code session directly.

**Multi-terminal supervision.** When running multiple agents in parallel, use a multi-tab terminal (e.g., a custom Electron app, tmux, or any tabbed terminal) to see all agents at a glance. Visual indicators (tab highlighting, color coding) show which agent needs attention. This is how you maintain human oversight at scale without switching between windows.

**Key conventions:**
- **CLAUDE.md = Imperative** — rules and instructions ("always do X", "use Y for Z")
- **PROJECT.md = Descriptive** — architecture, stack, design decisions ("built with React + FastAPI")
- **METAPLAN.md = Central status** — TODOs, bugs, progress across ALL projects
- **"Read before search"** — always check local knowledge before web searching. Saves tokens, prevents redundant suggestions.

---

## 2. Directory Structure

```
~/.claude/                              # Global config
├── CLAUDE.md                           # Global rules (all projects)
├── settings.json                       # Hooks, plugins, statusline
├── .claude.json                        # MCP servers
├── commands/                           # Custom skills
│   └── {skill-name}.md                # YAML frontmatter + instructions
├── hooks/                             # Event-driven scripts
│   └── {hook-name}.js                 # Node.js hook scripts
└── projects/                          # Auto-created per project
    └── {project-hash}/memory/         # Project-specific memory
        ├── MEMORY.md                  # Index + short facts
        └── {topic}.md                 # Deep-dive files (>10 lines)

{PROJECT_ROOT}/                         # Each project folder
├── CLAUDE.md                           # Project-specific rules (5-30 lines)
├── PROJECT.md                          # Stack, architecture, design
└── memory/                            # Local memory (optional)
    └── MEMORY.md                      # Project-local facts

{CENTRAL_LOCATION}/
├── METAPLAN.md                         # Cross-project status document
└── SystemDocs/                        # Git repo backing up all config files
    ├── sync-docs.sh                   # Sync script (copies + commits)
    └── .git/                          # Full history of all changes
```

---

## 3. Configuration Files

### 3.1 settings.json — Hooks, Plugins, StatusLine

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node path/to/auto-memory-reminder.js" }] }
    ],
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node path/to/session-check.js" }] }
    ],
    "PostToolUse": [
      { "hooks": [{ "type": "command", "command": "node path/to/context-monitor.js" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "python path/to/session-end.py" }] }
    ]
  },
  "statusLine": {
    "type": "command",
    "command": "bash path/to/statusline.sh"
  },
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true,
    "claude-md-management@claude-plugins-official": true,
    "skill-creator@claude-plugins-official": true
  }
}
```

### 3.2 .claude.json — MCP Servers

```json
{
  "mcpServers": {
    "my-custom-server": {
      "type": "stdio",
      "command": "node",
      "args": ["path/to/server/index.js"],
      "env": { "API_KEY": "..." }
    }
  }
}
```

Transport types: `stdio` (local process), `sse` (remote). Anthropic connectors (Gmail, Calendar, PubMed) are configured through the Claude Code UI.

### 3.3 Global CLAUDE.md — Recommended Sections

```markdown
# Global Rules

## Autonomy
- Act independently — open files, run commands, don't ask for things you can do yourself.

## Documentation Convention
| File | Scope | Content |
|------|-------|---------|
| ~/.claude/CLAUDE.md | Global | Rules for ALL projects (imperative) |
| {project}/CLAUDE.md | Local | Project-specific rules (imperative) |
| {project}/PROJECT.md | Local | Stack, architecture, design (descriptive) |
| METAPLAN.md | Central | Status, TODOs, bugs across all projects |

## Context Protection
- Before any compaction: save critical details to MEMORY.md. Compaction deletes context irreversibly.

## Model Selection
- Opus: Architecture, multi-file changes, brainstorming
- Sonnet: Isolated bugfixes, features with clear instructions
- Haiku: Simple edits, renaming, formatting, batch changes
- Actively suggest cheaper models: "This is a Haiku task — switch?"

## Available Tools
[List installed packages so agents know what they can use]
- Documents: python-docx, python-pptx, openpyxl, PyPDF2
- Data: pandas, requests, beautifulsoup4
- Images: pillow
Rule: check `pip show <name>` before installing.

## Hard Rules
1. Web search on 2nd failed attempt
2. Source data: always read completely before paraphrasing
3. Agents only for real research or complex multi-step tasks (10x token overhead for simple edits)
4. Large files: Grep first to locate, then Read with offset/limit
5. Existing files: always Edit, never Write (to avoid overwriting)
```

### 3.4 Project CLAUDE.md — Pattern

Keep it short (5-30 lines). Role + hard rules only.

```markdown
# Project Name

## Role
[What this agent does in 1-2 sentences]

## Hard Rules
1. [Critical constraint]
2. [Another constraint]
```

---

## 4. Memory System

### 3-Tier Architecture

| Tier | Scope | Persistence | Storage |
|------|-------|------------|---------|
| Working Memory | Current context window | Until compaction | Automatic |
| Short-Term | Session history | Until session ends | Automatic |
| Long-Term | Cross-session | Permanent | MEMORY.md + topic files |

### MEMORY.md as Index

```markdown
# Project Memory

## Quick Facts
- Key fact 1
- Key fact 2

## Deep Topics
- **Analysis X** → see `memory/analysis_x.md`
- **Decision Y** → see `memory/decision_y.md`
```

**Rules:**
- Facts under 3 lines: directly in MEMORY.md
- Anything over 10 lines: separate file with YAML frontmatter
- Every file must justify its overhead — MEMORY.md is the default

### YAML Frontmatter for Memory Files

```yaml
---
name: descriptive_name
description: One-line purpose (used to decide relevance)
type: reference | project | feedback | user
---
```

---

## 5. Hook System

### Available Events

| Event | When | Recommended Use |
|-------|------|----------------|
| SessionStart | Session begins | Version checks, config validation |
| UserPromptSubmit | Before every response | Memory reminders, context injection |
| PostToolUse | After each tool call | Progress monitoring |
| Stop | Session ends | Cleanup, backup, audio logging |
| StopFailure | API error (rate limit etc.) | Error notification |
| PostCompact | After compaction | Auto-save critical context |

### Auto-Memory Reminder — The Most Important Hook

This hook injects a reminder before EVERY response: "Does MEMORY.md need updating?"

```javascript
#!/usr/bin/env node
let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const output = {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext:
          "AUTO-MEMORY: Check if this response involves a fix, decision, or new insight. " +
          "If yes, update MEMORY.md BEFORE your text response. If purely conversational, skip."
      }
    };
    process.stdout.write(JSON.stringify(output));
  } catch (e) { process.exit(0); }
});
```

This creates **continuous knowledge capture** — knowledge is saved as it's generated, not when someone remembers to save it.

---

## 6. Skill System

### File Format

```markdown
---
name: skill-name
description: When to trigger. Be specific and "pushy" — the LLM decides whether to use the skill based on this description matching the user's request.
---

# Skill Title

**Purpose:** One-liner.

## Steps
1. [What to do first]
2. [What to do next]

## Output Format
[Template for the response]

## Guidelines
- [Important rules]
```

### Trigger Description Best Practices
- Include specific phrases users might say ("check my setup", "bin ich up to date")
- Explain what the skill does AND when to use it
- Be "pushy" — Claude tends to undertrigger skills

---

## 7. MCP Integration

**stdio servers** (local): Python or Node.js process that Claude spawns and communicates with via stdin/stdout. Best for custom domain-specific tools.

**Anthropic connectors** (cloud): Gmail, Calendar, PubMed, Google Drive. Require browser OAuth on first use.

**Recommended starter MCPs:**
- Paper search (PubMed, bioRxiv, arXiv) — for any research workflow
- Google Drive — read documents and spreadsheets
- Custom domain MCP — build one for YOUR specific data sources

**Building a custom MCP server:** If your domain has data that Claude can't access natively (lab databases, internal wikis, custom APIs), build a stdio MCP server. It's a Node.js or Python script that exposes tools via the MCP protocol. Claude Code documentation has templates.

---

## 8. Advanced Patterns

These patterns go beyond a standard setup and are what makes this system genuinely powerful.

### a) Negation-Free CLAUDE.md
LLMs process "Use Y" better than "Don't use X" — negation still activates the negated concept. Systematically rephrase all rules positively. Measurably better rule adherence (>92% at <200 lines, positively phrased).

**Before:** "NEVER auto-commit"
**After:** "Commits only on explicit request"

### b) Dual-Agent Strategy (Built-in Second Opinion)
Two agents for the same domain with deliberately different perspectives:
- **Agent A:** Unbiased, no project history, purely evidence-based
- **Agent B:** Full project context, knows all decisions and constraints

When they disagree, that's where the interesting questions are. Generalizable to any domain where you need independent verification: legal, medical, financial, research.

### c) Epistemological Guardrails (for knowledge-intensive work)
Embed these rules in CLAUDE.md for agents that work with facts:
- **Primary data mandate:** Agent must read original data, never trust summaries alone
- **Bias checklists:** Anchoring, Confirmation Bias, HARKing, Survivorship Bias
- **Evidence level tags:** [CORRELATION], [HYPOTHESIS], [EXPLORATORY], [UNCLEAR]
- **When data is insufficient:** SAY SO. Don't pick a hypothesis just to have an answer.

Generalizable to any domain where correctness is critical: law, medicine, research, finance.

### d) External Validation as Design Principle
Write system documentation so that external LLMs can read and critique it. Periodically give your system_overview.md to a different AI and ask "what could be improved?" — findings go into an improvements backlog. The system improves from the inside (audit) AND the outside (external review).

### e) Available-Tools Reference
List installed packages in the global CLAUDE.md so agents know what they can use. Prevents "I can't do that" when the tool is already installed. Rule: always check `pip show <name>` before installing.

### f) Output Validation Pattern
Structure does not guarantee correctness. A well-organized system can consistently produce wrong results. Build validation into your workflow at three levels:

- **Code validation:** Add test commands to each project's CLAUDE.md (e.g., `## Quick Reference: npm test, python -m pytest`). The agent should run tests after every change, not just when asked.
- **Data validation:** For data-intensive work (bioinformatics, analytics, research), define sanity checks in the project CLAUDE.md: expected ranges, known-good reference values, checksums. Example rule: "After every analysis, compare at least one result against a manually verified value."
- **Reasoning validation:** Use the Dual-Agent Strategy (Section 8b) for critical conclusions. If two agents with different perspectives agree, confidence goes up. If they disagree, investigate before proceeding. Add epistemological guardrails (Section 8c) for knowledge-intensive domains.

Without explicit validation rules, the agent will assume its output is correct — and so will you. That's the most dangerous failure mode.

### g) Cross-Project Knowledge Sharing
By default, each agent only knows its own project. The central status document (METAPLAN.md) tracks what's happening WHERE, but not the deep insights from each project. Without a mechanism for knowledge transfer, agents re-discover things other agents already know.

Three concrete patterns to solve this:

1. **Shared Learnings section in global CLAUDE.md** — When an agent discovers something universally useful (a tool trick, a debugging pattern, a domain insight), add it to the global CLAUDE.md. Every agent reads this at session start.
2. **Shared MCP server** — Build a domain-specific MCP server that all agents can query. This gives every agent read access to cross-project knowledge (lab results, data dictionaries, terminology) without breaking project isolation.
3. **Orchestrator as knowledge relay** — The hub/orchestrator agent reads all project MEMORY.md files and can manually propagate insights. After a session with Agent A that produced a useful finding, update Agent B's MEMORY.md in the next orchestrator session.

The human remains the primary knowledge transfer mechanism. These patterns make it more systematic.

### h) Project Prioritization
Without explicit prioritization, you'll end up with many half-finished projects. The central status document (METAPLAN.md) helps track status, but doesn't enforce priority.

Concrete pattern:
- In METAPLAN.md, mark each project with a priority level: **Active** (working on it now), **Paused** (defined stopping point, will resume), **Scaffolded** (structure exists, no active work), **Done** (feature-complete).
- Rule in global CLAUDE.md: "Only work on Active projects. If the user starts something new, ask: should this be Active or Scaffolded? If Active, which current Active project gets Paused?"
- Use task notation: `[~]` = in progress, `[ ]` = open, `[x]` = done. At any time, only 1-3 projects should be `Active`. More than that means you're context-switching too much.

This prevents the "14 half-finished projects" trap. The orchestrator enforces discipline, not just tracking.

---

## 9. Self-Improvement Loop — The Core Feature

This is what makes the system special. It's not a static setup — it's a closed feedback loop where the audit systematically identifies issues and the human decides what to fix. The system does not improve autonomously — it gives you the tools to improve it efficiently.

### The Cycle

```
Build → Use → Audit → Fix → Document → Build (improved)
                ↑                              |
                └──────────────────────────────┘
```

1. System is used daily
2. `/audit` skill detects drift, stale configs, new features, broken references
3. Findings are categorized (Action needed / Later / Already covered)
4. Fixes are applied
5. Changes are documented in system overview + improvements backlog
6. Next audit checks whether fixes worked
7. → Closed loop

### /audit Skill — Tiered Depth

The audit adapts its depth based on how recently it last ran:

| Tier | Condition | What runs | Token cost |
|------|-----------|-----------|-----------|
| **Quick** | <1 week since last audit | Version check + config health (local only) | ~8K |
| **Standard** | 1-4 weeks | + 1 web search for new features | ~25K |
| **Full** | >4 weeks or first audit | + deep research (2-3 searches) | ~60K |

Tier is auto-detected from `last_audit.md`. The most common run is Quick — cheap and fast.

### What the Audit Checks

| Check | What | Why |
|-------|------|-----|
| CLAUDE.md length | Line count, target <200 | Rule adherence drops above 200 lines |
| Negation density | Count NICHT/NEVER patterns | Positive phrasing works better |
| Hook health | Do referenced script files exist on disk? | Broken hooks fail silently |
| MCP health | Do server executables/scripts exist? | Missing MCPs cause confusing errors |
| Plugin completeness | Any new official plugins not in the list? | Easy to miss new additions |
| Skills overlap | Two skills doing the same thing? | Redundancy wastes triggers |
| Drift detection | Settings vs documentation in sync? | "Shadow changes" go unnoticed |

### Drift Detection — Three Types

| Type | Problem | Example |
|------|---------|---------|
| Config Drift | Setting changed but not documented | Plugin enabled but not in MEMORY.md |
| Memory Drift | Knowledge is outdated but still looks correct | Old MCP config info that changed |
| Structural Drift | New projects/files not tracked | New project folder not in METAPLAN.md |

### Git-Based Versioning (SystemDocs)

A central Git repo backs up all CLAUDE.md, MEMORY.md, PROJECT.md, METAPLAN.md files. Every sync = one commit = one snapshot. Full history, rollback anytime.

```bash
# Run at end of every significant session:
bash path/to/sync-docs.sh --commit
```

### Why This Matters

- Systems without self-improvement silently decay ("Memory Drift")
- Manual checking doesn't scale (you'll miss drift at 10+ projects)
- The audit makes the system **measurable**: Config Health table, drift count, negation count
- Results are saved (last_audit.md) → next audit knows previous findings → delta reporting

---

## 10. Day 1 — Getting Started

Step-by-step from zero to a working system:

1. **Install Claude Code:** `npm install -g @anthropic-ai/claude-code`
2. **Create global CLAUDE.md:** `~/.claude/CLAUDE.md` with the sections from Section 3.3
3. **Configure settings.json:** Add at minimum the auto-memory-reminder hook (Section 5)
4. **Create your first project folder** with:
   - `CLAUDE.md` — role + 2-3 hard rules
   - `PROJECT.md` — stack, architecture, design decisions
   - `memory/MEMORY.md` — empty index, will fill organically
5. **Initialize SystemDocs backup:**
   ```bash
   mkdir SystemDocs && cd SystemDocs && git init
   # Create sync-docs.sh that copies config files and commits
   ```
6. **Install recommended plugins:** superpowers, claude-md-management, skill-creator
7. **Test:** Open the project in Claude Code, have a conversation, verify MEMORY.md gets updated

## 11. Day 7 — Multi-Project Coordination

Once your first project is working:

1. **Create METAPLAN.md** — central status document listing all projects with status, TODOs, bugs
2. **Create a second project** with its own CLAUDE.md and PROJECT.md
3. **Create an orchestrator project** ("Metaplaner") — read-only, no code changes, just coordination
4. **Test cross-project awareness:** The orchestrator reads METAPLAN.md to know what's happening everywhere
5. **Run your first `/audit`** — build the audit skill (Section 9) and execute it

---

## 12. Scaling Notes

**Works well at 5 projects:**
- You can hold the full system state in your head
- File-based communication is fast and simple
- Manual checking catches most issues

**Needs adaptation at 20+ projects:**
- **Cognitive overload:** You can't review every agent's output. Consider the Debate Pattern (two agents evaluate, third judges).
- **Memory Drift accelerates:** More files = more staleness. The audit skill becomes critical.
- **File concurrency:** Two agents editing the same file can cause silent overwrites. Consider a file-hash hook (check hash before writing).
- **Central orchestrator becomes bottleneck:** Consider decentralizing coordination or adding specialized sub-orchestrators.

**Known risks at scale:**
- Single Point of Failure (orchestrator mistakes propagate everywhere)
- "Feeling of control" replaces actual control as project count grows
- File-based communication has no conflict resolution mechanism

**Future scaling paths:**
- Contract Layer: structured task definitions (goal, input, constraints, success_criteria) between agents
- Event Log: append-only instead of file-overwrite for better auditability
- Observability: session summaries, token tracking, error rates
- MCP-based communication instead of file-based (schema enforcement)

---

## 13. Community Best Practices

Patterns recommended by the Claude Code community that complement this blueprint:

- **Quick Reference commands** at the TOP of every CLAUDE.md (build/test/deploy one-liners)
- **`.claude/rules/*.md`** with `paths` frontmatter for directory-specific rules in larger projects
- **"When in doubt" fallback rules** — explicit instructions for ambiguous situations
- **Primacy + Recency placement** — put most-violated rules at the START and END of CLAUDE.md
- **PostCompact hook** as a safety net — auto-save critical context when compaction fires

---

## 14. Honest Limitations — Read This Before Building

This blueprint is powerful but not magic. These are real limitations you should understand:

### Structure does not guarantee correctness
A well-organized system can still produce wrong outputs consistently. All the CLAUDE.md files, memory systems, and audit skills in the world don't help if the code has bugs or the analysis is flawed. **You need validation:** tests for code, peer review for analysis, sanity checks for data. The epistemological guardrails (Section 8c) help with reasoning quality, but they don't replace domain-expert verification.
**Mitigation:** Add a validation layer to your workflow — test suites for code, reproducibility checks for data pipelines, and a second agent with a different perspective for critical conclusions (see Dual-Agent Strategy, Section 8b).

### "Self-improving" means human-improved with systematic tooling
The audit identifies issues. YOU decide what to fix. There is no autonomous self-correction. If you don't run the audit or ignore its findings, the system decays like any other. The value is in making problems VISIBLE, not in fixing them automatically.

### This is not a real multi-agent system
It's multiple isolated Claude Code sessions coordinated through shared files. There is no real parallelism, no conflict resolution protocol, no coordinated planning between agents. Calling it "multi-agent" is convenient shorthand, but technically it's "manually orchestrated isolated instances." This is fine for a single user — it becomes a real limitation if you need autonomous agent coordination.

### Cross-project knowledge transfer is shallow
The central status document (METAPLAN.md) coordinates STATUS across projects — what's done, what's blocked, what's next. But it does not transfer deep KNOWLEDGE. If one agent discovers something that another agent should know, the human must transfer that insight manually (by updating the relevant MEMORY.md or CLAUDE.md). There is no automatic cross-pollination of learnings.
**Mitigation:** Build a shared knowledge MCP server or use a domain-specific tool that all agents can access. This gives every agent read access to cross-project knowledge without breaking isolation. Alternatively, maintain a "Shared Learnings" section in the global CLAUDE.md for insights that apply everywhere.

### File-based communication is fragile under concurrency
No locking, no conflict resolution, no guaranteed ordering. If two sessions write to the same file simultaneously, one silently overwrites the other. This is acceptable for a single user who runs 1-3 sessions at a time. It breaks down for parallel pipelines or automated batch processing.

### Overhead scales with project count
For 1-3 projects, this system is overkill — just use Claude Code directly. The infrastructure (hooks, skills, memory files, audit, METAPLAN) starts paying off at 5+ projects. Below that, the overhead costs more than it saves.

### The biggest risk: false confidence
A well-structured, well-documented, self-auditing system FEELS reliable. That feeling can replace actual verification. The most dangerous failure mode is trusting the system's organization as a proxy for the quality of its outputs. Always ask: "Is this actually correct?" — not just "Is this well-organized?"
**Mitigation:** Periodically give your system documentation to an external LLM or colleague and ask for honest critique (Section 8d). Build domain-specific validation into your CLAUDE.md rules (e.g., "always verify calculations with a second method", "never trust a single data source"). The epistemological guardrails in Section 8c are designed exactly for this.

---

## How to Use This Blueprint

Copy the prompt from the top of this document into a new Claude Code session. Give it this file as context. The system will grow organically from there — just like the original did.
