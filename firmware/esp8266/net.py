"""Wi-Fi helpers for the ESP8266 bench prototype."""

import time

import network

import config


def connect(timeout_s=20):
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if wlan.isconnected():
        return wlan

    print("connecting to", config.WIFI_SSID)
    wlan.connect(config.WIFI_SSID, config.WIFI_PASSWORD)
    for _ in range(timeout_s * 5):
        if wlan.isconnected():
            return wlan
        time.sleep_ms(200)

    raise OSError("wifi connect timeout")


def ip(wlan):
    return wlan.ifconfig()[0]
