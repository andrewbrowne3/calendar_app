import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { EventForm } from '../components/EventForm';
import { Event, NotificationStyle } from '../types';
import { AppDispatch, RootState } from '../store/store';
import { updateEvent } from '../store/slices/eventsSlice';
import notificationService from '../services/notificationService';
import { logger } from '../utils/logger';

type EditEventScreenRouteProp = RouteProp<{
  EditEvent: { event: Event };
}, 'EditEvent'>;

export const EditEventScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EditEventScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const [isLoading, setIsLoading] = useState(false);

  const { events } = useSelector((state: RootState) => state.events);
  const routeEvent = route.params?.event;
  const event = events.find(e => e.id === routeEvent?.id) || routeEvent;

  if (!event) {
    Alert.alert('Error', 'Event not found');
    navigation.goBack();
    return null;
  }

  const handleSave = async (eventData: Partial<Event>, notificationStyle: NotificationStyle) => {
    try {
      setIsLoading(true);
      const updatedEvent = await dispatch(updateEvent({ eventId: event.id, updates: eventData })).unwrap();

      // Cancel old notifications and schedule new ones
      if (updatedEvent) {
        // Save the notification style preference
        await notificationService.saveNotificationStyle(updatedEvent.id, notificationStyle);

        // Cancel old notifications (using old reminder settings)
        if (event.reminder_minutes && event.reminder_minutes.length > 0) {
          logger.debug('EditEventScreen: Cancelling old notifications for event', event.id);
          await notificationService.cancelEventNotifications(event.id, event.reminder_minutes);
        }

        // Schedule new notifications with the chosen style
        if (eventData.reminder_minutes && eventData.reminder_minutes.length > 0) {
          logger.debug('EditEventScreen: Scheduling new notifications for event', updatedEvent.id);
          const notificationIds = await notificationService.scheduleEventNotification(
            updatedEvent,
            eventData.reminder_minutes,
            notificationStyle
          );
          logger.info('EditEventScreen: Rescheduled notifications', {
            eventId: updatedEvent.id,
            notificationIds,
            reminderMinutes: eventData.reminder_minutes,
            notificationStyle,
          });
        }
      }

      Alert.alert(
        'Success',
        'Event updated successfully!',
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
        error.message || 'Failed to update event. Please try again.'
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
        event={event}
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});