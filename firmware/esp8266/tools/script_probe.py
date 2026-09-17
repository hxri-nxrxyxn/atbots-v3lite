"""Two-client Script Mode probe.

Connects two WebSocket clients to the robot, has client A send `script_say`,
and checks that client B receives the `say` broadcast (operator -> ESP -> tablet).

Usage: .venv/bin/python firmware/esp8266/tools/script_probe.py [ws://host/ws]
"""

import json
import sys
import time

import websocket

URL = sys.argv[1] if len(sys.argv) > 1 else "ws://localhost:8765/ws"


def drain(ws, seconds):
    out = []
    end = time.time() + seconds
    while time.time() < end:
        ws.settimeout(max(0.1, end - time.time()))
        try:
            out.append(json.loads(ws.recv()))
        except Exception:
            pass
    return out


def main():
    a = websocket.create_connection(URL, timeout=5)
    b = websocket.create_connection(URL, timeout=5)
    print("connected A and B to", URL)
    drain(a, 0.5)
    drain(b, 0.5)

    text = "Welcome to the event."
    print("A ->", {"t": "script_say", "text": text})
    a.send(json.dumps({"t": "script_say", "text": text}))

    got_a = drain(a, 1.0)
    got_b = drain(b, 1.0)

    ack = any(m.get("t") == "ack" and m.get("cmd") == "script_say" for m in got_a)
    say = [m for m in got_b if m.get("t") == "event" and m.get("event") == "say"]
    print("A received ack:", ack)
    print("B received say:", say)

    a.close()
    b.close()
    print("PASS" if ack and say and say[0].get("detail") == text else "FAIL")


if __name__ == "__main__":
    main()
