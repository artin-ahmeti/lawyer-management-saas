# Feature slices

One directory per domain (matters, contacts, tasks, calendar, time, billing,
documents, intake). Each slice owns its `api.ts` (reads via supabase-js, writes
via @lawfirm/api-client), `hooks.ts`, `schemas.ts` (re-exported from
@lawfirm/core where shared), and `components/`.

Do not import across slices except through their public index.
