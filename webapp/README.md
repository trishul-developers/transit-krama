# Transit Krama — Modular WebApp & PWA Package

## Clean Modular File Architecture
Instead of a single monolithic HTML file, the codebase is split into focused, lightweight modules shared 1:1 with the Android WebView wrapper:

- `index.html` — Lightweight semantic DOM structure & modals (~16 KB)
- `css/styles.css` — Self-contained 100% offline CSS utility stylesheet (zero external CDN required)
- `js/levels.js` — 100 verified campaign levels, colorblind-safe livery palette & `decodeLevel()`
- `js/audio.js` — Web Audio API procedural synthesizer + `window.AndroidBridge` native haptics bridge
- `js/engine.js` — 2D OBB Separating Axis Theorem (SAT) collision, raycast, stadium-oval crowd roundabout & feeder chute geometry, 1-by-1 individual crowd physics, multi-vehicle dispatch & tactical power-ups
- `js/renderer.js` — High-DPI 2.5D/3D volumetric Canvas renderer & 60 FPS simulation loop
- `js/ui.js` — HUD state sync, forecast/victory/rescue/settings modals, pointer/touch input & icon switcher
- `icons/`
  - `icon-192.png`, `icon-512.png` — **Final Primary Icon (Choice 2: 4-Color Interlocking Bus Gridlock)**
  - `icon-alt-192.png`, `icon-alt-512.png` — **Alternative Icon (Choice 1: Classic Red Toy Bus & Waving Crowd)**
- `store_snapshots/` — 5 publishable 9:16 vertical store screenshots
