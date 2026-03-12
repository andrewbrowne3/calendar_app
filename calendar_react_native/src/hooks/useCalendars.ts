// Calendar hook - Manage calendars
import { useState, useEffect, useCallback } from 'react';
import { Calendar } from '../types';
import apiService from '../services/api';

export const useCalendars = () => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load calendars from API
  const loadCalendars = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📅 Loading calendars...');
      const calendarsData = await apiService.getCalendars();
      setCalendars(calendarsData);
      
      console.log(`✅ Loaded ${calendarsData.length} calendars`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load calendars';
      setError(errorMessage);
      console.error('❌ Failed to load calendars:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new calendar
  const createCalendar = useCallback(async (calendarData: Partial<Calendar>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('➕ Creating calendar:', calendarData.name);
      const newCalendar = await apiService.createCalendar(calendarData);
      setCalendars(prev => [...prev, newCalendar]);
      
      console.log('✅ Calendar created:', newCalendar.name);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create calendar';
      setError(errorMessage);
      console.error('❌ Failed to create calendar:', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle calendar visibility
  const toggleCalendarVisibility = useCallback(async (calendarId: string): Promise<void> => {
    const calendar = calendars.find(c => c.id === calendarId);
    if (!calendar) return;

    const newVisibility = !calendar.is_visible;
    
    // Update UI immediately
    setCalendars(prev => prev.map(c => 
      c.id === calendarId 
        ? { ...c, is_visible: newVisibility }
        : c
    ));

    try {
      // Sync with backend
      await apiService.updateCalendar(calendarId, { is_visible: newVisibility });
      console.log('✅ Calendar visibility toggled');
    } catch (err) {
      // Revert on error
      setCalendars(prev => prev.map(c => 
        c.id === calendarId 
          ? { ...c, is_visible: !newVisibility }
          : c
      ));
      console.error('❌ Failed to toggle visibility:', err);
    }
  }, [calendars]);

  // Load calendars on mount
  useEffect(() => {
    loadCalendars();
  }, [loadCalendars]);

  return {
    calendars,
    visibleCalendars: calendars.filter(c => c.is_visible),
    isLoading,
    error,
    loadCalendars,
    createCalendar,
    toggleCalendarVisibility,
    clearError: () => setError(null),
  };
};