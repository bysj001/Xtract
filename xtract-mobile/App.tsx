/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ManualInputScreen } from './src/screens/ManualInputScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AudioPlayerScreen } from './src/screens/AudioPlayerScreen';
import { RootStackParamList, User } from './src/types';
import { AuthService } from './src/services/supabase';
import { UrlSchemeService } from './src/services/urlScheme';
import { SharedUrlManager } from './src/services/sharedUrlManager';

const Stack = createStackNavigator<RootStackParamList>();

function App(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Centralized auth state management
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

    // Single auth state listener for the entire app
    const { data: { subscription } } = AuthService.onAuthStateChange((authUser) => {
      setUser(authUser);
    });

    // Initialize URL scheme handling
    const urlSchemeSubscription = UrlSchemeService.initialize();
    
    // Initialize shared URL manager to catch shared URLs early
    const sharedUrlSubscription = SharedUrlManager.initialize();
    
    return () => {
      subscription?.unsubscribe();
      urlSchemeSubscription?.();
      sharedUrlSubscription?.();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Stack.Navigator
          initialRouteName={user ? "Main" : "Welcome"}
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
          }}
        >
          {user ? (
            // Authenticated screens
            <>
              <Stack.Screen name="Main">
                {(props) => <HomeScreen {...props} user={user} />}
              </Stack.Screen>
              <Stack.Screen name="ManualInput">
                {(props) => <ManualInputScreen {...props} user={user} />}
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

export default App;
