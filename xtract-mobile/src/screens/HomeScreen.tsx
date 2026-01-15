import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsIcon, PlayIcon } from '../components';
import { colors, transparentColors } from '../styles/colors';
import { AudioService, VideoProcessingService, ProcessingService } from '../services/supabase';
import { AudioFile, ProcessingJob, VideoFileData } from '../types';
import { useSharedVideo } from '../../App';

interface HomeScreenProps {
  navigation: any;
  user: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, user }) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Get shared video from context (set by App.tsx when share is received)
  const { sharedVideo, clearSharedVideo } = useSharedVideo();

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Handle shared video when it arrives
  useEffect(() => {
    if (sharedVideo && !isProcessing) {
      console.log('📹 Shared video detected in HomeScreen:', sharedVideo.name);
      processVideo(sharedVideo);
      clearSharedVideo(); // Clear so it doesn't process again
    }
  }, [sharedVideo, isProcessing, clearSharedVideo]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAudioFiles(), loadProcessingJobs()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAudioFiles = async () => {
    try {
      const files = await AudioService.getUserAudioFiles(user.id);
      setAudioFiles(files);
    } catch (error) {
      console.error('Error loading audio files:', error);
    }
  };

  const loadProcessingJobs = async () => {
    try {
      const jobs = await ProcessingService.getUserProcessingJobs(user.id);
      // Only show pending/processing jobs
      const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'processing');
      setProcessingJobs(activeJobs);
    } catch (error) {
      console.error('Error loading processing jobs:', error);
    }
  };

  const processVideo = async (videoData: VideoFileData) => {
    if (isProcessing) {
      Alert.alert('Please Wait', 'A video is already being processed.');
      return;
    }

    setIsProcessing(true);

    try {
      Alert.alert(
        '🎬 Processing Video',
        `Uploading "${videoData.name}"...\n\nThis may take a moment depending on file size.`,
        [{ text: 'OK' }]
      );

      const result = await VideoProcessingService.processVideoFile(videoData, user.id);

      Alert.alert(
        '✅ Success!',
        'Your video is being processed. The audio will appear in your library shortly.',
        [{ text: 'OK', onPress: () => loadData() }]
      );

      // Subscribe to job updates
      const subscription = VideoProcessingService.subscribeToJob(result.jobId, (job) => {
        if (job.status === 'completed' || job.status === 'failed') {
          loadData();
          subscription.unsubscribe();

          if (job.status === 'failed') {
            Alert.alert('❌ Processing Failed', job.error_message || 'Unknown error occurred');
          }
        }
      });

    } catch (error: any) {
      Alert.alert(
        '❌ Error',
        error.message || 'Failed to process video',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

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

  const renderProcessingJob = (job: ProcessingJob) => (
    <View key={job.id} style={styles.jobCard}>
      <LinearGradient
        colors={[transparentColors.primary20, transparentColors.secondary10]}
        style={styles.jobGradient}
      >
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {job.original_filename || 'Processing...'}
          </Text>
          <View style={styles.statusBadge}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.statusText}>
              {job.status === 'pending' ? 'Queued' : 'Processing'}
            </Text>
          </View>
        </View>
        <Text style={styles.jobDate}>
          Started {new Date(job.created_at).toLocaleTimeString()}
        </Text>
      </LinearGradient>
    </View>
  );

  const renderAudioFile = (file: AudioFile) => (
    <TouchableOpacity
      key={file.id}
      style={styles.fileCard}
      onPress={() => navigation.navigate('AudioPlayer', { file })}
    >
      <LinearGradient
        colors={[transparentColors.primary10, transparentColors.secondary10]}
        style={styles.fileGradient}
      >
        <View style={styles.fileHeader}>
          <Text style={styles.fileName} numberOfLines={2}>
            {file.title || file.filename}
          </Text>
          {file.duration > 0 && (
            <Text style={styles.fileDuration}>{formatDuration(file.duration)}</Text>
          )}
        </View>
        
        <View style={styles.fileInfo}>
          <Text style={styles.fileSize}>{formatFileSize(file.file_size)}</Text>
          <Text style={styles.fileDate}>
            {new Date(file.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.playButtonContainer}>
          <PlayIcon size={20} color={colors.primary} />
          <Text style={styles.playButtonText}>Tap to Play</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={[colors.background, colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Xtract</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <SettingsIcon size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
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
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : audioFiles.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No audio files yet</Text>
                <Text style={styles.emptySubtext}>
                  Share a video file to get started!
                </Text>
              </View>
            ) : (
              audioFiles.map(renderAudioFile)
            )}
          </View>

          {/* Instructions Section */}
          <View style={styles.section}>
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>📹 How to Use Xtract</Text>
              
              <View style={styles.stepContainer}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>
                  Open Instagram and find the reel you want
                </Text>
              </View>
              
              <View style={styles.stepContainer}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>
                  Tap the share button and select "Save to Device"
                </Text>
              </View>
              
              <View style={styles.stepContainer}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>
                  Share the saved video file with Xtract
                </Text>
              </View>
              
              <View style={styles.stepContainer}>
                <Text style={styles.stepNumber}>4</Text>
                <Text style={styles.stepText}>
                  Audio will be extracted automatically!
                </Text>
              </View>

              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>✨ Benefits</Text>
                <Text style={styles.benefitsText}>• No rate limiting or API restrictions</Text>
                <Text style={styles.benefitsText}>• Works with any video source</Text>
                <Text style={styles.benefitsText}>• High-quality 320kbps MP3</Text>
                <Text style={styles.benefitsText}>• Syncs to desktop automatically</Text>
              </View>
            </View>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 60 : 40,
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
  loader: {
    marginTop: 40,
  },
  // Processing Job Styles
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
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: transparentColors.primary20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  jobDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Audio File Styles
  fileCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fileGradient: {
    padding: 16,
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  fileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fileSize: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  fileDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  playButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  playButtonText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 8,
  },
  // Empty State
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
  // Instructions Card
  instructionsCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: colors.background,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  benefitsContainer: {
    marginTop: 16,
    backgroundColor: transparentColors.primary10,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  benefitsText: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
    lineHeight: 18,
  },
});
