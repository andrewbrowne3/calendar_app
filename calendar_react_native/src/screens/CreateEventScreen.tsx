import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { EventForm } from '../components/EventForm';
import { Event, NotificationStyle } from '../types';
import { AppDispatch } from '../store/store';
import { createEvent } from '../store/slices/eventsSlice';
import notificationService from '../services/notificationService';
import { logger } from '../utils/logger';

type CreateEventScreenRouteProp = RouteProp<{
  CreateEvent: { date?: string };
}, 'CreateEvent'>;

export const CreateEventScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CreateEventScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);

  const initialDate = route.params?.date;

  // Request notification permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      const hasPermission = await notificationService.checkPermissions();
      if (!hasPermission) {
        await notificationService.requestPermissions();
      }
    };
    requestPermissions();
  }, []);

  const handleSave = async (eventData: Partial<Event>, notificationStyle: NotificationStyle) => {
    try {
      setIsLoading(true);
      const createdEvent = await dispatch(createEvent(eventData)).unwrap();

      if (createdEvent) {
        // Save the notification style preference
        await notificationService.saveNotificationStyle(createdEvent.id, notificationStyle);
      }

      // Schedule notifications for the event
      if (createdEvent && eventData.reminder_minutes && eventData.reminder_minutes.length > 0) {
        logger.debug('CreateEventScreen: Scheduling notifications for event', createdEvent.id);
        const notificationIds = await notificationService.scheduleEventNotification(
          createdEvent,
          eventData.reminder_minutes,
          notificationStyle
        );
        logger.info('CreateEventScreen: Scheduled notifications', {
          eventId: createdEvent.id,
          notificationIds,
          reminderMinutes: eventData.reminder_minutes,
          notificationStyle,
        });
      }

      Alert.alert(
        'Success',
        'Event created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to create event. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <EventForm
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isLoading}
        initialDate={initialDate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});