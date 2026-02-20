---
description: Run a focused security scan on your codebase
argument-hint: [optional: file/folder path, or focus area like "deps", "auth", "api"]
author: "@markoradak"
---

# Security Scan

I'll perform a focused security audit of your codebase, checking for vulnerabilities, exposed secrets, and insecure patterns.

> **When to use**: You want a dedicated security review — not a general code review. Use `/audit` for broad code quality review, or `/cleanup` to remove dead code.

## Current State

**Working Directory**: !`pwd`

**Branch**: !`git branch --show-current 2>/dev/null || echo "Not a git repository"`

**Status**:
!`git status --short`

**Dependencies**:
!`cat package.json 2>/dev/null | grep -c '"dependencies\|"devDependencies"' || echo "No package.json"`

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

Use the Task tool to launch the secure agent (subagent_type="secure") which will perform a comprehensive security analysis and provide actionable remediation guidance.
