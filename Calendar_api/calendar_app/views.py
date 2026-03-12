from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from datetime import datetime, timedelta
from .models import (
    Calendar, CalendarShare, Event, EventAttendee, EventReminder,
    Goal, Responsibility, GoalProgress, ResponsibilityCompletion
)
from .serializers import (
    CalendarSerializer, 
    CalendarShareSerializer, 
    EventSerializer, 
    EventCreateSerializer,
    EventAttendeeSerializer,
    EventReminderSerializer,
    GoalSerializer,
    ResponsibilitySerializer,
    GoalProgressSerializer,
    ResponsibilityCompletionSerializer
)
from authentication.models import User


# Calendar Views
@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def calendar_list(request):
    if request.method == 'GET':
        # Get user's own calendars and shared calendars
        owned_calendars = Calendar.objects.filter(owner=request.user, is_active=True)
        shared_calendars = Calendar.objects.filter(
            shares__user=request.user, 
            is_active=True
        ).distinct()
        
        all_calendars = owned_calendars.union(shared_calendars).order_by('name')
        serializer = CalendarSerializer(all_calendars, many=True, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = CalendarSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def calendar_detail(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)
    
    # Check permissions
    if calendar.owner != request.user:
        try:
            share = CalendarShare.objects.get(calendar=calendar, user=request.user)
            if request.method in ['PUT', 'PATCH', 'DELETE'] and share.permission != 'manage':
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        except CalendarShare.DoesNotExist:
            return Response({'error': 'Calendar not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = CalendarSerializer(calendar, context={'request': request})
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = CalendarSerializer(calendar, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        if calendar.owner != request.user:
            return Response({'error': 'Only calendar owner can delete'}, status=status.HTTP_403_FORBIDDEN)
        calendar.is_active = False
        calendar.save()
        return Response({'message': 'Calendar deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def calendar_shares(request, calendar_id):
    calendar = get_object_or_404(Calendar, id=calendar_id)
    
    # Only owner or users with manage permission can view/manage shares
    if calendar.owner != request.user:
        try:
            share = CalendarShare.objects.get(calendar=calendar, user=request.user)
            if share.permission != 'manage':
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        except CalendarShare.DoesNotExist:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'GET':
        shares = CalendarShare.objects.filter(calendar=calendar)
        serializer = CalendarShareSerializer(shares, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        try:
            user_email = request.data.get('user_email')
            user = User.objects.get(email=user_email)
            
            share, created = CalendarShare.objects.get_or_create(
                calendar=calendar,
                user=user,
                defaults={'permission': request.data.get('permission', 'view')}
            )
            
            if not created:
                share.permission = request.data.get('permission', share.permission)
                share.save()
            
            serializer = CalendarShareSerializer(share)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


# Event Views
@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def event_list(request):
    if request.method == 'GET':
        # Get events from user's calendars
        calendar_ids = Calendar.objects.filter(
            Q(owner=request.user) | Q(shares__user=request.user),
            is_active=True
        ).values_list('id', flat=True)
        
        events = Event.objects.filter(calendar_id__in=calendar_ids)
        
        # Filter by date range if provided
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            events = events.filter(start_time__gte=start_date)
        if end_date:
            events = events.filter(end_time__lte=end_date)
        
        # Filter by calendar if provided
        calendar_id = request.query_params.get('calendar_id')
        if calendar_id:
            events = events.filter(calendar_id=calendar_id)
        
        events = events.order_by('start_time')
        serializer = EventSerializer(events, many=True, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = EventCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            event = serializer.save()
            response_serializer = EventSerializer(event, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def event_detail(request, event_id):
    event = get_object_or_404(Event, id=event_id)
    
    # Check permissions
    calendar = event.calendar
    if calendar.owner != request.user:
        try:
            share = CalendarShare.objects.get(calendar=calendar, user=request.user)
            if request.method in ['PUT', 'PATCH', 'DELETE'] and share.permission == 'view':
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        except CalendarShare.DoesNotExist:
            return Response({'error': 'Event not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = EventSerializer(event, context={'request': request})
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = EventSerializer(event, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        event.delete()
        return Response({'message': 'Event deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def event_attendee_response(request, event_id):
    event = get_object_or_404(Event, id=event_id)
    
    try:
        attendee = EventAttendee.objects.get(event=event, user=request.user)
        attendee.response = request.data.get('response', 'pending')
        attendee.save()
        
        serializer = EventAttendeeSerializer(attendee)
        return Response(serializer.data)
    
    except EventAttendee.DoesNotExist:
        return Response({'error': 'You are not invited to this event'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def event_reminders(request, event_id):
    event = get_object_or_404(Event, id=event_id)
    
    if request.method == 'GET':
        reminders = EventReminder.objects.filter(event=event, user=request.user)
        serializer = EventReminderSerializer(reminders, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = EventReminderSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(event=event, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Goal Views
@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def goal_list(request):
    if request.method == 'GET':
        goals = Goal.objects.filter(user=request.user, is_active=True)
        
        # Filter by frequency if provided
        frequency = request.query_params.get('frequency')
        if frequency:
            goals = goals.filter(frequency=frequency)
        
        # Filter by status if provided
        goal_status = request.query_params.get('status')
        if goal_status:
            goals = goals.filter(status=goal_status)
        
        serializer = GoalSerializer(goals, many=True, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = GoalSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def goal_detail(request, goal_id):
    goal = get_object_or_404(Goal, id=goal_id, user=request.user)
    
    if request.method == 'GET':
        serializer = GoalSerializer(goal, context={'request': request})
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = GoalSerializer(goal, data=request.data, partial=partial, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        goal.is_active = False
        goal.save()
        return Response({'message': 'Goal deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def goal_progress(request, goal_id):
    goal = get_object_or_404(Goal, id=goal_id, user=request.user)
    
    serializer = GoalProgressSerializer(data=request.data)
    if serializer.is_valid():
        progress = serializer.save(goal=goal)
        
        # Update goal's current value
        goal.current_value += progress.value
        goal.save()
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Responsibility Views
@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAuthenticated])
def responsibility_list(request):
    if request.method == 'GET':
        # Get responsibilities created by user or assigned to user
        responsibilities = Responsibility.objects.filter(
            Q(user=request.user) | Q(assigned_to=request.user),
            is_active=True
        )
        
        # Filter by frequency if provided
        frequency = request.query_params.get('frequency')
        if frequency:
            responsibilities = responsibilities.filter(frequency=frequency)
        
        # Filter by status if provided
        resp_status = request.query_params.get('status')
        if resp_status:
            responsibilities = responsibilities.filter(status=resp_status)
        
        # Filter by assignment
        assigned_filter = request.query_params.get('assigned')
        if assigned_filter == 'me':
            responsibilities = responsibilities.filter(assigned_to=request.user)
        elif assigned_filter == 'created':
            responsibilities = responsibilities.filter(user=request.user)
        
        serializer = ResponsibilitySerializer(responsibilities, many=True, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = ResponsibilitySerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([permissions.IsAuthenticated])
def responsibility_detail(request, responsibility_id):
    responsibility = get_object_or_404(
        Responsibility, 
        id=responsibility_id, 
        user=request.user
    )
    
    if request.method == 'GET':
        serializer = ResponsibilitySerializer(responsibility, context={'request': request})
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = ResponsibilitySerializer(
            responsibility, 
            data=request.data, 
            partial=partial, 
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        responsibility.is_active = False
        responsibility.save()
        return Response({'message': 'Responsibility deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def responsibility_complete(request, responsibility_id):
    responsibility = get_object_or_404(
        Responsibility, 
        id=responsibility_id, 
        assigned_to=request.user
    )
    
    serializer = ResponsibilityCompletionSerializer(data=request.data)
    if serializer.is_valid():
        completion = serializer.save(responsibility=responsibility)
        
        # Mark responsibility as completed and set next due date
        responsibility.mark_completed()
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_summary(request):
    """Get dashboard summary with goals and responsibilities overview"""
    user = request.user
    
    # Goals summary
    active_goals = Goal.objects.filter(user=user, is_active=True, status='active')
    completed_goals = Goal.objects.filter(user=user, status='completed')
    
    # Responsibilities summary
    active_responsibilities = Responsibility.objects.filter(
        Q(user=user) | Q(assigned_to=user),
        is_active=True,
        status='active'
    )
    overdue_responsibilities = [r for r in active_responsibilities if r.is_overdue]
    
    # Goals by frequency
    daily_goals = active_goals.filter(frequency='daily').count()
    weekly_goals = active_goals.filter(frequency='weekly').count()
    monthly_goals = active_goals.filter(frequency='monthly').count()
    yearly_goals = active_goals.filter(frequency='yearly').count()
    
    # Responsibilities by frequency
    daily_responsibilities = active_responsibilities.filter(frequency='daily').count()
    weekly_responsibilities = active_responsibilities.filter(frequency='weekly').count()
    monthly_responsibilities = active_responsibilities.filter(frequency='monthly').count()
    
    return Response({
        'goals': {
            'total_active': active_goals.count(),
            'total_completed': completed_goals.count(),
            'by_frequency': {
                'daily': daily_goals,
                'weekly': weekly_goals,
                'monthly': monthly_goals,
                'yearly': yearly_goals,
            }
        },
        'responsibilities': {
            'total_active': active_responsibilities.count(),
            'overdue_count': len(overdue_responsibilities),
            'by_frequency': {
                'daily': daily_responsibilities,
                'weekly': weekly_responsibilities,
                'monthly': monthly_responsibilities,
            }
        }
    })
