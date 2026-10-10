"""Five touch pads for Snail Spoke Controller. Copy to CIRCUITPY/code.py.

Targets full-size Spoke; GPIO mapping follows the maker's keyboard example.
Requires adafruit_hid and neopixel.mpy in CIRCUITPY/lib.
"""
import time
import board
import touchio
import usb_hid
import neopixel
from adafruit_hid.keyboard import Keyboard
from adafruit_hid.keycode import Keycode

# (touch pin, USB keyboard key): edit these to choose different pads.
PAD_KEYS = (
    (board.GP1, Keycode.GRAVE_ACCENT),  # 0.2x
    (board.GP2, Keycode.LEFT_BRACKET),  # 0.4x
    (board.GP3, Keycode.RIGHT_BRACKET), # 0.5x
    (board.GP4, Keycode.BACKSLASH),     # 0.6x
    (board.GP5, Keycode.K),             # Start/pause
)
# Full-size Spoke: GP0 drives 27 LEDs; GP1..GP5 sit beside LEDs 0..4.
# If changing PAD_KEYS, update the corresponding LED indexes here too.
PAD_LEDS = (0, 1, 2, 3, 4)
LED_BRIGHTNESS = 0.12
IDLE_COLOR = (0, 25, 65)       # Dim blue: active input, ready.
TOUCH_COLOR = (30, 255, 70)   # Green: touch accepted and key sent.
FEEDBACK_SECONDS = 0.20      # Keep quick taps visible without blocking input.
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

pixels = neopixel.NeoPixel(board.GP0, 27, brightness=LED_BRIGHTNESS, auto_write=False)
pixels.fill((0, 0, 0))
pixels.show()
# A short green sweep confirms that touch sensors and USB keyboard initialized.
for led in PAD_LEDS:
    pixels[led] = TOUCH_COLOR
    pixels.show()
    time.sleep(0.12)
for led in PAD_LEDS:
    pixels[led] = IDLE_COLOR
pixels.show()
flash_until = [0.0] * len(sensors)
illuminated = [False] * len(sensors)

stable = [False] * len(sensors)
candidate = [False] * len(sensors)
changed_at = [time.monotonic()] * len(sensors)
print("Snail ready: GP1=0.2x, GP2=0.4x, GP3=0.5x, GP4=0.6x, GP5=start/pause")

try:
    while True:
        now = time.monotonic()
        leds_changed = False
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
                    flash_until[index] = now + FEEDBACK_SECONDS
            lit = stable[index] or now < flash_until[index]
            if lit != illuminated[index]:
                illuminated[index] = lit
                pixels[PAD_LEDS[index]] = TOUCH_COLOR if lit else IDLE_COLOR
                leds_changed = True
        if leds_changed:
            pixels.show()
        time.sleep(0.01)
finally:
    keyboard.release_all()
    pixels.fill((0, 0, 0))
    pixels.show()
    pixels.deinit()
    for sensor, _ in sensors:
        sensor.deinit()
