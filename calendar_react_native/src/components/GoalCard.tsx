// GoalCard component - The strike-through that actually works!
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Goal } from '../types';
import { COLORS, FONT_SIZES } from '../constants/config';

interface GoalCardProps {
  goal: Goal;
  onToggleCompletion: (goalId: string) => void;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onToggleCompletion,
  onPress,
  onEdit,
  onDelete,
}) => {
  const priorityColor = COLORS.PRIORITY[goal.priority];
  const isCompleted = goal.is_completed;

  const handleToggleCompletion = () => {
    onToggleCompletion(goal.id);
  };

  const handleLongPress = () => {
    Alert.alert(
      goal.title,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: onEdit },
        { 
          text: 'Delete', 
          onPress: onDelete,
          style: 'destructive' 
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderLeftColor: priorityColor },
        isCompleted && styles.completedContainer
      ]}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* Completion Checkbox */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          { borderColor: priorityColor },
          isCompleted && { backgroundColor: priorityColor }
        ]}
        onPress={handleToggleCompletion}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {isCompleted && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </TouchableOpacity>

      {/* Goal Content */}
      <View style={styles.content}>
        {/* Title with strike-through - THIS IS THE MAGIC! */}
        <Text
          style={[
            styles.title,
            // 🎯 INSTANT STRIKE-THROUGH - No state management hell!
            isCompleted && styles.strikethrough,
            isCompleted && styles.completedText,
          ]}
        >
          {goal.title}
        </Text>

        {/* Description with strike-through */}
        {goal.description && (
          <Text
            style={[
              styles.description,
              isCompleted && styles.strikethrough,
              isCompleted && styles.completedText,
            ]}
            numberOfLines={2}
          >
            {goal.description}
          </Text>
        )}

        {/* Goal metadata */}
        <View style={styles.metadata}>
          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: priorityColor + '20' }]}>
              <Text style={[styles.tagText, { color: priorityColor }]}>
                {goal.priority.toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {goal.frequency.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Progress indicator */}
          {goal.target_value && (
            <View style={styles.progress}>
              <Text style={styles.progressText}>
                {goal.current_value}/{goal.target_value} {goal.unit}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min(goal.progress_percentage, 100)}%`,
                      backgroundColor: priorityColor 
                    }
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    
    // Elevation for Android
    elevation: 3,
  },
  
  completedContainer: {
    opacity: 0.7,
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: FONT_SIZES.LARGE,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },

  description: {
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 12,
    lineHeight: 20,
  },

  // 🎯 THE MAGIC HAPPENS HERE!
  strikethrough: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
  },

  completedText: {
    color: COLORS.TEXT.DISABLED,
  },

  metadata: {
    gap: 8,
  },

  tags: {
    flexDirection: 'row',
    gap: 8,
  },

  tag: {
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  tagText: {
    fontSize: FONT_SIZES.SMALL,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },

  progress: {
    gap: 4,
  },

  progressText: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.SECONDARY,
    fontWeight: '500',
  },

  progressBar: {
    height: 4,
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});