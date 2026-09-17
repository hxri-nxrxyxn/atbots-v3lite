import net

wlan = net.connect()
print("connected:", wlan.isconnected())
print("ifconfig:", wlan.ifconfig())
