import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Icon } from '../components';
import { colors, transparentColors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { BackendService } from '../services/supabase';
import { isValidVideoUrl } from '../utils/videoUtils';

interface ManualInputScreenProps {
  navigation: any;
  route: any;
  user: any;
}

export const ManualInputScreen: React.FC<ManualInputScreenProps> = ({ navigation, route, user }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  // Pre-populate URL if it was shared from another app
  useEffect(() => {
    if (route?.params?.sharedUrl) {
      setUrl(route.params.sharedUrl);
    }
  }, [route?.params?.sharedUrl]);

  const handleSubmit = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a video URL');
      return;
    }

    if (!isValidVideoUrl(url)) {
      Alert.alert(
        'Invalid URL',
        'Please enter a valid URL'
      );
      return;
    }

    setLoading(true);
    try {
      // Call the Railway backend to process the video
      const result = await BackendService.processVideoUrl(url.trim(), user.id);

      Alert.alert(
        'Success',
        'Video processing completed! Check your audio files.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to process video: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const { Clipboard } = require('@react-native-clipboard/clipboard');
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent) {
        setUrl(clipboardContent);
      }
    } catch (error) {
      // Silently handle clipboard error
    }
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Enter Video URL</Text>
              <Text style={styles.subtitle}>
                Paste a link from any supported video platform
              </Text>
            </View>

            <View style={styles.content}>
              <View style={styles.inputContainer}>
                <Input
                  placeholder="https://www.example.com/video/..."
                  value={url}
                  onChangeText={setUrl}
                  multiline={false}
                  style={styles.input}
                />
                
                <TouchableOpacity
                  style={[globalStyles.buttonOutline, styles.pasteButton]}
                  onPress={handlePaste}
                  disabled={loading}
                >
                  <Text style={globalStyles.buttonTextOutline}>
                    Paste from Clipboard
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.examplesContainer}>
                <Text style={styles.examplesTitle}>Supported video platforms:</Text>
                <View style={styles.platformList}>
                  <View style={styles.platformItem}>
                    <Icon name="play-circle" size={16} color={colors.primary} />
                    <Text style={styles.platformName}>Short-form videos</Text>
                  </View>
                  <View style={styles.platformItem}>
                    <Icon name="videocam" size={16} color={colors.primary} />
                    <Text style={styles.platformName}>Social media content</Text>
                  </View>
                  <View style={styles.platformItem}>
                    <Icon name="globe" size={16} color={colors.primary} />
                    <Text style={styles.platformName}>Video sharing sites</Text>
                  </View>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[globalStyles.button, (loading || !url.trim()) && styles.disabledButton]}
                  onPress={handleSubmit}
                  disabled={loading || !url.trim()}
                >
                  <Text style={globalStyles.buttonText}>{loading ? 'Processing...' : 'Extract Audio'}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={globalStyles.buttonOutline}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={globalStyles.buttonTextOutline}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  pasteButton: {
    marginBottom: 15,
  },
  examplesContainer: {
    marginBottom: 40,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  platformList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  platformItem: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    backgroundColor: transparentColors.primary10,
    minWidth: 100,
  },
  platformName: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 15,
  },
  disabledButton: {
    backgroundColor: colors.backgroundCard,
    opacity: 0.5,
  },
}); 