/**
 * Utility functions for video URL validation and processing
 */

export const isValidVideoUrl = (url: string): boolean => {
  // Generic video URL validation - supports any HTTPS URL that could contain video content
  const genericVideoPatterns = [
    // Any HTTPS URL with common video path patterns
    /https?:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._/-]*[pP]\/[a-zA-Z0-9_-]+/i, // Posts/videos with /p/ pattern
    /https?:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._/-]*[rR]eel[sS]?\/[a-zA-Z0-9_-]+/i, // Reels pattern
    /https?:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._/-]*[vV]ideo\/[a-zA-Z0-9_-]+/i, // Video paths
    /https?:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._/-]*[wW]atch\?.*[vV]=[a-zA-Z0-9_-]+/i, // Watch with video ID
    /https?:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._/-]*[sS]horts\/[a-zA-Z0-9_-]+/i, // Short-form videos
    /https?:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._/-]*@[a-zA-Z0-9._-]+\/[a-zA-Z0-9_-]+/i, // User content paths
    /https?:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9_-]+/i, // Short URLs (like vm.platform.com/xyz)
  ];

  return genericVideoPatterns.some(pattern => pattern.test(url));
};

export const extractVideoUrl = (text: string): string | null => {
  // Extract any HTTPS URL that might contain video content
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlRegex);
  
  if (urls) {
    for (const url of urls) {
      if (isValidVideoUrl(url)) {
        return url;
      }
    }
  }
  
  return null;
}; 