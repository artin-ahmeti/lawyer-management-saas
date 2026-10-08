# Clepso engineering workflow

Read `CLAUDE.md` for the repository layout, commands, and architecture rules.
Read any `AGENTS.md` inside the application being changed before editing it.
The product roadmap is `docs/product/clepso-implementation-blueprint.pdf`: nationwide
US coverage, all practice areas, web and native applications, and the AI
receptionist as the final module. Implement one module slice at a time.

## Apply Agent Skills

The Addy Osmani Agent Skills pack is installed for both agents: the `agent-skills`
plugin in Claude Code (declared in `.claude/settings.json`) and the user's Codex
skills directory. Load only the skills relevant to the task, including their
referenced checklists, and invoke them by name; a skill that another file only
mentions ("see X") does not load on its own:

- Existing-code work: `context-engineering` and `code-review-and-quality`.
- New features: `spec-driven-development`, `planning-and-task-breakdown`, and
  `incremental-implementation`.
- Logic and bug fixes: `test-driven-development`; reproduce the failure before fixing it.
- API, auth, financial, or AI boundaries: `api-and-interface-design` and
  `security-and-hardening`.
- Staff web or native UI: `frontend-ui-engineering`.
- Migrations, RLS, matter access, money, or anything irreversible:
  `doubt-driven-development`.
- Pipeline changes: `ci-cd-and-automation`.

## Implementation tracker

- `docs/implementation/STATUS.md` holds only the current state: the latest and next
  slice, module matrix, open gates and slice index. Do not append session logs to it.
- Each slice's full record goes in `docs/implementation/slices/<slice-id>.md`, its
  screenshots in `docs/implementation/evidence/<slice-id>/`, and its decisions in
  `docs/implementation/DECISIONS.md`. Read older records only when a task needs them.
- Work one slice per session. The tracker and git history are the handoff between
  sessions, not the conversation.

User instructions and existing authorization take precedence over skill guidance.
Keep changes focused and preserve unrelated working-tree changes.

## Completion checks

- Run lint, formatting, types, affected tests, and builds as appropriate to the change.
- The CI baseline is `pnpm lint`, `pnpm format:check`, `pnpm typecheck`,
  `pnpm --filter '!@lawfirm/db' test`, `pnpm build`, and
  `pnpm audit --audit-level high`.
- Database changes additionally require `pnpm --filter @lawfirm/db test` against
  local Supabase. Tenant isolation remains a separate blocking CI job.
- Review correctness, readability, architecture, security, and performance.
- Report failed or unavailable checks explicitly. Fix failures instead of disabling
  checks, skipping tests, or treating a preview screen as an implemented feature.
- All application writes flow through the NestJS API. Keep tenant and matter
  authorization, server-side money calculations, and secrets out of client code.
- Commit each verified slice task on the implementation branch (currently
  `impl/core`), staging only that task's files. Pushing, merging and deployment
  require user authorization.
