import os
import uuid
import subprocess
import asyncio
import time
import random
from datetime import datetime, timedelta
from typing import Dict, Any
from urllib.parse import urlparse
from yt_dlp import YoutubeDL
import shutil
from supabase import create_client, Client
from pathlib import Path
from config import RATE_LIMITS, USER_AGENTS, MAX_RETRIES, RANDOM_DELAYS, USER_ERROR_MESSAGES
from instagram_graphql import get_instagram_video_info, download_instagram_video, InstagramGraphQLError

# Supabase configuration (same as your mobile/desktop apps)
SUPABASE_URL = "https://wgskngtfekehqpnbbanz.supabase.co"
# TODO: Replace with your SERVICE ROLE key from Supabase Dashboard > Settings > API
# The service role key bypasses RLS policies and is required for backend operations
# DO NOT use the anon key for backend services
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnc2tuZ3RmZWtlaHFwbmJiYW56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYyMjY4MiwiZXhwIjoyMDY2MTk4NjgyfQ.yhrt1Pm_sCwDUcpkTinMZF0_m1s-2zYRzXG2jhmds-k"  # Replace this with your actual service role key

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global rate limiting storage (in production, use Redis or database)
last_request_times = {}

async def extract_and_upload_audio(url: str, user_id: str) -> Dict[str, Any]:
    """
    Downloads a video from URL, extracts MP3 audio, and uploads to Supabase.

    Args:
        url (str): The video URL (TikTok, Instagram, YouTube, etc.)
        user_id (str): The user ID for Supabase storage

    Returns:
        Dict containing job_id and audio_file_id
    """
    job_id = None
    session_dir = None
    
    try:
        # Apply rate limiting before starting
        await apply_rate_limiting(url)
        
        # Create processing job in Supabase
        job_response = supabase.table('processing_jobs').insert({
            'user_id': user_id,
            'original_url': url,
            'status': 'pending',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }).execute()
        
        if not job_response.data:
            raise Exception("Failed to create processing job")
        
        job_id = job_response.data[0]['id']
        print(f"[INFO] Created processing job: {job_id}")
        
        # Update job status to processing
        supabase.table('processing_jobs').update({
            'status': 'processing',
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', job_id).execute()
        
        # Create unique session folder
        session_id = str(uuid.uuid4())
        session_dir = os.path.join("/tmp", session_id)
        os.makedirs(session_dir, exist_ok=True)
        
        # Download video
        video_path = await download_video(url, session_dir)
        print(f"[INFO] Video downloaded: {video_path}")
        
        # Extract audio
        audio_path = await extract_audio_from_video(video_path, session_dir)
        print(f"[INFO] Audio extracted: {audio_path}")
        
        # Upload to Supabase Storage
        audio_file_id = await upload_to_supabase(audio_path, user_id, url)
        print(f"[INFO] Audio uploaded to Supabase: {audio_file_id}")
        
        # Update job as completed
        supabase.table('processing_jobs').update({
            'status': 'completed',
            'result_audio_file_id': audio_file_id,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', job_id).execute()
        
        return {
            "job_id": job_id,
            "audio_file_id": audio_file_id
        }
        
    except Exception as e:
        error_message = str(e)
        print(f"[ERROR] Processing failed: {error_message}")
        
        # Update job as failed if job was created
        if job_id:
            supabase.table('processing_jobs').update({
                'status': 'failed',
                'error_message': error_message,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('id', job_id).execute()
        
        # Clean up temporary files
        if session_dir and os.path.exists(session_dir):
            shutil.rmtree(session_dir, ignore_errors=True)
        
        raise e
    
    finally:
        # Clean up temporary files
        if session_dir and os.path.exists(session_dir):
            shutil.rmtree(session_dir, ignore_errors=True)
            print(f"[INFO] Cleaned up temporary files: {session_dir}")

async def apply_rate_limiting(url: str):
    """Apply smart rate limiting based on platform and configuration"""
    domain = urlparse(url).netloc.lower()
    current_time = time.time()
    
    # Get platform-specific rate limit
    rate_limit = RATE_LIMITS.get(domain, RATE_LIMITS['default'])
    
    # Check if we need to wait
    if domain in last_request_times:
        time_since_last = current_time - last_request_times[domain]
        if time_since_last < rate_limit:
            wait_time = rate_limit - time_since_last
            print(f"[INFO] Rate limiting: waiting {wait_time:.2f}s for {domain}")
            await asyncio.sleep(wait_time)
    
    # Update last request time
    last_request_times[domain] = time.time()

def get_platform_from_url(url: str) -> str:
    """Detect platform from URL"""
    url_lower = url.lower()
    if 'instagram.com' in url_lower:
        return 'instagram'
    elif 'tiktok.com' in url_lower:
        return 'tiktok'
    elif 'youtube.com' in url_lower or 'youtu.be' in url_lower:
        return 'youtube'
    else:
        return 'default'

def is_instagram_url(url: str) -> bool:
    """Check if URL is from Instagram"""
    return 'instagram.com' in url.lower()





def get_platform_specific_options(url: str) -> dict:
    """Get platform-specific yt-dlp options based on configuration"""
    platform = get_platform_from_url(url)
    domain = urlparse(url).netloc.lower()
    
    options = {
        'socket_timeout': 60,
        'retries': MAX_RETRIES.get(domain, MAX_RETRIES['default']),
        'fragment_retries': 3,
        'extract_flat': False,
        'writethumbnail': False,
        'writeinfojson': False,
        'ignoreerrors': False,
    }
    

    
    # Get rotating user agent
    user_agent_list = USER_AGENTS.get(platform, USER_AGENTS['default'])
    user_agent = random.choice(user_agent_list)
    print(f"[INFO] Using {platform} user agent: {user_agent[:50]}...")
    
    # Instagram uses GraphQL API (no yt-dlp), so no options needed
    if platform == 'tiktok':
        options.update({
            'http_headers': {
                'User-Agent': user_agent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Referer': 'https://www.tiktok.com/',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
            },
        })
    else:
        options.update({
            'http_headers': {
                'User-Agent': user_agent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        })
    
    return options

def get_user_friendly_error(url: str, error_msg: str) -> str:
    """Convert technical error messages to user-friendly ones"""
    error_lower = error_msg.lower()
    
    if 'instagram' in url.lower():
        # Instagram uses GraphQL API (not yt-dlp) so different error handling
        if any(keyword in error_lower for keyword in [
            'login required', 'authentication required', 'private content',
            'unavailable content', 'access denied', 'forbidden', 'captcha'
        ]):
            return USER_ERROR_MESSAGES['instagram_auth_required']
        
        # Instagram GraphQL rate limiting
        if any(keyword in error_lower for keyword in ['rate-limit', 'not available', 'rate limit', 'too many requests']):
            return USER_ERROR_MESSAGES['instagram_rate_limit']
    
    if any(keyword in error_lower for keyword in ['rate-limit', 'too many requests', 'rate limit']):
        return USER_ERROR_MESSAGES['generic_rate_limit']
    
    return USER_ERROR_MESSAGES['extraction_failed']

async def download_video(url: str, session_dir: str) -> str:
    """
    Download video using platform-specific methods:
    
    - Instagram: Pure GraphQL API (no yt-dlp, matches instagram-video-downloader exactly)
    - Other platforms: yt-dlp with enhanced error handling
    """
    platform = get_platform_from_url(url)
    print(f"[INFO] Detected platform: {platform} for URL: {url}")
    
    # Instagram: Use pure GraphQL API (exactly like instagram-video-downloader)
    if is_instagram_url(url):
        print("[INFO] Using Instagram GraphQL API (no yt-dlp) - exactly like instagram-video-downloader")
        return await download_instagram_video_graphql(url, session_dir)
    
    # Other platforms: Use yt-dlp
    print(f"[INFO] Using yt-dlp for {platform} platform")
    return await download_video_ytdlp(url, session_dir)

async def download_instagram_video_graphql(url: str, session_dir: str) -> str:
    """
    Download Instagram video using pure GraphQL API (no yt-dlp)
    
    Uses the exact same approach as the working instagram-video-downloader project.
    This completely bypasses rate limits and cookies that yt-dlp struggles with.
    """
    print(f"[INFO] Using Instagram GraphQL API (PURE - NO YT-DLP) for: {url}")
    
    try:
        # NO rate limiting needed - instagram-video-downloader proves this works instantly
        # Get video info using our GraphQL API (same as instagram-video-downloader)
        video_info = await get_instagram_video_info(url)
        
        if not video_info.get('success'):
            raise Exception("Failed to get Instagram video information")
        
        video_url = video_info['video_url']
        shortcode = video_info['shortcode']
        
        print(f"[INFO] Successfully got video URL from Instagram GraphQL API")
        print(f"[INFO] Title: {video_info.get('title', 'N/A')}")
        print(f"[INFO] Duration: {video_info.get('duration', 'N/A')}s")
        print(f"[INFO] Has audio: {video_info.get('has_audio', 'N/A')}")
        print(f"[INFO] Owner: {video_info.get('owner_username', 'N/A')}")
        
        # Download the video file using our GraphQL downloader (no yt-dlp)
        video_filename = f"instagram_{shortcode}.mp4"
        video_path = os.path.join(session_dir, video_filename)
        
        print(f"[INFO] Downloading Instagram video to: {video_path}")
        success = download_instagram_video(video_url, video_path)
        
        if not success or not os.path.exists(video_path):
            raise Exception(f"Failed to download Instagram video file")
        
        file_size = os.path.getsize(video_path)
        print(f"[INFO] Instagram video downloaded successfully: {video_path} ({file_size:,} bytes)")
        
        return video_path
        
    except InstagramGraphQLError as e:
        print(f"[ERROR] Instagram GraphQL error: {str(e)}")
        # Provide user-friendly error messages based on Instagram GraphQL errors
        error_msg = str(e).lower()
        if "rate limit" in error_msg or "429" in error_msg:
            raise Exception(USER_ERROR_MESSAGES['instagram_rate_limit'])
        elif "not found" in error_msg or "404" in error_msg:
            raise Exception("Instagram post not found or is private. Please check the URL.")
        elif "not a video" in error_msg:
            raise Exception("This Instagram post is not a video. Please provide a video post URL.")
        elif "unauthorized" in error_msg or "401" in error_msg:
            raise Exception("Instagram blocked the request. Please try again later.")
        else:
            raise Exception(f"Instagram error: {str(e)}")
    
    except Exception as e:
        print(f"[ERROR] Instagram download failed: {str(e)}")
        # Don't wrap InstagramGraphQLError again
        if isinstance(e, InstagramGraphQLError):
            raise
        raise Exception(f"Failed to download Instagram video: {str(e)}")

async def download_video_ytdlp(url: str, session_dir: str) -> str:
    """Download video using yt-dlp with enhanced error handling and rate limiting"""
    video_path_template = os.path.join(session_dir, 'video.%(ext)s')
    
    # Get platform-specific options
    platform_options = get_platform_specific_options(url)
    
    # Try multiple format strategies for better compatibility
    format_strategies = [
        # Strategy 1: Best single format (no merging required)
        'best[ext=mp4]/best',
        # Strategy 2: Best video + best audio (requires ffmpeg)
        'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
        # Strategy 3: Fallback to any best format
        'best'
    ]
    
    for i, format_str in enumerate(format_strategies):
        # Get platform-specific options with rotating user agents
        platform_options = get_platform_specific_options(url)
        
        # Base yt-dlp options
        ydl_opts = {
            'outtmpl': video_path_template,
            'format': format_str,
            'quiet': True,
            'no_warnings': True,
            # Enhanced options for mobile app backend
            'socket_timeout': 90,  # Longer timeout for mobile
            'retries': platform_options.get('retries', 2),
            'fragment_retries': 3,
            'extract_flat': False,
            'writethumbnail': False,
            'writeinfojson': False,
            'ignoreerrors': False,
        }
        
        # Merge platform-specific options (including rotating user agents)
        ydl_opts.update(platform_options)
        
        # Only add merge format for strategies that might need it
        if 'bestvideo+bestaudio' in format_str:
            ydl_opts['merge_output_format'] = 'mp4'
        
        try:
            print(f"[INFO] Trying download strategy {i+1}: {format_str}")
            

            
            # Add random delay to appear more human (especially important for Instagram)
            platform = get_platform_from_url(url)
            domain = urlparse(url).netloc.lower()
            if platform in ['instagram', 'tiktok'] and i > 0:
                delay_range = RANDOM_DELAYS.get(domain, RANDOM_DELAYS['default'])
                delay = random.uniform(*delay_range)
                print(f"[INFO] Adding {delay:.1f}s human-like delay for {platform}")
                await asyncio.sleep(delay)
            
            # Run yt-dlp in executor to avoid blocking
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _download_with_ytdlp, url, ydl_opts)
            
            # Find the downloaded video file
            for file in os.listdir(session_dir):
                if file.endswith((".mp4", ".mkv", ".webm", ".m4a", ".mp3")):
                    file_path = os.path.join(session_dir, file)
                    print(f"[INFO] Successfully downloaded: {file}")
                    return file_path
            
        except Exception as e:
            error_msg = str(e)
            print(f"[WARNING] Strategy {i+1} failed: {error_msg}")
            
            # If this was the last strategy, show raw error for debugging
            if i == len(format_strategies) - 1:
                raise Exception(f"All download strategies failed. Raw yt-dlp error: {error_msg}")
            continue
    
    raise Exception("No video file found after trying all download strategies")

def _download_with_ytdlp(url: str, ydl_opts: dict):
    """Helper function to run yt-dlp synchronously"""
    with YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

async def extract_audio_from_video(video_path: str, session_dir: str) -> str:
    """Extract audio from video using ffmpeg"""
    audio_output_path = os.path.join(session_dir, 'audio.mp3')
    
    # Get file extension to determine if it's already audio-only
    file_ext = os.path.splitext(video_path)[1].lower()
    
    # If it's already an audio file, just convert to MP3 if needed
    if file_ext in ['.m4a', '.mp3', '.aac', '.ogg']:
        print(f"[INFO] Input is audio file ({file_ext}), converting to MP3")
        if file_ext == '.mp3':
            # Already MP3, just copy it
            import shutil
            shutil.copy2(video_path, audio_output_path)
            return audio_output_path
    
    # Build ffmpeg command
    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vn",  # No video (skip video streams)
        "-acodec", "libmp3lame",
        "-q:a", "2",  # High quality audio
        "-y",  # Overwrite output file
        audio_output_path
    ]
    
    try:
        print(f"[INFO] Extracting audio using ffmpeg: {' '.join(cmd)}")
        
        # Run ffmpeg in executor to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, 
            lambda: subprocess.run(
                cmd, 
                check=True, 
                capture_output=True,
                text=True
            )
        )
        
        if not os.path.exists(audio_output_path):
            raise Exception("MP3 extraction failed - output file not created")
        
        file_size = os.path.getsize(audio_output_path)
        print(f"[INFO] Audio extraction successful, file size: {file_size} bytes")
        
        return audio_output_path
        
    except subprocess.CalledProcessError as e:
        error_msg = f"FFmpeg failed with return code {e.returncode}"
        if e.stderr:
            error_msg += f": {e.stderr}"
        raise Exception(error_msg)

async def upload_to_supabase(audio_path: str, user_id: str, original_url: str) -> str:
    """Upload audio file to Supabase Storage and create database record"""
    
    try:
        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{user_id}/{timestamp}_{uuid.uuid4().hex[:8]}.mp3"
        
        print(f"[INFO] Uploading to Supabase Storage: {filename}")
        
        # Read the audio file
        with open(audio_path, 'rb') as f:
            audio_data = f.read()
        
        print(f"[INFO] Audio file size: {len(audio_data)} bytes")
        
        # Upload to Supabase Storage
        storage_response = supabase.storage.from_('audio-files').upload(
            path=filename,
            file=audio_data,
            file_options={
                "content-type": "audio/mpeg"
            }
        )
        
        print(f"[INFO] Storage upload response: {storage_response}")
        
        # Check for upload errors
        if hasattr(storage_response, 'error') and storage_response.error:
            raise Exception(f"Storage upload failed: {storage_response.error}")
        
        # Get public URL - this returns the URL string directly
        file_url = supabase.storage.from_('audio-files').get_public_url(filename)
        
        print(f"[INFO] Generated public URL: {file_url}")
        
        # Get file size
        file_size = len(audio_data)
        
        # Extract base filename for display
        display_filename = f"extracted_audio_{timestamp}.mp3"
        
        print(f"[INFO] Creating database record for audio file")
        
        # Create database record
        db_response = supabase.table('audio_files').insert({
            'user_id': user_id,
            'filename': display_filename,
            'file_url': file_url,
            'file_size': file_size,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }).execute()
        
        print(f"[INFO] Database insert response: {db_response}")
        
        if not db_response.data:
            raise Exception("Failed to create audio_files record")
        
        audio_file_id = db_response.data[0]['id']
        print(f"[INFO] Successfully created audio file record with ID: {audio_file_id}")
        
        return audio_file_id
        
    except Exception as e:
        print(f"[ERROR] Supabase upload error: {e}")
        print(f"[ERROR] Error type: {type(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise Exception(f"Supabase upload failed: {e}")

# Test function for local development
async def test_extraction():
    """Test function for local development"""
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll for testing
    test_user_id = "test-user-123"
    
    try:
        result = await extract_and_upload_audio(test_url, test_user_id)
        print(f"✅ Test successful: {result}")
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    # For local testing
    asyncio.run(test_extraction()) 