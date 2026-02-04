#!/usr/bin/env bash
# Design document validation script
# Validates frontmatter structure for design documentation

set -euo pipefail

file="${1:-}"

if [[ -z "$file" ]]; then
  echo "Usage: validate-design-doc.sh <file>" >&2
  exit 1
fi

if [[ ! -f "$file" ]]; then
  echo "Error: File not found: $file" >&2
  exit 1
fi

# Basic validation: check for required frontmatter
if ! head -1 "$file" | grep -q "^---$"; then
  echo "Error: Missing frontmatter in $file" >&2
  exit 1
fi

# Check for closing frontmatter
if ! grep -q "^---$" "$file"; then
  echo "Error: Unclosed frontmatter in $file" >&2
  exit 1
fi

echo "Validated: $file"
exit 0
