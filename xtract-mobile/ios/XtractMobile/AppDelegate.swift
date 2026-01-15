import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "XtractMobile",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
  
  // Handle URL scheme from Share Extension
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    // Check if this is a share-video URL from our share extension
    if url.scheme == "xtract" && url.host == "share-video" {
      // Extract the video path from the query parameter
      if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
         let pathItem = components.queryItems?.first(where: { $0.name == "path" }),
         let videoPath = pathItem.value?.removingPercentEncoding {
        // Store the video path in shared UserDefaults for the React Native layer
        let sharedDefaults = UserDefaults(suiteName: "group.com.xtract.mobile")
        sharedDefaults?.set(videoPath, forKey: "sharedVideoPath")
        sharedDefaults?.set(Date().timeIntervalSince1970, forKey: "sharedVideoTimestamp")
        sharedDefaults?.synchronize()
        
        // Post a notification that React Native can listen to
        NotificationCenter.default.post(name: NSNotification.Name("SharedVideoReceived"), object: nil, userInfo: ["path": videoPath])
        
        return true
      }
    }
    
    return false
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
