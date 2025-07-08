# Configuration for video extraction service

# Rate limiting settings (in seconds) - Optimized for GraphQL bypass
RATE_LIMITS = {
    'instagram.com': 3,      # Instagram GraphQL API is much more lenient
    'www.instagram.com': 3,
    'tiktok.com': 8,         # TikTok moderate rate limiting
    'www.tiktok.com': 8,     # Include www subdomain
    'vm.tiktok.com': 8,
    'youtube.com': 3,        # YouTube is more lenient
    'youtu.be': 3,
    'default': 5             # Default for other platforms
}



# Enhanced mobile-focused user agents
USER_AGENTS = {
    'instagram': [
        # Rotate between multiple realistic mobile user agents
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ],
    'tiktok': [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
    ],
    'youtube': [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
    'default': [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    ]
}

# Maximum retry attempts per platform (more conservative)
MAX_RETRIES = {
    'instagram.com': 1,         # Instagram: minimal retries to avoid blocks
    'www.instagram.com': 1,
    'tiktok.com': 2,
    'www.tiktok.com': 2,
    'vm.tiktok.com': 2,
    'youtube.com': 3,
    'youtu.be': 3,
    'default': 2
}

# Random delay ranges for more human-like behavior (optimized for GraphQL)
RANDOM_DELAYS = {
    'instagram.com': (1, 3),    # Much shorter delays with GraphQL API
    'www.instagram.com': (1, 3),
    'tiktok.com': (3, 8),
    'www.tiktok.com': (3, 8),
    'vm.tiktok.com': (3, 8),
    'youtube.com': (1, 4),
    'youtu.be': (1, 4),
    'default': (2, 6)
}

# Error messages for users
USER_ERROR_MESSAGES = {
    'instagram_rate_limit': """
🚫 Instagram Rate Limit Reached

Instagram has temporarily restricted our GraphQL API access. This is rare but can happen with very high request volumes.

⏰ Please wait 2-3 minutes and try again.

💡 Our enhanced system:
• Uses Instagram's internal GraphQL API (much more reliable)
• No login or cookies required
• Significantly reduced rate limiting compared to traditional methods

🔄 This temporary limit usually resolves quickly.
    """.strip(),
    
    'instagram_auth_required': """
🔐 Instagram Access Restricted

Instagram is restricting access to this content.

💡 This usually happens with:
• Private or restricted videos
• Videos from accounts that require login
• When Instagram detects automated access

🔄 Please try:
• Making sure the video is public and accessible
• Waiting 10-15 minutes and trying again
• Using a different public video if this one continues to fail
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
• Platform restrictions

💡 Please try:
• Checking that the video link works in your browser
• Waiting a few minutes and trying again
• Using a different video if this one continues to fail
    """.strip()
} 