import { format } from 'date-fns';
import { MapPin, Clock, Calendar, Trash2 } from 'lucide-react';
import type { Event } from '../../types';
import './EventCard.css';

interface EventCardProps {
  event?: Event;
  onDelete: () => void;
  onClose: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onDelete, onClose }) => {
  if (!event) return null;

  const formatEventTime = () => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);

    if (event.all_day) return 'All day';

    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  const formatEventDate = () => {
    const start = new Date(event.start_time);
    return format(start, 'EEEE, MMMM d, yyyy');
  };

  return (
    <div className="event-card">
      <div
        className="event-card-accent"
        style={{ backgroundColor: event.calendar?.color || '#2196F3' }}
      />

      <div className="event-card-content">
        <h3 className="event-card-title">{event.title}</h3>

        <div className="event-card-details">
          <div className="event-card-detail">
            <Calendar size={16} />
            <span>{formatEventDate()}</span>
          </div>

          <div className="event-card-detail">
            <Clock size={16} />
            <span>{formatEventTime()}</span>
          </div>

          {event.location && (
            <div className="event-card-detail">
              <MapPin size={16} />
              <span>{event.location}</span>
            </div>
          )}

          {event.calendar && (
            <div className="event-card-detail">
              <div
                className="calendar-dot"
                style={{ backgroundColor: event.calendar.color }}
              />
              <span>{event.calendar.name}</span>
            </div>
          )}
        </div>

        {event.description && (
          <div className="event-card-description">
            <p>{event.description}</p>
          </div>
        )}

        <div className="event-card-actions">
          <button className="btn btn-danger" onClick={onDelete}>
            <Trash2 size={16} />
            Delete
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
