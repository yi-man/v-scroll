#!/usr/bin/env bash
set -euo pipefail

# Keep root orchestration order explicit: check -> test -> build.
bun run check
bun run test
bun run build
