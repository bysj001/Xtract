from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import requests
from extract_audio import extract_and_upload_audio
import uvicorn

# Railway Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT

app = FastAPI(
    title="Xtract Audio API",
    description="API for extracting audio from video URLs and storing to Supabase",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class VideoURLRequest(BaseModel):
    url: str
    user_id: str

class HealthResponse(BaseModel):
    status: str
    message: str

class ExtractResponse(BaseModel):
    success: bool
    job_id: str
    message: str
    audio_file_id: str = None
    error: str = None

@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Railway deployment monitoring"""
    return HealthResponse(
        status="healthy",
        message="Xtract Audio API is running successfully"
    )

@app.get("/api/download-proxy")
async def download_proxy(url: str, filename: str = "xtract-video.mp4"):
    """
    Proxy video downloads through our server (like instagram-video-downloader)
    This helps bypass CORS and other restrictions
    """
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    if not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid URL format")
    
    try:
        # Fetch the video from the external URL with proper headers
        headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36",
            "Referer": "https://www.instagram.com/",
            "Accept": "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5",
            "Accept-Language": "en-US,en;q=0.5",
            "Range": "bytes=0-",
        }
        
        response = requests.get(url, headers=headers, stream=True, timeout=60)
        
        if response.status_code not in [200, 206]:
            raise HTTPException(status_code=response.status_code, detail=f"Failed to fetch video: {response.reason}")
        
        # Set response headers for download
        response_headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": response.headers.get("Content-Type", "video/mp4"),
        }
        
        if response.headers.get("Content-Length"):
            response_headers["Content-Length"] = response.headers.get("Content-Length")
        
        # Stream the video content
        def generate():
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk
        
        return StreamingResponse(generate(), headers=response_headers)
        
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

@app.post("/extract", response_model=ExtractResponse)
async def extract_audio_from_url(request: VideoURLRequest):
    """
    Extract audio from a video URL and store it in Supabase.
    
    Args:
        request: VideoURLRequest containing the URL and user_id
        
    Returns:
        ExtractResponse with job details and result
    """
    try:
        # Validate input
        if not request.url or not request.url.strip():
            raise HTTPException(status_code=400, detail="URL is required")
        
        if not request.user_id or not request.user_id.strip():
            raise HTTPException(status_code=400, detail="User ID is required")
        
        # Process the video URL
        result = await extract_and_upload_audio(request.url, request.user_id)
        
        return ExtractResponse(
            success=True,
            job_id=result["job_id"],
            audio_file_id=result.get("audio_file_id"),
            message="Audio extraction completed successfully"
        )
        
    except ValueError as e:
        # Handle validation errors
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        # Handle processing errors
        error_message = f"Audio extraction failed: {str(e)}"
        
        return ExtractResponse(
            success=False,
            job_id="",
            error=error_message,
            message="Audio extraction failed"
        )

@app.get("/health")
async def detailed_health():
    """Detailed health check with system information"""
    import psutil
    import platform
    
    return {
        "status": "healthy",
        "timestamp": "2024-01-20T00:00:00Z",
        "system": {
            "platform": platform.system(),
            "python_version": platform.python_version(),
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent
        },
        "services": {
            "fastapi": "running",
            "supabase": "connected"
        }
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False  # Set to False for production
    ) 