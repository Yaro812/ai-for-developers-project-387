#!/usr/bin/env bash
# WorktreeRemove hook: remove the worktree, then its branch.
# stdin: {"worktree_path": "...", ...}. Non-zero exit keeps the worktree on disk.
set -euo pipefail

dir=$(jq -er .worktree_path)
root=$(dirname "$(git -C "$dir" rev-parse --path-format=absolute --git-common-dir)")

branch=$(git -C "$dir" branch --show-current)
git -C "$root" worktree remove --force "$dir" >&2
# -d, not -D: a branch with unmerged commits is kept rather than lost.
[[ -n "$branch" ]] && { git -C "$root" branch -d "$branch" >&2 || echo "kept unmerged branch $branch" >&2; }
exit 0
