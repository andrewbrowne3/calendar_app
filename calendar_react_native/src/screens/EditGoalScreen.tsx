import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { GoalForm } from '../components/GoalForm';
import { useGoals } from '../hooks/useGoals';
import { Goal } from '../types';

type EditGoalRouteProp = RouteProp<{ EditGoal: { goal: Goal } }, 'EditGoal'>;

export const EditGoalScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EditGoalRouteProp>();
  const { updateGoal } = useGoals();
  const [isLoading, setIsLoading] = useState(false);

  const { goal } = route.params;

  const handleSave = async (goalData: Partial<Goal>) => {
    try {
      setIsLoading(true);
      await updateGoal(goal.id, goalData);
      
      Alert.alert(
        'Success',
        'Goal updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to update goal. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <GoalForm
        goal={goal}
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});