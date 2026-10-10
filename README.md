# Snail Spoke Controller

Four Spoke touch pads select **0.2×**, **0.4×**, **0.5×**, or **0.6×** playback on YouTube.
A fifth pad starts or pauses playback.
Spoke sends USB keyboard events; a small local browser extension applies the exact
rate to the video. No server, account, API key, build step, or npm install is needed.

This version targets **desktop Chrome and Edge** and **full-size Spoke** running
CircuitPython. Safari and mobile YouTube are not supported by this package. The
Spoke-mini pin mapping has not been verified.

## Downloads

Prebuilt ZIPs are checked in under [`dist/`](dist/):

- [`snail-spoke-controller-1.3.0.zip`](dist/snail-spoke-controller-1.3.0.zip):
  extension, Spoke program, and this setup guide. Extract it and follow the steps below.
- [`snail-spoke-extension-1.3.0.zip`](dist/snail-spoke-extension-1.3.0.zip):
  browser extension only. Extract into a permanent folder, then select that folder
  with **Load unpacked**. Chrome cannot load the ZIP directly.

The ZIPs do not bundle CircuitPython libraries; obtain them as described below.
SHA-256 checksums are included in `dist/SHA256SUMS`.

## 1. Install the browser extension

1. Keep this folder somewhere permanent on your computer.
2. Open `chrome://extensions` in Chrome, or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked**, then select the **extension** subfolder of this
   project (the folder containing `manifest.json`).
5. Open or reload a video at https://www.youtube.com/.

The extension runs only on `https://www.youtube.com/*`. It has no network calls,
analytics, storage permissions, or background service. The browser's YouTube site
access is needed to find and control the video.

## Updating an already installed copy

On `chrome://extensions` (or `edge://extensions`), click **Reload** on the Snail
card, then reload your YouTube tab. Version **1.3.0** includes a permanent snail panel
in the top-right corner. Both reloads are required to see the new code.

## 2. Test with your normal keyboard first

Click outside the search box and comments, with the YouTube tab in focus. Press
one of these **unmodified physical key positions**:

