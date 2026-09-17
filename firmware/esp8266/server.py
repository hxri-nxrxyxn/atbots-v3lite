"""Bench HTTP + WebSocket server for the ESP8266 prototype.

HTTP:  GET /status -> JSON status
WS:    /ws         -> JSON command channel (see docs/protocol.md, to come)

Safety here is best-effort only: the deadman stop is a software timer in a
single-threaded loop. The shipping design puts real safety on dedicated
hardware (e-stop relay); see the design doc.
"""

import gc
import json
import select
import socket
import time

import net
import ws

DEADMAN_MS = 500
TELEMETRY_MS = 1000

STATE = {"drive": "stop", "speed": 0, "expression": "neutral", "speaking": False}


def now_ms():
    try:
        return time.ticks_ms()
    except AttributeError:
        return int(time.time() * 1000)


def status(wlan):
    return {"ok": True, "ip": net.ip(wlan), "free": gc.mem_free(), "state": STATE}


def telemetry():
    return {
        "t": "telemetry",
        "drive": STATE["drive"],
        "speed": STATE["speed"],
        "expression": STATE["expression"],
        "speaking": STATE["speaking"],
        "free": gc.mem_free(),
        "uptime_ms": now_ms(),
    }


def handle_command(msg):
    kind = msg.get("t")
    if kind == "hb":
        return {"t": "hb_ack", "seq": msg.get("seq")}
    if kind == "drive":
        STATE["drive"] = msg.get("dir", "stop")
        STATE["speed"] = msg.get("speed", 0)
        return {"t": "ack", "cmd": "drive"}
    if kind == "stop":
        STATE["drive"] = "stop"
        STATE["speed"] = 0
        return {"t": "ack", "cmd": "stop"}
    if kind == "set_expression":
        STATE["expression"] = msg.get("value", "neutral")
        return {"t": "ack", "cmd": "set_expression"}
    if kind == "set_speaking":
        STATE["speaking"] = bool(msg.get("value", False))
        return {"t": "ack", "cmd": "set_speaking"}
    if kind == "script_say":
        return {"t": "ack", "cmd": "script_say"}
    return {"t": "nack", "reason": "unknown_command", "got": kind}


def ws_session(conn, wlan):
    last_hb = now_ms()
    last_tel = last_hb
    ws.send_text(conn, json.dumps({"t": "hello", "proto": 1, "ip": net.ip(wlan)}))

    while True:
        ready, _, _ = select.select([conn], [], [], 0.2)
        now = now_ms()

        if ready:
            opcode, payload = ws.read_frame(conn)
            if opcode == ws.OP_CLOSE:
                ws.send_frame(conn, ws.OP_CLOSE, b"")
                return
            if opcode == ws.OP_PING:
                ws.send_frame(conn, ws.OP_PONG, payload)
            elif opcode in (ws.OP_TEXT, ws.OP_BIN):
                try:
                    msg = json.loads(payload)
                except Exception:  # noqa: BLE001
                    ws.send_text(conn, json.dumps({"t": "nack", "reason": "bad_json"}))
                    continue
                if msg.get("t") == "hb":
                    last_hb = now
                ws.send_text(conn, json.dumps(handle_command(msg)))

        if STATE["drive"] != "stop" and now - last_hb > DEADMAN_MS:
            STATE["drive"] = "stop"
            STATE["speed"] = 0
            ws.send_text(conn, json.dumps({"t": "event", "event": "deadman_stop"}))

        if now - last_tel > TELEMETRY_MS:
            last_tel = now
            gc.collect()
            ws.send_text(conn, json.dumps(telemetry()))


def parse_request(req):
    try:
        head = req.split(b"\r\n\r\n", 1)[0].decode()
    except Exception:  # noqa: BLE001
        return "/", {}
    lines = head.split("\r\n")
    parts = lines[0].split(" ")
    path = parts[1] if len(parts) > 1 else "/"
    headers = {}
    for line in lines[1:]:
        if ":" in line:
            key, value = line.split(":", 1)
            headers[key.strip().lower()] = value.strip()
    return path, headers


def http_response(conn, body):
    payload = json.dumps(body).encode()
    conn.send(b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n")
    conn.send(b"Connection: close\r\n\r\n")
    conn.send(payload)


def main():
    wlan = net.connect()
    ip = net.ip(wlan)

    srv = socket.socket()
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("0.0.0.0", 80))
    srv.listen(2)
    print("listening on http://%s/  ws://%s/ws" % (ip, ip))

    while True:
        conn, _addr = srv.accept()
        try:
            req = conn.recv(1024)
            path, headers = parse_request(req)
            if path == "/ws" and headers.get("upgrade", "").lower() == "websocket":
                ws.handshake(conn, headers.get("sec-websocket-key", ""))
                ws_session(conn, wlan)
            else:
                http_response(conn, status(wlan))
        except Exception as exc:  # noqa: BLE001
            print("error:", exc)
        finally:
            conn.close()


if __name__ == "__main__":
    main()
