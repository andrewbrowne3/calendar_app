import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Event } from '../../types';
import apiService from '../../api/apiService';

interface EventsState {
  events: Event[];
  isLoading: boolean;
  error: string | null;
}

const initialState: EventsState = {
  events: [],
  isLoading: false,
  error: null,
};

export const fetchEvents = createAsyncThunk(
  'events/fetchEvents',
  async (
    params: { startDate?: string; endDate?: string; calendarId?: string } = {},
    { rejectWithValue }
  ) => {
    try {
      const events = await apiService.getEvents(
        params.startDate,
        params.endDate,
        params.calendarId
      );
      return events;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch events';
      return rejectWithValue(message);
    }
  }
);

export interface CreateEventData {
  title: string;
  description?: string;
  calendar: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  location?: string;
}

export const createEvent = createAsyncThunk(
  'events/createEvent',
  async (eventData: CreateEventData, { rejectWithValue }) => {
    try {
      const newEvent = await apiService.createEvent(eventData as any);
      return newEvent;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create event';
      return rejectWithValue(message);
    }
  }
);

export const updateEvent = createAsyncThunk(
  'events/updateEvent',
  async (
    { eventId, updates }: { eventId: string; updates: Partial<Event> },
    { rejectWithValue }
  ) => {
    try {
      const updatedEvent = await apiService.updateEvent(eventId, updates);
      return updatedEvent;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update event';
      return rejectWithValue(message);
    }
  }
);

export const deleteEvent = createAsyncThunk(
  'events/deleteEvent',
  async (eventId: string, { rejectWithValue }) => {
    try {
      await apiService.deleteEvent(eventId);
      return eventId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete event';
      return rejectWithValue(message);
    }
  }
);

export const toggleEventCompletion = createAsyncThunk(
  'events/toggleCompletion',
  async (eventId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { events: EventsState };
      const event = state.events.events.find((e) => e.id === eventId);
      if (!event) throw new Error('Event not found');

      const newCompletedStatus = !event.completed;
      const updatedEvent = await apiService.updateEvent(eventId, {
        completed: newCompletedStatus,
      });
      return updatedEvent;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to toggle completion';
      return rejectWithValue(message);
    }
  }
);

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearEvents: (state) => {
      state.events = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.events = action.payload;
        state.error = null;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.events.push(action.payload);
        state.error = null;
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex((event) => event.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
      })
      .addCase(updateEvent.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter((event) => event.id !== action.payload);
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(toggleEventCompletion.fulfilled, (state, action) => {
        const index = state.events.findIndex((event) => event.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
      })
      .addCase(toggleEventCompletion.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearEvents } = eventsSlice.actions;
export default eventsSlice.reducer;
