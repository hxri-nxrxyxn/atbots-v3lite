import time

import serial

port = "/dev/ttyUSB0"
s = serial.Serial(port, 115200, timeout=1)
time.sleep(0.5)
s.write(b"\r\x03\x03")  # Interrupt current execution
time.sleep(0.5)
s.write(b"\x04")  # Ctrl-D -> soft reboot, re-runs boot.py + main.py

out = b""
end = time.time() + 15
while time.time() < end:
    data = s.read(512)
    if data:
        out += data
s.close()
print(out.decode(errors="replace"))
