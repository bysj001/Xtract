import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { AudioService, AudioFile } from './services/supabase';

// Add CSS animations
const styles = `
  @keyframes pulse {
    0% { opacity: 0.4; transform: scaleY(0.8); }
    100% { opacity: 0.8; transform: scaleY(1.2); }
  }
  
  @keyframes pulse-fast {
    0% { opacity: 0.6; transform: scaleY(0.9); }
    100% { opacity: 1; transform: scaleY(1.3); }
  }
  
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 5px rgba(78, 205, 196, 0.5); }
    50% { box-shadow: 0 0 20px rgba(78, 205, 196, 0.8); }
  }
`;

interface CatalogProps {
  user: User;
}

const Catalog: React.FC<CatalogProps> = ({ user }) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const loadAudioFiles = async () => {
      try {
        const files = await AudioService.getUserAudioFiles(user.id);
        setAudioFiles(files);
      } catch (error) {
        console.error('Error loading audio files:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadAudioFiles();
    }
  }, [user?.id]);

  // Cleanup audio elements when component unmounts
  useEffect(() => {
    return () => {
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, [audioElements]);

  const handleDragStart = (event: React.DragEvent, file: AudioFile) => {
    // Set drag data for compatible DAWs (GarageBand, Logic, etc.)
    const downloadURL = `audio/mpeg:${file.filename}:${file.file_url}`;
    
    event.dataTransfer.setData('text/uri-list', file.file_url);
    event.dataTransfer.setData('DownloadURL', downloadURL);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handlePlayPause = async (file: AudioFile) => {
    try {
      // Stop any currently playing audio
      if (currentlyPlaying && currentlyPlaying !== file.id) {
        const currentAudio = audioElements.get(currentlyPlaying);
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }

      // Get or create audio element for this file
      let audio = audioElements.get(file.id);
      if (!audio) {
        audio = new Audio(file.file_url);
        
        // Set up event listeners
        audio.addEventListener('ended', () => {
          setCurrentlyPlaying(null);
        });
        
        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          setCurrentlyPlaying(null);
        });

        // Enable CORS for cross-origin requests
        audio.crossOrigin = 'anonymous';

        // Update the map
        const newAudioElements = new Map(audioElements);
        newAudioElements.set(file.id, audio);
        setAudioElements(newAudioElements);
      }

      // Toggle play/pause
      if (currentlyPlaying === file.id) {
        audio.pause();
        setCurrentlyPlaying(null);
      } else {
        await audio.play();
        setCurrentlyPlaying(file.id);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setCurrentlyPlaying(null);
    }
  };

  const truncateFilename = (filename: string, maxLength: number = 25) => {
    if (filename.length <= maxLength) return filename;
    const ext = filename.split('.').pop();
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
    const truncated = nameWithoutExt.slice(0, maxLength - ext!.length - 4) + '...';
    return `${truncated}.${ext}`;
  };

  const handleExport = async (file: AudioFile) => {
    try {
      // Download the file as a blob
      const blob = await AudioService.downloadAudioFile(file.file_url);
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting file:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        color: '#888'
      }}>
        Loading audio files...
      </div>
    );
  }

  if (audioFiles.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        color: '#888',
        textAlign: 'center'
      }}>
        <p>No audio files found for this user</p>
        <p style={{ fontSize: '12px', marginTop: '10px' }}>
          Upload audio files using the mobile app or web interface
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div style={{
        padding: '40px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '30px',
        maxWidth: '1600px',
        margin: '0 auto'
      }}>
      {audioFiles.map((file: AudioFile, index: number) => (
        <div
          key={file.id}
          draggable={true}
          onDragStart={(e) => handleDragStart(e, file)}
          style={{
            background: `
              linear-gradient(145deg, rgba(30, 30, 30, 0.9), rgba(20, 20, 20, 0.9)),
              radial-gradient(circle at 30% 30%, rgba(78, 205, 196, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(255, 107, 107, 0.1) 0%, transparent 50%)
            `,
            borderRadius: '20px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'grab',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `,
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
            e.currentTarget.style.boxShadow = `
              0 20px 40px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(78, 205, 196, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = `
              0 8px 32px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `;
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.cursor = 'grabbing';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.cursor = 'grab';
          }}
        >
          {/* Background pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, transparent 30%, rgba(78, 205, 196, 0.03) 50%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          
          {/* Waveform placeholder */}
          <div style={{
            height: '80px',
            background: currentlyPlaying === file.id ? `
              linear-gradient(135deg, 
                rgba(255, 107, 107, 1) 0%, 
                rgba(78, 205, 196, 1) 25%, 
                rgba(123, 104, 238, 1) 50%, 
                rgba(255, 183, 77, 1) 75%, 
                rgba(72, 219, 251, 1) 100%
              )
            ` : `
              linear-gradient(135deg, 
                rgba(255, 107, 107, 0.8) 0%, 
                rgba(78, 205, 196, 0.8) 25%, 
                rgba(123, 104, 238, 0.8) 50%, 
                rgba(255, 183, 77, 0.8) 75%, 
                rgba(72, 219, 251, 0.8) 100%
              )
            `,
            borderRadius: '12px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: currentlyPlaying === file.id 
              ? 'inset 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 20px rgba(78, 205, 196, 0.4)'
              : 'inset 0 2px 8px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s ease'
          }}>
            {/* Animated bars effect */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '10%',
              right: '10%',
              height: '60%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'end',
              gap: '2px'
            }}>
              {Array.from({ length: 40 }, (_, i) => {
                const isPlaying = currentlyPlaying === file.id;
                const animationDuration = isPlaying ? 0.5 + Math.random() * 0.5 : 1 + Math.random();
                const animationName = isPlaying ? 'pulse-fast' : 'pulse';
                
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${20 + Math.sin(i * 0.5) * 20 + Math.random() * 20}%`,
                      background: isPlaying 
                        ? 'rgba(255, 255, 255, 0.8)' 
                        : 'rgba(255, 255, 255, 0.3)',
                      borderRadius: '1px',
                      animationName: animationName,
                      animationDuration: `${animationDuration}s`,
                      animationTimingFunction: 'ease-in-out',
                      animationIterationCount: 'infinite',
                      animationDirection: 'alternate',
                      animationDelay: `${i * 0.05}s`,
                      transition: 'background 0.3s ease'
                    }}
                  />
                );
              })}
            </div>
            
            {/* Overlay gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(45deg, transparent 60%, rgba(255,255,255,0.1))',
              pointerEvents: 'none'
            }} />
          </div>

          {/* File info */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#fff',
              lineHeight: '1.3'
            }}>
              {truncateFilename(file.filename)}
            </h3>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '15px'
            }}>
              <span style={{
                color: '#888',
                fontSize: '12px',
                background: 'rgba(78, 205, 196, 0.1)',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(78, 205, 196, 0.2)'
              }}>
                {file.filename.split('.').pop()?.toUpperCase() || 'AUDIO'}
              </span>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handlePlayPause(file)}
                  style={{
                    background: currentlyPlaying === file.id 
                      ? 'linear-gradient(135deg, #ff6b6b, #ff8e8e)' 
                      : 'linear-gradient(135deg, #48dbfb, #0abde3)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: currentlyPlaying === file.id
                      ? '0 0 20px rgba(255, 107, 107, 0.4)'
                      : '0 2px 8px rgba(72, 219, 251, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: '70px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  }}
                >
                  {currentlyPlaying === file.id ? '⏸️ PAUSE' : '▶️ PLAY'}
                </button>

                <button
                  onClick={() => handleExport(file)}
                  style={{
                    background: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
                    color: 'white',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(78, 205, 196, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: '80px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(78, 205, 196, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(78, 205, 196, 0.3)';
                  }}
                >
                  📥 DOWNLOAD
                </button>
              </div>
            </div>

            {/* File size info */}
            <div style={{
              marginTop: '10px',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{(file.file_size / (1024 * 1024)).toFixed(1)} MB</span>
              <span>{new Date(file.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      ))}
      </div>
    </>
  );
};

export default Catalog; 