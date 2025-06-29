from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
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