# Engineering Thinking & Architectural Rationale

> **AT Bots V3 Lite** — Core protocol design, transport abstraction, firmware constraints, monorepo ergonomics, and system invariants for a commercial interactive robotic kiosk.

---

## 1. Protocol Architecture (`packages/protocol`)

The communication contract across the tablet visitor surface, operator console, and microcontroller hub is defined in a single source of truth: [`packages/protocol`](packages/protocol/src/messages.ts).

### 1.1 Topic & Payload JSON Envelopes

Rather than adopting heavy serialization frameworks (Protobuf, gRPC, FlatBuffers) or ad-hoc socket emissions, the system standardizes on an MQTT-style **Topic & Payload envelope**:

```typescript
export interface BaseEnvelope<TTopic extends string, TPayload> {
    topic: TTopic;
    payload: TPayload;
    id?: string;   // Correlated request/response ID
    ts?: number;   // Epoch millisecond timestamp
}
```

#### Engineering Trade-Offs & Decisions:
- **Microcontroller Memory Footprint:** The bench hardware runs on an ESP8266 with **~25–30 KB of usable heap**. Binary deserializers require native C-bindings or generate intermediate object allocations that fragment memory rapidly. UTF-8 JSON frames parsed via streaming decoders with explicit garbage collection keep memory consumption deterministic.
- **Zero-Tooling Observability:** As UTF-8 text frames over standard WebSockets, payloads can be inspected directly in Chrome DevTools Network Tab, captured with `websocat`, or verified via CLI scripts ([`ws_probe.py`](firmware/esp8266/tools/ws_probe.py)) without compilation steps or `.proto` schema registries.
- **Namespaced Topic Taxonomy:**
  - `sys/*` — Connection lifecycle and liveness (`sys/hello`, `sys/hb`).
  - `cmd/*` — Imperative control inputs (`cmd/drive`, `cmd/stop`, `cmd/say`, `cmd/sequence`).
  - `res/*` — Correlated confirmations and error rejections (`res/ack`, `res/nack`, `res/hb_ack`).
  - `event/*` — Asynchronous broadcasts and safety alerts (`event/deadman`, `event/estop`, `event/say`).
  - `telemetry` — Periodic 1 Hz broadcast of hardware state.

### 1.2 Correlated Request-Response Handshakes

Standard WebSockets provide full-duplex framing but lack native request/response correlation. When an operator sends a drive command or sequence trigger, fire-and-forget messaging makes it impossible to know whether the controller accepted, queued, or rejected the command.

To achieve RPC semantics without HTTP overhead:
1. When calling `link.request(topic, payload, timeoutMs)`, the client assigns a monotonically increasing request ID (`req_<seq>_<timestamp>`).
2. The ESP evaluates system readiness (e.g., verifying E-Stop is inactive and parameters are within valid ranges) and returns a matching `res/ack` or `res/nack` carrying the same `id`.
3. If rejected (e.g., drive attempted while E-Stop is engaged), the ESP returns `res/nack` with `{ reason: "estop_active" }`, immediately rejecting the client Promise.
4. If the controller does not acknowledge within the timeout window (default 3000 ms), the client Promise rejects with a timeout error, detecting link failure without waiting on TCP timeouts.

### 1.3 The Deadman Failsafe Mechanism

For a 25 kg moving chassis, motion command delivery must be actively validated:

```
[ Operator App ]                              [ ESP Microcontroller ]
       |                                                |
       |--- sys/hb { seq: N } (5 Hz / 200ms) ---------->|  (Resets deadman timer)
       |<-- res/hb_ack { seq: N } ----------------------|
       |                                                |
       * * * Network drop / Operator tab backgrounded * * *
       |                                                |
       |                                                x  (Timer exceeds 500ms)
       |                                                |
       |                                                |--> Cut Motor PWM = 0
       |<-- event/deadman { state: "stopped" } ---------|    (Broadcast to all)
```

