# Xtract Backend - Audio Extraction Service

A FastAPI-based service that extracts audio from social media videos (Instagram, TikTok, YouTube) and uploads them to Supabase storage.

## Features

- Extract audio from Instagram, TikTok, and YouTube videos
- Smart rate limiting to avoid platform blocks
- Platform-specific optimizations
- Supabase integration for storage and job tracking
- User-friendly error messages

## Installation & Setup

### Prerequisites
- Python 3.8+
- ffmpeg installed on the system
- Supabase project with storage bucket named 'audio-files'

### Local Development

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure Supabase:
- Replace `SUPABASE_KEY` in `extract_audio.py` with your service role key
- Ensure your Supabase project has an 'audio-files' storage bucket

4. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t xtract-backend .
```

2. Run the container:
```bash
docker run -p 8000:8000 xtract-backend
```

## API Endpoints

### POST /extract-audio
Extract audio from a video URL.

**Request:**
```json
{
  "url": "https://www.instagram.com/p/ABC123/",
  "user_id": "user-uuid"
}
```

**Response:**
```json
{
  "job_id": "job-uuid",
  "audio_file_id": "file-uuid"
}
```

### GET /health
Health check endpoint.

## Platform Support & Rate Limiting

The service includes intelligent rate limiting to prevent blocks:

### Instagram
- **Rate Limit:** 8 seconds between requests
- **Retries:** 2 attempts max
- **Delay:** 3-7 second random delays
- **Special handling:** Mobile user agent, Instagram-specific headers

### TikTok
- **Rate Limit:** 5 seconds between requests
- **Retries:** 3 attempts max
- **Delay:** 1-3 second random delays

### YouTube
- **Rate Limit:** 2 seconds between requests
- **Retries:** 3 attempts max
- **Delay:** 0.5-2 second random delays

## Troubleshooting

### Instagram Rate Limit Errors

If you see "Instagram Rate Limit Reached" errors:

1. **Wait 5-10 minutes** before trying again
2. **Process other platforms** (TikTok/YouTube) in the meantime
3. **Avoid rapid-fire requests** - wait between Instagram videos
4. **The limit resets automatically** after a short break

This is normal behavior and protects the service from being blocked by Instagram.

### Common Error Messages

#### "Instagram Rate Limit Reached"
- **Cause:** Too many Instagram requests in short time
- **Solution:** Wait 5-10 minutes, then try again

#### "Video Processing Failed"
- **Cause:** Private video, deleted content, or temporary issues
- **Solution:** Check the video URL in your browser, wait and retry

#### "All download strategies failed"
- **Cause:** Platform restrictions or connectivity issues
- **Solution:** Try a different video or wait a few minutes

### Best Practices

1. **Batch Processing:** Space out Instagram video requests by at least 30 seconds
2. **Mix Platforms:** Alternate between Instagram, TikTok, and YouTube
3. **Error Handling:** Implement retry logic in your client with exponential backoff
4. **Monitor Logs:** Check server logs for detailed error information

## Configuration

Rate limits and platform settings can be adjusted in `config.py`:

```python
RATE_LIMITS = {
    'instagram.com': 8,     # Increase for stricter rate limiting
    'tiktok.com': 5,
    'youtube.com': 2,
    'default': 3
}
```

## Database Schema

The service uses these Supabase tables:

### processing_jobs
```sql
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    original_url TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    result_audio_file_id UUID,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### audio_files
```sql
CREATE TABLE audio_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Development

### Testing
```bash
# Test the extraction function directly
python extract_audio.py
```

### Adding New Platforms
1. Add domain to `RATE_LIMITS` in `config.py`
2. Add user agent to `USER_AGENTS`
3. Update `get_platform_from_url()` function
4. Add platform-specific options in `get_platform_specific_options()`

## Security Notes

- **Service Role Key:** Keep your Supabase service role key secure
- **Rate Limiting:** Don't disable rate limiting - it protects against blocks
- **User Input:** All URLs are validated before processing

## License

[Your License Here] 