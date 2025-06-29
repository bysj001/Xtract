package com.xtractmobile

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

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
            // Send the shared URL to React Native
            sendSharedUrlToReactNative(url)
          }
        }
      }
      Intent.ACTION_VIEW -> {
        val data = intent.data
        data?.let { uri ->
          // Handle direct URL intents (from browser sharing)
          sendSharedUrlToReactNative(uri.toString())
        }
      }
    }
  }

  private fun sendSharedUrlToReactNative(url: String) {
    reactInstanceManager?.currentReactContext?.let { reactContext ->
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("sharedURL", url)
    }
  }
}
