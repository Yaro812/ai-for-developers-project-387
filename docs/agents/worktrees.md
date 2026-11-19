# Worktree environments

Requires `jq` and `mise`.

`.claude/settings.json` wires two hooks:

- `WorktreeCreate` → `.claude/hooks/worktree-create.sh`: creates `.claude/worktrees/<name>` on branch `worktree-<name>` from the current `HEAD` (not `origin/main`), then runs `mise install` there (pinned tools, npm dependencies, Git hooks).
- `WorktreeRemove` → `.claude/hooks/worktree-remove.sh`: removes the worktree and deletes its branch if merged; a branch with unmerged commits is kept.

Dev servers started with `mise daemons start` get their own ports in each worktree, shown by `mise daemons urls`.

The hooks fire for `claude --worktree`, `EnterWorktree`/`ExitWorktree`, subagent `isolation: worktree` and background sessions. Desktop-app «Worktree» sessions are not among the documented triggers (not tested), and `WorktreeRemove` does not fire for subagent worktrees or for `claude -p` runs. Clean those up manually:

```bash
git worktree remove --force .claude/worktrees/<name>
git branch -d worktree-<name>
```
