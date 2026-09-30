# H1 mobile preview on macOS

This app uses native modules, so run an iOS development build in Simulator. Install Xcode from the Mac App Store, open it once to finish setup, and install an iOS Simulator runtime in **Xcode → Settings → Components**. Select the installed Xcode in **Settings → Locations → Command Line Tools**.

From the repository root, run:

```sh
pnpm install
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer pnpm --filter @lawfirm/mobile preview:ios
```

The second command builds and installs the native app, then starts Metro. To reopen an already installed build after JavaScript changes, run `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer pnpm --filter @lawfirm/mobile preview:start` and press `i` in the Expo terminal. The `DEVELOPER_DIR` prefix is needed on this Mac because its global command-line tools setting still points to Command Line Tools rather than Xcode.

Native dependencies follow the Expo SDK 57 known-good set (`npx expo install --check` is clean; Sentry, FlashList and Skia are pinned newer via `expo.install.exclude`). After any native dependency change, run `preview:ios` again so the development build is rebuilt; JavaScript-only edits hot-reload through Metro.

Preview mode opens Today with the imported H1 mock data. It is enabled only in debug builds by `EXPO_PUBLIC_H1_PREVIEW=1`; it needs no local Supabase or API credentials. Remove that variable to test real authentication with the `EXPO_PUBLIC_*` values in `.env.example`.

## Simulator inside VS Code

When the local stream is running, press **Cmd+Shift+P** in VS Code, choose **Browser: Open Integrated Browser**, and enter `http://localhost:3200`. You can also select the localhost link in the VS Code terminal. To start the stream after a restart, with the iPhone Simulator booted and Expo preview running, choose **Tasks: Run Task** → **H1: Start iOS Simulator preview**. Keep the task terminal running while you use the preview.

This uses `serve-sim` 0.1.47. Its live stream was checked on the iPhone 18 Pro with Xcode 27. The earlier SimDeck extension could not stream this Xcode version because its binary looks for `SimulatorKit.framework` in the old Xcode directory; it was removed from VS Code.

## How the H1 shell is built

- `src/features/h1/H1App.tsx` is a single state machine ported from the prototype: the tab bar, sheets and screens switch local state, and the expo-router files under `app/` are thin entry points that mount it with an initial screen (`/matters/[id]`, `/billing/invoices/[id]`, `/contacts/[id]`). Splitting it into real routes is the next structural step once the backend hooks land.
- The running timer lives in `src/features/time/timerStore.ts` (zustand, mirrored to MMKV, wall-clock based) so it survives remounts and an app kill. Preview builds seed it once with the prototype's 42:17 Bennett timer.
- Money copy goes through `money()` in `data.ts`, which wraps `formatCents` from `@lawfirm/core`; amounts are integer cents everywhere.
- Confirmations use the `Dialog` primitive; the bottom sheet is still the local `H1Sheet` and should move to `@gorhom/bottom-sheet` when the flows get real forms.
- Theme defaults to light; the Settings "Courthouse mode" switch flips to the dark theme. A system/light/dark appearance picker is a later addition.

## Handoff for a new Codex chat

Open this repository in the IDE and ask Codex to continue the H1 mobile implementation. The imported source is `design/handoff/H1 Mobile Prototype.dc.html`; the React Native implementation is in `apps/mobile/src/features/h1/H1App.tsx` and `data.ts`. The iOS 27 development build was built, installed, and displayed the Today screen on an iPhone 18 Pro Simulator. Expo's one-time developer menu may cover the screen on first launch; select **Continue** to dismiss it. The preview uses local mock data and does not write to the backend. Current edits are in the working tree on `design/clepso-design-system`.
