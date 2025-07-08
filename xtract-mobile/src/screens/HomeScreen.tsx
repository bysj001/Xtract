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
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingsIcon, PlayIcon } from '../components';
import { colors, transparentColors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { AudioService, BackendService } from '../services/supabase';
import { UrlSchemeService } from '../services/urlScheme';
import { SharedUrlManager } from '../services/sharedUrlManager';
import { isValidVideoUrl } from '../utils/videoUtils';
import { AudioFile } from '../types';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: any;
  user: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, user }) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadData();
    const urlSchemeCleanup = setupURLSchemeListener();
    const sharedUrlCleanup = setupSharedUrlListener(); // Listen for shared URLs
    
    // Check for any pending shared URL when HomeScreen loads
    checkForPendingSharedUrl();

    return () => {
      urlSchemeCleanup?.();
      sharedUrlCleanup?.();
    };
  }, []);

  const setupSharedUrlListener = () => {
    // Listen for shared URLs that come in while the app is running
    const subscription = SharedUrlManager.addPendingUrlListener((url: string) => {
      // Validate that it's a video URL
      if (isValidVideoUrl(url)) {
        handleSharedUrl(url);
      } else {
        Alert.alert('Invalid URL', 'Please share a valid video URL from a supported video platform.');
      }
    });

    return () => {
      subscription.remove();
    };
  };

  const checkForPendingSharedUrl = async () => {
    try {
      const pendingUrl = await SharedUrlManager.getPendingSharedUrl();
      if (pendingUrl) {
        // Validate that it's a video URL
        if (isValidVideoUrl(pendingUrl)) {
          handleSharedUrl(pendingUrl);
        } else {
          Alert.alert('Invalid URL', 'Please share a valid video URL from a supported video platform.');
        }
      }
    } catch (error) {
      // Silently handle error - no need to show debug info to user
    }
  };

  const setupURLSchemeListener = () => {
    UrlSchemeService.setUrlHandler({
      handleUrl: (url: string) => {
        handleSharedUrl(url);
      }
    });

    return UrlSchemeService.initialize();
  };

  const handleSharedUrl = async (url: string) => {
    console.log('Processing shared URL:', url);
    
    // Validate that it's a video URL
    if (isValidVideoUrl(url)) {
      await processVideo(url);
    } else {
      Alert.alert('Invalid URL', 'Please share a valid video URL from a supported video platform.');
    }
  };

  const handlePendingUrl = async (pendingUrl: string) => {
    console.log('Processing pending URL:', pendingUrl);
    
    // Validate that it's a video URL
    if (isValidVideoUrl(pendingUrl)) {
      await processVideo(pendingUrl);
    } else {
      Alert.alert('Invalid URL', 'Please share a valid video URL from a supported video platform.');
    }
  };

  const processVideo = async (url: string) => {
    try {
      // Call the Railway backend to process the video
      const result = await BackendService.processVideoUrl(url, user.id);
      
      // Dismiss any existing alerts and show success
      Alert.alert('✅ Success!', 'Audio extracted successfully! Check your library below.', [
        { text: 'OK', onPress: () => loadData() }
      ]);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Dismiss any existing alerts and show error
      Alert.alert('❌ Error', `Failed to extract audio:\n${errorMessage}`, [
        { text: 'OK' }
      ]);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await loadAudioFiles();
    setLoading(false);
  };

  const loadAudioFiles = async () => {
    try {
      const files = await AudioService.getUserAudioFiles(user.id);
      setAudioFiles(files);
    } catch (error) {
      // Silently handle error
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderAudioFile = (file: AudioFile) => {
    // Fallback values for missing data
    const title = file.title || extractTitleFromFilename(file.filename) || 'Unknown Audio';
    const duration = file.duration || 0;
    const sourceUrl = file.source_url || 'Uploaded File';
    
    const handlePress = () => {
      try {
        navigation.navigate('AudioPlayer', { file });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        Alert.alert('Error', `Failed to open audio player: ${errorMessage}`);
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
            <PlayIcon size={20} color={colors.primary} />
            <Text style={styles.playButtonText}>Tap to Play</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const extractTitleFromFilename = (filename: string): string => {
    if (!filename) return '';
    
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    // Replace underscores and dashes with spaces
    const formatted = nameWithoutExt.replace(/[_-]/g, ' ');
    
    // Capitalize first letter of each word
    return formatted.replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return '0:00';
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
            <SettingsIcon size={24} color={colors.text} />
          </TouchableOpacity>
        </View>


        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >

          {/* Audio Files Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Audio Files</Text>
            {audioFiles.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No audio files yet</Text>
                <Text style={styles.emptySubtext}>
                  Share a video from any supported platform to get started!
                </Text>
              </View>
            ) : (
              audioFiles.map(renderAudioFile)
            )}
          </View>

          {/* Manual URL Input */}
          <View style={styles.section}>
            <TouchableOpacity
              style={globalStyles.button}
              onPress={() => navigation.navigate('ManualInput')}
            >
              <Text style={globalStyles.buttonText}>Enter Video URL Manually</Text>
            </TouchableOpacity>
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
    paddingBottom: Platform.OS === 'ios' ? 60 : 40, // Increased padding to ensure bottom content isn't clipped
  },
  section: {
    marginBottom: 40,
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
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fileGradient: {
    padding: 0,
  },
  fileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: 16,
    marginTop: 16,
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
    marginHorizontal: 16,
  },
  fileDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginHorizontal: 16,
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
  playButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  playButtonText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 8,
  },
  debugContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  debugText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
}); 