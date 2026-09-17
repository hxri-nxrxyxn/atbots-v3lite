"""Boot entrypoint for the ESP8266 bench prototype.

MicroPython runs main.py automatically after boot.py. It connects to Wi-Fi
and serves HTTP + WebSocket.
"""

import server

server.main()
