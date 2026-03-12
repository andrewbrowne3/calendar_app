import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GoalForm } from '../components/GoalForm';
import { useGoals } from '../hooks/useGoals';
import { Goal } from '../types';

export const CreateGoalScreen: React.FC = () => {
  const navigation = useNavigation();
  const { createGoal } = useGoals();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (goalData: Partial<Goal>) => {
    try {
      setIsLoading(true);
      await createGoal(goalData);
      
      Alert.alert(
        'Success',
        'Goal created successfully!',
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
        error.message || 'Failed to create goal. Please try again.'
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