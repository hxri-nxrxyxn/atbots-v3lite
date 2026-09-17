"""Comprehensive test suite for ESP8266 & Mock ESP.

Tests every topic, payload, handshake, deadman, and broadcast feature:
1. HTTP /status endpoint check
2. Connect & sys/hello greeting
3. Telemetry streaming format & frequency
4. sys/hb heartbeat & res/hb_ack
5. cmd/drive, cmd/stop & correlated res/ack
6. Deadman failsafe (500ms timeout -> event/deadman)
7. cmd/expression & cmd/speaking state updates
8. cmd/sequence & cmd/home commands
9. Correlated res/nack on unknown topics
10. Multi-client broadcast & Script Mode (cmd/say -> event/say)
"""

import json
import sys
import time
import urllib.request
import websocket

URL = sys.argv[1] if len(sys.argv) > 1 else "ws://192.168.0.155/ws"
HTTP_BASE = URL.replace("ws://", "http://").replace("/ws", "")

passed = 0
failed = 0


def log_test(name, result, detail=""):
    global passed, failed
    if result:
        passed += 1
        print(f"  \033[32m✔\033[0m {name} {detail}")
    else:
        failed += 1
        print(f"  \033[31m✖\033[0m {name} {detail}")


def drain_messages(ws, duration_s=1.0):
    messages = []
    end = time.time() + duration_s
    while time.time() < end:
        ws.settimeout(max(0.05, end - time.time()))
        try:
            raw = ws.recv()
            messages.append(json.loads(raw))
        except Exception:
            pass
    return messages


print(f"\n\033[1m=== Testing ESP Control Plane [{URL}] ===\033[0m\n")

# -------------------------------------------------------------------------
# Test 1: HTTP /status
# -------------------------------------------------------------------------
print("[1/10] HTTP Endpoints")
try:
    req = urllib.request.urlopen(f"{HTTP_BASE}/status", timeout=4)
    data = json.loads(req.read().decode())
    status_ok = data.get("ok") is True and "ip" in data and "free" in data
    log_test("GET /status returns valid JSON", status_ok, f"(free RAM: {data.get('free')} B)")
except Exception as e:
    log_test("GET /status", False, f"Error: {e}")

# -------------------------------------------------------------------------
# Test 2: Connect & sys/hello
# -------------------------------------------------------------------------
print("\n[2/10] WebSocket Connect & Greeting")
try:
    ws1 = websocket.create_connection(URL, timeout=4)
    init_msgs = drain_messages(ws1, 0.5)
    hello_msg = next((m for m in init_msgs if m.get("topic") == "sys/hello"), None)
    log_test(
        "sys/hello received on connection",
        hello_msg is not None,
        f"(proto: {hello_msg.get('payload', {}).get('proto') if hello_msg else 'none'})",
    )
except Exception as e:
    log_test("WebSocket connect", False, str(e))
    sys.exit(1)

# -------------------------------------------------------------------------
# Test 3: Telemetry Stream
# -------------------------------------------------------------------------
print("\n[3/10] Periodic Telemetry (1 Hz)")
tel_msgs = drain_messages(ws1, 1.2)
telemetry = next((m for m in tel_msgs if m.get("topic") == "telemetry"), None)
tel_ok = (
    telemetry is not None
    and "drive" in telemetry.get("payload", {})
    and "speed" in telemetry.get("payload", {})
    and "uptime_ms" in telemetry.get("payload", {})
)
log_test("telemetry payload structure valid", tel_ok, f"Payload: {telemetry.get('payload') if tel_ok else 'missing'}")

# -------------------------------------------------------------------------
# Test 4: Heartbeat & res/hb_ack
# -------------------------------------------------------------------------
print("\n[4/10] Heartbeat & Sequence Correlation")
hb_cmd = {"topic": "sys/hb", "payload": {"seq": 42}, "id": "hb_req_42"}
ws1.send(json.dumps(hb_cmd))
hb_responses = drain_messages(ws1, 0.5)
hb_ack = next(
    (m for m in hb_responses if m.get("topic") == "res/hb_ack" and m.get("payload", {}).get("seq") == 42),
    None,
)
log_test("sys/hb returns matching res/hb_ack (seq: 42)", hb_ack is not None)

# -------------------------------------------------------------------------
# Test 5: cmd/drive & Correlated res/ack
# -------------------------------------------------------------------------
print("\n[5/10] Drive Command & Correlated Handshake")
drive_cmd = {"topic": "cmd/drive", "payload": {"dir": "forward", "speed": 8}, "id": "drive_req_101"}
ws1.send(json.dumps(drive_cmd))
drive_res = drain_messages(ws1, 0.4)
drive_ack = next(
    (m for m in drive_res if m.get("topic") == "res/ack" and m.get("id") == "drive_req_101"),
    None,
)
log_test(
    "cmd/drive returns correlated res/ack with matching ID",
    drive_ack is not None and drive_ack.get("payload", {}).get("status") == "ok",
)