- **Heartbeat Cadence (`HEARTBEAT_MS = 200`):** Active control clients emit a 5 Hz heartbeat.
- **Deadman Window (`DEADMAN_MS = 500`):** If no heartbeat or drive packet arrives within 500 ms, the microcontroller immediately zeroes motor PWM outputs and halts the chassis.
- **Fail-Safe Invariant:** The system defaults to rest. Forward motion is a transient state requiring continuous, explicit cryptographic/temporal proof of operator intent.

### 1.4 Broadcast Script Mode

Script Mode allows an off-stage operator to broadcast canned or custom announcements through the robot:
1. Operator inputs text in the console and dispatches `cmd/say` with `{ text: "..." }`.
2. The ESP validates the packet, replies with a correlated `res/ack`, and re-broadcasts the payload as `event/say` to **all** connected clients.
3. The tablet application receives `event/say` from the local hub and feeds it directly into its speech synthesis engine.
4. This hub-and-spoke pattern eliminates the need for direct WebRTC peer-to-peer audio or complex client-to-client discovery.

---

## 2. Transport & Link Abstraction (`packages/link`)

Hardware is frequently unavailable during frontend and application development. Hardcoding WebSocket clients directly into UI components creates development bottlenecks and mocks that drift from hardware reality.

[`packages/link`](packages/link/src/esp-link.ts) defines the transport-agnostic `EspLink` contract:

```typescript
export interface EspLink {
    readonly status: LinkStatus;
    connect(): void;
    disconnect(): void;
    send(message: ClientMessage): void;
    request<TTopic extends ClientTopic>(
        topic: TTopic,
        payload: ExtractClientPayload<TTopic>,
        timeoutMs?: number
    ): Promise<ResAckMessage['payload']>;
    onMessage(handler: (message: EspMessage) => void): () => void;
    onTopic<TTopic extends EspTopic>(
        topic: TTopic | string,
        handler: (payload: ExtractPayload<TTopic>, message: EspMessage) => void
    ): () => void;
    onStatus(handler: (status: LinkStatus) => void): () => void;
    onTrace?(handler: (trace: PacketTrace) => void): () => void;
}
```

### 2.1 Complete Simulator Parity (`MockEspLink`)

[`MockEspLink`](packages/link/src/mock-esp-link.ts) is an in-memory, deterministic simulation of the physical robot firmware:
- Implements the exact same state machine as `firmware/esp8266/server.py`.
- Emits 1 Hz `telemetry` frames matching hardware field structures.
- Tracks `sys/hb` heartbeats; halts motors and triggers `event/deadman` if heartbeats lapse past 500 ms.
- Responds to `cmd/drive`, `cmd/stop`, `cmd/expression`, and `cmd/sequence` with correlated `res/ack` responses.
- Allows full UI, teleop, diagnostic, and telemetry dashboard development offline with zero hardware connected.

### 2.2 Robust Socket Lifecycle (`WebSocketEspLink`)

[`WebSocketEspLink`](packages/link/src/websocket-esp-link.ts) encapsulates connection resilience:
- **Connection State Machine:** Explicit transitions across `idle` → `connecting` → `open` → `closed` → `error`.
- **Queued Transmissions:** Non-heartbeat commands issued while reconnecting are preserved in a FIFO queue and flushed immediately upon socket handshake completion.
- **Heartbeat Shedding:** `sys/hb` frames are never queued during disconnects; stale heartbeats are discarded to prevent burst handshakes on reconnection.
- **Pending Request Invalidation:** If the socket drops while correlated requests are in flight, pending Promises are rejected immediately with a connection termination error rather than hanging until timeout.
- **Packet Tracing Pipeline:** An optional `onTrace` observer taps all outbound (`tx`) and inbound (`rx`) frames with high-resolution timestamps, driving real-time packet inspectors in the operator diagnostic panel.

---

