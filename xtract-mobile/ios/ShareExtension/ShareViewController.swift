//
//  ShareViewController.swift
//  ShareExtension
//
//  Created by Seung Jae You on 6/22/25.
//

import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {

    override func isContentValid() -> Bool {
        // Do validation of contentText and/or NSExtensionContext attachments here
        return true
    }

    override func didSelectPost() {
        if let content = contentText {
            let url = extractVideoURL(from: content)
            if let videoURL = url {
                // For now, just open the main app with URL scheme
                // App Groups can be added later once signing is fixed
                openMainApp(with: videoURL)
            }
        }
        
        // Inform the host that we're done, so it un-blocks its UI. Note: Alternatively you could call super's -didSelectPost, which will similarly complete the extension context.
        self.extensionContext!.completeRequest(returningItems: [], completionHandler: nil)
    }

    override func configurationItems() -> [Any]! {
        // To add configuration options via table cells at the bottom of the sheet, return an array of SLComposeSheetConfigurationItem here.
        return []
    }
    
    private func extractVideoURL(from text: String) -> String? {
        // Generic patterns that match common video URL structures without targeting specific platforms
        let patterns = [
            // Generic patterns for video content (posts, reels, videos, etc.)
            "https?://[a-zA-Z0-9.-]+/[a-zA-Z0-9._/-]*[pP]/[a-zA-Z0-9_-]+", // Posts with /p/ pattern
            "https?://[a-zA-Z0-9.-]+/[a-zA-Z0-9._/-]*[rR]eel[sS]?/[a-zA-Z0-9_-]+", // Reels pattern
            "https?://[a-zA-Z0-9.-]+/[a-zA-Z0-9._/-]*[vV]ideo/[a-zA-Z0-9_-]+", // Video paths  
            "https?://[a-zA-Z0-9.-]+/[a-zA-Z0-9._/-]*[wW]atch\\?.*[vV]=[a-zA-Z0-9_-]+", // Watch with video ID
            "https?://[a-zA-Z0-9.-]+/[a-zA-Z0-9._/-]*[sS]horts/[a-zA-Z0-9_-]+", // Short-form videos
            "https?://[a-zA-Z0-9.-]+/[a-zA-Z0-9._/-]*@[a-zA-Z0-9._-]+/[a-zA-Z0-9_-]+", // User content paths
            "https?://[a-zA-Z0-9.-]+/[a-zA-Z0-9_-]+", // Short URLs (like vm.platform.com/xyz)
        ]
        
        for pattern in patterns {
            let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive)
            let range = NSRange(location: 0, length: text.utf16.count)
            if let match = regex?.firstMatch(in: text, options: [], range: range) {
                if let swiftRange = Range(match.range, in: text) {
                    return String(text[swiftRange])
                }
            }
        }
        
        return nil
    }
    
    private func openMainApp(with url: String) {
        let urlScheme = "xtract://share?url=\(url.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        if let appURL = URL(string: urlScheme) {
            var responder: UIResponder? = self
            while responder != nil {
                if let application = responder as? UIApplication {
                    application.open(appURL, options: [:], completionHandler: nil)
                    break
                }
                responder = responder?.next
            }
            
            // Fallback method for iOS 14+
            if #available(iOS 14.0, *) {
                self.extensionContext?.open(appURL, completionHandler: nil)
            }
        }
    }
}
