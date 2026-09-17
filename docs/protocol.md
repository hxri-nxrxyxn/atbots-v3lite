# Protocol

Two JSON-over-WebSocket channels, defined once in `packages/protocol` and implemented by
`mock/esp`, `firmware/esp8266` and `packages/link`. Never duplicate message strings in apps.

## App ↔ ESP (local control plane)

Transport: `ws://<robot-ip>/ws`. Plain JSON text frames.

| Direction | Message | Notes |
|---|---|---|
| app → esp | `{"t":"hb","seq":n}` | 5 Hz (every 200 ms) |
| app → esp | `{"t":"drive","dir":"forward","speed":5}` | `stop`/`forward`/`backward`/`left`/`right` |
| app → esp | `{"t":"stop"}` | |
| app → esp | `{"t":"set_expression","value":"happy"}` | |
| app → esp | `{"t":"set_speaking","value":true}` | drives face mouth |
| app → esp | `{"t":"script_say","text":"..."}` | Script Mode |
| app → esp | `{"t":"play_sequence","name":"wave"}` | |
| app → esp | `{"t":"home"}` | |
| esp → app | `{"t":"hello","proto":1,"ip":"..."}` | on connect |
| esp → app | `{"t":"telemetry","drive":...,"speed":...,"expression":...,"speaking":...,"free":...,"uptime_ms":...}` | 1 Hz |
| esp → app | `{"t":"hb_ack","seq":n}` | |
| esp → app | `{"t":"ack","cmd":"drive"}` | |
| esp → app | `{"t":"nack","reason":"unknown_command","got":"..."}` | rejected, never silently clamped |
| esp → app | `{"t":"event","event":"deadman_stop","detail":"..."}` | `deadman_stop`/`estop`/`charger_connected`/`servo_fault`/`say` |

- **Deadman:** if no `hb` arrives within 500 ms, the ESP stops the drive and emits
  `deadman_stop`.
- **Script Mode** routes operator → ESP → all connected clients (`event: say`); the tablet
  speaks it.
- HTTP `GET /status` also returns the robot state as JSON.

## App ↔ cloud (data plane)

Stateless API (`mock/cloud`, port 8787):

- `GET /v1/fleet/robots`, `GET /v1/fleet/robots/:id`
- `POST /v1/fleet/robots/:id/restart`, `POST /v1/fleet/robots/:id/suspend`
- `GET /v1/credits/balance`, `GET /v1/content/knowledge`, `GET /v1/sessions`

Relay (`ws://localhost:8787/v1/session`):

- client → `session.start`, `user.text`, `audio.chunk`, `audio.end`, `session.end`
- server → `session.started`, `transcript.final`, `reply.chunk`, `tool.call`, `session.error`,
  `session.ended`

The relay picks its model with `AI_PROVIDER` (`mock` default, `openai` for a real provider).
Provider keys live only on the dev server, never in a client app.
