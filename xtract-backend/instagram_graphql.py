import requests
import json
import re
import time
import random
import asyncio
from typing import Dict, Any, Optional
from urllib.parse import urlparse, parse_qs, urlencode
from collections import OrderedDict

# No global rate limiting needed - instagram-video-downloader proves this works without delays

class InstagramGraphQLError(Exception):
    """Custom exception for Instagram GraphQL API errors"""
    pass

class InstagramGraphQLClient:
    """
    Instagram GraphQL client that exactly replicates the working instagram-video-downloader
    approach to bypass rate limits and cookie requirements.
    """
    
    def __init__(self):
        # Don't create session in __init__ - create fresh session per request
        self.session = None
        
        # Exact parameters from working implementation
        self.doc_id = "8845758582119845"
        self.lsd_token = "AVrqPT0gJDo"
        self.app_id = "1217981644879628"
    
    def _create_fresh_session(self) -> requests.Session:
        """Create a fresh session for each request (like opening a new browser tab)"""
        session = requests.Session()
        session.cookies.clear()
        
        # CRITICAL: Match fetch's credentials: "include" behavior exactly
        # This ensures cookies are handled like a browser
        session.trust_env = False  # Don't use environment proxy settings
        
        # Configure session to automatically handle cookies (like credentials: "include")
        # This is crucial for Instagram's authentication system
        
        # Add session-level headers that all requests should have
        session.headers.update({
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            # CRITICAL: Set proper Origin header to match working implementation
            'Origin': 'https://www.instagram.com',
        })
        
        return session
        
    def get_headers(self, shortcode: str) -> Dict[str, str]:
        """Generate headers that exactly match the working implementation"""
        return {
            "User-Agent": "Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/x-www-form-urlencoded",
            "X-FB-Friendly-Name": "PolarisPostActionLoadPostQueryQuery",
            "X-BLOKS-VERSION-ID": "0d99de0d13662a50e0958bcb112dd651f70dea02e1859073ab25f8f2a477de96",
            "X-CSRFToken": "uy8OpI1kndx4oUHjlHaUfu",
            "X-IG-App-ID": self.app_id,
            "X-FB-LSD": self.lsd_token,
            "X-ASBD-ID": "359341",
            "Sec-GPC": "1",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache",
        }
    
    def generate_request_body(self, shortcode: str) -> str:
        """Generate request body with EXACT values from working instagram-video-downloader"""
        
        # CRITICAL: Use exact JSON formatting and boolean handling as the working version
        variables_json = json.dumps({
            "shortcode": shortcode,
            "fetch_tagged_user_count": None,
            "hoisted_comment_id": None,
            "hoisted_reply_id": None,
        }, separators=(',', ':'))  # Remove ensure_ascii=False to match original
        
        # Use EXACT static values from working implementation - no randomization!
        # CRITICAL: Maintain EXACT parameter order from working implementation
        body_params = OrderedDict([
            ("av", "0"),
            ("__d", "www"),
            ("__user", "0"),
            ("__a", "1"),
            ("__req", "b"),
            ("__hs", "20183.HYP:instagram_web_pkg.2.1...0"),
            ("dpr", "3"),
            ("__ccg", "GOOD"),
            ("__rev", "1021613311"),
            ("__s", "hm5eih:ztapmw:x0losd"),
            ("__hsi", "7489787314313612244"),
            ("__dyn", "7xeUjG1mxu1syUbFp41twpUnwgU7SbzEdF8aUco2qwJw5ux609vCwjE1EE2Cw8G11wBz81s8hwGxu786a3a1YwBgao6C0Mo2swtUd8-U2zxe2GewGw9a361qw8Xxm16wa-0oa2-azo7u3C2u2J0bS1LwTwKG1pg2fwxyo6O1FwlA3a3zhA6bwIxe6V8aUuwm8jwhU3cyVrDyo"),
            ("__csr", "goMJ6MT9Z48KVkIBBvRfqKOkinBtG-FfLaRgG-lZ9Qji9XGexh7VozjHRKq5J6KVqjQdGl2pAFmvK5GWGXyk8h9GA-m6V5yF4UWagnJzazAbZ5osXuFkVeGCHG8GF4l5yp9oOezpo88PAlZ1Pxa5bxGQ7o9VrFbg-8wwxp1G2acxacGVQ00jyoE0ijonyXwfwEnwWwkA2m0dLw3tE1I80hCg8UeU4Ohox0clAhAtsM0iCA9wap4DwhS1fxW0fLhpRB51m13xC3e0h2t2H801HQw1bu02j-"),
            ("__comet_req", "7"),
            ("lsd", self.lsd_token),
            ("jazoest", "2946"),
            ("__spin_r", "1021613311"),
            ("__spin_b", "trunk"),
            ("__spin_t", "1743852001"),
            ("__crn", "comet.igweb.PolarisPostRoute"),
            ("fb_api_caller_class", "RelayModern"),
            ("fb_api_req_friendly_name", "PolarisPostActionLoadPostQueryQuery"),
            ("variables", variables_json),
            ("server_timestamps", "true"),  # CRITICAL: Use string "true" not boolean True
            ("doc_id", self.doc_id),
        ])
        
        return urlencode(body_params)
    
    def extract_shortcode_from_url(self, url: str) -> Optional[str]:
        """Extract Instagram shortcode from various URL formats"""
        patterns = [
            r'instagram\.com/p/([A-Za-z0-9_-]+)',
            r'instagram\.com/reel/([A-Za-z0-9_-]+)',
            r'instagram\.com/tv/([A-Za-z0-9_-]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    async def get_video_info(self, url: str) -> Dict[str, Any]:
        """
        Get video information from Instagram URL using exact working GraphQL approach
        """
        
        shortcode = self.extract_shortcode_from_url(url)
        if not shortcode:
            raise InstagramGraphQLError("Could not extract shortcode from Instagram URL")
        
        print(f"[INFO] Extracted shortcode: {shortcode}")
        
        # No delays needed - instagram-video-downloader makes immediate requests
        
        # Create fresh session for this request (like opening new browser tab)
        session = self._create_fresh_session()
        
        # Prepare the request exactly like the working implementation
        graphql_url = "https://www.instagram.com/graphql/query"
        headers = self.get_headers(shortcode)
        body = self.generate_request_body(shortcode)
        
        try:
            print(f"[INFO] Making GraphQL request to Instagram with fresh session...")
            
            # CRITICAL: Set referrer header to match fetch's referrer behavior exactly
            headers['Referer'] = f"https://www.instagram.com/p/{shortcode}/"
            
            # Debug the request (can be removed later)
            print(f"[DEBUG] Request URL: {graphql_url}")
            print(f"[DEBUG] Request headers count: {len(headers)}")
            print(f"[DEBUG] Request body length: {len(body)}")
            print(f"[DEBUG] First 100 chars of body: {body[:100]}")
            
            # Make POST request exactly like the working implementation
            response = session.post(
                graphql_url,
                headers=headers,
                data=body,
                timeout=30,
                allow_redirects=True  # Equivalent to mode: "cors"
            )
            
            print(f"[INFO] Instagram response status: {response.status_code}")
            print(f"[DEBUG] Response headers: {dict(response.headers)}")
            
            # CRITICAL: Log the actual response content for debugging
            response_text = response.text
            print(f"[DEBUG] Raw response length: {len(response_text)}")
            print(f"[DEBUG] Raw response (first 1000 chars): {response_text[:1000]}")
            
            # Handle various response codes like the working implementation
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"[DEBUG] Response data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                    print(f"[DEBUG] Full response data: {json.dumps(data, indent=2)}")
                except json.JSONDecodeError as je:
                    print(f"[ERROR] JSON decode error: {je}")
                    print(f"[DEBUG] Raw response text (first 1000 chars): {response.text[:1000]}")
                    raise InstagramGraphQLError("Invalid JSON response from Instagram")
                
                # Check for GraphQL data structure exactly like the working version
                if not data.get('data'):
                    print(f"[ERROR] No 'data' key in response: {data}")
                    raise InstagramGraphQLError(f"Instagram Response Missing Data: {json.dumps(data)}")
                    
                if not data['data'].get('xdt_shortcode_media'):
                    print(f"[ERROR] No 'xdt_shortcode_media' in data: {data['data']}")
                    raise InstagramGraphQLError(f"Instagram Response Missing Media: {json.dumps(data['data'])}")
                
                media = data['data']['xdt_shortcode_media']
                
                if not media:
                    raise InstagramGraphQLError(f"Instagram Media is Null: {json.dumps(data['data'])}")
                
                if not media.get('is_video', False):
                    print(f"[ERROR] Post is not a video. is_video: {media.get('is_video')}")
                    raise InstagramGraphQLError(f"Post is not a video. Post type: {media.get('__typename', 'unknown')}, is_video: {media.get('is_video')}")
                
                # Extract video information
                video_url = media.get('video_url')
                if not video_url:
                    print(f"[ERROR] No video_url in media: {list(media.keys())}")
                    raise InstagramGraphQLError(f"No video URL in response. Available keys: {list(media.keys())}")
                
                result = {
                    'success': True,
                    'video_url': video_url,
                    'title': media.get('title', f'Instagram Video {shortcode}'),
                    'duration': media.get('video_duration', 0),
                    'view_count': media.get('video_view_count', 0),
                    'has_audio': media.get('has_audio', True),
                    'shortcode': shortcode,
                    'thumbnail_url': media.get('display_url'),
                    'owner_username': media.get('owner', {}).get('username', 'unknown'),
                    'taken_at': media.get('taken_at_timestamp', 0)
                }
                
                print(f"[INFO] Successfully extracted video info for {shortcode}")
                return result
                
            elif response.status_code == 404:
                print(f"[ERROR] Instagram returned 404 for shortcode: {shortcode}")
                print(f"[DEBUG] 404 Response text: {response.text}")
                raise InstagramGraphQLError(f"Instagram 404 Error: {response.text}")
            elif response.status_code in [429, 401]:
                print(f"[ERROR] Instagram rate limited or unauthorized: {response.status_code}")
                print(f"[DEBUG] Rate limit response text: {response.text}")
                raise InstagramGraphQLError(f"Instagram {response.status_code} Error: {response.text}")
            else:
                print(f"[ERROR] Instagram API error {response.status_code}: {response.text}")
                raise InstagramGraphQLError(f"Instagram {response.status_code} Error: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Network error: {e}")
            raise InstagramGraphQLError(f"Network error: {str(e)}")
        except Exception as e:
            if isinstance(e, InstagramGraphQLError):
                raise
            print(f"[ERROR] Unexpected error: {e}")
            print(f"[DEBUG] Exception type: {type(e)}")
            import traceback
            print(f"[DEBUG] Full traceback: {traceback.format_exc()}")
            raise InstagramGraphQLError(f"Unexpected error: {str(e)}")
    
    def download_video_direct(self, video_url: str, output_path: str) -> bool:
        """Download video directly from Instagram's CDN with proper headers"""
        
        try:
            # Use fresh session for download too
            session = self._create_fresh_session()
            
            # Use appropriate headers for video download
            download_headers = {
                "User-Agent": "Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36",
                "Referer": "https://www.instagram.com/",
                "Accept": "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5",
                "Accept-Language": "en-US,en;q=0.5",
                "Range": "bytes=0-",  # Support partial content
            }
            
            response = session.get(
                video_url,
                headers=download_headers,
                stream=True,
                timeout=60  # Longer timeout for video downloads
            )
            
            if response.status_code in [200, 206]:  # Accept partial content too
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                return True
            else:
                print(f"Download failed with status code: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"Error downloading video: {e}")
            return False

# Global instance for reuse
instagram_client = InstagramGraphQLClient()

# Convenience function for integration with existing code
async def get_instagram_video_info(url: str) -> Dict[str, Any]:
    """Get Instagram video info using the GraphQL client"""
    return await instagram_client.get_video_info(url)

def download_instagram_video(video_url: str, output_path: str) -> bool:
    """Download Instagram video using the GraphQL client"""
    return instagram_client.download_video_direct(video_url, output_path) 