## 3. Microcontroller Firmware Engineering (`firmware/esp8266`)

The bench motion controller runs on MicroPython on an ESP8266 (with a planned path to ESP32-S3). Designing reliable network services on a resource-constrained microcontroller demands strict defensive programming:

```python
# firmware/esp8266/server.py
MAX_BUFFER = 1024
DEADMAN_MS = 500
TELEMETRY_MS = 1000

while True:
    socks = [srv] + [client["sock"] for client in clients]
    ready, _, _ = select.select(socks, [], [], 0.2)
    now = now_ms()
    ...
    # Deterministic deadman evaluation
    if STATE["drive"] != "stop" and diff_ms(now, last_hb) > DEADMAN_MS:
        STATE["drive"] = "stop"
        STATE["speed"] = 0
        broadcast({"topic": "event/deadman", "payload": {"state": "stopped"}})

    # Fixed telemetry interval + explicit heap compaction
    if diff_ms(now, last_tel) > TELEMETRY_MS:
        last_tel = now
        gc.collect()
        broadcast(telemetry())
```

### 3.1 Firmware Implementation Invariants

1. **Single-Threaded Polling Loop (`select.select`):** Uses POSIX socket multiplexing with a 200 ms timeout across the listening socket and client descriptors. Avoids threading overhead, locks, and race conditions on bare-metal hardware.
2. **Strict Buffer Bounding (`MAX_BUFFER = 1024`):** Socket read buffers are strictly capped at 1024 bytes. Malformed frames or oversized payloads trigger connection termination before memory fragmentation can destabilize the heap.
3. **Deterministic Heap Management (`gc.collect()`):** MicroPython's automatic garbage collection can pause execution unpredictably. By invoking `gc.collect()` synchronously after each 1 Hz telemetry push, memory fragmentation is minimized, maintaining free heap steadily around ~25 KB.
4. **Lightweight RFC 6455 Frame Parser ([`ws.py`](firmware/esp8266/ws.py)):** Custom frame decoder implementing opcodes (`TEXT`, `BIN`, `PING`, `PONG`, `CLOSE`), client mask XOR unmasking, and SHA-1/Sec-WebSocket-Key handshakes in ~100 lines of efficient Python without third-party dependencies.

---

## 4. Developer Experience & Monorepo Architecture

The repository is organized as an npm workspace monorepo:

```
├── apps/
│   ├── tablet/          # Visitor-facing SvelteKit SPA (:5173)
│   └── operator/        # Operator console SvelteKit SPA (:5174)
├── packages/
│   ├── protocol/        # Message shapes, guards, constants (TypeScript)
│   └── link/            # EspLink, WebSocketEspLink, MockEspLink
├── mock/
│   ├── esp/             # Node.js WebSocket robot simulator (:8765)
│   └── cloud/           # Node.js AI relay & fleet API (:8787)
├── firmware/
│   └── esp8266/         # MicroPython bench server
└── docs/                # Specifications, ICDs, and protocol docs
```

### 4.1 Zero-Build Internal Package Exports

In standard TypeScript monorepos, internal libraries require separate build steps (`tsc -b`, Rollup, or esbuild), introducing build desynchronization, stale output artifacts, and watch-mode friction.

Here:
- Both `packages/protocol` and `packages/link` export raw TypeScript source files (`"exports": "./src/index.ts"`).
- SvelteKit, Vite, Vitest, and `tsx` consume the raw TypeScript sources directly.
- **Zero build step for packages.** Updating an interface in `messages.ts` propagates instantly across frontends, tests, and mock servers without compilation lag.

### 4.2 Unified Service Orchestration

Developing the multi-node system requires four concurrent processes:
1. `mock/cloud` — AI relay and fleet management API (`:8787`)
2. `mock/esp` — Hardware simulator (`:8765`)
3. `apps/tablet` — Visitor interface (`:5173`)
4. `apps/operator` — Control console (`:5174`)

