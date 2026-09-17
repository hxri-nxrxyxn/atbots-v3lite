import hashlib

print("sha1:", hasattr(hashlib, "sha1"))

try:
    import ubinascii

    print("ubinascii.b2a_base64:", hasattr(ubinascii, "b2a_base64"))
except Exception as exc:  # noqa: BLE001
    print("ubinascii error:", exc)

try:
    import binascii

    print("binascii.b2a_base64:", hasattr(binascii, "b2a_base64"))
except Exception as exc:  # noqa: BLE001
    print("binascii error:", exc)

try:
    import json

    print("json: ok")
except Exception as exc:  # noqa: BLE001
    print("json error:", exc)
