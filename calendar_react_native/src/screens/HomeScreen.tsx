// Home Screen - Calendar view with events
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONT_SIZES } from '../constants/config';
import { Event } from '../types';
import { logger } from '../utils/logger';
import { RootState, AppDispatch } from '../store/store';
import { fetchEvents, deleteEvent } from '../store/slices/eventsSlice';
import { fetchCalendars } from '../store/slices/calendarsSlice';

export const HomeScreen: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();

  const { events, isLoading: eventsLoading } = useSelector((state: RootState) => state.events);
  const { calendars, isLoading: calendarsLoading } = useSelector((state: RootState) => state.calendars);

  // Initialize data loading like Flutter does
  useEffect(() => {
    logger.debug('HomeScreen: Component mounted, loading events...');
    logger.debug('HomeScreen: Current events count:', events.length);
    logger.debug('HomeScreen: Current calendars count:', calendars.length);

    // Load events and calendars with Redux
    dispatch(fetchEvents());
    dispatch(fetchCalendars());
  }, [dispatch]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchEvents()).unwrap(),
        dispatch(fetchCalendars()).unwrap(),
      ]);
      logger.debug('HomeScreen: Refresh completed');
    } catch (error) {
      logger.error('HomeScreen: Refresh failed', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    const selectedDateObj = new Date(selectedDate);
    const dateString = selectedDateObj.toISOString().split('T')[0];
    
    const filteredEvents = events.filter(event => {
      const eventDate = new Date(event.start_time).toISOString().split('T')[0];
      return eventDate === dateString;
    });
    
    logger.debug('HomeScreen: Events for date', selectedDate, 'Total events:', events.length, 'Filtered:', filteredEvents.length);
    return filteredEvents;
  }, [selectedDate, events]);

  // Get events grouped by date (for calendar markers)
  const eventsByDate = useMemo(() => {
    const grouped: { [date: string]: Event[] } = {};
    
    events.forEach(event => {
      const date = new Date(event.start_time).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    
    return grouped;
  }, [events]);

  // Prepare marked dates for calendar
  const markedDates = useMemo(() => {
    const marks: any = {};
    
    // Mark all dates with events
    Object.keys(eventsByDate).forEach(date => {
      const dayEvents = eventsByDate[date];
      marks[date] = {
        marked: true,
        dots: dayEvents.slice(0, 3).map((event, index) => {
          const calendar = calendars.find(c => c.id === event.calendar.id);
          return {
            key: `event-${index}`,
            color: calendar?.color || COLORS.PRIMARY,
          };
        }),
      };
    });
    
    // Mark selected date
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: COLORS.PRIMARY,
    };
    
    return marks;
  }, [selectedDate, eventsByDate, calendars]);

  const getCalendarColor = (calendarId: string): string => {
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar?.color || COLORS.PRIMARY;
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetail' as never, { event } as never);
  };

  const handleDeleteEvent = (event: Event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => dispatch(deleteEvent(event.id))
        },
      ]
    );
  };

  const handleCreateEvent = () => {
    navigation.navigate('CreateEvent' as never, { date: selectedDate } as never);
  };

  const formatEventTime = (event: Event): string => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    
    if (event.all_day) return 'All day';
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    };
    
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const renderEventCard = (event: Event) => {
    const calendar = calendars.find(c => c.id === event.calendar.id);
    const calendarColor = calendar?.color || COLORS.PRIMARY;
    
    return (
      <TouchableOpacity
        key={event.id}
        style={[styles.eventCard, { borderLeftColor: calendarColor }]}
        onPress={() => handleEventPress(event)}
      >
        <View style={styles.eventTime}>
          <Text style={[
            styles.eventTimeText,
            event.completed && styles.completedText
          ]}>
            {formatEventTime(event)}
          </Text>
        </View>
        
        <View style={styles.eventContent}>
          <Text style={[
            styles.eventTitle,
            event.completed && styles.completedText
          ]} numberOfLines={1}>
            {event.title}
          </Text>
          {event.location && (
            <Text style={[
              styles.eventLocation,
              event.completed && styles.completedText
            ]} numberOfLines={1}>
              📍 {event.location}
            </Text>
          )}
          <Text style={[
            styles.eventCalendar, 
            { color: calendarColor },
            event.completed && styles.completedText
          ]}>
            {calendar?.name || 'Unknown Calendar'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (eventsLoading || calendarsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Refresh Button */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity
          onPress={onRefresh}
          disabled={refreshing}
          style={styles.refreshButton}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          ) : (
            <Text style={styles.refreshIcon}>↻</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        {/* Calendar Component */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            onDayPress={handleDayPress}
            markedDates={markedDates}
            markingType={'multi-dot'}
            theme={{
              backgroundColor: COLORS.BACKGROUND.PRIMARY,
              calendarBackground: COLORS.BACKGROUND.CARD,
              selectedDayBackgroundColor: COLORS.PRIMARY,
              selectedDayTextColor: 'white',
              todayTextColor: COLORS.PRIMARY,
              dayTextColor: COLORS.TEXT.PRIMARY,
              textDisabledColor: COLORS.TEXT.DISABLED,
              dotColor: COLORS.PRIMARY,
              arrowColor: COLORS.PRIMARY,
              monthTextColor: COLORS.TEXT.PRIMARY,
              textDayFontWeight: '400',
              textMonthFontWeight: '600',
              textDayHeaderFontWeight: '500',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>

        {/* Selected Date Header */}
        <View style={styles.dateHeader}>
          <Text style={styles.dateTitle}>
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <Text style={styles.eventCount}>
            {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'event' : 'events'}
          </Text>
        </View>

        {/* Events List */}
        <View style={styles.eventsContainer}>
          {selectedDateEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No events</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to create an event for this date
              </Text>
            </View>
          ) : (
            selectedDateEvents.map(renderEventCard)
          )}
        </View>
      </ScrollView>

      {/* Create Event FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateEvent}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },

  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND.SECONDARY,
  },

  headerTitle: {
    fontSize: FONT_SIZES.TITLE,
    fontWeight: '700',
    color: COLORS.TEXT.PRIMARY,
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
  },

  refreshIcon: {
    fontSize: 24,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },

  loadingText: {
    marginTop: 12,
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },

  calendarContainer: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    margin: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },

  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  dateTitle: {
    fontSize: FONT_SIZES.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },

  eventCount: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 4,
  },

  eventsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  eventCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  eventTime: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },

  eventTimeText: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
  },

  eventContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
  },

  eventTitle: {
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },

  eventLocation: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 4,
  },

  eventCalendar: {
    fontSize: FONT_SIZES.SMALL,
    fontWeight: '500',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },

  emptyTitle: {
    fontSize: FONT_SIZES.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  fabIcon: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },

  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});