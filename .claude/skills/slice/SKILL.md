---
name: slice
description: Runs the current Clepso implementation slice from docs/implementation/STATUS.md. Plans the next dependency-ready slice when the current one is complete, otherwise implements its unchecked tasks test-first, commits each verified task, and closes the slice with checks, review and a slice record.
disable-model-invocation: true
argument-hint: '[slice id to plan instead of the one STATUS.md names]'
---

# Run one implementation slice

One slice per session. When the slice is closed, stop; the next one starts in a
fresh session from the tracker and git, not from this conversation.

## 1. Load the current state

- Read `docs/implementation/STATUS.md`. It holds only the current state.
- Read the `DECISIONS.md` records and the `slices/*.md` records this slice depends
  on, and only the blueprint pages it cites
  (`docs/product/clepso-implementation-blueprint.pdf`). Exact verification commands
  from the latest record (for example, integration suites need Redis at `REDIS_URL`)
  are in the most recent `slices/*.md`.
- Run `git status` and `git log --oneline -5`. Expect a clean tree on `impl/core`. If
  it holds changes you didn't make, stop and ask before touching anything.

## 2. If the STATUS.md slice is complete: plan the next one, then stop

- Invoke `agent-skills:planning-and-task-breakdown` for the next dependency-ready
  slice STATUS.md names (or `$ARGUMENTS`).
- Write it into the STATUS.md header in the existing format: outcome,
  prerequisites, cited PDF pages, and at most four ordered tasks with checkboxes.
  Commit that tracker change on its own.
- Present the plan and stop. Implement only after an unambiguous approval.

Do not use `agent-skills:build auto` here: it expects `SPEC.md` and
`tasks/plan.md` and would start a second tracker.

## 3. Otherwise: implement the unchecked tasks in order

For each task:

1. Invoke `agent-skills:incremental-implementation` and
   `agent-skills:test-driven-development`, plus every boundary skill AGENTS.md maps
   to the task, by name: `frontend-ui-engineering` for UI;
   `api-and-interface-design` and `security-and-hardening` for API, auth, money or
   AI; `doubt-driven-development` for migrations, RLS, matter access, money or
   anything irreversible.
2. Write the failing test first and watch it fail for the expected reason.
3. Implement the minimum, then run the affected tests and `pnpm typecheck`.
   Database changes also need `pnpm --filter @lawfirm/db test` against local
   Supabase, including clean, upgrade, down and reapply.
4. Tick the task in STATUS.md and commit only that task's files (never
   `git add -A`), in the repository's `Area: summary` style with the slice id.

Stop and ask instead of pushing through when a test can't pass without weakening
it, the blueprint or a decision is ambiguous, or a step touches hosted services,
credentials, providers, deployment, or can't be undone with `git revert`.

## 4. Close the slice

- Run the full CI baseline from AGENTS.md and report every command's result,
  including failures you could not fix.
- Review the slice diff on the five axes. When it touches auth, matter access,
  money or migrations, run the `code-reviewer`, `security-auditor` and
  `test-engineer` agents in parallel and fix what they find.
- Capture browser evidence for the slice's new screens and states in
  `docs/implementation/evidence/<slice-id>/` with the repository's browser harness
  (`apps/api/test/*.browser.mjs`).
- Write `docs/implementation/slices/<slice-id>.md`: scope, changed paths, acceptance
  evidence against the cited PDF gates, exact commands and outcomes, review and
  cleanup. Add decisions to `DECISIONS.md`. Update the STATUS.md header, affected
  matrix rows, open gates and slice index. Commit.
- Report what was delivered, what stays open, and the next dependency-ready slice.
  Then stop.
