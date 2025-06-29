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
    
    ydl_opts = {
        'outtmpl': video_path_template,
        'format': 'bestaudio+bestvideo/best',
        'quiet': True,
        'merge_output_format': 'mp4',
    }
    
    try:
        # Run yt-dlp in executor to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _download_with_ytdlp, url, ydl_opts)
        
        # Find the downloaded video file
        for file in os.listdir(session_dir):
            if file.endswith((".mp4", ".mkv", ".webm")):
                return os.path.join(session_dir, file)
        
        raise Exception("No video file found after yt-dlp download")
        
    except Exception as e:
        raise Exception(f"yt-dlp failed: {e}")

def _download_with_ytdlp(url: str, ydl_opts: dict):
    """Helper function to run yt-dlp synchronously"""
    with YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

async def extract_audio_from_video(video_path: str, session_dir: str) -> str:
    """Extract audio from video using ffmpeg"""
    audio_output_path = os.path.join(session_dir, 'audio.mp3')
    
    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vn",  # No video
        "-acodec", "libmp3lame",
        "-q:a", "2",  # High quality audio
        "-y",  # Overwrite output file
        audio_output_path
    ]
    
    try:
        # Run ffmpeg in executor to avoid blocking
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, 
            lambda: subprocess.run(
                cmd, 
                check=True, 
                stdout=subprocess.DEVNULL, 
                stderr=subprocess.DEVNULL
            )
        )
        
        if not os.path.exists(audio_output_path):
            raise Exception("MP3 extraction failed - output file not created")
        
        return audio_output_path
        
    except subprocess.CalledProcessError as e:
        raise Exception(f"FFmpeg failed: {e}")

async def upload_to_supabase(audio_path: str, user_id: str, original_url: str) -> str:
    """Upload audio file to Supabase Storage and create database record"""
    
    try:
        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{user_id}/{timestamp}_{uuid.uuid4().hex[:8]}.mp3"
        
        # Read the audio file
        with open(audio_path, 'rb') as f:
            audio_data = f.read()
        
        # Upload to Supabase Storage
        storage_response = supabase.storage.from_('audio-files').upload(
            path=filename,
            file=audio_data,
            file_options={
                "content-type": "audio/mpeg",
                "upsert": False
            }
        )
        
        if hasattr(storage_response, 'error') and storage_response.error:
            raise Exception(f"Storage upload failed: {storage_response.error}")
        
        # Get public URL
        public_url_response = supabase.storage.from_('audio-files').get_public_url(filename)
        file_url = public_url_response
        
        # Get file size
        file_size = len(audio_data)
        
        # Extract base filename for display
        display_filename = f"extracted_audio_{timestamp}.mp3"
        
        # Create database record
        db_response = supabase.table('audio_files').insert({
            'user_id': user_id,
            'filename': display_filename,
            'file_url': file_url,
            'file_size': file_size,
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }).execute()
        
        if not db_response.data:
            raise Exception("Failed to create audio_files record")
        
        audio_file_id = db_response.data[0]['id']
        return audio_file_id
        
    except Exception as e:
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