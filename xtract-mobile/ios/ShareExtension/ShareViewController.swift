//
//  ShareViewController.swift
//  ShareExtension
//
//  Handles video file sharing from other apps
//

import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {

    override func isContentValid() -> Bool {
        return true
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        handleSharedContent()
    }

    override func didSelectPost() {
        self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    override func configurationItems() -> [Any]! {
        return []
    }
    
    private func handleSharedContent() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
            return
        }
        
        for extensionItem in extensionItems {
            if let itemProviders = extensionItem.attachments {
                for itemProvider in itemProviders {
                    // Check for video content
                    if itemProvider.hasItemConformingToTypeIdentifier(UTType.movie.identifier) {
                        handleVideoItem(itemProvider)
                        return
                    } else if itemProvider.hasItemConformingToTypeIdentifier(UTType.video.identifier) {
                        handleVideoItem(itemProvider)
                        return
                    } else if itemProvider.hasItemConformingToTypeIdentifier("public.movie") {
                        handleVideoItem(itemProvider)
                        return
                    }
                }
            }
        }
        
        // No video found - show error
        showAlert(title: "Unsupported Content", message: "Please share a video file to extract audio.")
    }
    
    private func handleVideoItem(_ itemProvider: NSItemProvider) {
        let typeIdentifiers = [
            UTType.movie.identifier,
            UTType.video.identifier,
            "public.movie",
            "com.apple.quicktime-movie"
        ]
        
        for typeIdentifier in typeIdentifiers {
            if itemProvider.hasItemConformingToTypeIdentifier(typeIdentifier) {
                itemProvider.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { [weak self] (item, error) in
                    DispatchQueue.main.async {
                        if let error = error {
                            self?.showAlert(title: "Error", message: "Failed to load video: \(error.localizedDescription)")
                            return
                        }
                        
                        if let url = item as? URL {
                            self?.openMainAppWithVideo(url: url)
                        } else if let data = item as? Data {
                            // Save data to temp file and open
                            self?.saveAndOpenVideo(data: data)
                        } else {
                            self?.showAlert(title: "Error", message: "Could not process video file")
                        }
                    }
                }
                return
            }
        }
    }
    
    private func saveAndOpenVideo(data: Data) {
        let tempDir = FileManager.default.temporaryDirectory
        let filename = "shared_video_\(Date().timeIntervalSince1970).mp4"
        let fileURL = tempDir.appendingPathComponent(filename)
        
        do {
            try data.write(to: fileURL)
            openMainAppWithVideo(url: fileURL)
        } catch {
            showAlert(title: "Error", message: "Failed to save video: \(error.localizedDescription)")
        }
    }
    
    private func openMainAppWithVideo(url: URL) {
        // Create URL scheme to open main app with video file path
        let encodedPath = url.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let appURLString = "xtract://share-video?path=\(encodedPath)"
        
        if let appURL = URL(string: appURLString) {
            // Try to open the main app
            openURL(appURL)
        }
        
        // Complete the extension
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        }
    }
    
    private func openURL(_ url: URL) {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = responder?.next
        }
        
        // Fallback for iOS 14+
        if #available(iOS 14.0, *) {
            self.extensionContext?.open(url, completionHandler: nil)
        }
    }
    
    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
        })
        present(alert, animated: true)
    }
}
