/**
 * Utility functions for video URL validation and processing
 */

export const isValidVideoUrl = (url: string): boolean => {
  const patterns = [
    /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[a-zA-Z0-9_-]+/i,
    /https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+\/video\/\d+/i,
    /https?:\/\/(www\.|m\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/i,
    /https?:\/\/(www\.|m\.)?youtube\.com\/watch\?.*v=[a-zA-Z0-9_-]+/i, // YouTube with extra params
    /https?:\/\/(www\.|m\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]+/i, // YouTube Shorts
    /https?:\/\/youtu\.be\/[a-zA-Z0-9_-]+/i,
    /https?:\/\/(vm\.)?tiktok\.com\/[a-zA-Z0-9]+/i,
  ];

  return patterns.some(pattern => pattern.test(url));
};

export const extractVideoUrl = (text: string): string | null => {
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlPattern);
  
  if (!urls) return null;

  for (const url of urls) {
    if (isValidVideoUrl(url)) {
      return url;
    }
  }

  return null;
}; 