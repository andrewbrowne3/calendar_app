import { useCallback, useMemo, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './useAppDispatch';
import {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal as deleteGoalAction,
  toggleGoalCompletion,
  clearError,
} from '../store/slices/goalsSlice';
import type { Goal } from '../types';

export const useGoals = () => {
  const dispatch = useAppDispatch();
  const { goals, isLoading, error } = useAppSelector((state) => state.goals);

  useEffect(() => {
    dispatch(fetchGoals());
  }, [dispatch]);

  const activeGoals = useMemo(() => goals.filter((g: Goal) => !g.is_completed), [goals]);
  const completedGoals = useMemo(() => goals.filter((g: Goal) => g.is_completed), [goals]);

  const loadGoals = useCallback(async () => {
    return dispatch(fetchGoals()).unwrap();
  }, [dispatch]);

  const addGoal = useCallback(
    async (goalData: Partial<Goal>) => {
      return dispatch(createGoal(goalData)).unwrap();
    },
    [dispatch]
  );

  const editGoal = useCallback(
    async (goalId: string, updates: Partial<Goal>) => {
      return dispatch(updateGoal({ goalId, updates })).unwrap();
    },
    [dispatch]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      return dispatch(deleteGoalAction(goalId)).unwrap();
    },
    [dispatch]
  );

  const toggleCompletion = useCallback(
    (goalId: string) => {
      dispatch(toggleGoalCompletion(goalId));
    },
    [dispatch]
  );

  const clearGoalsError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    goals,
    activeGoals,
    completedGoals,
    isLoading,
    error,
    loadGoals,
    addGoal,
    editGoal,
    deleteGoal,
    toggleGoalCompletion: toggleCompletion,
    clearError: clearGoalsError,
  };
};

export default useGoals;
