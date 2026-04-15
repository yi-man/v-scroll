#!/usr/bin/env bash
set -euo pipefail

bun run check
bun run test
bun run build
