import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Goal } from '../types';
import { COLORS, FONT_SIZES } from '../constants/config';

interface GoalFormProps {
  goal?: Goal;
  onSave: (goalData: Partial<Goal>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const GoalForm: React.FC<GoalFormProps> = ({
  goal,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'daily',
    priority: 'medium',
    status: 'active',
    targetValue: '',
    currentValue: '',
    unit: '',
    color: '#4CAF50',
    isActive: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });

  const frequencies = ['daily', 'weekly', 'monthly', 'yearly'];
  const priorities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['active', 'completed', 'paused', 'cancelled'];
  const colors = [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#F44336', // Red
    '#9C27B0', // Purple
    '#607D8B', // Blue Grey
    '#795548', // Brown
    '#009688', // Teal
  ];

  useEffect(() => {
    if (goal) {
      setFormData({
        title: goal.title || '',
        description: goal.description || '',
        frequency: goal.frequency || 'daily',
        priority: goal.priority || 'medium',
        status: goal.status || 'active',
        targetValue: goal.target_value?.toString() || '',
        currentValue: goal.current_value?.toString() || '',
        unit: goal.unit || '',
        color: goal.color || '#4CAF50',
        isActive: goal.is_active !== undefined ? goal.is_active : true,
        startDate: goal.start_date ? goal.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: goal.end_date ? goal.end_date.split('T')[0] : '',
      });
    }
  }, [goal]);

  const handleSave = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for your goal');
      return;
    }

    const goalData: Partial<Goal> = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      frequency: formData.frequency as Goal['frequency'],
      priority: formData.priority as Goal['priority'],
      status: formData.status as Goal['status'],
      target_value: formData.targetValue ? parseInt(formData.targetValue) : undefined,
      current_value: formData.currentValue ? parseInt(formData.currentValue) : 0,
      unit: formData.unit.trim() || undefined,
      color: formData.color,
      is_active: formData.isActive,
      start_date: formData.startDate,
      end_date: formData.endDate || undefined,
    };

    onSave(goalData);
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderDropdown = (
    label: string,
    value: string,
    options: string[],
    onSelect: (value: string) => void
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dropdownContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.dropdownOption,
              value === option && styles.selectedDropdownOption,
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                styles.dropdownOptionText,
                value === option && styles.selectedDropdownOptionText,
              ]}
            >
              {option.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderColorPicker = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Color</Text>
      <View style={styles.colorContainer}>
        {colors.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              formData.color === color && styles.selectedColorOption,
            ]}
            onPress={() => updateFormData('color', color)}
          >
            {formData.color === color && (
              <Text style={styles.colorCheckmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {goal ? 'Edit Goal' : 'Create Goal'}
        </Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(value) => updateFormData('title', value)}
            placeholder="Enter goal title"
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            placeholder="Describe your goal (optional)"
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Frequency */}
        {renderDropdown(
          'Frequency *',
          formData.frequency,
          frequencies,
          (value) => updateFormData('frequency', value)
        )}

        {/* Priority */}
        {renderDropdown(
          'Priority *',
          formData.priority,
          priorities,
          (value) => updateFormData('priority', value)
        )}

        {/* Status */}
        {renderDropdown(
          'Status *',
          formData.status,
          statuses,
          (value) => updateFormData('status', value)
        )}

        {/* Color Picker */}
        {renderColorPicker()}

        {/* Target Value and Unit */}
        <View style={styles.rowContainer}>
          <View style={[styles.inputContainer, styles.halfWidth]}>
            <Text style={styles.label}>Target Value</Text>
            <TextInput
              style={styles.input}
              value={formData.targetValue}
              onChangeText={(value) => updateFormData('targetValue', value)}
              placeholder="e.g., 10000"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputContainer, styles.halfWidth]}>
            <Text style={styles.label}>Unit</Text>
            <TextInput
              style={styles.input}
              value={formData.unit}
              onChangeText={(value) => updateFormData('unit', value)}
              placeholder="e.g., steps, hours"
            />
          </View>
        </View>

        {/* Current Value (only for editing) */}
        {goal && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Current Value</Text>
            <TextInput
              style={styles.input}
              value={formData.currentValue}
              onChangeText={(value) => updateFormData('currentValue', value)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Start Date */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Start Date *</Text>
          <TextInput
            style={styles.input}
            value={formData.startDate}
            onChangeText={(value) => updateFormData('startDate', value)}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* End Date */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>End Date</Text>
          <TextInput
            style={styles.input}
            value={formData.endDate}
            onChangeText={(value) => updateFormData('endDate', value)}
            placeholder="YYYY-MM-DD (optional)"
          />
        </View>

        {/* Active Toggle */}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Active</Text>
          <Switch
            value={formData.isActive}
            onValueChange={(value) => updateFormData('isActive', value)}
            trackColor={{ false: '#767577', true: COLORS.PRIMARY }}
            thumbColor={formData.isActive ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.disabledButton]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : goal ? 'Update Goal' : 'Create Goal'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND.SECONDARY,
  },
  title: {
    fontSize: FONT_SIZES.LARGE,
    fontWeight: 'bold',
    color: COLORS.TEXT.PRIMARY,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.TEXT.SECONDARY,
  },
  form: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BACKGROUND.SECONDARY,
    borderRadius: 8,
    padding: 12,
    fontSize: FONT_SIZES.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedDropdownOption: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  dropdownOptionText: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.TEXT.SECONDARY,
    fontWeight: '500',
  },
  selectedDropdownOptionText: {
    color: 'white',
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: COLORS.TEXT.PRIMARY,
  },
  colorCheckmark: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: FONT_SIZES.MEDIUM,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});