# @lawfirm/landing

The Clepso marketing site: one responsive page built with Next.js 16 (Turbopack), TypeScript and Tailwind CSS v4, themed entirely by the Clepso design tokens. All product demonstrations use one fictional matter and run in the browser; no AI service is called.

```sh
pnpm install
pnpm --filter @lawfirm/ui-web build        # tokens + icons the site imports
cp apps/landing/.env.example apps/landing/.env.local
pnpm --filter @lawfirm/landing dev         # http://localhost:3200
```

Set `NEXT_PUBLIC_SIGN_UP_URL` and `NEXT_PUBLIC_LOGIN_URL` to the web app (`http://localhost:3100/sign-up` and `/sign-in` locally), or `NEXT_PUBLIC_LAUNCH_MODE=early-access` for the enquiry form.

## Where things live

- `src/config/site.ts`: destinations, launch mode, stage. `src/config/features.ts`: Available / Preview / Planned. `src/config/launch.ts`: blockers that fail a production-stage build.
- `src/content/sample-matter.ts`: the fictional matter every demo reads.
- `src/components/sections`: page sections in reading order. `src/components/demo`: the four AI workflows. `src/components/hero`: vessel scene, static fallback and the hero sequence.
- `src/app/api/early-access`: validates enquiries and forwards them to `EARLY_ACCESS_ENDPOINT`.

See `HANDOFF.md` for the research map, token mapping, licences, feature-status assumptions, launch blockers and test record.
