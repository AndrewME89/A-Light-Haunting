# The Raven Portrait

A self-contained, full-screen Gothic “living portrait” for a 16:9 display and Amazon Fire TV Silk. Version 1 is deliberately quiet: most of the time it is a still cemetery painting; independently scheduled blinks, ruffles, and small head turns happen rarely.

## Run locally

A web server is recommended so the browser loads assets consistently:

```bash
python3 -m http.server 8080
```

Open <http://localhost:8080>. Press `F11` in a desktop browser for fullscreen. No build, account, backend, or internet connection is required.

## Fire TV / Silk

1. Put this folder on any static web host on the same network (a computer running the command above is sufficient for testing), or deploy it to a basic HTTPS static host.
2. In Silk, open the resulting URL and choose **Enter full screen** from the menu when available.
3. In Fire TV **Settings → Display & Sounds → Screensaver**, choose the longest available start time; review sleep/power settings for the intended installation.
4. Disable monitor auto-sleep if continuous display is desired. Bookmark the portrait for quick relaunch after Fire TV updates or restarts.
5. Test the exact Fire TV/monitor combination for several hours. Silk and Fire OS can still suspend a tab or show a screensaver, and autoplay audio normally requires a user gesture.

Silk does not provide a dependable “launch this page at boot” setting. A future packaged HTML5 wrapper can reuse these exact files if kiosk reliability is required.

## Configuration

All settings live in [`config.js`](config.js). Intervals are randomized independently after every event; they are not repeating schedules. Set `burnInProtection: false` to turn off the extremely slow 1–2 pixel scene drift.

Set `debug: true` to reveal a small developer panel. Its buttons and the `B`, `R`, `N`, `←`, and `→` keys force raven states. The panel and keyboard listener do not exist when debug mode is off.

Fields reserved for later releases—location, weather refresh, audio, and lightning—already live beside Version 1 settings so upgrades keep one configuration surface. `latitude` and `longitude` intentionally default to `null`.

## Replacing artwork

Assets are intentionally isolated:

- `assets/backgrounds/cemetery.svg` — full 16:9 cemetery painting
- `assets/backgrounds/foreground.svg` — near-ground silhouette
- `assets/raven/*.svg` — identically sized raven state layers
- `assets/audio/` — reserved audio library

Replace a file while retaining its filename, or update the path map near the top of `app.js`. Production raven states should use the same canvas dimensions, anchor point, crop, and normal pose so swaps do not jump. PNG and WebP files work too after changing the mapped extension. Preloading is automatic.

## Architecture and future releases

`window.HauntedPortrait.setState('ACTIVE' | 'IDLE' | 'SLEEP' | 'AWAY')` is a small integration boundary for future presence/home automation adapters. It deliberately has no network dependency today. Weather should later be added as a separate service/controller which only changes scene classes and retains its last successful response; audio should be another independently scheduled controller.

## Display safety and limitations

The default imperceptible scene drift reduces exact pixel persistence but cannot prevent burn-in. Use the monitor’s power scheduling, avoid continuous maximum brightness, and regularly inspect the panel. The included SVG art is an original, lightweight placeholder intended to demonstrate composition and clean state alignment; replace it with final commissioned/exported artwork for the finished installation. Version 1 includes no weather requests or sound playback by design.
