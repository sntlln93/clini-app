#!/usr/bin/env bash
# Conditional quality gate: detects which side of the codebase changed and
# runs only the matching tools. Backend runs through Sail (apps/api) — there
# is no local PHP. Frontend runs inside the already-running `panel` container
# (apps/panel/compose.yaml, brought up together with apps/api's via the root
# compose.yaml's `include`) — it isn't part of the Sail PHP container, and a
# local node breaks vitest/rollup.
#
# Usage: bash .claude/skills/run-forensics/scripts/run-forensics.sh [--full]
#   --full | --pr   also run the test suites of the touched side(s)
#                   (vitest / pest; playwright is skipped here even though it
#                   can run locally — see the e2e compose profile in
#                   CLAUDE.md — because it's too heavy for this fast gate)

set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1

# Sail resolves compose.yaml relative to the caller's cwd, not its own
# location — it must be invoked from apps/api even though this script runs
# from the repo root.
sail() {
    (cd apps/api && ./vendor/bin/sail "$@")
}

# The panel service isn't reachable through Sail's wrapper (that only targets
# laravel.test), so it's addressed directly via docker compose, through the
# root compose.yaml (the `include` that merges apps/api's and apps/panel's
# files into one project — same one `docker compose up` from the repo root
# uses). WWWUSER/WWWGROUP mirror what vendor/bin/sail itself exports, so
# files eslint/prettier write stay owned by the host user instead of root.
export WWWUSER=${WWWUSER:-$UID}
export WWWGROUP=${WWWGROUP:-$(id -g)}
panel() {
    docker compose exec -T --workdir /workspace/apps/panel panel "$@"
}

# e2e/ (root-level: shared by no single app) has no running container of its
# own — a one-off container keeps this off the host node, which is neither a
# pinned version nor guaranteed to be present.
e2e_node() {
    docker run --rm -v "$PWD:/app" -w /app --user "$WWWUSER:$WWWGROUP" -e HOME=/tmp \
        node:24-bookworm-slim "$@"
}

FULL=false
if [ "${1:-}" = "--full" ] || [ "${1:-}" = "--pr" ]; then
    FULL=true
fi

# `sail ps` only reports on laravel.test/pgsql — it has no notion of panel,
# so a stack started with `sail up` alone (api only, no frontend) would
# otherwise pass this check and then fail confusingly on the first `panel`
# docker compose exec below. Check both directly against the root project.
down=()
docker compose ps laravel.test 2>/dev/null | grep -q "Up" || down+=("laravel.test")
docker compose ps panel 2>/dev/null | grep -q "Up" || down+=("panel")
if [ ${#down[@]} -gt 0 ]; then
    echo "ERROR: not running: ${down[*]}. Start everything with: docker compose up -d (from the repo root)" >&2
    exit 1
fi

# Changed files: committed on this branch (vs the merge-base with develop)
# + staged + working tree + untracked.
base=$(git merge-base HEAD origin/develop 2>/dev/null \
    || git merge-base HEAD develop 2>/dev/null \
    || echo HEAD)
files=$(
    {
        git diff --name-only "$base" 2>/dev/null
        git diff --name-only --cached 2>/dev/null
        git ls-files --others --exclude-standard
    } | sort -u
)

backend=false
frontend=false
e2e=false
grep -qE '^apps/api/.*\.php$|^apps/api/composer\.(json|lock)$|^apps/api/database/|^apps/api/routes/|^apps/api/(phpstan|phpunit|pint)\.' <<<"$files" && backend=true
grep -qE '^apps/panel/src/.*\.(ts|tsx|js|jsx|css)$|^apps/panel/package(-lock)?\.json$|^apps/panel/(vite|vitest|tailwind|postcss|eslint)\.config' <<<"$files" && frontend=true
grep -qE '^e2e/|^playwright\.config\.ts$|^package(-lock)?\.json$' <<<"$files" && e2e=true

if ! $backend && ! $frontend && ! $e2e; then
    echo "No backend, frontend or e2e changes detected — nothing to validate."
    exit 0
fi

echo "Changed sides: backend=$backend frontend=$frontend e2e=$e2e (full=$FULL)"
echo

failures=()
# Output is captured, not streamed: a passing tool prints its whole file/test
# list, which is pure noise that an agent then re-reads on every later turn.
# On success only the label is emitted; on failure, a per-tool filtered log
# (falling back to the raw tail when the filter matches nothing).
filter_log() {
    local filter=$1 log=$2
    case "$filter" in
        phpstan)
            # Drop PHPStan's fixed preamble/table borders — keep only
            # "path:line:message" lines — and strip the container path prefix.
            grep -E '^[^:]+:[0-9]+:' "$log" | sed -E 's#^/var/www/html/##'
            ;;
        tsc)
            grep -E 'error TS' "$log"
            ;;
        eslint)
            sed -E 's/^[[:space:]]+//; s/[[:space:]]{2,}/ /g' "$log"
            ;;
        vitest)
            grep -E '^::error' "$log"
            ;;
        pest)
            sed -E $'s/\x1b\\[[0-9;]*[a-zA-Z]//g' "$log"
            ;;
        raw | *)
            cat "$log"
            ;;
    esac
}

run() {
    local label=$1 filter=$2
    shift 2
    local log
    log=$(mktemp)
    if "$@" >"$log" 2>&1; then
        echo "==> $label: OK"
    else
        echo "==> $label: FAILED"
        local filtered
        filtered=$(filter_log "$filter" "$log")
        if [ -z "$filtered" ]; then
            tail -n "${VALIDATE_LOG_LINES:-40}" "$log"
        else
            echo "$filtered" | head -n "${VALIDATE_LOG_LINES:-40}"
        fi
        echo
        failures+=("$label")
    fi
    rm -f "$log"
}

if $backend; then
    run "pint" "raw" sail php ./vendor/bin/pint
    run "phpstan" "phpstan" sail php ./vendor/bin/phpstan analyse --error-format=raw --no-progress
fi

if $frontend; then
    run "prettier (write)" "raw" panel npm run format
    run "eslint (fix)" "eslint" panel npm run lint -- --max-warnings=0
    run "tsc" "tsc" panel npm run typecheck
fi

if $e2e; then
    run "tsc (e2e)" "tsc" e2e_node npx tsc -p e2e --noEmit
fi

if $FULL; then
    $backend && run "pest" "pest" sail php ./vendor/bin/pest --compact --colors=never
    $frontend && run "vitest" "vitest" panel npm run test -- --reporter=github-actions --no-isolate
    # Playwright itself is skipped here, not because it can't run locally
    # (see `docker compose --profile e2e up e2e` in CLAUDE.md) — it's just too
    # heavy for this fast quality gate (composer install, migrate, browser
    # download on first run). The e2e required check covers it on every PR.
    $e2e && echo "==> playwright: skipped locally (heavy — run via the e2e compose profile if needed)" && echo
fi

if [ ${#failures[@]} -gt 0 ]; then
    echo "FAILED: ${failures[*]}"
    exit 1
fi

echo "All checks passed."
