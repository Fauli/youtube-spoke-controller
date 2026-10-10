"""Four touch pads for Snail Spoke Controller. Copy to CIRCUITPY/code.py.

Targets full-size Spoke; GPIO mapping follows the maker's keyboard example.
Requires adafruit_hid in CIRCUITPY/lib. No NeoPixel library is needed.
"""
import time
import board
import touchio
import usb_hid
from adafruit_hid.keyboard import Keyboard
from adafruit_hid.keycode import Keycode

# (touch pin, USB keyboard key): edit these to choose different pads.
PAD_KEYS = (
    (board.GP1, Keycode.LEFT_BRACKET),   # 0.4x
    (board.GP2, Keycode.RIGHT_BRACKET),  # 0.5x
    (board.GP3, Keycode.BACKSLASH),      # 0.6x
    (board.GP4, Keycode.K),              # Start/pause
)
DEBOUNCE_SECONDS = 0.04
# Leave at zero initially. Increase if attached objects trigger without a touch.
THRESHOLD_OFFSET = 0

keyboard = Keyboard(usb_hid.devices)
keyboard.release_all()
sensors = []
for pin, key in PAD_KEYS:
    sensor = touchio.TouchIn(pin)
    sensor.threshold += THRESHOLD_OFFSET
    # Keep each sensor paired with its key; fail visibly on an invalid pin.
    sensors.append((sensor, key))

stable = [False] * len(sensors)
candidate = [False] * len(sensors)
changed_at = [time.monotonic()] * len(sensors)
print("Snail ready: GP1=0.4x, GP2=0.5x, GP3=0.6x, GP4=start/pause")

try:
    while True:
        now = time.monotonic()
        for index, (sensor, key) in enumerate(sensors):
            touched = sensor.value
            if touched != candidate[index]:
                candidate[index] = touched
                changed_at[index] = now
            if touched != stable[index] and now - changed_at[index] >= DEBOUNCE_SECONDS:
                stable[index] = touched
                if touched:
                    # One complete keystroke per touch; no held or repeating key.
                    keyboard.send(key)
        time.sleep(0.01)
finally:
    keyboard.release_all()
    for sensor, _ in sensors:
        sensor.deinit()
