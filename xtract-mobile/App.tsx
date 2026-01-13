/**
 * Xtract Mobile App
 * Extract audio from videos - no scraping, just pure file sharing
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AudioPlayerScreen } from './src/screens/AudioPlayerScreen';
import { RootStackParamList, User } from './src/types';
import { AuthService } from './src/services/supabase';

const Stack = createStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

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
