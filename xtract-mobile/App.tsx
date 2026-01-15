/**
 * Xtract Mobile App
 * Extract audio from videos - no scraping, just pure file sharing
 */

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { StatusBar, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ShareMenu, { SharedItem } from 'react-native-share-menu';

import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AudioPlayerScreen } from './src/screens/AudioPlayerScreen';
import { RootStackParamList, User, VideoFileData } from './src/types';
import { AuthService } from './src/services/supabase';

const Stack = createStackNavigator<RootStackParamList>();

// Context to pass shared video data to child components
interface SharedVideoContextType {
  sharedVideo: VideoFileData | null;
  clearSharedVideo: () => void;
}

export const SharedVideoContext = createContext<SharedVideoContextType>({
  sharedVideo: null,
  clearSharedVideo: () => {},
});

export const useSharedVideo = () => useContext(SharedVideoContext);

function App(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharedVideo, setSharedVideo] = useState<VideoFileData | null>(null);

  // Handle incoming shared content
  const handleShare = useCallback((item: SharedItem | null) => {
    if (!item) {
      console.log('📱 No shared item received');
      return;
    }

    console.log('📱 Received shared content in App.tsx:');
    console.log('   Type:', item.mimeType);
    console.log('   Data:', item.data?.substring(0, 100));

    // Check if it's a video file
    const mimeType = item.mimeType?.toLowerCase() || '';
    const isVideo = mimeType.startsWith('video/') || 
                    mimeType === 'public.movie' || 
                    mimeType === 'com.apple.quicktime-movie';

    if (isVideo && item.data) {
      // Extract filename from URI
      let filename = 'shared_video.mp4';
      try {
        const uriParts = item.data.split('/');
        const lastPart = uriParts[uriParts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          filename = decodeURIComponent(lastPart);
        }
      } catch (e) {
        // Use default filename
      }

      const videoData: VideoFileData = {
        uri: item.data,
        type: item.mimeType || 'video/mp4',
        name: filename,
      };

      console.log('📹 ✅ Valid video received, setting shared video state');
      setSharedVideo(videoData);
    } else {
      console.log('❌ Shared content is not a video file');
    }
  }, []);

  const clearSharedVideo = useCallback(() => {
    setSharedVideo(null);
  }, []);

  useEffect(() => {
    // Check initial auth state
    const checkAuthState = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        setUser(currentUser as User);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();

    // Subscribe to auth state changes
    const { data: { subscription } } = AuthService.onAuthStateChange((authUser) => {
      setUser(authUser);
    });

    // Check for initial shared data (app opened via share)
    ShareMenu.getInitialShare(handleShare);

    // Listen for new shares while app is running
    const shareListener = ShareMenu.addNewShareListener(handleShare);

    return () => {
      subscription?.unsubscribe();
      shareListener.remove();
    };
  }, [handleShare]);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SharedVideoContext.Provider value={{ sharedVideo, clearSharedVideo }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <Stack.Navigator
            initialRouteName={user ? 'Main' : 'Welcome'}
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              cardStyle: { backgroundColor: '#0f0f0f' },
            }}
          >
            {user ? (
              // Authenticated screens
              <>
                <Stack.Screen name="Main">
                  {(props) => <HomeScreen {...props} user={user} />}
                </Stack.Screen>
                <Stack.Screen name="Settings">
                  {(props) => <SettingsScreen {...props} user={user} />}
                </Stack.Screen>
                <Stack.Screen name="AudioPlayer" component={AudioPlayerScreen} />
              </>
            ) : (
              // Unauthenticated screens
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </SharedVideoContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});

export default App;
