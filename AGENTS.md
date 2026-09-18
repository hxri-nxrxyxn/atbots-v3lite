# AGENTS.md

## Repo status

- Monorepo: `apps/tablet` / `apps/operator` (SvelteKit SPAs); `packages/protocol`
  and `packages/link`; `mock/esp` and `mock/cloud` (Node simulators); `firmware/esp8266`
  (working bench prototype). Remote: `github.com/hxri-nxrxyxn/atbots-v3lite`.
- The design doc lives at `docs/AT_Bots_V3_Lite_Master_Technical_Design_Document.md`.

## Commands

- Install: `npm install` (repo root; npm workspaces).
- Run all services: `npm run dev:all` (starts mock-cloud, mock-esp, tablet, and operator).
- Dev apps: `npm run dev:tablet` / `npm run dev:operator`.
- Mock servers: `npm run dev:esp` (ws://localhost:8765) / `npm run dev:cloud` (http://localhost:8787).
- Build / check apps: `npm run build` / `npm run check`.
- Tests: `npm test` (vitest). Typecheck packages + mocks: `npm run typecheck`.
- Format: `npm run format`; verify with `npm run format:check`.
- Per-app scripts: `npm -w @atbots/tablet run <script>` (or `@atbots/operator`).

## The design document is not the build contract

- `docs/AT_Bots_V3_Lite_Master_Technical_Design_Document.md` (~3,700 lines) is an
  aspirational product/architecture spec for the full shipping system.
- Treat it as product context, **not** the implementation contract. Build only
  what is listed under "MVP scope" below. When the doc and this file conflict,
  this file wins.

## MVP scope (what we are building now)

- `apps/tablet` — SvelteKit SPA, visitor-facing: home tiles, AI session + animated
  face, settings.
- `apps/operator` — SvelteKit SPA: local operator controls + cloud admin/fleet views.
- `mock/esp` — Node WebSocket robot simulator (drive, telemetry, deadman, script
  broadcast).
- `mock/cloud` — Node HTTP+WS relay/API stub with a swappable AI provider.
- `firmware/esp8266` — minimal MicroPython: Wi-Fi + WebSocket + drive + telemetry.
- Demo must-shows: AI chat with animated face, teleop drive, fleet dashboard,
  Script Mode announcements.

## Explicitly out of scope

- Native Capacitor plugins, kiosk/boot/foreground service, APK builds (browser-only
  for the demo).
- BLE, binary/CRC protocol, servos, real STT/LLM, RAG, vision, metering/ledger,
  OTA, secure boot, ESP32 port, iOS, non-stub quizzes/games.

## Stack and conventions

- Svelte 5 runes only: `$state` / `$derived` / `$effect` / `$props`. No `export let`,
  `$:`, or `on:` handlers.
- SvelteKit in SPA mode: `ssr = false` in `src/routes/+layout.ts`, `@sveltejs/adapter-static`
  with an `index.html` fallback, `bundleStrategy: 'single'`. No server routes or `load`
  functions — there is no app backend.
- SvelteKit config lives in `vite.config.ts` via `sveltekit({...})` (SvelteKit 2.62+).
  There is no `svelte.config.js`; kit options (`adapter`, `output`, ...) are top-level keys.
- Tailwind v4 (CSS-first, `@tailwindcss/vite`) + shadcn-svelte.
- shadcn-svelte is initialized in both apps (`components.json`, preset `b0`, theme in
  `src/app.css`). Add components with `npx shadcn-svelte@latest add <name> -y --no-deps-install`
  then `npm install`. Do **not** re-run `shadcn-svelte init` — it demands an interactive
  preset and overwrites `src/app.css`.
- **UI Design Principles (Zero AI Slop)**:
  - Strict typography and clean editorial document hierarchy (`font-semibold tracking-tight`, `text-sm text-muted-foreground`).
  - **NO decorative pill tags, colored badge chips, or uppercase letter-spaced micro-tags everywhere** (these scream "AI template").
  - Use the established monochrome/amber brand palette (`--brand`, `--background`, `--card`, `--border`). Avoid random colored accents like neon greens/blues.
  - Keep interactive elements tactile, restrained, and intentional for physical kiosk touchscreens.
- TypeScript everywhere. npm workspaces (`npm -w <pkg> run <script>`), not
  pnpm/yarn.
- Capacitor is the intended wrapper but is not built yet. Do not attempt Android
  builds.

## Layout and boundaries

```
apps/tablet, apps/operator     SvelteKit SPAs
packages/protocol              message shapes, type guards, constants — single source of truth
packages/link                  EspLink (WS) + MockEspLink + CloudClient
mock/esp, mock/cloud           Node simulators
firmware/esp8266               MicroPython
docs/                          design doc, protocol.md, runbook.md
```

- `packages/*` export TypeScript source directly (`exports: "./src/index.ts"`); there is no
  build step — Vite, vitest and tsx consume the source.
- `mock/esp` and `firmware/esp8266` implement the same JSON protocol; keep them in sync.

## Protocol conventions

- Topic & Payload JSON over WebSocket (`cmd/drive`, `telemetry`, `event/say`).
- The ESP is the local hub: both apps connect to it.
- Script Mode routes operator (`cmd/say`) → ESP → tablet (`event/say`); the tablet speaks.
- Heartbeat 5 Hz (`sys/hb` @ 200 ms); deadman 500 ms → stop (`event/deadman`).
- Handshakes: `link.request(topic, payload)` resolves on correlated `res/ack`.
- Never duplicate message strings outside `packages/protocol`.

## AI and voice

- `mock/cloud` defines an `AIProvider` interface. `MockProvider` is the default; a
  real provider is selected by env (`AI_PROVIDER`). No provider keys in client apps.
- Chat input: Web Speech API with typed + canned-question fallback.
- Voice output: browser `speechSynthesis` behind a thin `Voice` interface
  (pre-recorded clips may replace it later).

## Toolchain gotchas

- No Android SDK: `adb`/`sdkmanager` absent and `ANDROID_HOME` unset. Android Studio
  is at `/opt/android-studio` with bundled JBR **JDK 25**; Capacitor/AGP will likely
  need JDK 21. Don't try to build an APK.
- Node 24 / npm 11 are available.

## Testing

- `npm test` runs vitest over `packages/*/src/**/*.test.ts` (protocol guards + `MockEspLink`
  ack/deadman behaviour). No e2e or hardware tests yet.
- Mock servers are smoke-tested manually: `curl localhost:8765/status` and
  `.venv/bin/python firmware/esp8266/tools/ws_probe.py ws://localhost:8765/ws`.

## ESP8266 bench device

- Board on `/dev/ttyUSB0` (CP2102), MicroPython v1.29, only **~25–30 KB free RAM** — keep
  server code small. `gc.collect()` once per telemetry tick keeps memory flat.
- Tooling in `.venv/` (gitignored): `adafruit-ampy`. Test with
  `.venv/bin/ampy --port /dev/ttyUSB0 --baud 115200 run <file>`; deploy with `put` + `reset`.
- Wi-Fi credentials live in `firmware/esp8266/config.py` (gitignored; copy `config.example.py`).
  The SSID contains a typographic apostrophe (U+2019) — a straight `'` will not connect.
- `firmware/esp8266/main.py` is the boot entrypoint; it serves HTTP `GET /status` and a
  JSON WebSocket on `/ws` (commands: `hb`, `drive`, `stop`, `set_expression`, `set_speaking`,
  `script_say`). Deadman stops drive 500 ms after the last `hb`.
- `firmware/esp8266/tools/ws_probe.py` exercises the WS channel (needs `websocket-client`).
