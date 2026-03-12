import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Goal } from '../../types';
import apiService from '../../api/apiService';

interface GoalsState {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
}

const initialState: GoalsState = {
  goals: [],
  isLoading: false,
  error: null,
};

export const fetchGoals = createAsyncThunk(
  'goals/fetchGoals',
  async (_, { rejectWithValue }) => {
    try {
      const goals = await apiService.getGoals();
      return goals;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch goals';
      return rejectWithValue(message);
    }
  }
);

export const createGoal = createAsyncThunk(
  'goals/createGoal',
  async (goalData: Partial<Goal>, { rejectWithValue }) => {
    try {
      const newGoal = await apiService.createGoal(goalData);
      return newGoal;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create goal';
      return rejectWithValue(message);
    }
  }
);

export const updateGoal = createAsyncThunk(
  'goals/updateGoal',
  async ({ goalId, updates }: { goalId: string; updates: Partial<Goal> }, { rejectWithValue }) => {
    try {
      const updatedGoal = await apiService.updateGoal(goalId, updates);
      return updatedGoal;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update goal';
      return rejectWithValue(message);
    }
  }
);

export const deleteGoal = createAsyncThunk(
  'goals/deleteGoal',
  async (goalId: string, { rejectWithValue }) => {
    try {
      await apiService.deleteGoal(goalId);
      return goalId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete goal';
      return rejectWithValue(message);
    }
  }
);

export const toggleGoalCompletion = createAsyncThunk(
  'goals/toggleCompletion',
  async (goalId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { goals: GoalsState };
      const goal = state.goals.goals.find((g) => g.id === goalId);
      if (!goal) throw new Error('Goal not found');

      const newCompletedStatus = !goal.is_completed;
      const updatedGoal = await apiService.toggleGoalCompletion(goalId, newCompletedStatus);
      return updatedGoal;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to toggle completion';
      return rejectWithValue(message);
    }
  }
);

const goalsSlice = createSlice({
  name: 'goals',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.goals = action.payload;
        state.error = null;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createGoal.fulfilled, (state, action) => {
        state.goals.push(action.payload);
      })
      .addCase(createGoal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(updateGoal.fulfilled, (state, action) => {
        const index = state.goals.findIndex((goal) => goal.id === action.payload.id);
        if (index !== -1) {
          state.goals[index] = action.payload;
        }
      })
      .addCase(updateGoal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteGoal.fulfilled, (state, action) => {
        state.goals = state.goals.filter((goal) => goal.id !== action.payload);
      })
      .addCase(deleteGoal.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(toggleGoalCompletion.fulfilled, (state, action) => {
        const index = state.goals.findIndex((goal) => goal.id === action.payload.id);
        if (index !== -1) {
          state.goals[index] = action.payload;
        }
      })
      .addCase(toggleGoalCompletion.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = goalsSlice.actions;
export default goalsSlice.reducer;
