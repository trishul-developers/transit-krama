import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val versionPropsFile = rootProject.file("version.properties")
val versionProps = Properties()
if (versionPropsFile.exists()) {
    versionProps.load(versionPropsFile.inputStream())
}
val versionMajor = versionProps.getProperty("VERSION_MAJOR", "1").toInt()
val versionMinor = versionProps.getProperty("VERSION_MINOR", "0").toInt()
val versionPatch = versionProps.getProperty("VERSION_PATCH", "0").toInt()
val computedVersionCode = versionMajor * 10000 + versionMinor * 100 + versionPatch
val computedVersionName = "$versionMajor.$versionMinor.$versionPatch"
val signingStoreFile = providers.environmentVariable("ANDROID_KEYSTORE_PATH").orNull?.takeIf { it.isNotBlank() }
val signingStorePassword = providers.environmentVariable("ANDROID_KEYSTORE_PASSWORD").orNull?.takeIf { it.isNotBlank() }
val signingKeyAlias = providers.environmentVariable("ANDROID_KEY_ALIAS").orNull?.takeIf { it.isNotBlank() }
val signingKeyPassword = providers.environmentVariable("ANDROID_KEY_PASSWORD").orNull?.takeIf { it.isNotBlank() }
val signingValues = listOf(signingStoreFile, signingStorePassword, signingKeyAlias, signingKeyPassword)
require(signingValues.all { it == null } || signingValues.all { !it.isNullOrBlank() }) {
    "Android release signing requires ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, and ANDROID_KEY_PASSWORD."
}
val hasReleaseSigning = signingValues.all { !it.isNullOrBlank() }

android {
    namespace = "com.offline.busjam"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.offline.transitkrama"
        minSdk = 24
        targetSdk = 35
        versionCode = computedVersionCode
        versionName = computedVersionName
    }

    // The web app is the single source of truth for both the browser and WebView builds.
    sourceSets.getByName("main").assets.srcDir("../../webapp")

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(signingStoreFile!!)
                storePassword = signingStorePassword
                keyAlias = signingKeyAlias
                keyPassword = signingKeyPassword
            }
        }
    }

    buildTypes {
        debug {
            isDebuggable = true
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}
