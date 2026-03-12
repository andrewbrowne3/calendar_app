import { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Plus, RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { fetchEvents, createEvent, deleteEvent } from '../store/slices/eventsSlice';
import { fetchCalendars } from '../store/slices/calendarsSlice';
import Modal from '../components/common/Modal';
import EventForm from '../components/calendar/EventForm';
import EventCard from '../components/calendar/EventCard';
import type { Event as CalEvent } from '../types';
import toast from 'react-hot-toast';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarPage.css';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    originalEvent: CalEvent;
    calendarColor: string;
  };
}

export const CalendarPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { events, isLoading: eventsLoading } = useAppSelector((state) => state.events);
  const { calendars, isLoading: calendarsLoading } = useAppSelector((state) => state.calendars);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    dispatch(fetchEvents({}));
    dispatch(fetchCalendars());
  }, [dispatch]);

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return events.map((event: CalEvent) => {
      const calendar = calendars.find((c: { id: string }) => c.id === event.calendar?.id);
      return {
        id: event.id,
        title: event.title,
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        allDay: event.all_day,
        resource: {
          originalEvent: event,
          calendarColor: calendar?.color || '#2196F3',
        },
      };
    });
  }, [events, calendars]);

  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      setSelectedSlotInfo(slotInfo);
      setShowEventModal(true);
    },
    []
  );

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  }, []);

  const handleRefresh = async () => {
    try {
      await Promise.all([
        dispatch(fetchEvents({})).unwrap(),
        dispatch(fetchCalendars()).unwrap(),
      ]);
      toast.success('Calendar refreshed');
    } catch {
      toast.error('Failed to refresh');
    }
  };

  const handleCreateEvent = async (eventData: {
    title: string;
    description: string;
    calendar: string;
    start_time: string;
    end_time: string;
    all_day: boolean;
    location: string;
    reminder_minutes: number[];
  }) => {
    try {
      await dispatch(createEvent(eventData)).unwrap();
      toast.success('Event created');
      setShowEventModal(false);
      setSelectedSlotInfo(null);
    } catch {
      toast.error('Failed to create event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await dispatch(deleteEvent(eventId)).unwrap();
        toast.success('Event deleted');
        setShowEventDetail(false);
        setSelectedEvent(null);
      } catch {
        toast.error('Failed to delete event');
      }
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = event.resource?.calendarColor || '#2196F3';
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
      },
    };
  };

  const isLoading = eventsLoading || calendarsLoading;

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <h1 className="calendar-title">Calendar</h1>
        <div className="calendar-actions">
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
          </button>
          <button
            className="create-event-btn"
            onClick={() => {
              setSelectedSlotInfo({
                start: new Date(),
                end: addHours(new Date(), 1),
              });
              setShowEventModal(true);
            }}
          >
            <Plus size={18} />
            New Event
          </button>
        </div>
      </div>

      <div className="calendar-container">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 'calc(100vh - 200px)' }}
          view={view}
          onView={(newView) => setView(newView)}
          date={selectedDate}
          onNavigate={(date) => setSelectedDate(date)}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day', 'agenda']}
        />
      </div>

      {/* Create Event Modal */}
      <Modal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedSlotInfo(null);
        }}
        title="Create Event"
      >
        <EventForm
          calendars={calendars}
          initialStart={selectedSlotInfo?.start}
          initialEnd={selectedSlotInfo?.end}
          onSubmit={handleCreateEvent}
          onCancel={() => {
            setShowEventModal(false);
            setSelectedSlotInfo(null);
          }}
          isLoading={eventsLoading}
        />
      </Modal>

      {/* Event Detail Modal */}
      <Modal
        isOpen={showEventDetail}
        onClose={() => {
          setShowEventDetail(false);
          setSelectedEvent(null);
        }}
        title="Event Details"
      >
        {selectedEvent && (
          <EventCard
            event={selectedEvent.resource?.originalEvent}
            onDelete={() => handleDeleteEvent(selectedEvent.id)}
            onClose={() => {
              setShowEventDetail(false);
              setSelectedEvent(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default CalendarPage;
