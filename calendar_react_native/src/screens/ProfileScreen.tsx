// Profile Screen - User settings and info
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { COLORS, FONT_SIZES } from '../constants/config';
import { RootState, AppDispatch } from '../store/store';
import { logoutUser } from '../store/slices/authSlice';
import notificationService from '../services/notificationService';

export const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  const handleNotificationSettings = async () => {
    try {
      const hasPermission = await notificationService.checkPermissions();
      const scheduledNotifications = await notificationService.getScheduledNotifications();

      const permissionStatus = hasPermission ? '✅ Enabled' : '❌ Disabled';
      const notificationCount = scheduledNotifications.length;

      Alert.alert(
        'Notification Settings',
        `Status: ${permissionStatus}\n\nScheduled Reminders: ${notificationCount}`,
        [
          {
            text: 'Test Notification',
            onPress: async () => {
              await notificationService.displayNotification(
                'Test Notification',
                'This is a test notification from your Calendar app! 🎉'
              );
            },
          },
          {
            text: hasPermission ? 'View Scheduled' : 'Enable Notifications',
            onPress: async () => {
              if (!hasPermission) {
                const granted = await notificationService.requestPermissions();
                if (granted) {
                  Alert.alert('Success', 'Notifications enabled!');
                } else {
                  Alert.alert(
                    'Permission Required',
                    'Please enable notifications in your device settings.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Open Settings',
                        onPress: () => Linking.openSettings(),
                      },
                    ]
                  );
                }
              } else {
                // Show scheduled notifications details
                if (notificationCount > 0) {
                  const details = scheduledNotifications
                    .slice(0, 10)
                    .map((n: any, i: number) => {
                      const time = new Date(n.trigger.timestamp).toLocaleString();
                      return `${i + 1}. ${n.notification.title || 'Event'} - ${time}`;
                    })
                    .join('\n\n');

                  Alert.alert(
                    `Scheduled Notifications (${notificationCount})`,
                    details + (notificationCount > 10 ? '\n\n...and more' : ''),
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert('No Scheduled Notifications', 'Create events with reminders to schedule notifications!');
                }
              }
            },
          },
          { text: 'Close', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Failed to check notification settings:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Starting Redux logout process...');
              await dispatch(logoutUser());
              console.log('✅ Redux logout completed successfully');
            } catch (error: any) {
              console.error('❌ Redux logout failed:', error);
              Alert.alert('Logout Error', error.message || 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Account Settings',
      icon: '⚙️',
      onPress: () => console.log('Account settings'),
    },
    {
      title: 'Notifications',
      icon: '🔔',
      onPress: handleNotificationSettings,
    },
    {
      title: 'Privacy',
      icon: '🔒',
      onPress: () => console.log('Privacy'),
    },
    {
      title: 'Help & Support',
      icon: '❓',
      onPress: () => console.log('Help'),
    },
    {
      title: 'About',
      icon: 'ℹ️',
      onPress: () => console.log('About'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* User Info */}
      <View style={styles.userSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        
        <Text style={styles.userName}>
          {user?.email || 'Unknown User'}
        </Text>
        
        <Text style={styles.userEmail}>
          {user?.email || 'No email'}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Goals Created</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Goals Completed</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Events Created</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuTitle}>{item.title}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>Calendar App v1.0.0</Text>
        <Text style={styles.appDescription}>
          Built with React Native & TypeScript
        </Text>
      </View>

      {/* Logout Button */}
      <TouchableOpacity 
        style={[styles.logoutButton, isLoading && styles.disabledButton]} 
        onPress={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? (
          <View style={styles.logoutLoading}>
            <ActivityIndicator color="white" size="small" />
            <Text style={[styles.logoutButtonText, { marginLeft: 8 }]}>
              Logging out...
            </Text>
          </View>
        ) : (
          <Text style={styles.logoutButtonText}>Logout</Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },

  userSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.BACKGROUND.CARD,
    marginBottom: 24,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  avatarText: {
    color: 'white',
    fontSize: FONT_SIZES.TITLE,
    fontWeight: 'bold',
  },

  userName: {
    fontSize: FONT_SIZES.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },

  userEmail: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },

  statsSection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statNumber: {
    fontSize: FONT_SIZES.LARGE,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
  },

  menuSection: {
    marginHorizontal: 16,
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    marginBottom: 24,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND.SECONDARY,
  },

  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  menuTitle: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    fontWeight: '500',
  },

  menuArrow: {
    fontSize: 20,
    color: COLORS.TEXT.SECONDARY,
  },

  appInfo: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },

  appVersion: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 4,
  },

  appDescription: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.SECONDARY,
  },

  logoutButton: {
    marginHorizontal: 16,
    backgroundColor: COLORS.ERROR,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  logoutButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: '600',
  },

  disabledButton: {
    opacity: 0.6,
  },

  logoutLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomPadding: {
    height: 24,
  },
});