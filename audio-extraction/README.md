# Xtract Audio Extraction Service

A Node.js/Express service that extracts audio from video files using FFmpeg and stores them in Supabase for user management. Designed to work with the Xtract backend hosted on Vercel.

## Features

- Extract audio from video URLs in multiple formats (MP3, WAV, AAC, OGG)
- Quality control (low, medium, high)
- **User-based audio file storage** with Supabase integration
- **Automatic file upload** to Supabase Storage
- **Database tracking** of processing jobs and audio files
- Job status tracking and progress monitoring
- RESTful API for easy integration
- Designed for Railway deployment

## Database Schema

The service uses the following Supabase tables:

### `audio_files`
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `title` (text)
- `filename` (text)
- `source_url` (text)
- `file_url` (text) - Supabase Storage URL
- `duration` (numeric, optional)
- `file_size` (bigint, optional)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `processing_jobs`
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `video_url` (text)
- `status` (text: 'pending', 'processing', 'completed', 'failed')
- `error_message` (text, optional)
- `audio_file_id` (uuid, optional, references audio_files)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Audio Extraction
- `POST /api/extract/from-url` - Extract audio from video URL (requires `userId`)
- `GET /api/extract/status/:jobId` - Check extraction job status
- `GET /api/extract/download/:jobId` - Redirect to Supabase Storage URL
- `GET /api/extract/download-url/:jobId` - Get direct Supabase download URL

## Installation

1. Clone this directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Install FFmpeg (required for audio extraction):
   - **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
   - **macOS**: `brew install ffmpeg`
   - **Windows**: Download from https://ffmpeg.org/

4. Set up Supabase:
   - Create a new Supabase project
   - Run the database migrations (see Database Setup section)
   - Create a storage bucket named `audio-files`
   - Configure Row Level Security (RLS) policies

5. Copy environment configuration:
   ```bash
   cp env.example .env
   ```

6. Configure environment variables in `.env`

## Database Setup

Create the required tables in your Supabase project:

```sql
-- Create audio_files table
CREATE TABLE audio_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  source_url TEXT NOT NULL,
  file_url TEXT NOT NULL,
  duration NUMERIC,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create processing_jobs table
CREATE TABLE processing_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  audio_file_id UUID REFERENCES audio_files(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_audio_files_user_id ON audio_files(user_id);
CREATE INDEX idx_audio_files_created_at ON audio_files(created_at DESC);
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);

-- Enable Row Level Security
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own audio files" ON audio_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audio files" ON audio_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio files" ON audio_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audio files" ON audio_files
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own processing jobs" ON processing_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own processing jobs" ON processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own processing jobs" ON processing_jobs
  FOR UPDATE USING (auth.uid() = user_id);
```

### Storage Setup

1. Create a storage bucket named `audio-files`
2. Set up RLS policies for the bucket:

```sql
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload audio files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio-files' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to view their own files
CREATE POLICY "Users can view their own audio files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio-files' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own audio files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio-files' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

## Development

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3001` |
| `XTRACT_BACKEND_URL` | URL of the Xtract backend | `http://localhost:3000` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `http://localhost:3000` |
| `TEMP_DIR` | Temporary files directory | `./temp` |
| `MAX_FILE_SIZE` | Maximum file size in MB | `100` |
| `CLEANUP_INTERVAL_HOURS` | Cleanup job interval | `1` |
| `FILE_RETENTION_HOURS` | File retention period | `2` |
| `SUPABASE_URL` | Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Required |

## Deployment to Railway

1. Connect your GitHub repository to Railway
2. Set the environment variables in Railway dashboard
3. Railway will automatically detect the `railway.toml` configuration
4. FFmpeg will be installed automatically via the configuration

### Required Railway Environment Variables:
```
NODE_ENV=production
XTRACT_BACKEND_URL=https://your-vercel-backend.vercel.app
ALLOWED_ORIGINS=https://your-vercel-backend.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Usage Example

### Extract Audio from Video (with User)
```bash
curl -X POST https://your-railway-app.railway.app/api/extract/from-url \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://your-backend.vercel.app/api/temp-file/video.mp4",
    "shortcode": "abc123",
    "userId": "user-uuid-here",
    "format": "mp3",
    "quality": "medium",
    "videoTitle": "My Instagram Video"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "audioFileId": "audio-file-uuid",
    "audioUrl": "/api/extract/download/550e8400-e29b-41d4-a716-446655440000",
    "supabaseUrl": "https://project.supabase.co/storage/v1/object/public/audio-files/user-id/file.mp3",
    "format": "mp3",
    "size": 1234567,
    "duration": 180.5,
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### Get Direct Download URL
```bash
curl https://your-railway-app.railway.app/api/extract/download-url/550e8400-e29b-41d4-a716-446655440000
```

Response:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://project.supabase.co/storage/v1/object/public/audio-files/user-id/file.mp3",
    "expiresAt": "2024-01-01T13:00:00.000Z"
  }
}
```

## Architecture

This service works as part of a two-server architecture with user management:

1. **Xtract Backend (Vercel)**: Handles Instagram URL parsing, temporary video storage, and user coordination
2. **Audio Extraction Service (Railway)**: Downloads videos, extracts audio, and stores in Supabase

The communication flow:
1. User provides Instagram URL and user ID to Xtract Backend
2. Backend downloads video temporarily and returns download URL
3. Audio service receives video URL with user context
4. Audio is extracted and uploaded to Supabase Storage
5. Database records are created linking audio file to user
6. Audio file is accessible through user's library

## File Management

- **Temporary files** are stored locally during processing and cleaned up automatically
- **Audio files** are permanently stored in Supabase Storage organized by user ID
- **Database records** track all audio files and processing jobs per user
- **Cleanup job** removes old temporary files but preserves user data in Supabase
- **User isolation** ensures users can only access their own audio files

## Security Features

- **Row Level Security (RLS)** on all database tables
- **User-based file organization** in Supabase Storage
- **Authenticated access** required for all operations
- **File path validation** to prevent unauthorized access
- **CORS protection** for cross-origin requests

## Technologies Used

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **FFmpeg** - Audio/video processing
- **fluent-ffmpeg** - FFmpeg Node.js wrapper
- **Supabase** - Database and storage backend
- **node-cron** - Scheduled cleanup jobs
- **Railway** - Deployment platform 