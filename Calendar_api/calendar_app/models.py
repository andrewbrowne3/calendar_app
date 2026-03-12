from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Calendar(models.Model):
    VISIBILITY_CHOICES = [
        ('private', 'Private'),
        ('public', 'Public'),
        ('shared', 'Shared'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_calendars')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    color = models.CharField(max_length=7, default='#3788d8')  # Hex color
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default='private')
    timezone = models.CharField(max_length=50, default='UTC')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.owner.email})"


class CalendarShare(models.Model):
    PERMISSION_CHOICES = [
        ('view', 'View Only'),
        ('edit', 'Edit Events'),
        ('manage', 'Full Access'),
    ]
    
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='shares')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shared_calendars')
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default='view')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['calendar', 'user']
    
    def __str__(self):
        return f"{self.calendar.name} shared with {self.user.email} ({self.permission})"


class Event(models.Model):
    STATUS_CHOICES = [
        ('confirmed', 'Confirmed'),
        ('tentative', 'Tentative'),
        ('cancelled', 'Cancelled'),
    ]
    
    RECURRENCE_CHOICES = [
        ('none', 'No Recurrence'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    calendar = models.ForeignKey(Calendar, on_delete=models.CASCADE, related_name='events')
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_events')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=200, blank=True, null=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    all_day = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='confirmed')
    color = models.CharField(max_length=7, blank=True, null=True)  # Override calendar color
    
    # Recurrence fields
    recurrence_rule = models.CharField(max_length=10, choices=RECURRENCE_CHOICES, default='none')
    recurrence_end_date = models.DateField(blank=True, null=True)
    recurrence_count = models.PositiveIntegerField(blank=True, null=True)
    recurrence_interval = models.PositiveIntegerField(default=1)  # Every N days/weeks/months
    
    # Additional fields
    url = models.URLField(blank=True, null=True)
    is_private = models.BooleanField(default=False)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['start_time']
    
    def __str__(self):
        return f"{self.title} ({self.start_time})"
    
    @property
    def duration(self):
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None


class EventAttendee(models.Model):
    RESPONSE_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('tentative', 'Tentative'),
    ]
    
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='attendees')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='event_invitations')
    email = models.EmailField(blank=True, null=True)  # For external attendees
    name = models.CharField(max_length=100, blank=True, null=True)  # For external attendees
    response = models.CharField(max_length=10, choices=RESPONSE_CHOICES, default='pending')
    is_organizer = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['event', 'user']
    
    def __str__(self):
        attendee_name = self.user.full_name if self.user else self.name
        return f"{attendee_name} - {self.event.title} ({self.response})"


class EventReminder(models.Model):
    REMINDER_TYPES = [
        ('email', 'Email'),
        ('popup', 'Popup'),
        ('sms', 'SMS'),
    ]
    
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='reminders')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reminders')
    reminder_type = models.CharField(max_length=10, choices=REMINDER_TYPES, default='popup')
    minutes_before = models.PositiveIntegerField(default=15)  # Minutes before event
    is_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['event', 'user', 'reminder_type', 'minutes_before']
    
    def __str__(self):
        return f"{self.reminder_type} reminder for {self.event.title} ({self.minutes_before} min before)"


class Goal(models.Model):
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='goals')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    target_value = models.PositiveIntegerField(blank=True, null=True)  # For measurable goals
    current_value = models.PositiveIntegerField(default=0)  # Current progress
    unit = models.CharField(max_length=50, blank=True, null=True)  # e.g., "hours", "miles", "books"
    
    # Date fields
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    
    # Tracking
    color = models.CharField(max_length=7, default='#4CAF50')  # Green by default
    is_active = models.BooleanField(default=True)
    is_completed = models.BooleanField(default=False)  # Boolean completion status
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-priority', 'start_date']
    
    def __str__(self):
        return f"{self.title} ({self.frequency})"
    
    @property
    def progress_percentage(self):
        if self.target_value and self.target_value > 0:
            return min(100, (self.current_value / self.target_value) * 100)
        return 0


class Responsibility(models.Model):
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='responsibilities')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    
    # Assignment and tracking
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='assigned_responsibilities',
        blank=True, 
        null=True
    )  # Can be assigned to someone else
    
    # Date fields
    start_date = models.DateField()
    due_date = models.DateField(blank=True, null=True)
    completed_date = models.DateTimeField(blank=True, null=True)
    next_due_date = models.DateField(blank=True, null=True)  # For recurring responsibilities
    
    # Tracking
    estimated_hours = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    actual_hours = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    color = models.CharField(max_length=7, default='#FF9800')  # Orange by default
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['due_date', '-priority']
        verbose_name_plural = "Responsibilities"
    
    def __str__(self):
        return f"{self.title} ({self.frequency})"
    
    @property
    def is_overdue(self):
        if self.due_date and self.status == 'active':
            return timezone.now().date() > self.due_date
        return False
    
    def mark_completed(self):
        self.status = 'completed'
        self.completed_date = timezone.now()
        
        # Set next due date for recurring responsibilities
        if self.frequency == 'daily' and self.due_date:
            self.next_due_date = self.due_date + timezone.timedelta(days=1)
        elif self.frequency == 'weekly' and self.due_date:
            self.next_due_date = self.due_date + timezone.timedelta(weeks=1)
        elif self.frequency == 'monthly' and self.due_date:
            # Handle month boundaries properly
            from dateutil.relativedelta import relativedelta
            self.next_due_date = self.due_date + relativedelta(months=1)
        
        self.save()


class GoalProgress(models.Model):
    """Track daily/weekly/monthly progress towards goals"""
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='progress_entries')
    date = models.DateField()
    value = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['goal', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.goal.title} - {self.date} ({self.value})"


class ResponsibilityCompletion(models.Model):
    """Track completion instances of responsibilities"""
    responsibility = models.ForeignKey(Responsibility, on_delete=models.CASCADE, related_name='completions')
    completed_date = models.DateTimeField()
    hours_spent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    quality_rating = models.PositiveSmallIntegerField(blank=True, null=True)  # 1-5 scale
    
    class Meta:
        ordering = ['-completed_date']
    
    def __str__(self):
        return f"{self.responsibility.title} completed on {self.completed_date.date()}"
