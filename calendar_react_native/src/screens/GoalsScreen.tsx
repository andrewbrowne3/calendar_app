// Goals Screen - Clean, functional, with INSTANT strike-through!
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGoals } from '../hooks/useGoals';
import { GoalCard } from '../components/GoalCard';
import { Goal } from '../types';
import { RootStackParamList } from '../types/navigation';
import { COLORS, FONT_SIZES } from '../constants/config';

type GoalsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const GoalsScreen: React.FC = () => {
  const navigation = useNavigation<GoalsScreenNavigationProp>();
  const {
    goals,
    activeGoals,
    completedGoals,
    isLoading,
    error,
    loadGoals,
    deleteGoal,
    toggleGoalCompletion,  // ⭐ The magic method!
    clearError,
  } = useGoals();

  const [showCompleted, setShowCompleted] = useState(false);

  // Get the goals to display based on filter
  const displayGoals = showCompleted ? completedGoals : activeGoals;

  const handleGoalPress = (goal: Goal) => {
    // TODO: Navigate to goal details
    console.log('Goal pressed:', goal.title);
  };

  const handleEditGoal = (goal: Goal) => {
    navigation.navigate('EditGoal', { goal });
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goal.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(goal.id);
              Alert.alert('Success', 'Goal deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  // THE MAIN EVENT: Toggle completion with instant UI update!
  const handleToggleCompletion = (goalId: string) => {
    toggleGoalCompletion(goalId);
    // That's it! No state management hell, no Provider updates, just works!
  };

  const handleCreateGoal = () => {
    navigation.navigate('CreateGoal');
  };

  const renderGoalCard = ({ item: goal }: { item: Goal }) => (
    <GoalCard
      goal={goal}
      onToggleCompletion={handleToggleCompletion}
      onPress={() => handleGoalPress(goal)}
      onEdit={() => handleEditGoal(goal)}
      onDelete={() => handleDeleteGoal(goal)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {showCompleted ? 'No completed goals yet' : 'No active goals'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {showCompleted 
          ? 'Complete some goals to see them here!' 
          : 'Create your first goal to get started'
        }
      </Text>
      {!showCompleted && (
        <TouchableOpacity style={styles.createButton} onPress={handleCreateGoal}>
          <Text style={styles.createButtonText}>Create Goal</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Goals</Text>
        <Text style={styles.subtitle}>
          {activeGoals.length} active • {completedGoals.length} completed
        </Text>
      </View>

      {/* Filter toggle */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            !showCompleted && styles.activeFilterButton
          ]}
          onPress={() => setShowCompleted(false)}
        >
          <Text style={[
            styles.filterButtonText,
            !showCompleted && styles.activeFilterButtonText
          ]}>
            Active ({activeGoals.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            showCompleted && styles.activeFilterButton
          ]}
          onPress={() => setShowCompleted(true)}
        >
          <Text style={[
            styles.filterButtonText,
            showCompleted && styles.activeFilterButtonText
          ]}>
            Completed ({completedGoals.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={displayGoals}
        keyExtractor={(item) => item.id}
        renderItem={renderGoalCard}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadGoals} />
        }
        contentContainerStyle={
          displayGoals.length === 0 ? styles.emptyContainer : undefined
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Create Goal FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateGoal}>
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

  header: {
    padding: 16,
    paddingTop: 24,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },

  titleContainer: {
    marginBottom: 16,
  },

  title: {
    fontSize: FONT_SIZES.TITLE,
    fontWeight: 'bold',
    color: COLORS.TEXT.PRIMARY,
  },

  subtitle: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 4,
  },

  filterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    borderRadius: 8,
    padding: 4,
  },

  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },

  activeFilterButton: {
    backgroundColor: COLORS.PRIMARY,
  },

  filterButtonText: {
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },

  activeFilterButtonText: {
    color: 'white',
  },

  errorContainer: {
    backgroundColor: COLORS.ERROR,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  errorText: {
    color: 'white',
    fontSize: FONT_SIZES.MEDIUM,
    flex: 1,
  },

  errorDismiss: {
    color: 'white',
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: '600',
  },

  emptyContainer: {
    flex: 1,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  emptyTitle: {
    fontSize: FONT_SIZES.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  createButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  createButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: '600',
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
});