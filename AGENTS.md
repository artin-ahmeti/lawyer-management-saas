# Clepso engineering workflow

Read `CLAUDE.md` for the repository layout, commands, and architecture rules.
Read any `AGENTS.md` inside the application being changed before editing it.
The product roadmap is `docs/product/clepso-implementation-blueprint.pdf`: nationwide
US coverage, all practice areas, web and native applications, and the AI
receptionist as the final module. Implement one module slice at a time.

## Apply Agent Skills

The Addy Osmani Agent Skills pack is installed in the user's Codex skills directory.
Load only the skills relevant to the task, including their referenced checklists:

- Existing-code work: `context-engineering` and `code-review-and-quality`.
- New features: `spec-driven-development`, `planning-and-task-breakdown`, and
  `incremental-implementation`.
- Logic and bug fixes: `test-driven-development`; reproduce the failure before fixing it.
- API, auth, financial, or AI boundaries: `api-and-interface-design` and
  `security-and-hardening`.
- Pipeline changes: `ci-cd-and-automation`.

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
- Leave changes reviewable; merge and deployment require user authorization.
