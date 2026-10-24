# Android app

This directory contains the Android WebView wrapper. Its Gradle asset source points to the
repository's `../webapp/` directory, so the APK packages the same HTML, CSS, JavaScript, PWA
manifest, and icons as the browser version without a second copy.

Build and run the Android unit-test task from the repository root:

```powershell
android\gradlew.bat -p android testReleaseUnitTest assembleRelease
```

The app version is set in `version.properties`. See the repository [release instructions](../README.md).
