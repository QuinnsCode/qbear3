---
name: rebuild-pr
description: Bring an open PR up to date with main by merging main into its branch and resolving the conflicts. Use for "rebuild #N on main", "PR #N conflicts with main", "resolve #N's conflicts", or when main moved under an open PR.
---

# Rebuild a PR on main

1. **Still open?** `gh pr view N --json state,headRefName`. Stop unless `OPEN`.
2. **Check out.** `gh pr checkout N`. If the branch is checked out in another worktree:
   `git fetch origin <branch> && git checkout --detach FETCH_HEAD`, and later push to `HEAD:<branch>`.
3. **Merge main.** `git fetch origin main && git merge origin/main`. Merge, never rebase. No force push.
4. **Resolve so both sides survive.** Read the PR (`gh pr view N`, `gh pr diff N`) and the main commits
   that touched each conflicted file (`git log -p HEAD...origin/main -- <file>`).
   - Lockfile: take main's `pnpm-lock.yaml`, then `pnpm install` to regenerate it. Don't hand-merge.
   - Generated output (`generated/`, `worker-configuration.d.ts`) is regenerated with `pnpm run generate`.
   - Numbered migrations: renumber the PR's to the next free number.
   - JSON stays valid.
5. **Check, narrowly.** `pnpm run check`, and only the e2e files the PR touched
   (`bun test tests/e2e/<file>.test.ts`). Not the whole suite.
6. **Ship.** Commit the merge, `git push` (or `git push origin HEAD:<branch>` from a detached HEAD), then
   `gh pr checks N --watch` until green. Fix a red check and rerun just its test. Don't merge; the owner does.
7. **Report**, short:

   ```
   DONE  merged main into #N, 3 conflicts, CI green
   NEXT  owner merges
   BROKE nothing
   DONT  rebase, force push, merge
   ```
