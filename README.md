# Transit Krama

Transit Krama is an offline HTML5 game distributed as a web app and as an Android WebView app.
The root `webapp/` directory is the single source for HTML, CSS, JavaScript, icons, and PWA files.
The Android Gradle project packages those same files directly from `webapp/`.

GitHub repository: [trishul-developers/transit-krama](https://github.com/trishul-developers/transit-krama).

## Project layout

- `webapp/` — Browser/PWA app and shared runtime resources.
- `android/` — Android WebView wrapper, launcher resources, and Gradle build.
- `android/version.properties` — Shared Android release version (`0.1.0`).
- `android/store_assets/` — Store artwork and screenshots.

## Build locally

Serve `webapp/` with any static web server for browser use. Install JDK 17 and Android SDK 35 to
build the Android app. From the repository root, run:

```powershell
android\gradlew.bat -p android testReleaseUnitTest assembleRelease
```

The release APK is written to `android/app/build/outputs/apk/release/`.

## Release CI

Pull requests and pushes to `main` build and test the Android release APK and package the web app.
Pushing a `v*` tag builds both and publishes them as GitHub Release assets. The Android artifact is
unsigned; sign it with your distribution keystore before publishing to an app store.

See [GitHub Actions](https://github.com/trishul-developers/transit-krama/actions) for CI runs and
[Releases](https://github.com/trishul-developers/transit-krama/releases) for published downloads.

Release version is set in `android/version.properties` and the release tag must match it, for
example `v0.1.0`.
