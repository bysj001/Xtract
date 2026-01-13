# Xtract Mobile App v2.0

A React Native app for iOS and Android that extracts audio from video files. Simply share a video file with the app to automatically extract and save the audio.

## Features

- **Video file sharing**: Share any video file to extract audio
- **High-quality extraction**: 320kbps MP3 output
- **Real-time sync**: Audio automatically appears on desktop
- **Audio playback**: Built-in audio player
- **Secure auth**: Supabase authentication

## How It Works

1. **Save video to device**: Download/save the video you want to extract audio from
2. **Share with Xtract**: Use your device's share sheet to share the video file
3. **Automatic processing**: Video is uploaded and audio is extracted
4. **Sync to desktop**: Audio automatically syncs to the desktop app

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile App                            │
├─────────────────────────────────────────────────────────────┤
│  1. User shares video file via Share Sheet                  │
│  2. Video uploaded to Supabase Storage                      │
│  3. Processing job created in database                      │
│  4. Railway backend triggered for extraction                │
│  5. Real-time updates via Supabase subscriptions            │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- React Native CLI
- Xcode (for iOS)
- Android Studio (for Android)
- CocoaPods (for iOS)

### Installation

```bash
# Install dependencies
npm install

# iOS: Install pods
cd ios && bundle install && bundle exec pod install && cd ..

# Apply patches
npm run postinstall
```

### Development

```bash
# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Building for Production

#### iOS

```bash
# Open in Xcode
open ios/XtractMobile.xcworkspace

# Select target device and build
# Or use Xcode Cloud for CI/CD
```

#### Android

```bash
# Generate release APK
cd android
./gradlew assembleRelease

# Or generate AAB for Play Store
./gradlew bundleRelease
```

## Project Structure

```
xtract-mobile/
├── App.tsx                 # Main app component
├── src/
│   ├── components/         # Reusable UI components
│   ├── screens/            # App screens
│   │   ├── HomeScreen.tsx  # Main audio library
│   │   ├── WelcomeScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── AudioPlayerScreen.tsx
│   ├── services/
│   │   ├── supabase.ts     # Supabase client & services
│   │   └── shareMenu.ts    # Share sheet handling
│   ├── styles/             # Shared styles
│   └── types/              # TypeScript types
├── ios/
│   ├── ShareExtension/     # iOS Share Extension
│   └── XtractMobile/       # Main iOS app
└── android/                # Android project
```

## iOS Share Extension

The app includes a Share Extension for receiving video files. It handles:

- `public.movie` - Standard movie files
- `com.apple.quicktime-movie` - QuickTime movies
- `video/*` - Any video MIME type

Configure in Xcode:
1. Select ShareExtension target
2. Update App Groups if needed
3. Configure URL schemes

## Configuration

### Supabase

Update `src/services/supabase.ts` with your credentials:

```typescript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
const RAILWAY_BACKEND_URL = 'your-railway-url';
```

### URL Scheme

The app uses `xtract://` URL scheme:

- `xtract://share-video?path=...` - Open app with video file

## Dependencies

### Core
- `react-native` - Cross-platform mobile framework
- `@supabase/supabase-js` - Supabase client
- `react-native-share-menu` - Share sheet handling

### Navigation
- `@react-navigation/native` - Navigation container
- `@react-navigation/stack` - Stack navigator

### UI
- `react-native-linear-gradient` - Gradient backgrounds
- `react-native-safe-area-context` - Safe area handling

## Troubleshooting

### iOS Build Issues

```bash
# Clean build
cd ios && rm -rf build Pods Podfile.lock && bundle exec pod install && cd ..
```

### Android Build Issues

```bash
# Clean build
cd android && ./gradlew clean && cd ..
```

### Metro Bundler Issues

```bash
# Reset cache
npm start -- --reset-cache
```

## Security

- **No URL scraping**: Only accepts video files, not URLs
- **No Instagram API**: Completely bypasses rate limits
- **Secure storage**: Videos uploaded to private Supabase bucket
- **Auth required**: All operations require authentication
