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
import { useSelector } from 'react-redux';
import { Event, Calendar, NotificationStyle } from '../types';
import { COLORS, FONT_SIZES, NOTIFICATION_STYLES } from '../constants/config';
import notificationService from '../services/notificationService';
import { RootState } from '../store/store';

interface EventFormProps {
  event?: Event;
  onSave: (eventData: Partial<Event>, notificationStyle: NotificationStyle) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialDate?: string;
}

export const EventForm: React.FC<EventFormProps> = ({
  event,
  onSave,
  onCancel,
  isLoading = false,
  initialDate,
}) => {
  const { calendars } = useSelector((state: RootState) => state.calendars);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: initialDate || new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endDate: initialDate || new Date().toISOString().split('T')[0],
    endTime: '10:00',
    allDay: false,
    calendarId: calendars.length > 0 ? calendars[0].id : '',
    status: 'confirmed',
    isPrivate: false,
    reminderMinutes: [15], // Default: 15 minutes before
    notificationStyle: 'normal' as NotificationStyle,
  });

  const statuses = ['confirmed', 'tentative', 'cancelled'];

  // Reminder options in minutes
  const reminderOptions = [
    { label: 'None', value: 0 },
    { label: '5 minutes before', value: 5 },
    { label: '15 minutes before', value: 15 },
    { label: '30 minutes before', value: 30 },
    { label: '1 hour before', value: 60 },
    { label: '2 hours before', value: 120 },
    { label: '1 day before', value: 1440 },
    { label: '2 days before', value: 2880 },
  ];

  useEffect(() => {
    if (event) {
      const startDateTime = new Date(event.start_time);
      const endDateTime = new Date(event.end_time);

      setFormData({
        title: event.title || '',
        description: event.description || '',
        location: event.location || '',
        startDate: startDateTime.toISOString().split('T')[0],
        startTime: startDateTime.toTimeString().slice(0, 5),
        endDate: endDateTime.toISOString().split('T')[0],
        endTime: endDateTime.toTimeString().slice(0, 5),
        allDay: event.all_day,
        calendarId: event.calendar.id,
        status: event.status,
        isPrivate: event.is_private,
        reminderMinutes: event.reminder_minutes || [15],
        notificationStyle: 'normal' as NotificationStyle,
      });

      // Load saved notification style from AsyncStorage
      const loadNotificationStyle = async () => {
        const style = await notificationService.getNotificationStyle(event.id);
        setFormData(prev => ({ ...prev, notificationStyle: style }));
      };
      loadNotificationStyle();
    } else if (calendars.length > 0 && !formData.calendarId) {
      setFormData(prev => ({ ...prev, calendarId: calendars[0].id }));
    }
  }, [event, calendars]);

  const handleSave = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for your event');
      return;
    }

    if (!formData.calendarId) {
      Alert.alert('Error', 'Please select a calendar for your event');
      return;
    }

    const startDateTime = formData.allDay 
      ? `${formData.startDate}T00:00:00`
      : `${formData.startDate}T${formData.startTime}:00`;
    
    const endDateTime = formData.allDay
      ? `${formData.endDate}T23:59:59`
      : `${formData.endDate}T${formData.endTime}:00`;

    const eventData: any = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      location: formData.location.trim() || undefined,
      start_time: startDateTime,
      end_time: endDateTime,
      all_day: formData.allDay,
      calendar: formData.calendarId,  // Backend expects 'calendar' not 'calendar_id'
      status: formData.status as Event['status'],
      is_private: formData.isPrivate,
      reminder_minutes: formData.reminderMinutes,
    };

    console.log('EventForm: Sending event data:', eventData);
    onSave(eventData, formData.notificationStyle);
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleReminder = (minutes: number) => {
    if (minutes === 0) {
      // "None" selected - clear all reminders
      setFormData(prev => ({ ...prev, reminderMinutes: [] }));
      return;
    }

    setFormData(prev => {
      const currentReminders = prev.reminderMinutes;
      const index = currentReminders.indexOf(minutes);

      if (index > -1) {
        // Remove reminder
        return {
          ...prev,
          reminderMinutes: currentReminders.filter(m => m !== minutes),
        };
      } else {
        // Add reminder and sort
        return {
          ...prev,
          reminderMinutes: [...currentReminders, minutes].sort((a, b) => a - b),
        };
      }
    });
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

  const renderCalendarSelector = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Calendar *</Text>
      <View style={styles.dropdownContainer}>
        {calendars.map((calendar) => (
          <TouchableOpacity
            key={calendar.id}
            style={[
              styles.dropdownOption,
              formData.calendarId === calendar.id && styles.selectedDropdownOption,
            ]}
            onPress={() => updateFormData('calendarId', calendar.id)}
          >
            <View style={styles.calendarOptionContent}>
              <View
                style={[
                  styles.calendarColorDot,
                  { backgroundColor: calendar.color },
                ]}
              />
              <Text
                style={[
                  styles.dropdownOptionText,
                  formData.calendarId === calendar.id && styles.selectedDropdownOptionText,
                ]}
              >
                {calendar.name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {event ? 'Edit Event' : 'Create Event'}
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
            placeholder="Enter event title"
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
            placeholder="Describe your event (optional)"
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Location */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(value) => updateFormData('location', value)}
            placeholder="Event location (optional)"
            maxLength={200}
          />
        </View>

        {/* All Day Toggle */}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>All Day</Text>
          <Switch
            value={formData.allDay}
            onValueChange={(value) => updateFormData('allDay', value)}
            trackColor={{ false: '#767577', true: COLORS.PRIMARY }}
            thumbColor={formData.allDay ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Start Date and Time */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Start Date *</Text>
          <TextInput
            style={styles.input}
            value={formData.startDate}
            onChangeText={(value) => updateFormData('startDate', value)}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {!formData.allDay && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Start Time *</Text>
            <TextInput
              style={styles.input}
              value={formData.startTime}
              onChangeText={(value) => updateFormData('startTime', value)}
              placeholder="HH:MM"
            />
          </View>
        )}

        {/* End Date and Time */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>End Date *</Text>
          <TextInput
            style={styles.input}
            value={formData.endDate}
            onChangeText={(value) => updateFormData('endDate', value)}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {!formData.allDay && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>End Time *</Text>
            <TextInput
              style={styles.input}
              value={formData.endTime}
              onChangeText={(value) => updateFormData('endTime', value)}
              placeholder="HH:MM"
            />
          </View>
        )}

        {/* Calendar Selection */}
        {renderCalendarSelector()}

        {/* Status */}
        {renderDropdown(
          'Status *',
          formData.status,
          statuses,
          (value) => updateFormData('status', value)
        )}

        {/* Private Toggle */}
        <View style={styles.switchContainer}>
          <Text style={styles.label}>Private Event</Text>
          <Switch
            value={formData.isPrivate}
            onValueChange={(value) => updateFormData('isPrivate', value)}
            trackColor={{ false: '#767577', true: COLORS.PRIMARY }}
            thumbColor={formData.isPrivate ? '#fff' : '#f4f3f4'}
          />
        </View>

        {/* Reminders */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Reminders</Text>
          <View style={styles.dropdownContainer}>
            {reminderOptions.map((option) => {
              const isSelected = option.value === 0
                ? formData.reminderMinutes.length === 0
                : formData.reminderMinutes.includes(option.value);

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    isSelected && styles.selectedDropdownOption,
                  ]}
                  onPress={() => toggleReminder(option.value)}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      isSelected && styles.selectedDropdownOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {formData.reminderMinutes.length > 0 && (
            <Text style={styles.reminderHint}>
              {formData.reminderMinutes.length} reminder{formData.reminderMinutes.length > 1 ? 's' : ''} set
            </Text>
          )}
        </View>

        {/* Notification Style */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Notification Style</Text>
          <View style={styles.dropdownContainer}>
            {(Object.keys(NOTIFICATION_STYLES) as NotificationStyle[]).map((styleKey) => {
              const styleConfig = NOTIFICATION_STYLES[styleKey];
              const isSelected = formData.notificationStyle === styleKey;
              return (
                <TouchableOpacity
                  key={styleKey}
                  style={[
                    styles.dropdownOption,
                    isSelected && { backgroundColor: styleConfig.color, borderColor: styleConfig.color },
                  ]}
                  onPress={() => updateFormData('notificationStyle', styleKey)}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      isSelected && styles.selectedDropdownOptionText,
                    ]}
                  >
                    {styleConfig.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.reminderHint}>
            {NOTIFICATION_STYLES[formData.notificationStyle].description}
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.disabledButton]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
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
  calendarOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  reminderHint: {
    fontSize: FONT_SIZES.SMALL,
    color: COLORS.PRIMARY,
    marginTop: 8,
    fontWeight: '500',
  },
});