#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p docs
at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
log="$(mktemp)"
RESULT=0

run() {
  local name="$1"
  shift
  printf '· %s\n' "$name"
  if "$@" >>"$log" 2>&1; then
    printf '  pass\n'
    RESULT=1
  else
    printf '  FAIL\n'
    tail -40 "$log"
    RESULT=0
  fi
}

run typecheck pnpm typecheck
tc="$RESULT"
run lint pnpm lint
lint="$RESULT"
run test pnpm test
test_result="$RESULT"
run build pnpm build
build="$RESULT"

printf '{"at":"%s","typecheck":%s,"lint":%s,"test":%s,"build":%s}\n' \
  "$at" \
  "$([ "$tc" = "1" ] && echo true || echo false)" \
  "$([ "$lint" = "1" ] && echo true || echo false)" \
  "$([ "$test_result" = "1" ] && echo true || echo false)" \
  "$([ "$build" = "1" ] && echo true || echo false)" >> docs/quality.log

if [ "$tc" != "1" ] || [ "$lint" != "1" ] || [ "$test_result" != "1" ] || [ "$build" != "1" ]; then
  echo "✗ Quality gate failed"
  exit 1
fi

echo "✓ Quality gate passed"
