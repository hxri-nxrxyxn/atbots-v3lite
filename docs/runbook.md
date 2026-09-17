# Demo Runbook — AT Bots V3 Lite

A step-by-step guide to running an end-to-end live demo of the AT Bots V3 Lite platform.

---

## 1. Architecture Checklist

```
[ Operator App ] (:5174) ───┐
                            ├──► (WS :80 or :8765) ──► [ ESP8266 / Mock ESP ]
[ Tablet App ]   (:5173) ───┤                                ▲
     │                      │                                │ (tool calls)
     └──────► (WSS :8787) ──┴────────────────────────► [ Mock Cloud Relay ]
```

- **Local Control Plane:** Tablet and Operator both connect to the ESP (or `mock-esp`). Script Mode announcements and telemetry travel across this local WebSocket channel with **zero internet reliance**.
- **AI Data Plane:** Tablet opens an AI session with the Cloud Relay (:8787). Model output streams speech to the tablet and triggers tool calls (`set_expression`, `play_sequence`) on the ESP.

---

## 2. Pre-flight Setup & Startup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Background Services

You can start the demo services in separate terminals:

```bash
# Terminal 1 — Cloud Relay & Stateless API (:8787)
npm run dev:cloud

# Terminal 2 — (Optional) Mock ESP if physical hardware is offline (:8765)
npm run dev:esp

# Terminal 3 — Visitor Tablet App (:5173)
npm run dev:tablet

# Terminal 4 — Operator Console App (:5174)
npm run dev:operator
```

*Or use the single-command dev runner:*
```bash
npm run dev:all
```

---

## 3. Demo Walkthrough

### Part 1: Visitor AI Conversation & Animated Face
1. Open the **Tablet App** at `http://localhost:5173`.
2. Tap **Speak with AI** (`/session`).
3. Speak into the microphone (in Chrome on localhost) or click one of the quick chips:
   - *"What are the school timings?"*
   - *"Tell me about admissions"*
   - *"Can you wave?"*
4. **Observe:**
   - The SVG face smoothly morphs expressions (e.g., to `thinking` then `speaking`).
   - The mouth animates synchronously with the browser's voice output.
   - On *"Can you wave?"*, a tool call is dispatched to the robot controller.
   - Tap **Stop** mid-utterance to demonstrate tactile barge-in.

---

### Part 2: Operator Teleop & Deadman Failsafe
1. Open the **Operator App** at `http://localhost:5174`.
2. Go to **Connect**:
   - Select **Simulated robot** (or **ESP8266 over Wi-Fi** at `ws://192.168.0.155/ws`).
   - Click **Connect** → Status transitions to `Robot linked`.
   - Enter PIN `123456` to unlock controls.
3. Navigate to **Drive** (`/drive`):
   - Press and hold **Forward** / **Left** / **Right** → Telemetry reflects active drive and speed.
   - Release the button → Immediate ramped stop.
   - **Deadman test:** Hold a direction and switch browser tabs or close the page → ESP stops the drive within 500 ms and emits `deadman_stop`.
   - Tap **E-stop** → Software emergency stop latches and cuts drive commands until reset.

---

### Part 3: Script Mode (Operator Announcement → Tablet Speech)
1. On the **Operator App**, go to **Script Mode** (`/script`).
2. Tap any preset announcement (e.g., *"Welcome to the event. Please make your way to the main hall."*) or type a custom message.
3. **Observe the Tablet App:**
   - The tablet intercepts the broadcast event from the ESP.
   - The tablet face switches to `speaking` and speaks the announcement out loud.

---

### Part 4: Fleet & Credit Management
1. In the **Operator App**, go to **Fleet** (`/fleet`):
   - View connected robots, firmware versions, battery percentages, and status badges.
   - Tap a robot for detailed metrics, or test the **Restart** / **Suspend** controls.
2. Go to **Credits** (`/credits`):
   - Observe live balance, daily burn rate, and projected run-out time.
3. Go to **Sessions** (`/sessions`):
   - Inspect recent AI conversations and exact credit usage per session.

---

## 4. Hardware ESP8266 Checklist (When Bench Device is Attached)

1. Connect ESP8266 over USB (`/dev/ttyUSB0`).
2. Copy credentials:
   ```bash
   cp firmware/esp8266/config.example.py firmware/esp8266/config.py
   # Edit config.py with Wi-Fi SSID / Password
   ```
3. Flash and verify:
   ```bash
   .venv/bin/ampy --port /dev/ttyUSB0 --baud 115200 put firmware/esp8266/net.py net.py
   .venv/bin/ampy --port /dev/ttyUSB0 --baud 115200 put firmware/esp8266/ws.py ws.py
   .venv/bin/ampy --port /dev/ttyUSB0 --baud 115200 put firmware/esp8266/server.py server.py
   .venv/bin/ampy --port /dev/ttyUSB0 --baud 115200 put firmware/esp8266/main.py main.py
   .venv/bin/ampy --port /dev/ttyUSB0 --baud 115200 reset
   ```
4. Verify Wi-Fi and endpoints:
   ```bash
   curl http://<board-ip>/status
   .venv/bin/python firmware/esp8266/tools/script_probe.py ws://<board-ip>/ws
   ```
5. In both Tablet and Operator settings, switch **Source** to **ESP8266 over Wi-Fi** (`ws://<board-ip>/ws`).
