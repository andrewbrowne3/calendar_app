import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Calendar } from '../../types';
import apiService from '../../services/api';

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

// Async thunks
export const fetchCalendars = createAsyncThunk(
  'calendars/fetchCalendars',
  async (_, { rejectWithValue }) => {
    try {
      console.log('📅 Redux: Fetching calendars');
      const calendars = await apiService.getCalendars();
      console.log(`✅ Redux: Loaded ${calendars.length} calendars`);
      return calendars;
    } catch (error: any) {
      console.error('❌ Redux: Failed to fetch calendars:', error.message);
      return rejectWithValue(error.message || 'Failed to fetch calendars');
    }
  }
);

export const createCalendar = createAsyncThunk(
  'calendars/createCalendar',
  async (calendarData: Partial<Calendar>, { rejectWithValue }) => {
    try {
      console.log('➕ Redux: Creating calendar:', calendarData.name);
      const newCalendar = await apiService.createCalendar(calendarData);
      console.log('✅ Redux: Calendar created:', newCalendar.name);
      return newCalendar;
    } catch (error: any) {
      console.error('❌ Redux: Failed to create calendar:', error.message);
      return rejectWithValue(error.message || 'Failed to create calendar');
    }
  }
);

export const updateCalendar = createAsyncThunk(
  'calendars/updateCalendar',
  async ({ calendarId, updates }: { calendarId: string; updates: Partial<Calendar> }, { rejectWithValue }) => {
    try {
      console.log('✏️ Redux: Updating calendar:', calendarId);
      const updatedCalendar = await apiService.updateCalendar(calendarId, updates);
      console.log('✅ Redux: Calendar updated:', updatedCalendar.name);
      return updatedCalendar;
    } catch (error: any) {
      console.error('❌ Redux: Failed to update calendar:', error.message);
      return rejectWithValue(error.message || 'Failed to update calendar');
    }
  }
);

export const deleteCalendar = createAsyncThunk(
  'calendars/deleteCalendar',
  async (calendarId: string, { rejectWithValue }) => {
    try {
      console.log('🗑️ Redux: Deleting calendar:', calendarId);
      await apiService.deleteCalendar(calendarId);
      console.log('✅ Redux: Calendar deleted');
      return calendarId;
    } catch (error: any) {
      console.error('❌ Redux: Failed to delete calendar:', error.message);
      return rejectWithValue(error.message || 'Failed to delete calendar');
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
    clearCalendars: (state) => {
      state.calendars = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch calendars
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
      // Create calendar
      .addCase(createCalendar.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCalendar.fulfilled, (state, action) => {
        state.isLoading = false;
        state.calendars.push(action.payload);
        state.error = null;
      })
      .addCase(createCalendar.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update calendar
      .addCase(updateCalendar.fulfilled, (state, action) => {
        const index = state.calendars.findIndex(calendar => calendar.id === action.payload.id);
        if (index !== -1) {
          state.calendars[index] = action.payload;
        }
      })
      .addCase(updateCalendar.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Delete calendar
      .addCase(deleteCalendar.fulfilled, (state, action) => {
        state.calendars = state.calendars.filter(calendar => calendar.id !== action.payload);
      })
      .addCase(deleteCalendar.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCalendars } = calendarsSlice.actions;
export default calendarsSlice.reducer;