| US keyboard label | Browser key code | Playback speed |
| --- | --- | --- |
| Backtick (US key below Escape) | `Backquote` | 0.2× |
| `[` | `BracketLeft` | 0.4× |
| `]` | `BracketRight` | 0.5× |
| `\` | `Backslash` | 0.6× |
| `K` | `KeyK` | Start/pause |

The top-right **🐌 Snail** panel appears as soon as the extension loads. It
shows the actual video speed, or **no video found** if the player is unavailable.
Click its **0.2× / 0.4× / 0.5× / 0.6×** buttons to test without any keyboard mapping.
A brief **🐌 0.4×** (or corresponding speed) message confirms each selection.
The fixed 260 × 108 px badge stays in the top-right corner. Click the snail to
shrink it to a 48 × 48 px snail button; click again to reopen. Keyboard and Spoke
controls continue to work while collapsed, including the snail animation.
The badge stays collapsed across video navigation; reloading the page opens it. Long info text is
truncated; hover over it to read the full message. The snail gives one gentle
hop when you use a speed or Start/Pause control,
including keyboard and Spoke triggers. Reduced-motion preferences use a gentle
opacity pulse instead.
The info line below the buttons shows clicks and the last unmodified key code
received outside editable fields, to help test Spoke and keyboard mappings.
This information is displayed locally and is not stored or transmitted.

If the snail panel is missing entirely, the extension has not loaded into this
page: check site access and perform both reload steps above. If clicking a speed
works but a key does not, check the key code shown in the panel.
On Swiss/German and other layouts the printed characters can differ. The program
uses `KeyboardEvent.code`, so use the physical positions corresponding to those
US keys, **without Shift/Alt/AltGr**. If unsure, run this in the browser DevTools
console, close/focus away from the console, and press a key on the page:

```js
window.addEventListener('keydown', e => console.log(e.code), { capture: true });
```

Reopen the console to read the code; reloading the page removes this diagnostic.
To check the actual rate while a video is present:

```js
document.querySelector('#movie_player video.html5-main-video').playbackRate
```

YouTube's speed menu may not reflect the custom rate. The video property is the
value to check. Audio pitch correction remains at the browser's default.

## 3. Configure Spoke

1. Connect your Spoke with a USB **data** cable. It should appear as a drive named
   **CIRCUITPY**. If it does not, follow the manufacturer's getting-started guide
   linked below; do not replace the firmware merely to install this program.
2. **Back up the existing `code.py` and any `boot.py` from CIRCUITPY to your
   computer.** This program replaces the board's current behavior, including MIDI
   output and LED animations. It adds LED feedback for the five active inputs.
3. Check for `CIRCUITPY/lib/adafruit_hid/`. If absent, download the
   [Adafruit CircuitPython library bundle](https://circuitpython.org/libraries)
   matching your board's CircuitPython major version (shown in `boot_out.txt`).
   Copy the entire `adafruit_hid` folder into `CIRCUITPY/lib/`, keeping existing
   libraries. Also keep or copy `neopixel.mpy` into `CIRCUITPY/lib/` for LED feedback.
4. Copy this project's **`spoke/code.py`** onto the drive as **`CIRCUITPY/code.py`**.
   CircuitPython normally restarts the program automatically when saved.
5. With your objects/clips connected, unplug and reconnect the board. Keep your
   hands off the pads and objects during startup so touch baselines are measured
   correctly.

| Spoke input | Key sent | Speed |
| --- | --- | --- |
| GP1 | Backtick | 0.2× |
| GP2 | Left bracket | 0.4× |
| GP3 | Right bracket | 0.5× |
| GP4 | Backslash | 0.6× |
| GP5 | K | Start/pause |

These are the first five GPIO inputs in the manufacturer's full-size Spoke
keyboard example. Check your board markings against that example if labels differ.
Attach conductive objects to these inputs with clips, or touch the pads directly.
Each new touch sends one complete keystroke; release the pad before touching it
again. Holding a pad does not repeatedly send keys. Other pads are unused.

To use different pads, edit `PAD_KEYS` near the top of `spoke/code.py` using the
manufacturer's pin mapping, then copy the edited file to CIRCUITPY.

## Board LED feedback

On startup, the five active pads show a short green sweep, then dim blue lights.
Each pad turns bright green when a touch is accepted and its keyboard event is
sent. It stays green while held, with a minimum 0.2-second flash for quick taps.
The other LEDs remain off. This confirms local touch/key handling; it does not
confirm YouTube received the key. Check the browser badge for that.

The full-size board uses GP0 for 27 NeoPixels, with LEDs 0–4 beside GP1–GP5.
If you change input pins, also update `PAD_LEDS`. Adjust `LED_BRIGHTNESS` in
`spoke/code.py` to change brightness (0.0–1.0; default 0.12).

## Start / stop playback

Click **▶ / ⏸**, press **K** outside a text field, or touch **GP5**.
“Stop” pauses at the current position; Start resumes at the selected speed.
The button follows playback changes made with YouTube’s own controls too.
Copy the updated `spoke/code.py` onto CIRCUITPY to enable all five pads.
Reload the extension and YouTube tab to enable the new panel button.

## 4. Daily use

Open a regular YouTube video, keep the tab in focus, and touch a pad. Fullscreen
playback is supported. Playback stays playing or paused as it was before the touch.

The chosen speed is locked for the lifetime of this loaded page, including
navigation to another video. The extension attempts to restore it after ads and
video-element replacements. It does not apply the selected slow speed while
YouTube marks the player as showing an ad. Pressing a speed pad during an ad
queues the choice for the content.

Only the four slow speeds are offered. A full page reload clears the extension's
lock (YouTube may separately remember its own speed). Each tab has its own choice.

Shortcuts are ignored in editable fields and when modifier keys are held. Spoke
still behaves as a keyboard: touching a pad while typing can insert a character,
and touching it in another application sends that key to that application.
This is not a global/background playback controller. Embedded YouTube players on
other websites, Shorts, live streams, casting and picture-in-picture controls are
outside the tested scope; use a normal prerecorded watch-page video first.

## Troubleshooting

- **Nothing happens:** reload the YouTube page after loading the extension, check
  that it is enabled with site access, then click outside editable fields. Try the
  normal keyboard first to separate browser setup from board setup.
- **Keyboard works but Spoke does not:** check the data cable, input mapping, and
  `adafruit_hid` library. Use the CircuitPython serial console (for example in
  Thonny) to see startup messages or exceptions.
- **`No keyboard device` / HID error:** a previous `boot.py` may have disabled USB
  HID. Back it up and inspect it. If necessary, merge these lines into that file,
  removing a conflicting `usb_hid.disable()` or later HID configuration, then
  physically unplug/reconnect the board:

  ```python
  import usb_hid
  usb_hid.enable((usb_hid.Device.KEYBOARD,))
  ```

  Preserve unrelated boot settings. This exposes only a keyboard HID interface.
- **Unwanted touches:** reconnect without touching the attached objects. If
  needed, increase `THRESHOLD_OFFSET` in small increments such as 100 and retest.
  Larger values make activation less sensitive. Reduce it again if touches stop
  registering.
- **Speed keeps changing or fighting:** disable other playback-speed extensions.
  Snail intentionally restores the selected rate until you reload the page.
- **Changed extension code:** click Reload on its extensions-page card, then
  reload the YouTube tab. Board changes must instead be copied to CIRCUITPY.
- **Restore original Spoke behavior:** copy your backed-up `code.py` and, if
  changed, `boot.py` back to CIRCUITPY, then unplug/reconnect. Remove or disable
  Snail on the browser's extensions page to uninstall it.

## Files and validation

```text
extension/manifest.json  Browser extension definition
extension/content.js    Key handling, speed lock, and on-screen feedback
spoke/code.py           CircuitPython touch-to-keyboard program
tests/controller.test.cjs  Automated controller behavior checks
scripts/build_dist.py   Reproducible ZIP packaging script
dist/                   Checked-in installable ZIPs and checksums
backups/                Saved board programs from development (not current firmware)
```

Run automated checks with Node.js 18 or newer:

```sh
node --test tests/controller.test.cjs
```

Rebuild distribution packages after changing the extension, board code, or README:

```sh
python3 scripts/build_dist.py
```

Commit the updated `dist/` files together with the source changes.

These checks simulate browser events and player changes; they are not an end-to-end
YouTube or physical-board test. Before relying on the setup, verify all four
speeds, paused playback, fullscreen, typing in comments, a new video, and
an ad-to-video transition on your own browser. YouTube DOM changes may require an
update to the extension. Physical Spoke behavior must be checked on the device.

## References

- [Spoke coding guide](https://www.spokeboard.com/code)
- [Spoke getting started](https://www.spokeboard.com/getting-started)
- [Manufacturer's keyboard/pin example](https://github.com/Tom-Vulpes/Spoke/blob/main/Default-Keyboard-Code)
- [Chrome: loading an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
- [Browser playbackRate property](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate)
