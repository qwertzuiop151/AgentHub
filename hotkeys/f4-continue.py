"""
F4 Hotkey → tippt 'claude --dangerously-skip-permissions --continue' + Enter
Läuft neben whisper-stt.py als eigener Prozess.
F12 = beenden.
"""
import time
import threading
import pyperclip
from pynput import keyboard as kb

CMD = "claude --dangerously-skip-permissions --continue"

def type_cmd():
    time.sleep(0.05)
    pyperclip.copy(CMD)
    time.sleep(0.05)
    ctrl = kb.Controller()
    with ctrl.pressed(kb.Key.ctrl):
        ctrl.press('v')
        ctrl.release('v')
    time.sleep(0.05)
    ctrl.press(kb.Key.enter)
    ctrl.release(kb.Key.enter)

stop = threading.Event()

def on_press(key):
    if key == kb.Key.f4:
        threading.Thread(target=type_cmd, daemon=True).start()
    elif key == kb.Key.f12:
        stop.set()
        return False

with kb.Listener(on_press=on_press) as listener:
    print("F4-Continue aktiv (F12 = beenden)")
    stop.wait()
