# Blueprints

> by All Things Claude

Blueprints gives Claude Code a full development loop: turn an idea into a written plan, build it phase by phase (interactively, autonomously, or across parallel agents), review it for security, accessibility and quality, and commit it with a clear message. It also brings research, debugging, documentation and on-brand design commands, so the same plans and conventions carry through a whole project.

This is the plugin version of [`@allthingsclaude/blueprints`](https://github.com/allthingsclaude/blueprints). Commands are named `/blueprints:<command>` and agents `blueprints:<agent>`.

## What's inside

**Planning and building**: `/blueprint` writes a structured plan to `tasks/plans/`; `/kickoff` builds it with you step by step; `/implement` builds it on its own; `/parallelize` splits independent tasks across agents; `/autopilot` runs the whole loop from idea to committed code; `/dispatch` and `/integrate` run several plans in separate git worktrees and merge them back; `/finalize` wraps up a phase.

**Reviewing**: `/audit`, `/secure`, `/a11y`, `/test`, `/cleanup`, `/dry`, `/refactor` and `/todo`. The `preflight` workflow reviews a branch with parallel audit, security, accessibility and test reviewers and verifies every finding before one fix pass; the `sweep` workflow scans a whole codebase one area at a time and has a separate agent check each finding.

**Research and understanding**: `/research`, `/explain`, `/diagnose`, `/history`, `/diagram`, `/onboard`, `/glance`.

**Thinking modes**: `/brainstorm`, `/challenge`, `/validate`, `/critique`.

**Shipping**: `/commit`, `/changelog`, `/release`, `/merge`, `/migrate`, `/docs`, `/i18n`, `/update`, `/standup`, `/handoff`, `/pickup`.

**Design and marketing**: `/brand`, `/visuals`, `/copywrite`, `/email`, `/pitch`, `/og`, `/showcase`, `/storyboard`, `/imagine`.

Agents run on Sonnet for routine and research work and on Opus for planning, implementation and review.

## What it runs, writes and connects to

- **Files**: plans, state and session notes go in a `tasks/` folder in your project (`tasks/plans/`, `tasks/STATE.md`, `tasks/sessions/`). Design commands write to `design/`. Nothing is written outside your project.
- **Shell commands**: commands read project context with read-only commands such as `pwd`, `git status`, `git log` and `ls`. Building and reviewing run your project's own scripts (tests, typecheck, lint) and git.
- **Hook**: one `SubagentStop` hook, `hooks/phase-gate.sh`, runs when the `blueprints:implement` agent finishes. In a JavaScript or TypeScript project with a `typecheck` script it runs that script and, if it fails, hands the errors back to the agent once so it can fix them. Set `BLUEPRINTS_PHASE_GATE=0` to turn it off. No other hooks are installed.
- **Network**: the plugin sends nothing anywhere by itself. `/imagine` calls Google's Gemini API (`generativelanguage.googleapis.com`) or fal.ai (`fal.run`) to generate images, only when you run it, using your own `GEMINI_API_KEY` or `FAL_KEY` from your environment. HTML that the design commands generate may load fonts from Google Fonts. Research commands use Claude's own web search and fetch tools.

## License

MIT
