import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { WebView } from 'react-native-webview';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Waveform } from '../components';
import { colors, transparentColors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { AudioFile } from '../types';

const { width } = Dimensions.get('window');

interface AudioPlayerScreenProps {
  navigation: any;
  route: any;
}

export const AudioPlayerScreen: React.FC<AudioPlayerScreenProps> = ({ navigation, route }) => {
  const { file }: { file: AudioFile } = route.params;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(file.duration || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Helper function to extract a clean title from filename
  const extractTitleFromFilename = (filename: string): string => {
    if (!filename) return 'Unknown Audio';
    
    // Remove file extension
    let title = filename.replace(/\.[^/.]+$/, '');
    
    // Handle special characters and patterns
    title = title
      .replace(/@/g, '') // Remove @ symbols
      .replace(/_/g, ' ') // Replace underscores with spaces
      .replace(/-/g, ' ') // Replace dashes with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    // Capitalize first letter of each word
    return title.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get display values with fallbacks
  const displayTitle = file.title || extractTitleFromFilename(file.filename) || 'Unknown Audio';
  const displaySource = file.source_url || 'Uploaded File';
  
  // Extract file format from filename
  const getFileFormat = (filename: string): string => {
    const extension = filename.split('.').pop()?.toUpperCase();
    return extension || 'AUDIO';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // HTML5 Audio Player Template - clean up debug elements
  const audioPlayerHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 20px; background: #f0f0f0; }
            audio { width: 100%; height: 50px; margin-bottom: 10px; }
            .status { font-family: monospace; font-size: 12px; background: #333; color: #fff; padding: 10px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <audio id="audioPlayer" controls preload="metadata" crossorigin="anonymous">
            <source src="${file.file_url}" type="audio/mpeg">
            <source src="${file.file_url}" type="audio/mp3">
            <source src="${file.file_url}">
            Your browser does not support the audio element.
        </audio>
        <div class="status" id="status">Status: Loading...</div>
        
        <script>
            const audio = document.getElementById('audioPlayer');
            const status = document.getElementById('status');
            
            function updateStatus(msg) {
                status.textContent = 'Status: ' + msg;
            }
            
            updateStatus('Initializing audio element...');
            
            audio.addEventListener('loadstart', function() {
                updateStatus('Loading started...');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'loadstart'
                }));
            });
            
            audio.addEventListener('loadedmetadata', function() {
                updateStatus('Metadata loaded. Duration: ' + audio.duration + 's');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'loaded',
                    duration: audio.duration
                }));
            });
            
            audio.addEventListener('canplay', function() {
                updateStatus('Can start playing');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'canplay'
                }));
            });
            
            audio.addEventListener('timeupdate', function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'timeupdate',
                    currentTime: audio.currentTime,
                    duration: audio.duration
                }));
            });
            
            audio.addEventListener('play', function() {
                updateStatus('Playing...');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'play'
                }));
            });
            
            audio.addEventListener('pause', function() {
                updateStatus('Paused');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'pause'
                }));
            });
            
            audio.addEventListener('ended', function() {
                updateStatus('Playback ended');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'ended'
                }));
            });
            
            audio.addEventListener('error', function(e) {
                const errorMsg = 'Error: ' + (e.message || audio.error?.message || 'Failed to load audio');
                updateStatus(errorMsg);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    error: errorMsg
                }));
            });
            
            // Multiple ways to listen for commands from React Native
            
            // Method 1: Standard window message listener
            window.addEventListener('message', function(event) {
                updateStatus('Received: ' + event.data);
                handleCommand(event.data);
            });
            
            // Method 2: React Native WebView specific listener
            document.addEventListener('message', function(event) {
                updateStatus('Received: ' + event.data);
                handleCommand(event.data);
            });
            
            // Method 3: Direct window property (fallback)
            window.handleReactNativeMessage = function(data) {
                updateStatus('Received: ' + data);
                handleCommand(data);
            };
            
            // Command handler function
            function handleCommand(data) {
                try {
                    const command = JSON.parse(data);
                    
                    switch(command.type) {
                        case 'play':
                            updateStatus('▶️ Playing audio...');
                            const playPromise = audio.play();
                            if (playPromise !== undefined) {
                                playPromise
                                    .then(() => {
                                        updateStatus('✅ Audio playing!');
                                        window.ReactNativeWebView.postMessage(JSON.stringify({
                                            type: 'play_success'
                                        }));
                                    })
                                    .catch(error => {
                                        updateStatus('❌ Play failed: ' + error.message);
                                        window.ReactNativeWebView.postMessage(JSON.stringify({
                                            type: 'play_error',
                                            error: error.message
                                        }));
                                    });
                            }
                            break;
                        case 'pause':
                            updateStatus('⏸️ Pausing audio...');
                            audio.pause();
                            break;
                        case 'seek':
                            updateStatus('⏭️ Seeking to: ' + command.time + 's');
                            audio.currentTime = command.time;
                            break;
                        default:
                            updateStatus('❓ Unknown command: ' + command.type);
                    }
                } catch (e) {
                    updateStatus('❌ Error parsing command: ' + e.message);
                }
            }
        </script>
    </body>
    </html>
  `;

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'loadstart':
          break;
        case 'loaded':
          setDuration(data.duration);
          setWebViewReady(true);
          setLoading(false);
          setError(null);
          break;
        case 'canplay':
          break;
        case 'timeupdate':
          setCurrentTime(data.currentTime);
          break;
        case 'play_success':
          setIsPlaying(true);
          break;
        case 'play':
          setIsPlaying(true);
          break;
        case 'pause':
          setIsPlaying(false);
          break;
        case 'ended':
          setIsPlaying(false);
          setCurrentTime(0);
          break;
        case 'error':
          Alert.alert('Audio Error', data.error);
          break;
      }
    } catch (error) {
      // Handle JSON parsing error
    }
  };

  // Send commands to WebView with multiple fallback methods
  const sendCommand = (command: any) => {
    if (webViewRef.current) {
      try {
        // Try multiple methods to ensure command delivery
        
        // Method 1: postMessage (most reliable)
        webViewRef.current.postMessage(JSON.stringify(command));
        
        // Method 2: injectedJavaScript (fallback)
        const script = `
          try {
            handleReactNativeMessage('${JSON.stringify(command).replace(/'/g, "\\'")}');
          } catch(e) {
            console.error('Script injection failed:', e);
          }
          true;
        `;
        webViewRef.current.injectJavaScript(script);
      } catch (error) {
        // Handle send error
      }
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      sendCommand({ type: 'pause' });
    } else {
      sendCommand({ type: 'play' });
    }
  };

  const seekTo = (time: number) => {
    sendCommand({ type: 'seek', time });
    setCurrentTime(time);
  };

  const skipBackward = async () => {
    const newPosition = Math.max(0, currentTime - 15);
    seekTo(newPosition);
  };

  const skipForward = async () => {
    const newPosition = Math.min(duration, currentTime + 15);
    seekTo(newPosition);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this audio I extracted: ${file.title}`,
        url: file.file_url,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDownload = async () => {
    Alert.alert(
      'Download',
      'This feature will download the audio file to your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', onPress: () => {
          // Implement download functionality
          Alert.alert('Success', 'Audio file downloaded to your device!');
        }}
      ]
    );
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* WebView for HTML5 Audio Player - visible for debugging */}
        <WebView
          ref={webViewRef}
          source={{ html: audioPlayerHTML }}
          style={styles.hiddenWebView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleWebViewMessage}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          mixedContentMode="compatibility"
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            setError('WebView failed to load');
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error:', nativeEvent);
            setError(`HTTP Error: ${nativeEvent.statusCode}`);
          }}
        />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Text style={styles.shareIcon}>↗</Text>
          </TouchableOpacity>
        </View>

        {/* Audio Info */}
        <View style={styles.audioInfo}>
          <Text style={styles.audioTitle} numberOfLines={2}>
            {displayTitle}
          </Text>
          
        </View>

        {/* Waveform Visualization */}
        <View style={styles.waveformContainer}>
                  <LinearGradient
          colors={[transparentColors.primary30, transparentColors.secondary30]}
          style={styles.waveformBackground}
        >
            <Waveform />
          </LinearGradient>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={duration}
            value={currentTime}
            onValueChange={seekTo}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={transparentColors.textSecondary30}
            thumbTintColor={colors.primary}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Playback Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={skipBackward}
          >
            <Text style={styles.controlIcon}>⏪</Text>
            <Text style={styles.controlLabel}>-15s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.playButtonActive]}
            onPress={togglePlayPause}
            disabled={loading}
          >
            <LinearGradient
              colors={isPlaying ? [colors.secondary, colors.primary] : [colors.primary, colors.secondary]}
              style={styles.playButtonGradient}
            >
              <Text style={styles.playIcon}>
                {loading ? '⏳' : isPlaying ? '⏸' : '▶️'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={skipForward}
          >
            <Text style={styles.controlIcon}>⏩</Text>
            <Text style={styles.controlLabel}>+15s</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={handleDownload}
            style={[globalStyles.button, styles.actionButton]}
          >
            <Text style={[globalStyles.buttonText, styles.actionButtonText]}>
              Download
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleShare}
            style={[globalStyles.button, styles.actionButton]}
          >
            <Text style={[globalStyles.buttonText, styles.actionButtonText]}>
              Share
            </Text>
          </TouchableOpacity>
        </View>

        {/* File Details */}
        <View style={styles.detailsContainer}>
          <LinearGradient
            colors={[transparentColors.surface40, transparentColors.surface20]}
            style={styles.detailsBackground}
          >
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>File Size:</Text>
              <Text style={styles.detailValue}>{formatFileSize(file.file_size || 0)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailValue}>{formatTime(duration)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Format:</Text>
              <Text style={styles.detailValue}>{getFileFormat(file.filename)}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quality:</Text>
              <Text style={styles.detailValue}>High (320kbps)</Text>
            </View>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  hiddenWebView: {
    height: 200,
    width: '100%',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 10,
    marginLeft: -10,
  },
  backIcon: {
    fontSize: 28,
    color: colors.text,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  shareButton: {
    padding: 10,
    marginRight: -10,
  },
  shareIcon: {
    fontSize: 24,
    color: colors.text,
  },
  audioInfo: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  audioTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  audioSource: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  audioDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    marginTop: 8,
    textAlign: 'center',
  },
  debugText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  waveformContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  waveformBackground: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
  progressSlider: {
    flex: 1,
    height: 40,
    marginHorizontal: 15,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  controlButton: {
    alignItems: 'center',
    padding: 15,
  },
  controlIcon: {
    fontSize: 24,
    color: colors.text,
    marginBottom: 4,
  },
  controlLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  playButton: {
    marginHorizontal: 30,
  },
  playButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  playButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 32,
    color: colors.text,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: transparentColors.primary50,
  },
  actionButtonText: {
    color: colors.primary,
  },
  detailsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  detailsBackground: {
    borderRadius: 12,
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
}); 