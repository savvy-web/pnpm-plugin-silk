#!/usr/bin/env bash
# Update timestamp in design document frontmatter
# Updates the 'updated' field to current date

set -euo pipefail

file="${1:-}"

if [[ -z "$file" ]]; then
  echo "Usage: update-timestamp.sh <file>" >&2
  exit 1
fi

if [[ ! -f "$file" ]]; then
  echo "Error: File not found: $file" >&2
  exit 1
fi

# Get current date in ISO format
current_date=$(date +%Y-%m-%d)

# Update the 'updated' field in frontmatter if it exists
if grep -q "^updated:" "$file"; then
  sed -i '' "s/^updated:.*/updated: $current_date/" "$file"
  echo "Updated timestamp in: $file"
else
  echo "No 'updated' field found in: $file"
fi

exit 0
