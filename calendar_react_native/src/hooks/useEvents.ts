// Events hook - Manage calendar events
import { useState, useEffect, useCallback } from 'react';
import { Event } from '../types';
import apiService from '../services/api';

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load events from API
  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📆 Loading events...');
      const eventsData = await apiService.getEvents();
      console.log('🔥 RAW EVENTS DATA:', JSON.stringify(eventsData, null, 2));
      setEvents(eventsData);
      
      console.log(`✅ Loaded ${eventsData.length} events`);
      eventsData.forEach((event, index) => {
        console.log(`Event ${index + 1}: ${event.title} on ${event.start_time}`);
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load events';
      setError(errorMessage);
      console.error('❌ Failed to load events:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new event
  const createEvent = useCallback(async (eventData: Partial<Event>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('➕ Creating event:', eventData.title);
      const newEvent = await apiService.createEvent(eventData);
      setEvents(prev => [...prev, newEvent]);
      
      console.log('✅ Event created:', newEvent.title);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create event';
      setError(errorMessage);
      console.error('❌ Failed to create event:', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update event
  const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>): Promise<void> => {
    try {
      console.log('✏️ Updating event:', eventId);
      const updatedEvent = await apiService.updateEvent(eventId, updates);
      
      setEvents(prev => prev.map(event => 
        event.id === eventId ? updatedEvent : event
      ));
      
      console.log('✅ Event updated:', updatedEvent.title);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update event';
      setError(errorMessage);
      console.error('❌ Failed to update event:', errorMessage);
      throw err;
    }
  }, []);

  // Delete event
  const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🗑️ Deleting event:', eventId);
      await apiService.deleteEvent(eventId);
      setEvents(prev => prev.filter(event => event.id !== eventId));
      
      console.log('✅ Event deleted');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete event';
      setError(errorMessage);
      console.error('❌ Failed to delete event:', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date): Event[] => {
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.start_time).toISOString().split('T')[0];
      return eventDate === dateString;
    });
  }, [events]);

  // Get events grouped by date (for calendar markers)
  const getEventsByDate = useCallback(() => {
    const eventsByDate: { [date: string]: Event[] } = {};
    
    events.forEach(event => {
      const date = new Date(event.start_time).toISOString().split('T')[0];
      if (!eventsByDate[date]) {
        eventsByDate[date] = [];
      }
      eventsByDate[date].push(event);
    });
    
    return eventsByDate;
  }, [events]);

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    isLoading,
    error,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getEventsByDate,
    clearError: () => setError(null),
  };
};