// Goals hook - Clean state management for goals (no Provider headaches!)
import { useState, useEffect, useCallback } from 'react';
import { Goal } from '../types';
import apiService from '../services/api';

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load goals from API
  const loadGoals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📋 Loading goals...');
      const goalsData = await apiService.getGoals();
      setGoals(goalsData);
      
      console.log(`✅ Loaded ${goalsData.length} goals`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load goals';
      setError(errorMessage);
      console.error('❌ Failed to load goals:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new goal
  const createGoal = useCallback(async (goalData: Partial<Goal>): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('➕ Creating goal:', goalData.title);
      const newGoal = await apiService.createGoal(goalData);
      setGoals(prev => [...prev, newGoal]);
      
      console.log('✅ Goal created:', newGoal.title);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create goal';
      setError(errorMessage);
      console.error('❌ Failed to create goal:', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update goal
  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>): Promise<void> => {
    try {
      console.log('✏️ Updating goal:', goalId);
      const updatedGoal = await apiService.updateGoal(goalId, updates);
      
      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? updatedGoal : goal
      ));
      
      console.log('✅ Goal updated:', updatedGoal.title);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update goal';
      setError(errorMessage);
      console.error('❌ Failed to update goal:', errorMessage);
      throw err;
    }
  }, []);

  // Delete goal
  const deleteGoal = useCallback(async (goalId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🗑️ Deleting goal:', goalId);
      await apiService.deleteGoal(goalId);
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
      
      console.log('✅ Goal deleted');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete goal';
      setError(errorMessage);
      console.error('❌ Failed to delete goal:', errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // THE MAIN EVENT: Toggle goal completion!
  // This will update UI immediately, then sync with backend
  const toggleGoalCompletion = useCallback(async (goalId: string): Promise<void> => {
    // Find the goal
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newCompletionState = !goal.is_completed;
    
    // 🚀 INSTANT UI UPDATE (no waiting for server!)
    setGoals(prev => prev.map(g => 
      g.id === goalId 
        ? { 
            ...g, 
            is_completed: newCompletionState,
            status: newCompletionState ? 'completed' : 'active'
          }
        : g
    ));

    try {
      // Background API call (user doesn't wait for this!)
      console.log(`🎯 Toggling goal completion: ${goal.title} -> ${newCompletionState ? 'completed' : 'active'}`);
      
      await apiService.toggleGoalCompletion(goalId, newCompletionState);
      console.log('✅ Goal completion synced with server');
      
    } catch (err: any) {
      // If API fails, revert the UI change
      console.error('❌ Failed to sync completion state, reverting:', err);
      
      setGoals(prev => prev.map(g => 
        g.id === goalId 
          ? { 
              ...g, 
              is_completed: !newCompletionState,  // Revert
              status: !newCompletionState ? 'completed' : 'active'
            }
          : g
      ));
      
      setError('Failed to update goal completion');
    }
  }, [goals]);

  // Load goals on mount
  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Computed values (like getters in C++)
  const activeGoals = goals.filter(goal => !goal.is_completed);
  const completedGoals = goals.filter(goal => goal.is_completed);
  const goalsByPriority = {
    high: goals.filter(goal => goal.priority === 'high'),
    medium: goals.filter(goal => goal.priority === 'medium'),
    low: goals.filter(goal => goal.priority === 'low'),
  };

  return {
    // State
    goals,
    activeGoals,
    completedGoals,
    goalsByPriority,
    isLoading,
    error,
    
    // Actions
    loadGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleGoalCompletion,  // ⭐ The star method!
    
    // Utility
    clearError: () => setError(null),
  };
};