#!/usr/bin/env bash
# WorktreeCreate hook: git worktree with its pinned tools and npm dependencies.
# stdin: {"name": "...", "cwd": "...", ...}. stdout: worktree path (last line). Logs go to stderr.
set -euo pipefail
exec 3>&1 1>&2

input=$(cat)
name=$(jq -er .name <<<"$input")
cwd=$(jq -er .cwd <<<"$input")

# Main checkout root, even when called from inside another worktree.
root=$(dirname "$(git -C "$cwd" rev-parse --path-format=absolute --git-common-dir)")
dir="$root/.claude/worktrees/$name"

if [[ ! -e "$dir" ]]; then
  # Base = HEAD of the checkout Claude runs in (same as worktree.baseRef "head").
  git -C "$cwd" worktree add -b "worktree-$name" "$dir" HEAD
fi

cd "$dir"
# Pinned tools, npm dependencies and Git hooks (postinstall hook in mise.toml).
mise trust --quiet
mise install

echo "$dir" >&3
