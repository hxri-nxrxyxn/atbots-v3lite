"""Two-client Script Mode probe using Topic schema."""

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

    text = "Welcome to the topic-standardized event."
    cmd = {"topic": "cmd/say", "payload": {"text": text}, "id": "say_101"}
    print("A ->", cmd)
    a.send(json.dumps(cmd))

    got_a = drain(a, 1.0)
    got_b = drain(b, 1.0)

    ack = any(
        m.get("topic") == "res/ack" and m.get("id") == "say_101" for m in got_a
    )
    say = [m for m in got_b if m.get("topic") == "event/say"]

    print("A received correlated ack:", ack)
    print("B received say broadcast:", say)

    a.close()
    b.close()

    success = ack and len(say) > 0 and say[0].get("payload", {}).get("text") == text
    print("PASS" if success else "FAIL")


if __name__ == "__main__":
    main()
