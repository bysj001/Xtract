# Xtract Desktop v2.0

An Electron-based desktop application for managing your extracted audio library. Features real-time sync with the mobile app and drag-and-drop export to DAWs.

## Features

- **Real-time sync**: New audio files appear automatically
- **Audio playback**: Built-in player with waveform visualization
- **Drag & drop**: Export to DAWs like GarageBand, Logic, Ableton
- **One-click download**: Save files to any location
- **Beautiful UI**: Modern dark theme with animations

## Screenshots

The app features:
- Animated waveform visualization
- Real-time "NEW" badges for fresh syncs
- Gradient backgrounds with hover effects
- Responsive grid layout

## Installation

### Prerequisites

- Node.js 20+
- npm or yarn

### Development

```bash
# Install dependencies
npm install

# Start development server (Vite + Electron)
npm run electron:dev
```

### Building for Production

```bash
# Build for current platform
npm run electron:dist

# Output in release/{version}/
```

#### Platform-Specific Builds

**macOS:**
- Output: `Xtract-{version}.dmg`
- Supports both Intel (x64) and Apple Silicon (arm64)

**Windows:**
- Output: `Xtract-{version}.exe` (NSIS installer)

**Linux:**
- Output: `Xtract-{version}.AppImage`

## Project Structure

```
xtract-desktop/
├── electron/
│   ├── main.ts         # Electron main process
│   └── preload.ts      # Preload scripts
├── src/
│   ├── App.tsx         # Main React component
│   ├── Catalog.tsx     # Audio file grid
│   ├── components/
│   │   └── AuthForm.tsx
│   └── services/
│       └── supabase.ts # Supabase client
├── index.html          # Entry point
├── vite.config.ts      # Vite configuration
└── package.json
```

## How It Works

### Real-time Sync

1. Mobile app extracts audio
2. Audio file saved to Supabase
3. Desktop app receives real-time event
4. New file appears with "NEW" badge
5. Badge disappears after 5 seconds

### Audio Playback

- Click PLAY to start playback
- Click PAUSE to stop
- Waveform animates while playing
- Only one file plays at a time

### Export Options

1. **Drag & Drop**: Drag card directly to DAW
2. **Download**: Click DOWNLOAD button
3. **Delete**: Remove from library

## Configuration

Update `src/services/supabase.ts`:

```typescript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

## Development

### Available Scripts

```bash
npm run dev          # Start Vite dev server
npm run electron:dev # Start full Electron dev
npm run build        # Build for production
npm run electron:dist # Build + package Electron
```

### Hot Reload

The development environment supports:
- React Fast Refresh for UI changes
- Electron reload for main process changes

## Dependencies

### Core
- `react` + `react-dom` - UI framework
- `@supabase/supabase-js` - Backend client
- `electron` - Desktop framework

### Build
- `vite` - Fast build tool
- `vite-plugin-electron` - Electron integration
- `electron-builder` - App packaging

## Troubleshooting

### Build Fails

```bash
# Clean and rebuild
rm -rf dist dist-electron node_modules
npm install
npm run build
```

### App Won't Start

```bash
# Check for port conflicts
lsof -i :5173
# Kill conflicting process if needed
```

### Audio Playback Issues

- Ensure signed URLs are valid (1 hour expiry)
- Check browser console for CORS errors
- Verify Supabase storage bucket is accessible

## Security

- Uses Supabase anon key (client-safe)
- RLS policies protect user data
- No sensitive keys in code
- Signed URLs for audio access
