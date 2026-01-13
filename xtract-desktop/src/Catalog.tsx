import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { AudioService, AudioFile } from './services/supabase';

// CSS animations
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

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
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
  const [newFileIds, setNewFileIds] = useState<Set<string>>(new Set());

  // Load audio files
  const loadAudioFiles = useCallback(async () => {
    try {
      const files = await AudioService.getUserAudioFiles(user.id);
      setAudioFiles(files);
    } catch (error) {
      console.error('Error loading audio files:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    if (user?.id) {
      loadAudioFiles();

      // Subscribe to new files (realtime sync)
      const subscription = AudioService.subscribeToNewFiles(user.id, (newFile) => {
        console.log('📥 New audio file received:', newFile.title);
        setAudioFiles(prev => [newFile, ...prev]);
        setNewFileIds(prev => new Set(prev).add(newFile.id));
        
        // Clear "new" indicator after 5 seconds
        setTimeout(() => {
          setNewFileIds(prev => {
            const next = new Set(prev);
            next.delete(newFile.id);
            return next;
          });
        }, 5000);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id, loadAudioFiles]);

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, [audioElements]);

  const handleDragStart = (event: React.DragEvent, file: AudioFile) => {
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

      let audio = audioElements.get(file.id);
      if (!audio) {
        // Get signed URL for playback
        const signedUrl = await AudioService.getSignedUrl(file.storage_path);
        audio = new Audio(signedUrl);
        
        audio.addEventListener('ended', () => setCurrentlyPlaying(null));
        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          setCurrentlyPlaying(null);
        });
        audio.crossOrigin = 'anonymous';

        const newAudioElements = new Map(audioElements);
        newAudioElements.set(file.id, audio);
        setAudioElements(newAudioElements);
      }

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

  const handleExport = async (file: AudioFile) => {
    try {
      const blob = await AudioService.downloadAudioFile(file.storage_path);
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

  const handleDelete = async (file: AudioFile) => {
    if (!window.confirm(`Delete "${file.title || file.filename}"?`)) return;
    
    try {
      await AudioService.deleteAudioFile(file.id);
      setAudioFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const truncateFilename = (filename: string, maxLength: number = 30) => {
    if (filename.length <= maxLength) return filename;
    const ext = filename.split('.').pop();
    const nameWithoutExt = filename.slice(0, filename.lastIndexOf('.'));
    const truncated = nameWithoutExt.slice(0, maxLength - (ext?.length || 0) - 4) + '...';
    return `${truncated}.${ext}`;
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        color: 'rgba(255, 255, 255, 0.6)'
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
        height: '300px',
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        padding: '40px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎵</div>
        <h3 style={{ margin: '0 0 10px 0', color: 'rgba(255, 255, 255, 0.8)' }}>
          No audio files yet
        </h3>
        <p style={{ fontSize: '14px', maxWidth: '300px', lineHeight: '1.6' }}>
          Share a video from Instagram to your mobile app, and extracted audio will automatically sync here!
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
        {audioFiles.map((file, index) => {
          const isNew = newFileIds.has(file.id);
          const isPlaying = currentlyPlaying === file.id;
          
          return (
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
                border: isNew 
                  ? '2px solid rgba(78, 205, 196, 0.6)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'grab',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isNew
                  ? '0 0 30px rgba(78, 205, 196, 0.3)'
                  : '0 8px 32px rgba(0, 0, 0, 0.3)',
                position: 'relative',
                overflow: 'hidden',
                backdropFilter: 'blur(10px)',
                animation: isNew ? 'fadeIn 0.5s ease-out' : 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(78, 205, 196, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = isNew 
                  ? '0 0 30px rgba(78, 205, 196, 0.3)'
                  : '0 8px 32px rgba(0, 0, 0, 0.3)';
              }}
            >
              {/* New badge */}
              {isNew && (
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  NEW
                </div>
              )}

              {/* Waveform visualization */}
              <div style={{
                height: '80px',
                background: isPlaying ? `
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
                    rgba(78, 205, 196, 0.8) 50%, 
                    rgba(123, 104, 238, 0.8) 100%
                  )
                `,
                borderRadius: '12px',
                marginBottom: '20px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isPlaying
                  ? 'inset 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 20px rgba(78, 205, 196, 0.4)'
                  : 'inset 0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
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
                  {Array.from({ length: 40 }, (_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${20 + Math.sin(i * 0.5) * 20 + Math.random() * 20}%`,
                        background: isPlaying ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)',
                        borderRadius: '1px',
                        animationName: isPlaying ? 'pulse-fast' : 'pulse',
                        animationDuration: `${isPlaying ? 0.3 : 1}s`,
                        animationTimingFunction: 'ease-in-out',
                        animationIterationCount: 'infinite',
                        animationDirection: 'alternate',
                        animationDelay: `${i * 0.03}s`
                      }}
                    />
                  ))}
                </div>
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
                  {file.title || truncateFilename(file.filename)}
                </h3>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '12px'
                }}>
                  <span>{formatDuration(file.duration)}</span>
                  <span>{formatFileSize(file.file_size)}</span>
                  <span>{new Date(file.created_at).toLocaleDateString()}</span>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handlePlayPause(file)}
                    style={{
                      background: isPlaying
                        ? 'linear-gradient(135deg, #ff6b6b, #ff8e8e)'
                        : 'linear-gradient(135deg, #48dbfb, #0abde3)',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}
                  </button>

                  <button
                    onClick={() => handleExport(file)}
                    style={{
                      background: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    📥 DOWNLOAD
                  </button>

                  <button
                    onClick={() => handleDelete(file)}
                    style={{
                      background: 'rgba(255, 107, 107, 0.2)',
                      color: '#ff6b6b',
                      padding: '8px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      border: '1px solid rgba(255, 107, 107, 0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default Catalog;
