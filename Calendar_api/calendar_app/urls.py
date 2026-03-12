from django.urls import path
from . import views

urlpatterns = [
    # Calendar URLs
    path('calendars/', views.calendar_list, name='calendar_list'),
    path('calendars/<uuid:calendar_id>/', views.calendar_detail, name='calendar_detail'),
    path('calendars/<uuid:calendar_id>/shares/', views.calendar_shares, name='calendar_shares'),
    
    # Event URLs
    path('events/', views.event_list, name='event_list'),
    path('events/<uuid:event_id>/', views.event_detail, name='event_detail'),
    path('events/<uuid:event_id>/response/', views.event_attendee_response, name='event_attendee_response'),
    path('events/<uuid:event_id>/reminders/', views.event_reminders, name='event_reminders'),
    
    # Goal URLs
    path('goals/', views.goal_list, name='goal_list'),
    path('goals/<uuid:goal_id>/', views.goal_detail, name='goal_detail'),
    path('goals/<uuid:goal_id>/progress/', views.goal_progress, name='goal_progress'),
    
    # Responsibility URLs
    path('responsibilities/', views.responsibility_list, name='responsibility_list'),
    path('responsibilities/<uuid:responsibility_id>/', views.responsibility_detail, name='responsibility_detail'),
    path('responsibilities/<uuid:responsibility_id>/complete/', views.responsibility_complete, name='responsibility_complete'),
    
    # Dashboard
    path('dashboard/', views.dashboard_summary, name='dashboard_summary'),
]