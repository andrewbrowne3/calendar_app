import { useState } from 'react';
import type { Calendar } from '../../types';
import './EventForm.css';

interface EventFormProps {
  calendars: Calendar[];
  initialStart?: Date;
  initialEnd?: Date;
  onSubmit: (eventData: {
    title: string;
    description: string;
    calendar: string;
    start_time: string;
    end_time: string;
    all_day: boolean;
    location: string;
    reminder_minutes: number[];
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const formatDateTimeLocal = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

export const EventForm: React.FC<EventFormProps> = ({
  calendars,
  initialStart,
  initialEnd,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [calendarId, setCalendarId] = useState(calendars[0]?.id || '');
  const [startTime, setStartTime] = useState(
    initialStart ? formatDateTimeLocal(initialStart) : formatDateTimeLocal(new Date())
  );
  const [endTime, setEndTime] = useState(
    initialEnd
      ? formatDateTimeLocal(initialEnd)
      : formatDateTimeLocal(new Date(Date.now() + 3600000))
  );
  const [allDay, setAllDay] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([15]);

  const reminderOptions = [
    { label: '5 min', value: 5 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '1 day', value: 1440 },
  ];

  const toggleReminder = (value: number) => {
    setReminderMinutes(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!calendarId) {
      alert('Please select a calendar');
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      calendar: calendarId,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      all_day: allDay,
      location: location.trim(),
      reminder_minutes: reminderMinutes,
    });
  };

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Title *</label>
        <input
          type="text"
          className="form-input"
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Calendar *</label>
        <select
          className="form-select"
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          disabled={isLoading}
        >
          {calendars.map((cal) => (
            <option key={cal.id} value={cal.id}>
              {cal.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start</label>
          <input
            type="datetime-local"
            className="form-input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            disabled={isLoading || allDay}
          />
        </div>
        <div className="form-group">
          <label className="form-label">End</label>
          <input
            type="datetime-local"
            className="form-input"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={isLoading || allDay}
          />
        </div>
      </div>

      <div className="form-group form-checkbox">
        <input
          type="checkbox"
          id="allDay"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          disabled={isLoading}
        />
        <label htmlFor="allDay">All day event</label>
      </div>

      <div className="form-group">
        <label className="form-label">Location</label>
        <input
          type="text"
          className="form-input"
          placeholder="Event location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Reminders</label>
        <div className="reminder-pills">
          {reminderOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`reminder-pill${reminderMinutes.includes(opt.value) ? ' active' : ''}`}
              onClick={() => toggleReminder(opt.value)}
              disabled={isLoading}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-textarea"
          placeholder="Event description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </form>
  );
};

export default EventForm;
