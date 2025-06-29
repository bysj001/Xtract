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
    when (intent.action) {
      Intent.ACTION_SEND -> {
        if (intent.type == "text/plain") {
          val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
          sharedText?.let { url ->
            storeSharedUrl(url)
          }
        }
      }
      Intent.ACTION_VIEW -> {
        val data = intent.data
        data?.let { uri ->
          storeSharedUrl(uri.toString())
        }
      }
    }
  }

  private fun storeSharedUrl(url: String) {
    try {
      val prefs: SharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().putString(SHARED_URL_KEY, url).apply()
    } catch (e: Exception) {
      // Handle error silently
    }
  }
}
