import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
  EventType,
  AuthorizationStatus
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event, NotificationStyle } from '../types';
import { STORAGE_KEYS } from '../constants/config';
import { logger } from '../utils/logger';

export interface NotificationSettings {
  enabled: boolean;
  defaultReminderMinutes: number[];
  sound: boolean;
  vibration: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  defaultReminderMinutes: [15],
  sound: true,
  vibration: true,
};

// Channel configurations for each notification style
const CHANNELS = {
  normal: {
    id: 'calendar-events-normal',
    name: 'Calendar Events - Normal',
    description: 'Standard calendar event notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  },
  urgent: {
    id: 'calendar-events-urgent',
    name: 'Calendar Events - Urgent',
    description: 'High-priority alarm-style notifications for important events',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [0, 500, 200, 500, 200, 500],
  },
  silent: {
    id: 'calendar-events-silent',
    name: 'Calendar Events - Silent',
    description: 'Visual-only notifications with no sound or vibration',
    importance: AndroidImportance.LOW,
    vibration: false,
  },
} as const;

class NotificationService {
  private initialized = false;

  /**
   * Initialize the notification service
   * Creates notification channels and sets up handlers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('NotificationService: Already initialized');
      return;
    }

    try {
      // Create all notification channels
      await Promise.all([
        notifee.createChannel({
          id: CHANNELS.normal.id,
          name: CHANNELS.normal.name,
          description: CHANNELS.normal.description,
          importance: CHANNELS.normal.importance,
          sound: 'default',
          vibration: true,
        }),
        notifee.createChannel({
          id: CHANNELS.urgent.id,
          name: CHANNELS.urgent.name,
          description: CHANNELS.urgent.description,
          importance: CHANNELS.urgent.importance,
          sound: 'default',
          vibration: true,
          vibrationPattern: [0, 500, 200, 500, 200, 500],
        }),
        notifee.createChannel({
          id: CHANNELS.silent.id,
          name: CHANNELS.silent.name,
          description: CHANNELS.silent.description,
          importance: CHANNELS.silent.importance,
          vibration: false,
        }),
      ]);

      // Delete old single channel from previous version
      try {
        await notifee.deleteChannel('calendar-events');
      } catch {
        // Ignore if it doesn't exist
      }

      // Set up foreground event handler
      notifee.onForegroundEvent(({ type, detail }) => {
        logger.debug('NotificationService: Foreground event', type, detail);

        if (type === EventType.PRESS) {
          const eventId = detail.notification?.data?.eventId;
          logger.debug('NotificationService: Notification pressed for event', eventId);
        }
      });

      this.initialized = true;
      logger.info('NotificationService: Initialized successfully with 3 channels');
    } catch (error) {
      logger.error('NotificationService: Initialization failed', error);
      throw error;
    }
  }

  /**
   * Request notification permissions from user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const settings = await notifee.requestPermission();

      const granted = settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
      logger.info('NotificationService: Permission request result', granted);

      return granted;
    } catch (error) {
      logger.error('NotificationService: Permission request failed', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const settings = await notifee.getNotificationSettings();
      return settings.authorizationStatus === AuthorizationStatus.AUTHORIZED;
    } catch (error) {
      logger.error('NotificationService: Permission check failed', error);
      return false;
    }
  }

  /**
   * Save notification style preference for an event
   */
  async saveNotificationStyle(eventId: string, style: NotificationStyle): Promise<void> {
    const key = `${STORAGE_KEYS.NOTIFICATION_STYLE_PREFIX}${eventId}`;
    await AsyncStorage.setItem(key, style);
    logger.debug('NotificationService: Saved notification style', { eventId, style });
  }

  /**
   * Get saved notification style for an event (defaults to 'normal')
   */
  async getNotificationStyle(eventId: string): Promise<NotificationStyle> {
    const key = `${STORAGE_KEYS.NOTIFICATION_STYLE_PREFIX}${eventId}`;
    const style = await AsyncStorage.getItem(key);
    return (style as NotificationStyle) || 'normal';
  }

  /**
   * Remove saved notification style for an event
   */
  async removeNotificationStyle(eventId: string): Promise<void> {
    const key = `${STORAGE_KEYS.NOTIFICATION_STYLE_PREFIX}${eventId}`;
    await AsyncStorage.removeItem(key);
  }

  /**
   * Get channel ID and android notification overrides for a style
   */
  private getNotificationConfig(style: NotificationStyle) {
    switch (style) {
      case 'urgent':
        return {
          channelId: CHANNELS.urgent.id,
          androidOverrides: {
            importance: AndroidImportance.HIGH,
            loopSound: true,
            vibrationPattern: [0, 500, 200, 500, 200, 500],
          },
        };
      case 'silent':
        return {
          channelId: CHANNELS.silent.id,
          androidOverrides: {
            importance: AndroidImportance.LOW,
          },
        };
      case 'normal':
      default:
        return {
          channelId: CHANNELS.normal.id,
          androidOverrides: {
            importance: AndroidImportance.HIGH,
          },
        };
    }
  }

  /**
   * Schedule notification(s) for an event
   * @param event - The event to schedule notifications for
   * @param reminderMinutes - Array of minutes before event to send reminders
   * @param notificationStyle - Optional style override; if not provided, looks up from AsyncStorage
   */
  async scheduleEventNotification(
    event: Event,
    reminderMinutes: number[] = DEFAULT_SETTINGS.defaultReminderMinutes,
    notificationStyle?: NotificationStyle
  ): Promise<string[]> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        logger.warn('NotificationService: No permission to schedule notification');
        return [];
      }

      // Resolve notification style
      const style = notificationStyle || await this.getNotificationStyle(event.id);
      const config = this.getNotificationConfig(style);

      const eventStartTime = new Date(event.start_time);
      const now = new Date();
      const notificationIds: string[] = [];

      // Schedule a notification for each reminder time
      for (const minutes of reminderMinutes) {
        const notificationTime = new Date(eventStartTime.getTime() - minutes * 60 * 1000);

        // Skip if notification time is in the past
        if (notificationTime <= now) {
          logger.debug('NotificationService: Skipping past notification', {
            eventId: event.id,
            notificationTime: notificationTime.toISOString(),
            minutes,
          });
          continue;
        }

        // Create trigger
        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: notificationTime.getTime(),
        };

        // Format notification body
        const timeStr = event.all_day
          ? 'All day event'
          : eventStartTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });

        const reminderText = this.getReminderText(minutes);
        const body = event.location
          ? `${timeStr} • ${event.location}\n${reminderText}`
          : `${timeStr}\n${reminderText}`;

        // Schedule notification with style-specific config
        const notificationId = await notifee.createTriggerNotification(
          {
            id: `event-${event.id}-${minutes}`,
            title: event.title,
            body: body,
            data: {
              eventId: event.id,
              reminderMinutes: minutes.toString(),
              notificationStyle: style,
            },
            android: {
              channelId: config.channelId,
              ...config.androidOverrides,
              pressAction: {
                id: 'default',
                launchActivity: 'default',
              },
              smallIcon: 'ic_launcher',
              color: event.calendar.color || '#007AFF',
              showTimestamp: true,
              timestamp: eventStartTime.getTime(),
            },
          },
          trigger
        );

        notificationIds.push(notificationId);

        logger.info('NotificationService: Scheduled notification', {
          eventId: event.id,
          notificationId,
          notificationTime: notificationTime.toISOString(),
          reminderMinutes: minutes,
          style,
        });
      }

      return notificationIds;
    } catch (error) {
      logger.error('NotificationService: Failed to schedule notification', error);
      return [];
    }
  }

  /**
   * Cancel all notifications for an event
   */
  async cancelEventNotifications(eventId: string, reminderMinutes?: number[]): Promise<void> {
    try {
      const minutesToCancel = reminderMinutes || DEFAULT_SETTINGS.defaultReminderMinutes;

      for (const minutes of minutesToCancel) {
        const notificationId = `event-${eventId}-${minutes}`;
        await notifee.cancelNotification(notificationId);
        logger.info('NotificationService: Cancelled notification', { eventId, notificationId });
      }
    } catch (error) {
      logger.error('NotificationService: Failed to cancel notification', error);
    }
  }

  /**
   * Update notifications for an event (cancel old ones and schedule new ones)
   */
  async updateEventNotifications(
    event: Event,
    reminderMinutes: number[] = DEFAULT_SETTINGS.defaultReminderMinutes,
    notificationStyle?: NotificationStyle
  ): Promise<string[]> {
    try {
      await this.cancelEventNotifications(event.id, reminderMinutes);
      return await this.scheduleEventNotification(event, reminderMinutes, notificationStyle);
    } catch (error) {
      logger.error('NotificationService: Failed to update notifications', error);
      return [];
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<any[]> {
    try {
      const notifications = await notifee.getTriggerNotifications();
      logger.debug('NotificationService: Scheduled notifications', notifications.length);
      return notifications;
    } catch (error) {
      logger.error('NotificationService: Failed to get scheduled notifications', error);
      return [];
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
      logger.info('NotificationService: Cancelled all notifications');
    } catch (error) {
      logger.error('NotificationService: Failed to cancel all notifications', error);
    }
  }

  /**
   * Format reminder text based on minutes
   */
  private getReminderText(minutes: number): string {
    if (minutes < 60) {
      return `Reminder: ${minutes} minute${minutes !== 1 ? 's' : ''} before`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `Reminder: ${hours} hour${hours !== 1 ? 's' : ''} before`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `Reminder: ${days} day${days !== 1 ? 's' : ''} before`;
    }
  }

  /**
   * Display an immediate notification (for testing or immediate alerts)
   */
  async displayNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId: CHANNELS.normal.id,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
          smallIcon: 'ic_launcher',
        },
      });

      logger.info('NotificationService: Displayed immediate notification');
    } catch (error) {
      logger.error('NotificationService: Failed to display notification', error);
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
