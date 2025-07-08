# Configuration for video extraction service

# Rate limiting settings (in seconds)
RATE_LIMITS = {
    'instagram.com': 8,     # Instagram is strict, wait 8 seconds between requests
    'www.instagram.com': 8,
    'tiktok.com': 5,        # TikTok moderate rate limiting
    'vm.tiktok.com': 5,
    'youtube.com': 2,       # YouTube is more lenient
    'youtu.be': 2,
    'default': 3            # Default for other platforms
}

# Platform-specific user agents
USER_AGENTS = {
    'instagram': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'tiktok': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'youtube': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'default': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Maximum retry attempts per platform
MAX_RETRIES = {
    'instagram.com': 2,     # Instagram: fewer retries to avoid triggering blocks
    'tiktok.com': 3,
    'youtube.com': 3,
    'default': 2
}

# Random delay ranges for more human-like behavior (in seconds)
RANDOM_DELAYS = {
    'instagram.com': (3, 7),   # 3-7 second random delay for Instagram
    'tiktok.com': (1, 3),
    'youtube.com': (0.5, 2),
    'default': (1, 3)
}

# Error messages for users
USER_ERROR_MESSAGES = {
    'instagram_rate_limit': """
🚫 Instagram Rate Limit Reached

Instagram has temporarily blocked requests from our server. This is normal when processing multiple videos quickly.

⏰ Please wait 5-10 minutes and try again.

💡 Tips to avoid this:
• Wait a few minutes between processing multiple Instagram videos
• Try processing videos from other platforms (TikTok, YouTube) in the meantime
• This limit resets automatically after a short break

🔄 Your request will work once the rate limit period passes.
    """.strip(),
    
    'generic_rate_limit': """
⏰ Rate Limit Reached

Please wait a few minutes before processing another video from this platform.

This helps ensure reliable service for all users.
    """.strip(),
    
    'extraction_failed': """
❌ Video Processing Failed

This can happen for several reasons:
• The video is private or restricted
• The video was deleted or moved
• Temporary server issues

💡 Please try:
• Checking that the video link works in your browser
• Waiting a few minutes and trying again
• Using a different video if this one continues to fail
    """.strip()
} 