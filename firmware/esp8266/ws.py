"""Tiny RFC 6455 WebSocket server helpers for MicroPython (ESP8266).

Only what the bench prototype needs: handshake, frame read (with client
masking), frame write. No fragmentation, no extensions, no permessage-deflate.
"""

import binascii
import hashlib

GUID = b"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

OP_CONT = 0x0
OP_TEXT = 0x1
OP_BIN = 0x2
OP_CLOSE = 0x8
OP_PING = 0x9
OP_PONG = 0xA


def accept_key(key):
    if isinstance(key, str):
        key = key.encode()
    sha = hashlib.sha1(key)
    sha.update(GUID)
    return binascii.b2a_base64(sha.digest()).strip().decode()


def handshake(conn, key):
    response = (
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Accept: %s\r\n\r\n" % accept_key(key)
    )
    conn.send(response.encode())


def _recv_exact(conn, n):
    buf = b""
    while len(buf) < n:
        chunk = conn.recv(n - len(buf))
        if not chunk:
            raise OSError("connection closed")
        buf += chunk
    return buf


def read_frame(conn):
    header = _recv_exact(conn, 2)
    opcode = header[0] & 0x0F
    masked = header[1] & 0x80
    length = header[1] & 0x7F
    if length == 126:
        length = int.from_bytes(_recv_exact(conn, 2), "big")
    elif length == 127:
        length = int.from_bytes(_recv_exact(conn, 8), "big")
    mask = _recv_exact(conn, 4) if masked else None
    payload = _recv_exact(conn, length) if length else b""
    if mask:
        unmasked = bytearray(payload)
        for i in range(len(unmasked)):
            unmasked[i] ^= mask[i % 4]
        payload = bytes(unmasked)
    return opcode, payload


def send_frame(conn, opcode, payload):
    if isinstance(payload, str):
        payload = payload.encode()
    length = len(payload)
    header = bytearray([0x80 | opcode])
    if length < 126:
        header.append(length)
    elif length < 65536:
        header.append(126)
        header.extend(length.to_bytes(2, "big"))
    else:
        header.append(127)
        header.extend(length.to_bytes(8, "big"))
    header.extend(payload)
    conn.send(header)


def send_text(conn, text):
    send_frame(conn, OP_TEXT, text)
