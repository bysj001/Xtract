import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  DeviceEventEmitter,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Waveform } from '../components';
import { colors, transparentColors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { AudioService, ProcessingService, BackendService } from '../services/supabase';
import { URLSchemeService } from '../services/urlScheme';
import { ShareMenuService } from '../services/shareMenu';
import { AudioFile, ProcessingJob } from '../types';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
  user: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, user }) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const urlSchemeCleanup = setupURLSchemeListener();
    const processingCleanup = setupProcessingSubscription();
    const nativeEventCleanup = setupNativeEventListener(); // Listen for shared URLs from native Android

    return () => {
      urlSchemeCleanup?.();
      processingCleanup?.();
      nativeEventCleanup?.();
    };
  }, []);

  const setupNativeEventListener = () => {
    // Listen for shared URLs from Android MainActivity
    const subscription = DeviceEventEmitter.addListener('sharedURL', (url: string) => {
      console.log('Received shared URL from native:', url);
      
      // Validate that it's a video URL
      if (ShareMenuService.isValidVideoUrl(url)) {
        handleSharedURL(url);
      } else {
        Alert.alert('Invalid URL', 'Please share a valid video URL from Instagram, TikTok, or YouTube.');
      }
    });

    return () => {
      subscription.remove();
    };
  };

  const setupURLSchemeListener = () => {
    const removeListener = URLSchemeService.addListener((url) => {
      handleSharedURL(url);
    });

    // Check for pending shared URL on mount
    URLSchemeService.getPendingSharedURL().then((url) => {
      if (url) {
        handleSharedURL(url);
      }
    });

    return removeListener;
  };

  const setupProcessingSubscription = () => {
    const subscription = ProcessingService.subscribeToProcessingJobs(
      user.id,
      (jobs) => {
        setProcessingJobs(jobs);
        // Refresh audio files when processing completes
        if (jobs.some(job => job.status === 'completed')) {
          loadAudioFiles();
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  };

  const handleSharedURL = async (url: string) => {
    console.log('Automatically processing shared URL:', url);
    
    // Show immediate feedback to user
    Alert.alert('Processing Video', 'Extracting audio from shared video...', [], { cancelable: false });
    
    // Automatically process the video
    try {
      await processVideo(url);
      // Success alert is handled in processVideo()
    } catch (error) {
      // Error alert is handled in processVideo()
      console.error('Auto-processing failed:', error);
    }
  };

  const processVideo = async (url: string) => {
    try {
      console.log('Processing video URL:', url);
      console.log('User ID:', user.id);
      
      // Call the Railway backend to process the video
      const result = await BackendService.processVideoUrl(url, user.id);
      
      console.log('Backend processing result:', result);
      
      // Dismiss any existing alerts and show success
      Alert.alert('✅ Success!', 'Audio extracted successfully! Check your library below.', [
        { text: 'OK', onPress: () => loadData() }
      ]);
      
    } catch (error) {
      console.error('Error processing video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Dismiss any existing alerts and show error
      Alert.alert('❌ Error', `Failed to extract audio:\n${errorMessage}`, [
        { text: 'OK' }
      ]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadAudioFiles(),
      loadProcessingJobs()
    ]);
    setLoading(false);
  };

  const loadAudioFiles = async () => {
    try {
      const files = await AudioService.getUserAudioFiles(user.id);
      console.log('Loaded audio files:', JSON.stringify(files, null, 2));
      setAudioFiles(files);
    } catch (error) {
      console.error('Error loading audio files:', error);
    }
  };

  const loadProcessingJobs = async () => {
    try {
      const jobs = await ProcessingService.getUserProcessingJobs(user.id);
      setProcessingJobs(jobs);
    } catch (error) {
      console.error('Error loading processing jobs:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderProcessingJob = (job: ProcessingJob) => (
    <View key={job.id} style={styles.jobCard}>
      <LinearGradient
        colors={[transparentColors.primary20, transparentColors.secondary20]}
        style={styles.jobGradient}
      >
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle}>Processing Video</Text>
          <Text style={styles.jobStatus}>{job.status}</Text>
        </View>
        <Text style={styles.jobUrl} numberOfLines={2}>
          {job.original_url}
        </Text>
        {job.status === 'processing' && (
          <View style={styles.waveformContainer}>
            <Waveform size={20} />
          </View>
        )}
        {job.error_message && (
          <Text style={styles.errorText}>{job.error_message}</Text>
        )}
      </LinearGradient>
    </View>
  );

  const renderAudioFile = (file: AudioFile) => {
    // Debug log to see the actual file data
    console.log('Rendering audio file:', JSON.stringify(file, null, 2));
    
    // Fallback values for missing data
    const title = file.title || extractTitleFromFilename(file.filename) || 'Unknown Audio';
    const duration = file.duration || 0;
    const sourceUrl = file.source_url || 'Uploaded File';
    
    const handlePress = () => {
      try {
        console.log('=== Audio File Pressed ===');
        console.log('Navigating to AudioPlayer with file:', {
          id: file.id,
          filename: file.filename,
          file_url: file.file_url,
          title: title
        });
        navigation.navigate('AudioPlayer', { file });
        console.log('Navigation call completed');
      } catch (error) {
        console.error('Error navigating to AudioPlayer:', error);
        Alert.alert('Error', `Failed to open audio player: ${error.message}`);
      }
    };
    
    return (
      <TouchableOpacity
        key={file.id}
        style={styles.fileCard}
        onPress={handlePress}
      >
        <LinearGradient
          colors={[transparentColors.primary10, transparentColors.secondary10]}
          style={styles.fileGradient}
        >
          <View style={styles.fileHeader}>
            <Text style={styles.fileName} numberOfLines={2}>
              {title}
            </Text>
            {duration > 0 && (
              <Text style={styles.fileDuration}>{formatDuration(duration)}</Text>
            )}
          </View>
          <Text style={styles.fileSource} numberOfLines={1}>
            From: {sourceUrl}
          </Text>
          <Text style={styles.fileDate}>
            {new Date(file.created_at).toLocaleDateString()}
          </Text>
          {/* Add a play button icon */}
          <View style={styles.playButtonContainer}>
            <Text style={styles.playButtonIcon}>▶️</Text>
            <Text style={styles.playButtonText}>Tap to Play</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Helper function to extract a clean title from filename
  const extractTitleFromFilename = (filename: string): string => {
    if (!filename) return 'Unknown Audio';
    
    // Remove file extension
    let title = filename.replace(/\.[^/.]+$/, '');
    
    // Handle special characters and patterns
    title = title
      .replace(/[@]/g, '') // Remove @ symbols
      .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing spaces
    
    // Capitalize first letter of each word
    title = title.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
    
    return title || 'Unknown Audio';
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Xtract</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Processing Jobs Section */}
          {processingJobs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Processing</Text>
              {processingJobs.map(renderProcessingJob)}
            </View>
          )}

          {/* Audio Files Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Audio Files</Text>
            {audioFiles.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No audio files yet</Text>
                <Text style={styles.emptySubtext}>
                  Share a video from Instagram, TikTok, or YouTube to get started!
                </Text>
              </View>
            ) : (
              audioFiles.map(renderAudioFile)
            )}
          </View>

          {/* Manual URL Input */}
          <View style={styles.section}>
            <Button
              title="Enter Video URL Manually"
              onPress={() => navigation.navigate('ManualInput')}
              style={styles.manualButton}
            />
          </View>
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  settingsButton: {
    padding: 10,
  },
  settingsIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  jobCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  jobGradient: {
    padding: 16,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  jobStatus: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  jobUrl: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  waveformContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 8,
  },
  fileCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fileGradient: {
    padding: 16,
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  fileDuration: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  fileSource: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  fileDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  manualButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  playButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  playButtonIcon: {
    fontSize: 20,
    color: colors.primary,
    marginRight: 5,
  },
  playButtonText: {
    fontSize: 14,
    color: colors.primary,
  },
}); 