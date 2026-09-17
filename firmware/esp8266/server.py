"""Bench HTTP + WebSocket server for the ESP8266 prototype.

Standardized Topic & Payload WebSocket protocol with correlated Request-Response IDs.
"""

import gc
import json
import select
import socket
import time

import net
import ws

PROTOCOL_VERSION = 2
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
        "topic": "telemetry",
        "payload": {
            "drive": STATE["drive"],
            "speed": STATE["speed"],
            "expression": STATE["expression"],
            "speaking": STATE["speaking"],
            "free": gc.mem_free(),
            "uptime_ms": now_ms(),
        },
    }


def handle_command(msg):
    """Return (reply_or_None, broadcast_or_None) for an incoming topic envelope."""
    topic = msg.get("topic")
    payload = msg.get("payload", {})
    req_id = msg.get("id")

    if topic == "sys/hb":
        return {
            "topic": "res/hb_ack",
            "payload": {"seq": payload.get("seq", 0)},
            "id": req_id,
        }, None

    if topic == "cmd/drive":
        STATE["drive"] = payload.get("dir", "stop")
        STATE["speed"] = payload.get("speed", 0)
        return {
            "topic": "res/ack",
            "payload": {"status": "ok", "cmd": "cmd/drive"},
            "id": req_id,
        }, None

    if topic == "cmd/stop":
        STATE["drive"] = "stop"
        STATE["speed"] = 0
        return {
            "topic": "res/ack",
            "payload": {"status": "ok", "cmd": "cmd/stop"},
            "id": req_id,
        }, None

    if topic == "cmd/expression":
        STATE["expression"] = payload.get("value", "neutral")
        return {
            "topic": "res/ack",
            "payload": {"status": "ok", "cmd": "cmd/expression"},
            "id": req_id,
        }, None

    if topic == "cmd/speaking":
        STATE["speaking"] = bool(payload.get("value", False))
        return {
            "topic": "res/ack",
            "payload": {"status": "ok", "cmd": "cmd/speaking"},
            "id": req_id,
        }, None

    if topic == "cmd/sequence":
        return {
            "topic": "res/ack",
            "payload": {"status": "ok", "cmd": "cmd/sequence"},
            "id": req_id,
        }, None

    if topic == "cmd/home":
        STATE["expression"] = "neutral"
        return {
            "topic": "res/ack",
            "payload": {"status": "ok", "cmd": "cmd/home"},
            "id": req_id,
        }, None

    if topic == "cmd/say":
        text = payload.get("text", "")
        return (
            {
                "topic": "res/ack",
                "payload": {"status": "ok", "cmd": "cmd/say"},
                "id": req_id,
            },
            {
                "topic": "event/say",
                "payload": {"text": text},
            },
        )

    return {
        "topic": "res/nack",
        "payload": {"status": "error", "reason": "unknown_topic", "got": topic},
        "id": req_id,
    }, None


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
            except OSError as e:
                if e.args[0] in (11, 115):  # EAGAIN / EWOULDBLOCK
                    continue
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
                    send_to(
                        client,
                        {
                            "topic": "sys/hello",
                            "payload": {
                                "proto": PROTOCOL_VERSION,
                                "ip": ip,
                                "robot_id": "bot-001",
                            },
                        },
                    )
                else:
                    http_response(sock, status(wlan))
                    drop(client)
                continue

            while True:
                parsed = ws.parse_frame(client["buf"])
                if parsed is None:
                    break
                opcode, payload, consumed = parsed
                client["buf"] = client["buf"][consumed:]

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
                    send_to(
                        client,
                        {
                            "topic": "res/nack",
                            "payload": {"status": "error", "reason": "bad_json"},
                        },
                    )
                    continue

                if msg.get("topic") in ("sys/hb", "cmd/drive"):
                    last_hb = now

                reply, announce = handle_command(msg)
                if reply is not None:
                    send_to(client, reply)
                if announce is not None:
                    broadcast(announce)

        if STATE["drive"] != "stop" and diff_ms(now, last_hb) > DEADMAN_MS:
            STATE["drive"] = "stop"
            STATE["speed"] = 0
            broadcast({"topic": "event/deadman", "payload": {"state": "stopped"}})

        if diff_ms(now, last_tel) > TELEMETRY_MS:
            last_tel = now
            gc.collect()
            broadcast(telemetry())


if __name__ == "__main__":
    main()
