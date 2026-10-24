package com.offline.busjam

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

/**
 * Lightweight, Hardware-Accelerated Android Wrapper for the Modular Transit Krama HTML5 Engine.
 *
 * Single Source of Truth:
 * - Loads the shared `webapp/index.html` (`css/styles.css`, `js/levels.js`, `js/audio.js`,
 *   `js/engine.js`, `js/renderer.js`, `js/ui.js`) via AndroidX `WebViewAssetLoader`.
 * - Bridges native Android `VibrationEffect` haptics and dynamic Launcher Icon switching
 *   (Choice 2 Primary vs. Choice 1 Alternative) via `window.AndroidBridge`.
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val assetLoader = WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0F172A"))
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                mediaPlaybackRequiresUserGesture = false
                cacheMode = WebSettings.LOAD_DEFAULT
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
            }

            addJavascriptInterface(AndroidBridge(this@MainActivity), "AndroidBridge")

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? {
                    return assetLoader.shouldInterceptRequest(request.url)
                }
            }

            loadUrl("https://appassets.androidplatform.net/assets/index.html")
        }

        setContentView(webView)
        // Accessing window.insetsController before the decor view exists can crash on Android 11+.
        enableImmersiveFullscreen()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enableImmersiveFullscreen()
    }

    private fun enableImmersiveFullscreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // If any modal is open or user is on the game board, let the JS UI handle navigation first
        val jsBackScript = "(function(){const m=['forecastModal','settingsModal','rescueModal','victoryModal'];for(const id of m){const e=document.getElementById(id);if(e&&!e.classList.contains('hidden')){e.classList.add('hidden');return true;}}const g=document.getElementById('gameScreen'),b=document.getElementById('btnBackToHome');if(g&&!g.classList.contains('hidden')&&b){b.click();return true;}return false;})();"
        webView.evaluateJavascript(jsBackScript) { handled ->
            if (handled != "true") {
                super.onBackPressed()
            }
        }
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    class AndroidBridge(private val context: Context) {

        @JavascriptInterface
        fun vibrate(durationMs: Long) {
            try {
                val ms = durationMs.coerceIn(8L, 200L)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                    vm?.defaultVibrator?.vibrate(
                        VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE)
                    )
                } else {
                    @Suppress("DEPRECATION")
                    val vib = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vib?.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
                    } else {
                        @Suppress("DEPRECATION")
                        vib?.vibrate(ms)
                    }
                }
            } catch (_: Exception) {}
        }

        /**
         * Switches the Android Home Screen Launcher Icon between:
         * - "choice2" (Final Primary Icon: 4-Bus Interlocking Gridlock)
         * - "choice1" (Alternative Icon: Classic Red Toy Bus & Crowd Hero)
         */
        @JavascriptInterface
        fun setAppIcon(choice: String) {
            try {
                val pm = context.packageManager
                val pkg = context.packageName
                val c2 = ComponentName(pkg, "com.offline.busjam.LauncherChoice2")
                val c1 = ComponentName(pkg, "com.offline.busjam.LauncherChoice1")
                if (choice == "choice1") {
                    pm.setComponentEnabledSetting(c1, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
                    pm.setComponentEnabledSetting(c2, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
                } else {
                    pm.setComponentEnabledSetting(c2, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
                    pm.setComponentEnabledSetting(c1, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
                }
            } catch (_: Exception) {}
        }
    }
}
