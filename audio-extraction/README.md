# Xtract Audio Extraction Service v2.0

A production-ready Node.js/Express service that extracts high-quality audio from video files using FFmpeg. Designed to work with client-side video uploads through Supabase Storage.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│    Supabase     │────▶│    Railway      │
│  (iOS/Android)  │     │    Storage      │     │   Backend       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │  1. Upload video      │  2. Download video    │
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐            │
        │               │    FFmpeg       │◀───────────┘
        │               │  (320kbps MP3)  │
        │               └─────────────────┘
        │                       │
        │  4. Real-time sync    │  3. Upload audio
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Desktop App   │◀────│  Audio Storage  │
│   (Electron)    │     │   & Database    │
└─────────────────┘     └─────────────────┘
```

## Features

- **High-quality extraction**: 320kbps MP3 audio at 48kHz
- **Supabase integration**: Secure file storage with signed URLs
- **Automatic cleanup**: Source videos deleted after extraction
- **Desktop sync tracking**: Marks files for desktop app sync
- **Production-ready**: Health checks, error handling, logging
- **Scalable**: Handles videos up to 300MB safely

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and version info.

### Extract Audio
```
POST /api/extract
Content-Type: application/json

{
  "jobId": "uuid",
  "userId": "uuid", 
  "videoStoragePath": "user-id/timestamp_filename.mp4",
  "originalFilename": "my-video.mp4"  // optional
}
```

### Check Job Status
```
GET /api/extract/status/:jobId
```

### Get Download URL
```
GET /api/extract/download/:audioFileId
```

### Get User's Audio Files
```
GET /api/extract/user/:userId/files
```

### Get Unsynced Files (for Desktop)
```
GET /api/extract/user/:userId/unsynced
```

### Mark Files as Synced
```
POST /api/extract/mark-synced
Content-Type: application/json

{
  "audioFileIds": ["uuid1", "uuid2"]
}
```

## Installation

### Prerequisites
- Node.js 20+
- FFmpeg installed on system
- Supabase project with storage buckets

### Local Development

```bash
# Install dependencies
npm install

# Copy environment config
cp env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port | No (default: 8080) |
| `SUPABASE_URL` | Supabase project URL | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (not anon!) | **Yes** |
| `TEMP_DIR` | Temp directory for processing | No |
| `MAX_FILE_SIZE_MB` | Max video size in MB | No (default: 300) |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | No |

## Deployment to Railway

1. **Connect Repository**
   - Link your GitHub repository to Railway

2. **Set Environment Variables**
   ```
   NODE_ENV=production
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ALLOWED_ORIGINS=*
   ```

3. **Deploy**
   - Railway will auto-detect the configuration
   - FFmpeg is installed via nixpacks.toml

### Railway Configuration Files

- `railway.toml` - Railway deployment config with health checks
- `nixpacks.toml` - Build configuration with FFmpeg installation
- `Dockerfile` - Alternative Docker deployment option

## Supabase Setup

### Storage Buckets

Create two storage buckets:

1. **`videos`** - For temporary video uploads
   - Public: No
   - File size limit: 300MB
   
2. **`audio-files`** - For extracted audio
   - Public: Yes (or use signed URLs)
   - File size limit: 50MB

### RLS Policies

The service uses a **service role key** to bypass RLS for backend operations. Ensure your tables have proper RLS policies for client access:

```sql
-- Audio files: users can only access their own
CREATE POLICY "Users can view their own audio files" ON audio_files
  FOR SELECT USING (auth.uid() = user_id);

-- Processing jobs: users can only access their own
CREATE POLICY "Users can view their own processing jobs" ON processing_jobs
  FOR SELECT USING (auth.uid() = user_id);
```

## Processing Flow

1. **Mobile app** uploads video to Supabase `videos` bucket
2. **Mobile app** creates processing job record
3. **Mobile app** calls `/api/extract` with job details
4. **Backend** downloads video from Supabase
5. **Backend** extracts audio using FFmpeg (320kbps MP3)
6. **Backend** uploads audio to Supabase `audio-files` bucket
7. **Backend** creates audio file record in database
8. **Backend** deletes source video from storage
9. **Desktop app** receives real-time notification
10. **Desktop app** syncs new audio file

## Security

- Uses Supabase service role for secure backend operations
- No direct video URLs exposed
- Temporary files cleaned up automatically
- CORS protection for API endpoints
- Request validation on all endpoints

## Technologies

- **Node.js 20** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **FFmpeg** - Audio extraction
- **fluent-ffmpeg** - FFmpeg wrapper
- **Supabase** - Database & storage
- **Railway** - Deployment platform
