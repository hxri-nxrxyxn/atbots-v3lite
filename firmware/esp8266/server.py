"""Bench HTTP + WebSocket server for the ESP8266 prototype.

Serves several WebSocket clients at once (tablet + operator) and broadcasts
telemetry, events and Script Mode announcements.

Safety here is best-effort only: the deadman stop is a software timer in a
single-threaded loop. The shipping design puts real safety on dedicated
hardware (an e-stop relay); see the design doc.
"""

import gc
import json
import select
import socket
import time

import net
import ws

PROTOCOL_VERSION = 1
DEADMAN_MS = 500
TELEMETRY_MS = 1000
MAX_BUFFER = 1024

STATE = {"drive": "stop", "speed": 0, "expression": "neutral", "speaking": False}


def now_ms():
    try:
        return time.ticks_ms()
    except AttributeError:
        return int(time.time() * 1000)


def diff_ms(a, b):
    try:
        return time.ticks_diff(a, b)
    except AttributeError:
        return a - b


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
    """Return (reply, broadcast_or_None) for one client command."""
    kind = msg.get("t")
    if kind == "hb":
        return {"t": "hb_ack", "seq": msg.get("seq")}, None
    if kind == "drive":
        STATE["drive"] = msg.get("dir", "stop")
        STATE["speed"] = msg.get("speed", 0)
        return {"t": "ack", "cmd": "drive"}, None
    if kind == "stop":
        STATE["drive"] = "stop"
        STATE["speed"] = 0
        return {"t": "ack", "cmd": "stop"}, None
    if kind == "set_expression":
        STATE["expression"] = msg.get("value", "neutral")
        return {"t": "ack", "cmd": "set_expression"}, None
    if kind == "set_speaking":
        STATE["speaking"] = bool(msg.get("value", False))
        return {"t": "ack", "cmd": "set_speaking"}, None
    if kind == "play_sequence":
        return {"t": "ack", "cmd": "play_sequence"}, None
    if kind == "home":
        STATE["expression"] = "neutral"
        return {"t": "ack", "cmd": "home"}, None
    if kind == "script_say":
        return (
            {"t": "ack", "cmd": "script_say"},
            {"t": "event", "event": "say", "detail": msg.get("text", "")},
        )
    return {"t": "nack", "reason": "unknown_command", "got": kind}, None


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
    srv.listen(4)
    srv.setblocking(False)
    print("listening on http://%s/  ws://%s/ws" % (ip, ip))

    clients = []
    last_hb = now_ms()
    last_tel = last_hb

    def drop(client):
        if client in clients:
            clients.remove(client)
        try:
            client["sock"].close()
        except OSError:
            pass

    def send_raw(client, data):
        try:
            client["sock"].send(data)
        except OSError:
            drop(client)

    def send_to(client, msg):
        send_raw(client, ws.encode_frame(ws.OP_TEXT, json.dumps(msg)))

    def broadcast(msg):
        data = ws.encode_frame(ws.OP_TEXT, json.dumps(msg))
        for client in list(clients):
            if client["ws"]:
                send_raw(client, data)

    while True:
        socks = [srv] + [client["sock"] for client in clients]
        ready, _, _ = select.select(socks, [], [], 0.2)
        now = now_ms()

        if srv in ready:
            try:
                conn, _addr = srv.accept()
                conn.setblocking(False)
                clients.append({"sock": conn, "ws": False, "buf": bytearray()})
            except OSError:
                pass

        for client in list(clients):
            sock = client["sock"]
            if sock not in ready:
                continue

            try:
                data = sock.recv(256)
            except OSError:
                data = b""
            if not data:
                drop(client)
                continue

            buf = client["buf"]
            buf.extend(data)
            if len(buf) > MAX_BUFFER:
                drop(client)
                continue

            if not client["ws"]:
                if b"\r\n\r\n" not in buf:
                    continue
                request = bytes(buf)
                client["buf"] = bytearray()
                path, headers = parse_request(request)
                if path == "/ws" and headers.get("upgrade", "").lower() == "websocket":
                    ws.handshake(sock, headers.get("sec-websocket-key", ""))
                    client["ws"] = True
                    send_to(client, {"t": "hello", "proto": PROTOCOL_VERSION, "ip": ip})
                else:
                    http_response(sock, status(wlan))
                    drop(client)
                continue

            while True:
                parsed = ws.parse_frame(client["buf"])
                if parsed is None:
                    break
                opcode, payload, consumed = parsed
                del client["buf"][:consumed]

                if opcode == ws.OP_CLOSE:
                    drop(client)
                    break
                if opcode == ws.OP_PING:
                    send_raw(client, ws.encode_frame(ws.OP_PONG, payload))
                    continue
                if opcode not in (ws.OP_TEXT, ws.OP_BIN):
                    continue

                try:
                    msg = json.loads(payload)
                except Exception:  # noqa: BLE001
                    send_to(client, {"t": "nack", "reason": "bad_json"})
                    continue

                if msg.get("t") == "hb":
                    last_hb = now

                reply, announce = handle_command(msg)
                send_to(client, reply)
                if announce is not None:
                    broadcast(announce)

        if STATE["drive"] != "stop" and diff_ms(now, last_hb) > DEADMAN_MS:
            STATE["drive"] = "stop"
            STATE["speed"] = 0
            broadcast({"t": "event", "event": "deadman_stop"})

        if diff_ms(now, last_tel) > TELEMETRY_MS:
            last_tel = now
            gc.collect()
            broadcast(telemetry())


if __name__ == "__main__":
    main()
