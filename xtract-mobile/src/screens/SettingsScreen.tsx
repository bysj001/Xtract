import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components';
import { colors, transparentColors } from '../styles/colors';
import { AuthService } from '../services/supabase';

interface SettingsScreenProps {
  navigation: any;
  route: any;
  user: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, route, user }) => {
  const [notifications, setNotifications] = useState(true);
  const [autoProcess, setAutoProcess] = useState(true);
  const [highQuality, setHighQuality] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.signOut();
              navigation.navigate('Welcome');
                } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your audio files and data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Type "DELETE" to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                // In a real app, you'd implement proper account deletion
                { text: 'Confirm', style: 'destructive' }
              ]
            );
          }
        }
      ]
    );
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://xtract.app/privacy');
  };

  const openTermsOfService = () => {
    Linking.openURL('https://xtract.app/terms');
  };

  const openSupport = () => {
    Linking.openURL('mailto:support@xtract.app');
  };

  const SettingItem = ({ 
    title, 
    subtitle, 
    onPress, 
    rightComponent,
    showArrow = false 
  }: {
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent}
      {showArrow && <Text style={styles.arrow}>›</Text>}
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={[colors.background, colors.backgroundLight]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <View style={styles.accountCard}>
              <LinearGradient
                colors={[transparentColors.primary20, transparentColors.secondary20]}
                style={styles.accountGradient}
              >
                <View style={styles.accountInfo}>
                  <Text style={styles.accountEmail}>{user?.email}</Text>
                  <Text style={styles.accountStatus}>Premium Account</Text>
                </View>
              </LinearGradient>
            </View>

            <SettingItem
              title="Manage Subscription"
              subtitle="View billing and upgrade options"
              onPress={() => {/* Navigate to subscription management */}}
              showArrow
            />
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            
            <SettingItem
              title="Push Notifications"
              subtitle="Get notified when processing completes"
              rightComponent={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: transparentColors.textSecondary30, true: transparentColors.primary50 }}
                  thumbColor={notifications ? colors.primary : colors.textSecondary}
                />
              }
            />

            <SettingItem
              title="Auto-Process Shared Videos"
              subtitle="Automatically start processing when sharing videos"
              rightComponent={
                <Switch
                  value={autoProcess}
                  onValueChange={setAutoProcess}
                  trackColor={{ false: transparentColors.textSecondary30, true: transparentColors.primary50 }}
                  thumbColor={autoProcess ? colors.primary : colors.textSecondary}
                />
              }
            />

            <SettingItem
              title="High Quality Audio"
              subtitle="Use higher bitrate for better quality (uses more storage)"
              rightComponent={
                <Switch
                  value={highQuality}
                  onValueChange={setHighQuality}
                  trackColor={{ false: transparentColors.textSecondary30, true: transparentColors.primary50 }}
                  thumbColor={highQuality ? colors.primary : colors.textSecondary}
                />
              }
            />
          </View>

          {/* Storage Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storage</Text>
            
            <SettingItem
              title="Clear Cache"
              subtitle="Free up space by clearing temporary files"
              onPress={() => Alert.alert('Cache Cleared', 'Temporary files have been removed.')}
              showArrow
            />

            <SettingItem
              title="Storage Usage"
              subtitle="View how much space your audio files are using"
              onPress={() => {/* Navigate to storage details */}}
              showArrow
            />
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            
            <SettingItem
              title="Help & FAQ"
              onPress={() => {/* Navigate to help */}}
              showArrow
            />

            <SettingItem
              title="Contact Support"
              onPress={openSupport}
              showArrow
            />

            <SettingItem
              title="Privacy Policy"
              onPress={openPrivacyPolicy}
              showArrow
            />

            <SettingItem
              title="Terms of Service"
              onPress={openTermsOfService}
              showArrow
            />
          </View>

          {/* App Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App Info</Text>
            
            <SettingItem
              title="Version"
              subtitle="1.0.0"
            />

            <SettingItem
              title="Build"
              subtitle="2024.01.15"
            />
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Actions</Text>
            
            <View style={styles.dangerZone}>
              <Button
                title="Sign Out"
                onPress={handleSignOut}
                style={styles.signOutButton}
                textStyle={styles.signOutText}
              />

              <Button
                title="Delete Account"
                onPress={handleDeleteAccount}
                style={styles.deleteButton}
                textStyle={styles.deleteText}
              />
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 28,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
  },
  accountCard: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  accountGradient: {
    padding: 20,
  },
  accountInfo: {
    alignItems: 'center',
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  accountStatus: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: transparentColors.surface40,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  arrow: {
    fontSize: 20,
    color: colors.textSecondary,
    marginLeft: 10,
  },
  dangerZone: {
    gap: 12,
  },
  signOutButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: transparentColors.textSecondary50,
  },
  signOutText: {
    color: colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  deleteText: {
    color: '#ff6b6b',
  },
}); 