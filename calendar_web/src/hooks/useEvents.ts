import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useAppDispatch';
import {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventCompletion,
  clearError,
  type CreateEventData,
} from '../store/slices/eventsSlice';
import type { Event } from '../types';

export const useEvents = () => {
  const dispatch = useAppDispatch();
  const { events, isLoading, error } = useAppSelector((state) => state.events);

  const loadEvents = useCallback(
    async (params?: { startDate?: string; endDate?: string; calendarId?: string }) => {
      return dispatch(fetchEvents(params || {})).unwrap();
    },
    [dispatch]
  );

  const addEvent = useCallback(
    async (eventData: CreateEventData) => {
      return dispatch(createEvent(eventData)).unwrap();
    },
    [dispatch]
  );

  const editEvent = useCallback(
    async (eventId: string, updates: Partial<Event>) => {
      return dispatch(updateEvent({ eventId, updates })).unwrap();
    },
    [dispatch]
  );

  const removeEvent = useCallback(
    async (eventId: string) => {
      return dispatch(deleteEvent(eventId)).unwrap();
    },
    [dispatch]
  );

  const toggleCompletion = useCallback(
    async (eventId: string) => {
      return dispatch(toggleEventCompletion(eventId)).unwrap();
    },
    [dispatch]
  );

  const clearEventsError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    events,
    isLoading,
    error,
    loadEvents,
    addEvent,
    editEvent,
    removeEvent,
    toggleCompletion,
    clearEventsError,
  };
};

export default useEvents;
