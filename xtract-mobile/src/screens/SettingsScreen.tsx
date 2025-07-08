import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowBackIcon, Icon } from '../components';
import { colors, transparentColors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { AuthService } from '../services/supabase';

interface SettingsScreenProps {
  navigation: any;
  route: any;
  user: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, route, user }) => {
  const insets = useSafeAreaInsets();

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
      {showArrow && <Icon name="chevron-forward" size={20} color={colors.textSecondary} />}
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
            <ArrowBackIcon size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
              >
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.deleteText}>Delete Account</Text>
              </TouchableOpacity>
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
    padding: 0,
  },
  accountInfo: {
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 20,
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 22,
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
    backgroundColor: colors.backgroundCard,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b6b',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30, // Simple padding for iOS
  },
}); 