"""Tiny RFC 6455 WebSocket server helpers for MicroPython (ESP8266).

Only what the bench prototype needs: handshake, non-blocking frame parsing
(client masking) and frame encoding. No fragmentation, no extensions.
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


def encode_frame(opcode, payload):
    """Build a server->client frame (unmasked) as bytes."""
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
    return bytes(header)


def parse_frame(buf):
    """Parse one frame from `buf` without blocking.

    Returns (opcode, payload, consumed) or None when the frame is incomplete.
    """
    if len(buf) < 2:
        return None

    opcode = buf[0] & 0x0F
    masked = buf[1] & 0x80
    length = buf[1] & 0x7F
    offset = 2

    if length == 126:
        if len(buf) < 4:
            return None
        length = int.from_bytes(buf[2:4], "big")
        offset = 4
    elif length == 127:
        if len(buf) < 10:
            return None
        length = int.from_bytes(buf[2:10], "big")
        offset = 10

    mask = None
    if masked:
        if len(buf) < offset + 4:
            return None
        mask = buf[offset : offset + 4]
        offset += 4

    if len(buf) < offset + length:
        return None

    payload = bytes(buf[offset : offset + length])
    if mask:
        unmasked = bytearray(payload)
        for i in range(len(unmasked)):
            unmasked[i] ^= mask[i % 4]
        payload = bytes(unmasked)

    return opcode, payload, offset + length


def send_frame(conn, opcode, payload):
    conn.send(encode_frame(opcode, payload))


def send_text(conn, text):
    send_frame(conn, OP_TEXT, text)