[`scripts/dev-all.js`](scripts/dev-all.js) unifies these under a single command:

```bash
npm run dev:all
```

It spawns child processes across workspaces, prefixes stdout/stderr with dedicated ANSI color tags, and intercepts SIGINT/SIGTERM for clean teardown.

---

## 5. Fault Containment & System Invariants

A professional robotics control stack is evaluated not by how it behaves during nominal operations, but by **how deterministically it contains failure modes.**

### 5.1 Formal Safety Invariants

| Invariant | Guarantee | Enforcement Mechanism |
|---|---|---|
| **`INV-SAFE-01`** | Motors must never run without active proof of operator presence. | 500 ms firmware deadman timer (`DEADMAN_MS`); zero software overrides permitted. |
| **`INV-SAFE-02`** | E-Stop overrides all commands unconditionally. | Microcontroller ignores incoming drive frames when `estop == true`; returns `res/nack`. |
| **`INV-SAFE-03`** | AI models cannot command arbitrary motor trajectories. | Microcontroller accepts only predefined semantic sequence identifiers (`cmd/sequence`). Joint velocities and acceleration ramps are hard-coded in firmware. |
| **`INV-SAFE-04`** | Local control is immune to cloud network failures. | Teleop and safety routines execute entirely on the local subnet (`/ws`); no WAN dependency. |
| **`INV-SAFE-05`** | API secrets never touch client bundles. | LLM and cloud credentials reside exclusively on the cloud relay; clients receive only mediated session streams. |

### 5.2 Failure Mode & Recovery Matrix

```
+---------------------------+-----------------------------------+-----------------------------------+
| Failure Mode              | Primary Risk                      | Deterministic Recovery Action     |
+---------------------------+-----------------------------------+-----------------------------------+
| Network Partition         | Lost teleop control               | ESP deadman timer trips at 500ms; |
| (Venue Wi-Fi drops)       | during chassis motion             | PWM cut to 0; event/deadman       |
|                           |                                   | broadcast on reconnect.           |
+---------------------------+-----------------------------------+-----------------------------------+
| Client OS Backgrounding   | Operator browser tab              | Heartbeat pulse stops; ESP halts  |
| (Phone locked / tab swap) | suspended while driving           | drive within 500ms.               |
+---------------------------+-----------------------------------+-----------------------------------+
| Microcontroller Heap      | MicroPython heap exhaustion       | 1024-byte buffer cap rejects      |
| Pressure                  | from continuous allocations       | large frames; synchronous         |
|                           |                                   | gc.collect() on 1Hz tick.         |
+---------------------------+-----------------------------------+-----------------------------------+
| Stale Correlated Request  | Delayed response resolving an     | Pending requests reject on socket |
| (Socket drop mid-flight)  | invalid subsequent action         | drop; timers clear immediately.   |
+---------------------------+-----------------------------------+-----------------------------------+
| LLM Hallucination         | Cloud AI emitting invalid joint   | Schema rejection; unknown topics  |
| / Malformed Command       | angles or erratic velocity vectors| or parameters return res/nack.    |
+---------------------------+-----------------------------------+-----------------------------------+
```

### 5.3 Architectural Conclusion

AT Bots V3 Lite achieves reliability not through layers of defensive middleware, but through **strict physical boundaries and minimal surface area**:

1. **Separation of Planes:** The Control Plane (ESP + local WebSocket) has zero coupling to the Data Plane (Cloud API + LLM). The robot can drive and interact locally even if cloud services are unreachable.
2. **Minimal State Microcontroller:** The firmware acts as a deterministic state machine and hardware I/O multiplexer, leaving UI rendering, audio synthesis, and conversational logic to the tablet.
3. **Bounded Resources:** Buffer limits, memory compaction cadences, and failsafe timers are fixed constants, eliminating unbounded queue growth or memory leakage under sustained operation.
