import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../components';
import { colors, transparentColors } from '../styles/colors';
import { BackendService } from '../services/supabase';
import { ShareMenuService } from '../services/shareMenu';

interface ManualInputScreenProps {
  navigation: any;
  route: any;
  user: any;
}

export const ManualInputScreen: React.FC<ManualInputScreenProps> = ({ navigation, route, user }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

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

    if (!ShareMenuService.isValidVideoUrl(url)) {
      Alert.alert(
        'Invalid URL',
        'Please enter a valid Instagram, TikTok, or YouTube URL'
      );
      return;
    }

    setLoading(true);
    try {
      console.log('Processing video URL:', url.trim());
      console.log('User ID:', user.id);
      
      // Call the Railway backend to process the video
      const result = await BackendService.processVideoUrl(url.trim(), user.id);
      
      console.log('Backend processing result:', result);

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
      console.error('Error processing video:', error);
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
      console.error('Error pasting from clipboard:', error);
    }
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.title}>Enter Video URL</Text>
              <Text style={styles.subtitle}>
                Paste a link from Instagram, TikTok, or YouTube
              </Text>
            </View>

            <View style={styles.content}>
              <View style={styles.inputContainer}>
                <Input
                  placeholder="https://www.instagram.com/p/..."
                  value={url}
                  onChangeText={setUrl}
                  multiline
                  numberOfLines={3}
                  style={styles.urlInput}
                />
                
                <Button
                  title="Paste from Clipboard"
                  onPress={handlePaste}
                  style={styles.pasteButton}
                  textStyle={styles.pasteButtonText}
                />
              </View>

              <View style={styles.examplesContainer}>
                <Text style={styles.examplesTitle}>Supported platforms:</Text>
                <View style={styles.platformList}>
                  <View style={styles.platformItem}>
                    <Text style={styles.platformEmoji}>📸</Text>
                    <Text style={styles.platformName}>Instagram</Text>
                  </View>
                  <View style={styles.platformItem}>
                    <Text style={styles.platformEmoji}>🎵</Text>
                    <Text style={styles.platformName}>TikTok</Text>
                  </View>
                  <View style={styles.platformItem}>
                    <Text style={styles.platformEmoji}>📺</Text>
                    <Text style={styles.platformName}>YouTube</Text>
                  </View>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  title={loading ? 'Processing...' : 'Extract Audio'}
                  onPress={handleSubmit}
                  disabled={loading || !url.trim()}
                  style={styles.submitButton}
                />
                
                <Button
                  title="Cancel"
                  onPress={() => navigation.goBack()}
                  style={styles.cancelButton}
                  textStyle={styles.cancelButtonText}
                />
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
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 30,
  },
  urlInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  pasteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: transparentColors.primary50,
    paddingVertical: 12,
  },
  pasteButtonText: {
    color: colors.primary,
    fontSize: 14,
  },
  examplesContainer: {
    marginBottom: 40,
  },
  examplesTitle: {
    fontSize: 18,
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
    flex: 1,
  },
  platformEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  platformName: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 15,
    paddingBottom: 30,
  },
  submitButton: {
    paddingVertical: 16,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: transparentColors.textSecondary50,
    paddingVertical: 14,
  },
  cancelButtonText: {
    color: colors.textSecondary,
  },
}); 