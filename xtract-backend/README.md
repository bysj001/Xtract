# Xtract Backend API

FastAPI backend for extracting audio from video URLs and storing to Supabase. Designed for deployment on Railway.

## Features

- Extract audio from TikTok, Instagram, YouTube, and other video platforms
- Store extracted MP3 files in Supabase Storage
- Track processing jobs with status updates
- User-based file organization
- Health monitoring endpoints

## API Endpoints

### Health Check
```
GET /
GET /health
```

### Extract Audio
```
POST /extract
```
**Request Body:**
```json
{
  "url": "https://www.tiktok.com/@user/video/123456789",
  "user_id": "user-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "job_id": "job-uuid",
  "audio_file_id": "file-uuid", 
  "message": "Audio extraction completed successfully"
}
```

## Deployment on Railway

### Prerequisites
- Railway account
- Supabase project with `audio_files` table and `audio-files` storage bucket
- Supabase `processing_jobs` table

### Quick Deploy

1. **Connect to Railway:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Create new project
   railway init
   ```

2. **Deploy:**
   ```bash
   # In the xtract-backend directory
   railway up
   ```

3. **Configure Start Command:**
   In Railway dashboard, set the start command to:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

4. **Environment Variables:**
   No additional environment variables needed - Supabase credentials are embedded in the code.

### Alternative Deployment Steps

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial backend setup"
   git push origin main
   ```

2. **Connect Railway to GitHub:**
   - Go to Railway dashboard
   - Create new project from GitHub repo
   - Select the `xtract-backend` directory as root

3. **Railway will automatically:**
   - Detect Python environment
   - Install dependencies from `requirements.txt`
   - Deploy with the correct start command

## Local Development

### Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload --port 8000
```

### Test the API
```bash
# Health check
curl http://localhost:8000/

# Test extraction
curl -X POST http://localhost:8000/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "user_id": "test-user"}'
```

## System Requirements

### Railway Environment
- Python 3.10+
- FFmpeg (automatically available on Railway)
- Internet access for video downloads

### Dependencies
- FastAPI - Web framework
- yt-dlp - Video downloading
- supabase - Database and storage
- psutil - System monitoring

## File Structure

```
xtract-backend/
├── main.py              # FastAPI application
├── extract_audio.py     # Audio processing logic
├── requirements.txt     # Python dependencies
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Supabase Integration

### Required Tables

**audio_files:**
```sql
CREATE TABLE audio_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**processing_jobs:**
```sql
CREATE TABLE processing_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result_audio_file_id UUID REFERENCES audio_files(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Storage Bucket
- Bucket name: `audio-files`
- Public access: Enabled
- File size limit: Configure as needed

## Mobile App Integration

Update the mobile app's backend URL in `src/services/supabase.ts`:

```typescript
private static BACKEND_URL = 'https://your-railway-app.railway.app';
```

## Error Handling

The API returns detailed error messages for:
- Invalid URLs
- Missing user IDs
- Video download failures
- Audio extraction failures
- Supabase upload errors

## Monitoring

- Health endpoints provide system status
- Processing jobs track operation status
- Logs are available in Railway dashboard

## Security

- CORS configured for mobile app access
- Input validation on all endpoints
- Temporary file cleanup
- No sensitive credentials in code (uses Supabase public key)

## Support

For issues with:
- Video downloads: Check yt-dlp compatibility
- Audio extraction: Ensure FFmpeg is available
- Storage uploads: Verify Supabase configuration
- Deployment: Check Railway logs 