---
description: Run a focused security scan on your codebase
argument-hint: optional: file/folder path, or focus area like "deps", "auth", "api"
author: "@markoradak"
---

# Security Scan

I'll perform a focused security audit of your codebase, checking for vulnerabilities, exposed secrets, and insecure patterns.

> **When to use**: You want a dedicated security review — not a general code review. Use `/audit` for broad code quality review, or `/cleanup` to remove dead code.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
!`git status --short 2>/dev/null | head -40 | grep . || echo "Clean, or not a git repository"`

**Dependency Manifests**:
!`ls package.json requirements.txt go.mod Cargo.toml pyproject.toml 2>/dev/null || echo "No manifest found"`

---

## Focus Area

$ARGUMENTS

---

## Launching Security Agent

The security agent will:
- Scan source code for OWASP Top 10 vulnerabilities
- Check for hardcoded secrets, API keys, and credentials
- Audit dependencies for known vulnerabilities
- Review authentication and authorization patterns
- Check input validation and output encoding
- Identify injection vectors (SQL, XSS, command, path traversal)
- Provide a severity-ranked report with specific remediation steps

**Scoping options**:
- No argument → Full codebase security scan
- `deps` → Dependency vulnerability audit only
- `auth` → Authentication and authorization review
- `api` → API endpoint security review
- File/folder path → Scoped scan

**After the scan**, the agent ends its report with these options:
1. **Report only** — The security audit is complete
2. **Fix critical issues** — Fix critical findings with validation
3. **Create fix plan** — Generate `{{PLANS_DIR}}/PLAN_SECURITY_FIXES.md`
4. **Fix all** — Work through all findings by priority

Use the `Agent` tool to launch the secure agent (subagent_type="secure") which will perform a comprehensive security analysis and provide actionable remediation guidance.

**When the agent returns**: show the user its report, then ask which option they want with `AskUserQuestion` (the agent runs as a subagent and can't ask). For a fix or fix-plan option, relaunch the secure agent with the reported findings and "Fix these findings — don't re-scan" (naming which findings, per the chosen option), so it doesn't scan everything again.
