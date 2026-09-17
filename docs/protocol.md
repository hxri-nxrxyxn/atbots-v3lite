# Protocol

Two standardized WebSocket channels, defined once in `packages/protocol` and implemented by
`mock/esp`, `firmware/esp8266` and `packages/link`. Never duplicate message strings in apps.

## App ↔ ESP (Local Control Plane)

Transport: `ws://<robot-ip>/ws`. MQTT-style **Topic & Payload JSON envelopes** with optional correlated **Request-Response IDs** (`id`).

```typescript
interface Envelope<TTopic, TPayload> {
  topic: TTopic;
  payload: TPayload;
  id?: string;   // Correlated request/response ID
  ts?: number;   // Millisecond timestamp
}
```

| Direction | Topic | Payload | Handshake / Response |
|---|---|---|---|
| **App ↔ ESP** | `sys/hello` | `{ proto: 2, ip: string, robot_id?: string }` | Sent by ESP on connect |
| **App → ESP** | `sys/hb` | `{ seq: number }` | `res/hb_ack` (`{ seq: number }`) |
| **App → ESP** | `cmd/drive` | `{ dir: 'forward'\|'stop'..., speed: 0-10 }` | `res/ack` (`{ status: 'ok', cmd: 'cmd/drive' }`) |
| **App → ESP** | `cmd/stop` | `{}` | `res/ack` (`{ status: 'ok', cmd: 'cmd/stop' }`) |
| **App → ESP** | `cmd/expression` | `{ value: 'happy'\|'neutral'... }` | `res/ack` (`{ status: 'ok', cmd: 'cmd/expression' }`) |
| **App → ESP** | `cmd/speaking` | `{ value: boolean }` | `res/ack` (`{ status: 'ok', cmd: 'cmd/speaking' }`) |
| **App → ESP** | `cmd/say` | `{ text: string }` | `res/ack` (`{ status: 'ok', cmd: 'cmd/say' }`) + broadcasts `event/say` |
| **App → ESP** | `cmd/sequence` | `{ name: string }` | `res/ack` (`{ status: 'ok', cmd: 'cmd/sequence' }`) |
| **App → ESP** | `cmd/home` | `{}` | `res/ack` (`{ status: 'ok', cmd: 'cmd/home' }`) |
| **ESP → All** | `telemetry` | `{ drive, speed, expression, speaking, free, uptime_ms }` | 1 Hz periodic broadcast |
| **ESP → All** | `event/say` | `{ text: string, from?: string }` | Broadcast on Script Mode line |
| **ESP → All** | `event/deadman` | `{ state: 'stopped' }` | Failsafe trip broadcast |
| **ESP → All** | `event/estop` | `{ state: 'active' \| 'cleared' }` | E-stop status change |
| **ESP → Sender**| `res/ack` | `{ status: 'ok', cmd: string }` | Correlated command confirmation |
| **ESP → Sender**| `res/nack` | `{ status: 'error', reason: string, got?: string }` | Rejected command with explanation |

- **Deadman:** If no `sys/hb` arrives within 500 ms, the ESP stops the drive and emits `event/deadman`.
- **Script Mode:** Routes Operator (`cmd/say`) → ESP → all connected clients (`event/say`); the tablet speaks it.
- **Correlated Handshakes:** Using `link.request(topic, payload)` sends an `id` and awaits the matching `res/ack` response.
- HTTP `GET /status` returns the robot state as JSON.

## App ↔ Cloud (Data Plane)

Stateless API (`mock/cloud`, port 8787):

- `GET /v1/fleet/robots`, `GET /v1/fleet/robots/:id`
- `POST /v1/fleet/robots/:id/restart`, `POST /v1/fleet/robots/:id/suspend`
- `GET /v1/credits/balance`, `GET /v1/content/knowledge`, `GET /v1/sessions`

Relay (`ws://localhost:8787/v1/session`):

- client → `session.start`, `user.text`, `audio.chunk`, `audio.end`, `session.end`
- server → `session.started`, `transcript.final`, `reply.chunk`, `tool.call`, `session.error`, `session.ended`

The relay picks its model with `AI_PROVIDER` (`mock` default, `openai` for a real provider).
Provider keys live only on the dev server, never in a client app.
