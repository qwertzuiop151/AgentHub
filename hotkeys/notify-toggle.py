"""
F6 = Claude-Notification an/aus togglen
F12 = beenden

Schreibt eine Flag-Datei die der Notification-Hook checkt.
"""
import os
import sys
import threading
from pynput import keyboard as kb

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from toast import show_toast

FLAG = os.path.join(os.environ.get("TEMP", "/tmp"), "claude-notify-off.flag")

def toggle():
    if os.path.exists(FLAG):
        os.remove(FLAG)
        print("Notifications: AN")
        show_toast("Benachrichtigungen: AN", 2000)
    else:
        with open(FLAG, "w") as f:
            f.write("off")
        print("Notifications: AUS")
        show_toast("Benachrichtigungen: AUS", 2000)

stop = threading.Event()

def on_press(key):
    if key == kb.Key.f6:
        toggle()
    elif key == kb.Key.f12:
        stop.set()
        return False

with kb.Listener(on_press=on_press) as listener:
    state = "AUS" if os.path.exists(FLAG) else "AN"
    print(f"Notify-Toggle aktiv (F6 = umschalten, F12 = beenden) — aktuell: {state}")
    stop.wait()
