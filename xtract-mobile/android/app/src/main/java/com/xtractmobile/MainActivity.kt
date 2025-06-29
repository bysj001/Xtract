package com.xtractmobile

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
  
  companion object {
    private const val PREFS_NAME = "XtractPrefs"
    private const val SHARED_URL_KEY = "shared_url"
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "XtractMobile"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    intent?.let { handleIntent(it) }
  }

  private fun handleIntent(intent: Intent) {
    android.util.Log.d("XtractMainActivity", "=== handleIntent called ===")
    android.util.Log.d("XtractMainActivity", "Intent action: ${intent.action}")
    android.util.Log.d("XtractMainActivity", "Intent type: ${intent.type}")
    android.util.Log.d("XtractMainActivity", "Intent data: ${intent.data}")
    
    when (intent.action) {
      Intent.ACTION_SEND -> {
        android.util.Log.d("XtractMainActivity", "Handling ACTION_SEND")
        if (intent.type == "text/plain") {
          val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
          android.util.Log.d("XtractMainActivity", "Shared text: $sharedText")
          sharedText?.let { url ->
            storeSharedUrl(url)
          }
        } else {
          android.util.Log.d("XtractMainActivity", "ACTION_SEND but wrong type: ${intent.type}")
        }
      }
      Intent.ACTION_VIEW -> {
        android.util.Log.d("XtractMainActivity", "Handling ACTION_VIEW")
        val data = intent.data
        android.util.Log.d("XtractMainActivity", "View data: $data")
        data?.let { uri ->
          storeSharedUrl(uri.toString())
        }
      }
      else -> {
        android.util.Log.d("XtractMainActivity", "Unknown action: ${intent.action}")
      }
    }
  }

  private fun storeSharedUrl(url: String) {
    android.util.Log.d("XtractMainActivity", "=== storeSharedUrl called ===")
    android.util.Log.d("XtractMainActivity", "Storing URL: $url")
    
    try {
      val prefs: SharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().putString(SHARED_URL_KEY, url).apply()
      android.util.Log.d("XtractMainActivity", "URL stored successfully in SharedPreferences")
    } catch (e: Exception) {
      android.util.Log.e("XtractMainActivity", "Error storing URL in SharedPreferences", e)
    }
  }
}
