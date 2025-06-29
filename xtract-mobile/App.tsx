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
import { URLSchemeService } from './src/services/urlScheme';

const Stack = createStackNavigator<RootStackParamList>();

// Wrapper component for HomeScreen that handles user authentication
const MainScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser as User);
        } else {
          // No authenticated user, redirect to welcome
          navigation.replace('Welcome');
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        navigation.replace('Welcome');
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();

    // Set up auth state listener
    const { data: { subscription } } = AuthService.onAuthStateChange((authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
        navigation.replace('Welcome');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigation]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    // Should not happen, but fallback to welcome screen
    navigation.replace('Welcome');
    return null;
  }

  return <HomeScreen navigation={navigation} user={user} />;
};

// Wrapper for other screens that need user
const ScreenWrapper: React.FC<{ 
  Component: React.ComponentType<any>, 
  navigation: any,
  route: any 
}> = ({ Component, navigation, route }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser as User);
        } else {
          navigation.replace('Welcome');
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        navigation.replace('Welcome');
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();

    // Set up auth state listener
    const { data: { subscription } } = AuthService.onAuthStateChange((authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
        navigation.replace('Welcome');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigation]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return <Component navigation={navigation} route={route} user={user} />;
};

// Separate components to avoid inline functions
const ManualInputScreenWrapper: React.FC<any> = (props) => (
  <ScreenWrapper Component={ManualInputScreen} {...props} />
);

const SettingsScreenWrapper: React.FC<any> = (props) => (
  <ScreenWrapper Component={SettingsScreen} {...props} />
);

function App(): React.JSX.Element {
  useEffect(() => {
    // Initialize URL scheme handling
    const subscription = URLSchemeService.initialize();
    
    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen 
            name="ManualInput" 
            component={ManualInputScreenWrapper} 
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreenWrapper} 
          />
          <Stack.Screen name="AudioPlayer" component={AudioPlayerScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
