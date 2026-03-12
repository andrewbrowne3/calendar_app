from django.contrib import admin
from .models import (
    Calendar, CalendarShare, Event, EventAttendee, EventReminder,
    Goal, Responsibility, GoalProgress, ResponsibilityCompletion
)


@admin.register(Calendar)
class CalendarAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'visibility', 'color', 'is_active', 'created_at')
    list_filter = ('visibility', 'is_active', 'created_at')
    search_fields = ('name', 'owner__email', 'owner__first_name', 'owner__last_name')
    list_editable = ('is_active',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        (None, {
            'fields': ('owner', 'name', 'description', 'color', 'visibility', 'timezone', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CalendarShare)
class CalendarShareAdmin(admin.ModelAdmin):
    list_display = ('calendar', 'user', 'permission', 'created_at')
    list_filter = ('permission', 'created_at')
    search_fields = ('calendar__name', 'user__email', 'user__first_name', 'user__last_name')


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'calendar', 'creator', 'start_time', 'end_time', 'status', 'all_day')
    list_filter = ('status', 'all_day', 'recurrence_rule', 'is_private', 'created_at')
    search_fields = ('title', 'description', 'location', 'creator__email')
    date_hierarchy = 'start_time'
    readonly_fields = ('id', 'duration', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('calendar', 'creator', 'title', 'description', 'location', 'url')
        }),
        ('Date & Time', {
            'fields': ('start_time', 'end_time', 'all_day', 'duration')
        }),
        ('Settings', {
            'fields': ('status', 'color', 'is_private')
        }),
        ('Recurrence', {
            'fields': ('recurrence_rule', 'recurrence_interval', 'recurrence_end_date', 'recurrence_count'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(EventAttendee)
class EventAttendeeAdmin(admin.ModelAdmin):
    list_display = ('event', 'user', 'email', 'name', 'response', 'is_organizer')
    list_filter = ('response', 'is_organizer', 'created_at')
    search_fields = ('event__title', 'user__email', 'email', 'name')


@admin.register(EventReminder)
class EventReminderAdmin(admin.ModelAdmin):
    list_display = ('event', 'user', 'reminder_type', 'minutes_before', 'is_sent')
    list_filter = ('reminder_type', 'is_sent', 'created_at')
    search_fields = ('event__title', 'user__email')


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'frequency', 'priority', 'status', 'progress_percentage', 'start_date', 'end_date')
    list_filter = ('frequency', 'priority', 'status', 'is_active', 'created_at')
    search_fields = ('title', 'description', 'user__email', 'user__first_name', 'user__last_name')
    list_editable = ('status', 'priority')
    readonly_fields = ('id', 'progress_percentage', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'title', 'description', 'frequency', 'priority', 'status')
        }),
        ('Progress Tracking', {
            'fields': ('target_value', 'current_value', 'unit', 'progress_percentage')
        }),
        ('Dates', {
            'fields': ('start_date', 'end_date')
        }),
        ('Settings', {
            'fields': ('color', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(GoalProgress)
class GoalProgressAdmin(admin.ModelAdmin):
    list_display = ('goal', 'date', 'value', 'created_at')
    list_filter = ('date', 'created_at')
    search_fields = ('goal__title', 'notes')
    date_hierarchy = 'date'


@admin.register(Responsibility)
class ResponsibilityAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'assigned_to', 'frequency', 'priority', 'status', 'due_date', 'is_overdue')
    list_filter = ('frequency', 'priority', 'status', 'is_active', 'due_date', 'created_at')
    search_fields = ('title', 'description', 'user__email', 'assigned_to__email')
    list_editable = ('status', 'priority')
    readonly_fields = ('id', 'is_overdue', 'completed_date', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'title', 'description', 'frequency', 'priority', 'status')
        }),
        ('Assignment', {
            'fields': ('assigned_to',)
        }),
        ('Dates', {
            'fields': ('start_date', 'due_date', 'completed_date', 'next_due_date')
        }),
        ('Tracking', {
            'fields': ('estimated_hours', 'actual_hours', 'is_overdue')
        }),
        ('Settings', {
            'fields': ('color', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ResponsibilityCompletion)
class ResponsibilityCompletionAdmin(admin.ModelAdmin):
    list_display = ('responsibility', 'completed_date', 'hours_spent', 'quality_rating')
    list_filter = ('completed_date', 'quality_rating')
    search_fields = ('responsibility__title', 'notes')
    date_hierarchy = 'completed_date'
