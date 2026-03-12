from rest_framework import serializers
from .models import (
    Calendar, CalendarShare, Event, EventAttendee, EventReminder,
    Goal, Responsibility, GoalProgress, ResponsibilityCompletion
)
from authentication.serializers import UserProfileSerializer


class CalendarSerializer(serializers.ModelSerializer):
    owner = UserProfileSerializer(read_only=True)
    event_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Calendar
        fields = ['id', 'owner', 'name', 'description', 'color', 'visibility', 
                 'timezone', 'is_active', 'event_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']
    
    def get_event_count(self, obj):
        return obj.events.filter(status='confirmed').count()
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class CalendarShareSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    calendar = CalendarSerializer(read_only=True)
    user_email = serializers.EmailField(write_only=True)
    
    class Meta:
        model = CalendarShare
        fields = ['id', 'calendar', 'user', 'user_email', 'permission', 'created_at']
        read_only_fields = ['id', 'calendar', 'user', 'created_at']


class EventAttendeeSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = EventAttendee
        fields = ['id', 'user', 'email', 'name', 'response', 'is_organizer', 'created_at']
        read_only_fields = ['id', 'created_at']


class EventReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventReminder
        fields = ['id', 'reminder_type', 'minutes_before', 'is_sent', 'created_at']
        read_only_fields = ['id', 'is_sent', 'created_at']


class EventSerializer(serializers.ModelSerializer):
    creator = UserProfileSerializer(read_only=True)
    calendar = CalendarSerializer(read_only=True)
    attendees = EventAttendeeSerializer(many=True, read_only=True)
    reminders = EventReminderSerializer(many=True, read_only=True)
    duration = serializers.ReadOnlyField()
    calendar_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = Event
        fields = ['id', 'calendar', 'calendar_id', 'creator', 'title', 'description', 
                 'location', 'start_time', 'end_time', 'all_day', 'status', 'color',
                 'recurrence_rule', 'recurrence_end_date', 'recurrence_count', 
                 'recurrence_interval', 'url', 'is_private', 'completed', 'duration', 
                 'attendees', 'reminders', 'created_at', 'updated_at']
        read_only_fields = ['id', 'creator', 'calendar', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        if attrs.get('start_time') and attrs.get('end_time'):
            if attrs['start_time'] >= attrs['end_time']:
                raise serializers.ValidationError("End time must be after start time")
        return attrs
    
    def create(self, validated_data):
        calendar_id = validated_data.pop('calendar_id')
        calendar = Calendar.objects.get(id=calendar_id)
        
        # Check if user has permission to create events in this calendar
        user = self.context['request'].user
        if calendar.owner != user:
            # Check if user has shared access
            try:
                share = CalendarShare.objects.get(calendar=calendar, user=user)
                if share.permission not in ['edit', 'manage']:
                    raise serializers.ValidationError("You don't have permission to create events in this calendar")
            except CalendarShare.DoesNotExist:
                raise serializers.ValidationError("You don't have access to this calendar")
        
        validated_data['calendar'] = calendar
        validated_data['creator'] = user
        return super().create(validated_data)


class EventCreateSerializer(serializers.ModelSerializer):
    attendee_emails = serializers.ListField(
        child=serializers.EmailField(), 
        write_only=True, 
        required=False
    )
    reminder_minutes = serializers.ListField(
        child=serializers.IntegerField(min_value=0), 
        write_only=True, 
        required=False
    )
    
    class Meta:
        model = Event
        fields = ['calendar', 'title', 'description', 'location', 'start_time', 
                 'end_time', 'all_day', 'status', 'color', 'recurrence_rule', 
                 'recurrence_end_date', 'recurrence_count', 'recurrence_interval', 
                 'url', 'is_private', 'attendee_emails', 'reminder_minutes']
    
    def create(self, validated_data):
        attendee_emails = validated_data.pop('attendee_emails', [])
        reminder_minutes = validated_data.pop('reminder_minutes', [])
        
        validated_data['creator'] = self.context['request'].user
        event = super().create(validated_data)
        
        # Create attendees
        for email in attendee_emails:
            try:
                from authentication.models import User
                user = User.objects.get(email=email)
                EventAttendee.objects.create(event=event, user=user)
            except User.DoesNotExist:
                EventAttendee.objects.create(event=event, email=email)
        
        # Create reminders
        for minutes in reminder_minutes:
            EventReminder.objects.create(
                event=event, 
                user=self.context['request'].user, 
                minutes_before=minutes
            )
        
        return event


# Goal and Responsibility Serializers

class GoalProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalProgress
        fields = ['id', 'date', 'value', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class GoalSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    progress_percentage = serializers.ReadOnlyField()
    progress_entries = GoalProgressSerializer(many=True, read_only=True)
    
    class Meta:
        model = Goal
        fields = [
            'id', 'user', 'title', 'description', 'frequency', 'priority', 'status',
            'target_value', 'current_value', 'unit', 'start_date', 'end_date',
            'color', 'is_active', 'is_completed', 'progress_percentage', 'progress_entries',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ResponsibilityCompletionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResponsibilityCompletion
        fields = ['id', 'completed_date', 'hours_spent', 'notes', 'quality_rating']
        read_only_fields = ['id']


class ResponsibilitySerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    assigned_to = UserProfileSerializer(read_only=True)
    assigned_to_email = serializers.EmailField(write_only=True, required=False)
    is_overdue = serializers.ReadOnlyField()
    completions = ResponsibilityCompletionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Responsibility
        fields = [
            'id', 'user', 'title', 'description', 'frequency', 'priority', 'status',
            'assigned_to', 'assigned_to_email', 'start_date', 'due_date', 
            'completed_date', 'next_due_date', 'estimated_hours', 'actual_hours',
            'color', 'is_active', 'is_overdue', 'completions',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'assigned_to', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        assigned_to_email = validated_data.pop('assigned_to_email', None)
        validated_data['user'] = self.context['request'].user
        
        # Handle assignment to another user
        if assigned_to_email:
            try:
                from authentication.models import User
                assigned_user = User.objects.get(email=assigned_to_email)
                validated_data['assigned_to'] = assigned_user
            except User.DoesNotExist:
                raise serializers.ValidationError(f"User with email {assigned_to_email} not found")
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        assigned_to_email = validated_data.pop('assigned_to_email', None)
        
        # Handle assignment change
        if assigned_to_email:
            try:
                from authentication.models import User
                assigned_user = User.objects.get(email=assigned_to_email)
                validated_data['assigned_to'] = assigned_user
            except User.DoesNotExist:
                raise serializers.ValidationError(f"User with email {assigned_to_email} not found")
        
        return super().update(instance, validated_data)