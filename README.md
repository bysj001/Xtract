# Xtract v2.0 - Audio Extraction Platform

A complete system for extracting high-quality audio from video files across mobile, desktop, and cloud.

## 🎯 What is Xtract?

Xtract lets you save audio from any video file. Share a video from your phone, and the extracted audio automatically syncs to your desktop for use in your projects.

**No scraping. No API limits. No restrictions.** Just pure video file processing.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              XTRACT v2.0 ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐         ┌──────────────────┐         ┌─────────────┐     │
│   │   MOBILE    │────────▶│     SUPABASE     │◀────────│   DESKTOP   │     │
│   │  iOS/Android│         │                  │         │   Electron  │     │
│   └─────────────┘         │  ┌────────────┐  │         └─────────────┘     │
│         │                 │  │  Storage   │  │               ▲             │
│         │ 1. Upload       │  │ - videos   │  │               │             │
│         │    video        │  │ - audio    │  │               │ 4. Real-time│
│         ▼                 │  └────────────┘  │               │    sync     │
│   ┌─────────────┐         │  ┌────────────┐  │               │             │
│   │ Video File  │────────▶│  │  Database  │  │───────────────┘             │
│   │  (≤300MB)   │         │  │ - jobs     │  │                             │
│   └─────────────┘         │  │ - audio    │  │                             │
│                           │  └────────────┘  │                             │
│                           └────────┬─────────┘                             │
│                                    │                                        │
│                                    │ 2. Download video                      │
│                                    ▼                                        │
│                           ┌──────────────────┐                             │
│                           │     RAILWAY      │                             │
│                           │                  │                             │
│                           │  ┌────────────┐  │                             │
│                           │  │   FFmpeg   │  │ 3. Extract audio            │
│                           │  │ 320kbps MP3│  │    & upload                 │
│                           │  └────────────┘  │                             │
│                           └──────────────────┘                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
Xtract/
├── audio-extraction/      # Railway backend service
│   ├── src/
│   │   ├── index.ts       # Express server
│   │   ├── routes/        # API endpoints
│   │   └── services/      # FFmpeg & Supabase
│   ├── package.json
│   └── README.md
│
├── xtract-mobile/         # React Native app
│   ├── App.tsx            # Main component
│   ├── src/
│   │   ├── screens/       # App screens
│   │   └── services/      # Supabase & sharing
│   ├── ios/               # iOS project + Share Extension
│   ├── android/           # Android project
│   └── README.md
│
└── xtract-desktop/        # Electron app
    ├── electron/          # Main process
    ├── src/               # React UI
    └── README.md
```

## 🚀 Quick Start

### 1. Backend (Railway)

```bash
cd audio-extraction
npm install
cp env.example .env
# Edit .env with Supabase credentials
npm run dev
```

### 2. Mobile App

```bash
cd xtract-mobile
npm install

# iOS
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios

# Android
npm run android
```

### 3. Desktop App

```bash
cd xtract-desktop
npm install
npm run electron:dev
```

## 🔧 Configuration

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Create storage buckets:
   - `videos` (private) - for temporary video uploads
   - `audio-files` (public) - for extracted audio

3. Run the database migrations (applied automatically via the schema)

4. Get your keys:
   - **Anon Key** - for mobile & desktop apps
   - **Service Role Key** - for Railway backend (IMPORTANT: keeps this secret!)

### Environment Variables

#### Backend (Railway)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
```

#### Mobile & Desktop
Update the Supabase URL and anon key in:
- `xtract-mobile/src/services/supabase.ts`
- `xtract-desktop/src/services/supabase.ts`

## 📱 Usage Flow

1. **Find a video**: Open Instagram, TikTok, or any app
2. **Save to device**: Download/save the video to your phone
3. **Share with Xtract**: Use the share sheet to share the video file
4. **Wait for processing**: Video is uploaded and audio extracted
5. **Use on desktop**: Audio automatically appears in the desktop app

## 🛠️ Build Commands

### Backend
```bash
cd audio-extraction
npm run build        # Compile TypeScript
npm start           # Run production server
```

### Mobile
```bash
cd xtract-mobile

# iOS Release
cd ios && open XtractMobile.xcworkspace
# Build in Xcode with Release scheme

# Android Release
cd android && ./gradlew bundleRelease
```

### Desktop
```bash
cd xtract-desktop
npm run electron:dist   # Build for all platforms
```

## 🔒 Security

- **No scraping**: Only processes files you own
- **No Instagram API**: Completely avoids rate limits
- **RLS policies**: Users only see their own files
- **Service role separation**: Backend uses admin key, clients use anon key
- **Signed URLs**: Secure, time-limited access to files

## 🌐 Deployment

### Backend → Railway
1. Connect GitHub repo to Railway
2. Set environment variables
3. Deploy (auto-builds with FFmpeg via nixpacks)

### Mobile → App Stores
1. Build release versions
2. Submit to App Store Connect / Google Play Console

### Desktop → Direct Distribution
1. Build with `npm run electron:dist`
2. Distribute DMG/EXE/AppImage files
3. Optional: Add code signing for trusted distribution

## 📊 Scalability

The architecture is designed for scale:

- **Stateless backend**: Can run multiple Railway instances
- **Supabase handles storage**: Scales automatically
- **Real-time sync**: Efficient Postgres subscriptions
- **300MB file limit**: Prevents abuse while allowing most videos

## 🐛 Troubleshooting

### "Video upload failed"
- Check file size (max 300MB)
- Verify Supabase storage bucket exists
- Check network connection

### "Audio extraction failed"
- Verify FFmpeg is installed on Railway
- Check service role key is correct
- View Railway logs for details

### "Files not syncing to desktop"
- Check Supabase real-time is enabled
- Verify user is logged in on both apps
- Check browser console for errors

## 📄 License

MIT License - See individual project directories for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

Built with ❤️ using React Native, Electron, Supabase, and Railway.
