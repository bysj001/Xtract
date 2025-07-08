import requests
import json
import re
import time
import random
import asyncio
from typing import Dict, Any, Optional
from urllib.parse import urlparse, parse_qs, urlencode

# Global rate limiting for Instagram requests
_last_instagram_request_time = 0
_min_request_interval = 5  # Minimum 5 seconds between Instagram requests globally

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
        
        # Add some session-level headers that all requests should have
        session.headers.update({
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
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
            "Referer": f"https://www.instagram.com/p/{shortcode}/",
        }
    
    def generate_request_body(self, shortcode: str) -> str:
        """Generate request body with some variation to avoid fingerprint detection"""
        
        # Generate some random variations while keeping core structure
        jazoest_variants = ["2946", "21946", "22946", "23946"]  # Slight variations
        hsi_base = "7489787314313612"
        hsi_suffix = str(random.randint(100, 999))  # Add random suffix
        spin_t = str(int(time.time()))  # Use current timestamp
        
        # Randomly select req value
        req_variants = ["b", "c", "d", "e", "f"]
        
        body_params = {
            "av": "0",
            "__d": "www",
            "__user": "0",
            "__a": "1",
            "__req": random.choice(req_variants),  # Vary this
            "__hs": "20183.HYP:instagram_web_pkg.2.1...0",
            "dpr": "3",
            "__ccg": "GOOD",
            "__rev": "1021613311",
            "__s": "hm5eih:ztapmw:x0losd",
            "__hsi": hsi_base + hsi_suffix,  # Randomize this
            "__dyn": "7xeUjG1mxu1syUbFp41twpUnwgU7SbzEdF8aUco2qwJw5ux609vCwjE1EE2Cw8G11wBz81s8hwGxu786a3a1YwBgao6C0Mo2swtUd8-U2zxe2GewGw9a361qw8Xxm16wa-0oa2-azo7u3C2u2J0bS1LwTwKG1pg2fwxyo6O1FwlA3a3zhA6bwIxe6V8aUuwm8jwhU3cyVrDyo",
            "__csr": "goMJ6MT9Z48KVkIBBvRfqKOkinBtG-FfLaRgG-lZ9Qji9XGexh7VozjHRKq5J6KVqjQdGl2pAFmvK5GWGXyk8h9GA-m6V5yF4UWagnJzazAbZ5osXuFkVeGCHG8GF4l5yp9oOezpo88PAlZ1Pxa5bxGQ7o9VrFbg-8wwxp1G2acxacGVQ00jyoE0ijonyXwfwEnwWwkA2m0dLw3tE1I80hCg8UeU4Ohox0clAhAtsM0iCA9wap4DwhS1fxW0fLhpRB51m13xC3e0h2t2H801HQw1bu02j-",
            "__comet_req": "7",
            "lsd": self.lsd_token,
            "jazoest": random.choice(jazoest_variants),  # Vary this
            "__spin_r": "1021613311",
            "__spin_b": "trunk",
            "__spin_t": spin_t,  # Dynamic timestamp
            "__crn": "comet.igweb.PolarisPostRoute",
            "fb_api_caller_class": "RelayModern",
            "fb_api_req_friendly_name": "PolarisPostActionLoadPostQueryQuery",
            "variables": json.dumps({
                "shortcode": shortcode,
                "fetch_tagged_user_count": None,
                "hoisted_comment_id": None,
                "hoisted_reply_id": None,
            }),
            "server_timestamps": "true",
            "doc_id": self.doc_id,
        }
        
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
        
        # Global rate limiting - ensure minimum time between any Instagram requests
        global _last_instagram_request_time
        current_time = time.time()
        time_since_last = current_time - _last_instagram_request_time
        
        if time_since_last < _min_request_interval:
            wait_time = _min_request_interval - time_since_last
            print(f"[INFO] Global rate limiting: waiting {wait_time:.1f}s since last Instagram request...")
            await asyncio.sleep(wait_time)
        
        # Add additional random delay for human-like behavior
        delay = random.uniform(2, 4)  # Random delay on top of rate limiting
        print(f"[INFO] Adding {delay:.1f}s additional human-like delay...")
        await asyncio.sleep(delay)
        
        # Update last request time
        _last_instagram_request_time = time.time()
        
        # Create fresh session for this request (like opening new browser tab)
        session = self._create_fresh_session()
        
        # Prepare the request exactly like the working implementation
        graphql_url = "https://www.instagram.com/graphql/query"
        headers = self.get_headers(shortcode)
        body = self.generate_request_body(shortcode)
        
        try:
            print(f"[INFO] Making GraphQL request to Instagram with fresh session...")
            
            # Make POST request exactly like the working implementation
            # Fresh session mimics browser behavior better
            response = session.post(
                graphql_url,
                headers=headers,
                data=body,
                timeout=30,
                allow_redirects=True  # Equivalent to mode: "cors"
            )
            
            print(f"[INFO] Instagram response status: {response.status_code}")
            
            # Handle various response codes like the working implementation
            if response.status_code == 200:
                try:
                    data = response.json()
                except json.JSONDecodeError:
                    raise InstagramGraphQLError("Invalid JSON response from Instagram")
                
                # Check for GraphQL data structure
                if not data.get('data') or not data['data'].get('xdt_shortcode_media'):
                    raise InstagramGraphQLError("Post not found")
                
                media = data['data']['xdt_shortcode_media']
                
                if not media:
                    raise InstagramGraphQLError("Post not found")
                
                if not media.get('is_video', False):
                    raise InstagramGraphQLError("Post is not a video")
                
                # Extract video information
                video_url = media.get('video_url')
                if not video_url:
                    raise InstagramGraphQLError("Could not extract video URL")
                
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
                raise InstagramGraphQLError("Post not found")
            elif response.status_code in [429, 401]:
                raise InstagramGraphQLError("Rate limited by Instagram - please wait and try again")
            else:
                raise InstagramGraphQLError(f"Instagram API error: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            raise InstagramGraphQLError(f"Network error: {str(e)}")
        except Exception as e:
            if isinstance(e, InstagramGraphQLError):
                raise
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