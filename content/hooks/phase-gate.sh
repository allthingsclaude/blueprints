#!/bin/sh
# Blueprints phase gate: Stop hook for the implement agent (it fires as SubagentStop).
# If the project's typecheck fails when the agent tries to finish, it blocks once
# and hands the errors back so the agent can fix them. Anything unexpected exits 0.
# Disable with BLUEPRINTS_PHASE_GATE=0.

[ "${BLUEPRINTS_PHASE_GATE:-1}" = "0" ] && exit 0

input=$(cat)

# Already continuing because of a stop hook: let the agent finish (no loops).
printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0

dir=$(printf '%s' "$input" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
if [ -n "$dir" ] && [ -d "$dir" ]; then
  cd "$dir" || exit 0
fi

# Only JS/TS projects with a typecheck script are gated.
[ -f package.json ] || exit 0

script=""
for name in typecheck type-check check-types types:check; do
  if grep -q "\"$name\"[[:space:]]*:" package.json; then
    script=$name
    break
  fi
done
[ -n "$script" ] || exit 0

if [ -f pnpm-lock.yaml ]; then pm=pnpm
elif [ -f yarn.lock ]; then pm=yarn
elif [ -f bun.lockb ] || [ -f bun.lock ]; then pm=bun
else pm=npm
fi
command -v "$pm" >/dev/null 2>&1 || exit 0

if out=$("$pm" run "$script" 2>&1); then
  exit 0
fi

{
  echo "Typecheck failed (\`$pm run $script\`). Fix the errors your changes caused before finishing."
  echo "If these errors were already there before you started, say so in your report and finish."
  echo
  printf '%s\n' "$out" | tail -n 40
} >&2
exit 2
