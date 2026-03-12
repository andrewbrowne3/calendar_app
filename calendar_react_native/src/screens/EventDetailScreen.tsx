import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Event } from '../types';
import { COLORS, FONT_SIZES } from '../constants/config';
import { AppDispatch, RootState } from '../store/store';
import { deleteEvent, toggleEventCompletion } from '../store/slices/eventsSlice';

type EventDetailScreenRouteProp = RouteProp<{
  EventDetail: { event: Event };
}, 'EventDetail'>;

export const EventDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EventDetailScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { calendars } = useSelector((state: RootState) => state.calendars);

  const { events } = useSelector((state: RootState) => state.events);
  const routeEvent = route.params?.event;
  const event = events.find(e => e.id === routeEvent?.id) || routeEvent;

  if (!event) {
    Alert.alert('Error', 'Event not found');
    navigation.goBack();
    return null;
  }

  const calendar = calendars.find(c => c.id === event.calendar.id);

  const handleEdit = () => {
    navigation.navigate('EditEvent' as never, { event } as never);
  };

  const handleToggleCompletion = async () => {
    try {
      await dispatch(toggleEventCompletion(event.id)).unwrap();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to toggle completion');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteEvent(event.id)).unwrap();
              Alert.alert(
                'Success',
                'Event deleted successfully!',
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
                error.message || 'Failed to delete event. Please try again.'
              );
            }
          }
        },
      ]
    );
  };

  const formatDateTime = (dateTimeString: string, allDay: boolean): string => {
    const date = new Date(dateTimeString);
    
    if (allDay) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (): string => {
    if (event.all_day) {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 1 ? 'All day' : `${diffDays} days`;
    }
    
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const hours = Math.floor(diffTime / (1000 * 60 * 60));
    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'tentative':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return COLORS.TEXT.SECONDARY;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleEdit} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[styles.actionButton, styles.deleteButton]}>
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Title Section */}
        <View style={styles.section}>
          <Text style={styles.title}>{event.title}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
              <Text style={styles.statusText}>{event.status.toUpperCase()}</Text>
            </View>
            {event.is_private && (
              <View style={styles.privateBadge}>
                <Text style={styles.privateText}>PRIVATE</Text>
              </View>
            )}
          </View>
        </View>

        {/* Calendar Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar</Text>
          <View style={styles.calendarInfo}>
            <View style={[styles.calendarColor, { backgroundColor: calendar?.color || COLORS.PRIMARY }]} />
            <Text style={styles.calendarName}>{calendar?.name || 'Unknown Calendar'}</Text>
          </View>
        </View>

        {/* Date & Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.dateTimeInfo}>
            <Text style={styles.dateTimeLabel}>Starts:</Text>
            <Text style={styles.dateTimeValue}>
              {formatDateTime(event.start_time, event.all_day)}
            </Text>
          </View>
          <View style={styles.dateTimeInfo}>
            <Text style={styles.dateTimeLabel}>Ends:</Text>
            <Text style={styles.dateTimeValue}>
              {formatDateTime(event.end_time, event.all_day)}
            </Text>
          </View>
          <View style={styles.dateTimeInfo}>
            <Text style={styles.dateTimeLabel}>Duration:</Text>
            <Text style={styles.dateTimeValue}>{formatDuration()}</Text>
          </View>
        </View>

        {/* Description Section */}
        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        )}

        {/* Location Section */}
        {event.location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.location}>📍 {event.location}</Text>
          </View>
        )}

        {/* Creator Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Created By</Text>
          <Text style={styles.creator}>
            {event.creator.full_name || `${event.creator.first_name} ${event.creator.last_name}`}
          </Text>
          <Text style={styles.createdDate}>
            Created: {new Date(event.created_at).toLocaleString()}
          </Text>
          {event.updated_at !== event.created_at && (
            <Text style={styles.updatedDate}>
              Last updated: {new Date(event.updated_at).toLocaleString()}
            </Text>
          )}
        </View>

        {/* Completion Toggle */}
        <View style={styles.section}>
          <View style={styles.completionContainer}>
            <Text style={styles.sectionTitle}>Mark as Completed</Text>
            <Switch
              value={event.completed || false}
              onValueChange={handleToggleCompletion}
              trackColor={{ false: '#767577', true: COLORS.PRIMARY }}
              thumbColor={event.completed ? '#fff' : '#f4f3f4'}
            />
          </View>
          {event.completed && (
            <Text style={styles.completedText}>✅ This event has been completed</Text>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND.SECONDARY,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: FONT_SIZES.LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT.PRIMARY,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.SMALL,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: FONT_SIZES.SMALL,
    fontWeight: '600',
  },
  privateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.TEXT.SECONDARY,
  },
  privateText: {
    color: 'white',
    fontSize: FONT_SIZES.SMALL,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 12,
  },
  calendarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  calendarName: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  dateTimeInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dateTimeLabel: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    width: 80,
  },
  dateTimeValue: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    flex: 1,
  },
  description: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    lineHeight: 22,
  },
  location: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  creator: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  createdDate: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 2,
  },
  updatedDate: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.SECONDARY,
  },
  bottomSpacer: {
    height: 40,
  },
  completionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedText: {
    fontSize: FONT_SIZES.SMALL,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 8,
  },
});