package com.xtractmobile

import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SharedUrlModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val PREFS_NAME = "XtractPrefs"
    private const val SHARED_URL_KEY = "shared_url"
  }

  override fun getName(): String {
    return "SharedUrlModule"
  }

  @ReactMethod
  fun getStoredSharedUrl(promise: Promise) {
    try {
      val prefs: SharedPreferences = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val storedUrl = prefs.getString(SHARED_URL_KEY, null)
      
      android.util.Log.d("SharedUrlModule", "Retrieved stored URL: $storedUrl")
      promise.resolve(storedUrl)
    } catch (e: Exception) {
      android.util.Log.e("SharedUrlModule", "Error retrieving stored URL", e)
      promise.reject("GET_URL_ERROR", "Failed to get stored URL", e)
    }
  }

  @ReactMethod
  fun clearStoredSharedUrl(promise: Promise) {
    try {
      val prefs: SharedPreferences = reactApplicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().remove(SHARED_URL_KEY).apply()
      
      android.util.Log.d("SharedUrlModule", "Cleared stored URL")
      promise.resolve(true)
    } catch (e: Exception) {
      android.util.Log.e("SharedUrlModule", "Error clearing stored URL", e)
      promise.reject("CLEAR_URL_ERROR", "Failed to clear stored URL", e)
    }
  }
} 