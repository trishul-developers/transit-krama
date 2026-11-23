# Transit Krama Native Rebuild v1

Status: **Draft / playable native vertical slice**  
Branch: `feat/native-rebuild-v1`

## 1. Product goal

Rebuild Transit Krama as a proper Android-native puzzle game while preserving only the core idea:

> Vehicles can leave only along their facing direction. The player must dispatch them in a safe order into a limited number of transit bays. Passengers board only matching-color vehicles. A poor dispatch order consumes bay capacity and can deadlock the route.

The previous WebView implementation is intentionally not reused as the game runtime.

## 2. Market / design study

Reviewed current Android puzzle patterns including:

- Rollic **Bus Jam** — color-matching passenger/bus loop, progressive difficulty, simple controls.
- Gimica **Bus Jam: Traffic Trouble** — hidden/revealed passenger pressure and constrained boarding decisions.
- Popcore **Parking Jam 3D** — immediate vehicle-order puzzle, offline play, strong tactile movement and long-term customization.
- Guru Puzzle Game **Parking Jam 3D** — clear board-first presentation, no-timer positioning, obstacle variety.
- Rollic **Color Block Jam** — highly legible color/route goals and progressive obstacle complexity.

Observed strengths worth retaining:

1. The puzzle board is the primary visual surface.
2. Tap/swipe actions produce immediate, satisfying feedback.
3. Rules are understandable in seconds but support planning several moves ahead.
4. Difficulty comes from spatial constraints and new mechanics, not from UI complexity.
5. Offline play, undo/hints, color accessibility and solver-valid levels are strong trust features.
6. Progression/theme unlocks can create retention without changing the core puzzle.

Observed failure patterns to avoid:

1. Intrusive ads before/after short rounds.
2. Artificial timer pressure replacing puzzle depth.
3. Stutter or delayed vehicle response.
4. Repetitive layouts with only cosmetic difficulty changes.
5. Large HUDs, currencies and boosters obscuring the actual board.

Reference pages:
- https://play.google.com/store/apps/details?id=com.nt.games.busjam
- https://play.google.com/store/apps/details?id=com.lszenlamzr.parkingjam
- https://play.google.com/store/apps/details?id=com.GybeGames.ColorBlockJam
- https://developer.android.com/games/develop/gameloops
- https://developer.android.com/develop/ui/views/layout/custom-views/optimizing-view
- https://developer.android.com/develop/ui/views/haptics/haptics-principles

## 3. Native architecture

### Runtime

```
MainActivity
  └── TransitGameView
        ├── HOME
        ├── LEVEL MAP
        └── PLAY
              ├── passenger-flow HUD
              ├── native Canvas board
              ├── transit bays
              └── undo / hint / moves
```

There is no WebView, JavaScript bridge, HTML, CSS, service worker or PWA dependency in the Android runtime.

### Engine separation

`TransitGameEngine` owns deterministic state:

- parked / bay / cleared vehicle state
- directional ray blocking
- limited transit-bay occupancy
- ordered passenger queue
- color matching and boarding
- departure when capacity is reached
- deadlock detection
- undo snapshots
- hint selection
- win condition

`TransitGameView` owns only interaction, rendering, feedback and local progression.

## 4. Core loop

1. Read the next passenger colors.
2. Identify a vehicle whose forward exit ray is clear.
3. Tap it to dispatch it to the first free transit bay.
4. Matching passengers immediately board any compatible vehicle in the bays.
5. A full vehicle departs and frees its bay.
6. A partially filled vehicle stays and consumes bay capacity.
7. Clear all passengers and vehicles without locking every bay.

This deliberately creates two simultaneous reasoning layers:

- **Spatial:** which vehicle can physically exit?
- **Flow:** which color should occupy scarce bay capacity?

## 5. Campaign v1

The initial native vertical slice contains **30 deterministic levels**.

Difficulty ramps through:

- vehicle count: 8 → 10 → 12
- available bays: 4 → 3 → 2
- rotated board orientation
- longer blocker dependency chains
- repeated partial-fill / release patterns

Every level contains a known solution order. CI executes that order through the real engine and requires the level to finish in `WON`.

This is not intended to be the final campaign size. It is the production-quality foundation for adding authored obstacle families later.

## 6. Visual direction

Working title: **Transit Krama: City Flow**

Visual principles:

- dark contemporary city-control palette
- cyan route/navigation accent
- saturated vehicle/passenger colors
- high-contrast direction arrows
- large tap targets
- board-first composition
- shallow HUD
- no currency or booster clutter in the core loop

The launcher mark is a route/network icon rather than a reused bus illustration.

## 7. Feedback

Current:

- native system click sound
- subtle haptic on successful input
- stronger reject haptic on blocked/no-bay actions
- victory vibration cadence
- directional vehicle movement arc into a bay
- hint halo
- blocked halo
- toast feedback
- explicit deadlock panel

Future tuning should use real-device haptic review rather than increasing vibration strength blindly.

## 8. Performance rules

Android guidance is treated as a contract:

- no perpetual busy game loop when the board is static
- animate using `postInvalidateOnAnimation()` only while feedback is active
- elapsed-time animation instead of frame-count animation
- cache gradients and paints outside hot animation loops
- avoid WebView/browser compositing overhead
- keep rendering hierarchy to one custom game view

Before release, Profile GPU Rendering / Perfetto should validate frame consistency on a mid-range physical Android device.

## 9. CI acceptance

The branch is not accepted unless CI proves:

- native JVM engine tests pass
- all 30 known solution traces win
- undo state restoration passes
- native debug APK compiles and is signed
- QA package is `com.offline.transitkrama.native`
- QA launcher label is `Transit Krama Native QA`
- APK contains no `assets/index.html` WebView runtime

## 10. Next production stages

After the vertical slice passes device review:

1. Add authored obstacle families: locked buses, tunnels, one-way gates, road works.
2. Expand to 100+ solver-validated levels with repetition metrics.
3. Add colorblind roof symbols/patterns.
4. Add richer audio using packaged low-latency effects.
5. Add theme/vehicle cosmetics earned through progression, without interstitial ads.
6. Add per-level performance targets and Android Macrobenchmark/profile coverage.
7. Replace temporary/legacy store assets with screenshots captured from the native build.
