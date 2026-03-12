import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Calendar } from '../../types';
import apiService from '../../api/apiService';

interface CalendarsState {
  calendars: Calendar[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CalendarsState = {
  calendars: [],
  isLoading: false,
  error: null,
};

export const fetchCalendars = createAsyncThunk(
  'calendars/fetchCalendars',
  async (_, { rejectWithValue }) => {
    try {
      const calendars = await apiService.getCalendars();
      return calendars;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch calendars';
      return rejectWithValue(message);
    }
  }
);

export const createCalendar = createAsyncThunk(
  'calendars/createCalendar',
  async (calendarData: Partial<Calendar>, { rejectWithValue }) => {
    try {
      const newCalendar = await apiService.createCalendar(calendarData);
      return newCalendar;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create calendar';
      return rejectWithValue(message);
    }
  }
);

export const updateCalendar = createAsyncThunk(
  'calendars/updateCalendar',
  async (
    { calendarId, updates }: { calendarId: string; updates: Partial<Calendar> },
    { rejectWithValue }
  ) => {
    try {
      const updatedCalendar = await apiService.updateCalendar(calendarId, updates);
      return updatedCalendar;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update calendar';
      return rejectWithValue(message);
    }
  }
);

export const deleteCalendar = createAsyncThunk(
  'calendars/deleteCalendar',
  async (calendarId: string, { rejectWithValue }) => {
    try {
      await apiService.deleteCalendar(calendarId);
      return calendarId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete calendar';
      return rejectWithValue(message);
    }
  }
);

const calendarsSlice = createSlice({
  name: 'calendars',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCalendars.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCalendars.fulfilled, (state, action) => {
        state.isLoading = false;
        state.calendars = action.payload;
        state.error = null;
      })
      .addCase(fetchCalendars.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createCalendar.fulfilled, (state, action) => {
        state.calendars.push(action.payload);
      })
      .addCase(createCalendar.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(updateCalendar.fulfilled, (state, action) => {
        const index = state.calendars.findIndex((cal) => cal.id === action.payload.id);
        if (index !== -1) {
          state.calendars[index] = action.payload;
        }
      })
      .addCase(updateCalendar.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteCalendar.fulfilled, (state, action) => {
        state.calendars = state.calendars.filter((cal) => cal.id !== action.payload);
      })
      .addCase(deleteCalendar.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = calendarsSlice.actions;
export default calendarsSlice.reducer;
