import os
import uuid
import subprocess
import asyncio
from datetime import datetime
from typing import Dict, Any
from yt_dlp import YoutubeDL
import shutil
from supabase import create_client, Client
from pathlib import Path

# Supabase configuration (same as your mobile/desktop apps)
SUPABASE_URL = "https://wgskngtfekehqpnbbanz.supabase.co"
# TODO: Replace with your SERVICE ROLE key from Supabase Dashboard > Settings > API
# The service role key bypasses RLS policies and is required for backend operations
# DO NOT use the anon key for backend services
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnc2tuZ3RmZWtlaHFwbmJiYW56Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDYyMjY4MiwiZXhwIjoyMDY2MTk4NjgyfQ.yhrt1Pm_sCwDUcpkTinMZF0_m1s-2zYRzXG2jhmds-k"  # Replace this with your actual service role key

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

async def download_video(url: str, session_dir: str) -> str:
    """Download video using yt-dlp"""
    video_path_template = os.path.join(session_dir, 'video.%(ext)s')
    
    # Try multiple format strategies for better compatibility
    format_strategies = [
        # Strategy 1: Audio-only (less likely to be blocked)
        'bestaudio[ext=m4a]/bestaudio',
        # Strategy 2: Best single format (no merging required)
        'best[ext=mp4]/best',
        # Strategy 3: Best video + best audio (requires ffmpeg)
        'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
        # Strategy 4: Fallback to any best format
        'best'
    ]
    
    for i, format_str in enumerate(format_strategies):
        ydl_opts = {
            'outtmpl': video_path_template,
            'format': format_str,
            'quiet': True,
            'no_warnings': True,
            # Anti-bot measures
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'referer': 'https://www.youtube.com/',
            'sleep_interval': 1,
            'max_sleep_interval': 3,
            # Disable unnecessary features that might trigger detection
            'no_check_certificate': True,
            'prefer_insecure': False,
        }
        
        # Add YouTube-specific options for better compatibility
        if 'youtube.com' in url or 'youtu.be' in url:
            ydl_opts.update({
                'extractor_args': {
                    'youtube': {
                        'skip': ['hls', 'dash'],  # Skip adaptive formats that require more requests
                        'player_skip': ['configs'],  # Skip player config requests
                    }
                }
            })
        
        # Only add merge format for strategies that might need it
        if 'bestvideo+bestaudio' in format_str:
            ydl_opts['merge_output_format'] = 'mp4'
        
        try:
            print(f"[INFO] Trying download strategy {i+1}: {format_str}")
            print(f"[INFO] Using options: {ydl_opts}")
            
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
            print(f"[WARNING] Strategy {i+1} failed: {e}")
            
            # For YouTube, try a more aggressive fallback with different user agent
            if i == len(format_strategies) - 1 and ('youtube.com' in url or 'youtu.be' in url):
                print(f"[INFO] Trying final YouTube fallback with alternative configuration")
                try:
                    fallback_opts = {
                        'outtmpl': video_path_template,
                        'format': 'worst',  # Try worst quality to avoid bot detection
                        'quiet': True,
                        'no_warnings': True,
                        'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                        'extractor_args': {
                            'youtube': {
                                'player_client': ['android', 'web'],
                                'skip': ['hls', 'dash', 'translated_subs'],
                            }
                        }
                    }
                    
                    await loop.run_in_executor(None, _download_with_ytdlp, url, fallback_opts)
                    
                    # Check for downloaded file
                    for file in os.listdir(session_dir):
                        if file.endswith((".mp4", ".mkv", ".webm", ".m4a", ".mp3")):
                            file_path = os.path.join(session_dir, file)
                            print(f"[INFO] Fallback strategy succeeded: {file}")
                            return file_path
                            
                except Exception as fallback_e:
                    print(f"[WARNING] Fallback strategy also failed: {fallback_e}")
            
            if i == len(format_strategies) - 1:
                # This was the last strategy, re-raise the error
                raise Exception(f"All download strategies failed. Last error: {e}")
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