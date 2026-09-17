"""Ad-hoc WebSocket probe for the ESP8266 bench server using Topic schema."""

import json
import sys
import time

import websocket

URL = sys.argv[1] if len(sys.argv) > 1 else "ws://localhost:8765/ws"


def main():
    ws = websocket.create_connection(URL, timeout=5)
    print("connected to", URL)

    def send(topic, payload, req_id=None):
        msg = {"topic": topic, "payload": payload}
        if req_id:
            msg["id"] = req_id
        print("->", msg)
        ws.send(json.dumps(msg))

    def drain(seconds):
        end = time.time() + seconds
        while time.time() < end:
            ws.settimeout(max(0.1, end - time.time()))
            try:
                print("<-", ws.recv())
            except Exception:
                pass

    drain(1.5)
    send("sys/hb", {"seq": 1}, req_id="hb_1")
    drain(0.5)
    send("cmd/drive", {"dir": "forward", "speed": 5}, req_id="drive_1")
    drain(0.8)
    print("--- silent: expect deadman_stop ---")
    drain(1.5)
    send("cmd/stop", {}, req_id="stop_1")
    send("cmd/expression", {"value": "happy"}, req_id="exp_1")
    send("cmd/bogus", {}, req_id="bad_1")
    drain(1.0)
    ws.close()
    print("closed")


if __name__ == "__main__":
    main()
