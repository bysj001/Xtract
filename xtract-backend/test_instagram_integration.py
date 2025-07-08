#!/usr/bin/env python3
"""
Test script for Instagram GraphQL integration
"""

import asyncio
import os
import tempfile
from instagram_graphql import get_instagram_video_info, download_instagram_video, InstagramGraphQLError

async def test_instagram_graphql():
    """Test the Instagram GraphQL API integration"""
    
    # Test Instagram URLs (replace with actual public Instagram video URLs)
    test_urls = [
        "https://www.instagram.com/p/C1XXXXXXX/",  # Replace with real URLs
        "https://www.instagram.com/reel/C2XXXXXXX/",  # Replace with real URLs
    ]
    
    print("=" * 60)
    print("TESTING INSTAGRAM GRAPHQL INTEGRATION")
    print("=" * 60)
    
    for i, url in enumerate(test_urls, 1):
        print(f"\n--- Test {i}: {url} ---")
        
        if "XXXXXXX" in url:
            print("⚠️  Please replace with actual Instagram video URLs")
            continue
        
        try:
            # Test getting video info using our new async GraphQL API
            print("🔍 Getting video info using exact instagram-video-downloader approach...")
            video_info = await get_instagram_video_info(url)
            
            print("✅ Video info retrieved successfully!")
            print(f"   Success: {video_info.get('success', 'N/A')}")
            print(f"   Shortcode: {video_info['shortcode']}")
            print(f"   Title: {video_info.get('title', 'N/A')}")
            print(f"   Duration: {video_info.get('duration', 'N/A')}s")
            print(f"   Has audio: {video_info.get('has_audio', 'N/A')}")
            print(f"   Owner: {video_info.get('owner_username', 'N/A')}")
            print(f"   Video URL: {video_info['video_url'][:50]}...")
            
            # Test downloading (to temp directory)
            with tempfile.TemporaryDirectory() as temp_dir:
                print(f"📥 Testing download to: {temp_dir}")
                
                video_filename = f"test_{video_info['shortcode']}.mp4"
                video_path = os.path.join(temp_dir, video_filename)
                
                success = download_instagram_video(video_info['video_url'], video_path)
                
                if success and os.path.exists(video_path):
                    file_size = os.path.getsize(video_path)
                    print(f"✅ Download successful! File size: {file_size:,} bytes")
                else:
                    print("❌ Download failed - file not found")
                    
        except InstagramGraphQLError as e:
            print(f"❌ Instagram GraphQL Error: {e}")
        except Exception as e:
            print(f"❌ Unexpected Error: {e}")

def test_url_parsing():
    """Test URL parsing functionality"""
    print("\n" + "=" * 60)
    print("TESTING URL PARSING")
    print("=" * 60)
    
    # Import the client for URL parsing
    from instagram_graphql import instagram_client
    
    test_urls = [
        "https://www.instagram.com/p/ABC123DEF/",
        "https://instagram.com/p/XYZ789/",
        "https://www.instagram.com/reel/REEL123/",
        "https://instagram.com/tv/TV456/",
        "https://www.instagram.com/p/ABC123DEF/?utm_source=ig_web_copy_link",
        "https://invalid-url.com/something",
    ]
    
    for url in test_urls:
        shortcode = instagram_client.extract_shortcode_from_url(url)
        print(f"URL: {url}")
        print(f"Shortcode: {shortcode}")
        print("-" * 40)

if __name__ == "__main__":
    print("🚀 Starting Instagram GraphQL Integration Tests")
    
    # Test URL parsing first
    test_url_parsing()
    
    # Test actual API calls (requires real URLs)
    asyncio.run(test_instagram_graphql())
    
    print("\n✅ Test script completed!")
    print("\n💡 To test with real URLs:")
    print("   1. Replace the XXXXXXX placeholders with real Instagram video shortcodes")
    print("   2. Run this script again")
    print("   3. Check that videos download successfully using the exact instagram-video-downloader approach")
    print("   4. No cookies, login, or authentication required!") 