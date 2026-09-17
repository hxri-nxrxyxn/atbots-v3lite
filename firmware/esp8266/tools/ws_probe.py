"""Ad-hoc WebSocket probe for the ESP8266 bench server.

Usage: .venv/bin/python firmware/esp8266/tools/ws_probe.py [ws://host/ws]
"""

import json
import sys
import time

import websocket

URL = sys.argv[1] if len(sys.argv) > 1 else "ws://192.168.0.155/ws"


def main():
    ws = websocket.create_connection(URL, timeout=5)
    print("connected to", URL)

    def send(obj):
        print("->", obj)
        ws.send(json.dumps(obj))

    def drain(seconds):
        end = time.time() + seconds
        while time.time() < end:
            ws.settimeout(max(0.1, end - time.time()))
            try:
                print("<-", ws.recv())
            except Exception:
                pass

    drain(1.5)
    send({"t": "hb", "seq": 1})
    drain(0.5)
    send({"t": "drive", "dir": "forward", "speed": 5})
    drain(0.8)
    print("--- silent: expect deadman_stop ---")
    drain(1.5)
    send({"t": "stop"})
    send({"t": "set_expression", "value": "happy"})
    send({"t": "bogus"})
    drain(1.0)
    ws.close()
    print("closed")


if __name__ == "__main__":
    main()
