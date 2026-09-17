import network

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
nets = wlan.scan()
for ssid, _bssid, channel, rssi, _auth, _hidden in sorted(nets, key=lambda n: -n[3]):
    print("ch%-3d %-4d %s" % (channel, rssi, ssid.decode()))
print("total:", len(nets))