# -------------------------------------------------------------------------
# Test 6: Deadman Failsafe (500ms timeout)
# -------------------------------------------------------------------------
print("\n[6/10] Deadman Failsafe (500ms silence)")
deadman_msgs = drain_messages(ws1, 1.2)
deadman_event = next(
    (m for m in deadman_msgs if m.get("topic") == "event/deadman" and m.get("payload", {}).get("state") == "stopped"),
    None,
)
log_test("event/deadman emitted after heartbeat silence", deadman_event is not None)

# -------------------------------------------------------------------------
# Test 7: Expression & Speaking State
# -------------------------------------------------------------------------
print("\n[7/10] Expression & Speaking Commands")
ws1.send(json.dumps({"topic": "cmd/expression", "payload": {"value": "excited"}, "id": "exp_1"}))
ws1.send(json.dumps({"topic": "cmd/speaking", "payload": {"value": True}, "id": "spk_1"}))
state_res = drain_messages(ws1, 1.2)
exp_ack = any(m.get("topic") == "res/ack" and m.get("id") == "exp_1" for m in state_res)
spk_ack = any(m.get("topic") == "res/ack" and m.get("id") == "spk_1" for m in state_res)
state_tel = next((m for m in state_res if m.get("topic") == "telemetry"), None)

log_test("cmd/expression and cmd/speaking return res/ack", exp_ack and spk_ack)
if state_tel:
    p = state_tel.get("payload", {})
    log_test(
        "telemetry reflects updated state",
        p.get("expression") == "excited" and p.get("speaking") is True,
        f"(expression={p.get('expression')}, speaking={p.get('speaking')})",
    )
else:
    log_test("telemetry reflects updated state", False, "No telemetry received")

# -------------------------------------------------------------------------
# Test 8: Sequence & Home Commands
# -------------------------------------------------------------------------
print("\n[8/10] Sequence & Home Resets")
ws1.send(json.dumps({"topic": "cmd/sequence", "payload": {"name": "wave"}, "id": "seq_1"}))
ws1.send(json.dumps({"topic": "cmd/home", "payload": {}, "id": "home_1"}))
seq_res = drain_messages(ws1, 0.5)
seq_ack = any(m.get("topic") == "res/ack" and m.get("id") == "seq_1" for m in seq_res)
home_ack = any(m.get("topic") == "res/ack" and m.get("id") == "home_1" for m in seq_res)
log_test("cmd/sequence and cmd/home handled gracefully", seq_ack and home_ack)

# -------------------------------------------------------------------------
# Test 9: Unknown Topic Error Handling (res/nack)
# -------------------------------------------------------------------------
print("\n[9/10] Error Handling (res/nack)")
ws1.send(json.dumps({"topic": "cmd/invalid_command", "payload": {}, "id": "bad_req_99"}))
nack_res = drain_messages(ws1, 0.4)
nack = next(
    (m for m in nack_res if m.get("topic") == "res/nack" and m.get("id") == "bad_req_99"),
    None,
)
log_test(
    "Invalid topic returns correlated res/nack",
    nack is not None and nack.get("payload", {}).get("status") == "error",
    f"(reason: {nack.get('payload', {}).get('reason') if nack else 'none'})",
)

# -------------------------------------------------------------------------
# Test 10: Multi-Client Script Mode Broadcast
# -------------------------------------------------------------------------
print("\n[10/10] Multi-Client Broadcast (Script Mode)")
try:
    ws2 = websocket.create_connection(URL, timeout=4)
    drain_messages(ws2, 0.3)  # Drain hello

    announcement = "Test announcement across all devices."
    ws1.send(json.dumps({"topic": "cmd/say", "payload": {"text": announcement}, "id": "say_test_1"}))

    res_client1 = drain_messages(ws1, 0.8)
    res_client2 = drain_messages(ws2, 0.8)

    client1_ack = any(m.get("topic") == "res/ack" and m.get("id") == "say_test_1" for m in res_client1)
    client2_say = next(
        (m for m in res_client2 if m.get("topic") == "event/say" and m.get("payload", {}).get("text") == announcement),
        None,
    )

    log_test(
        "Operator receives correlated ACK for cmd/say",
        client1_ack,
    )
    log_test(
        "Tablet (Client 2) receives broadcast event/say",
        client2_say is not None,
        f"(detail: {client2_say.get('payload', {}).get('text') if client2_say else 'none'})",
    )
    ws2.close()
except Exception as e:
    log_test("Multi-client broadcast test", False, str(e))

ws1.close()

# -------------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------------
print("\n" + "=" * 50)
if failed == 0:
    print(f"\033[32m\033[1mALL {passed} TESTS PASSED!\033[0m ESP control plane is 100% operational.")
else:
    print(f"\033[31m\033[1m{failed} TEST(S) FAILED.\033[0m ({passed} passed)")
print("=" * 50 + "\n")

sys.exit(0 if failed == 0 else 1)
