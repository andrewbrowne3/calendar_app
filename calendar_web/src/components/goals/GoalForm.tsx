import { useState } from 'react';
import './GoalForm.css';

interface GoalFormProps {
  onSubmit: (goalData: {
    title: string;
    description: string;
    priority: string;
    frequency: string;
    target_value?: number;
    unit?: string;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const GoalForm: React.FC<GoalFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [frequency, setFrequency] = useState('weekly');
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    const goalData: {
      title: string;
      description: string;
      priority: string;
      frequency: string;
      target_value?: number;
      unit?: string;
    } = {
      title: title.trim(),
      description: description.trim(),
      priority,
      frequency,
    };

    if (hasTarget && targetValue) {
      goalData.target_value = parseInt(targetValue, 10);
      goalData.unit = unit.trim();
    }

    onSubmit(goalData);
  };

  return (
    <form className="goal-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Title *</label>
        <input
          type="text"
          className="form-input"
          placeholder="Goal title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-textarea"
          placeholder="Goal description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
          rows={2}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select
            className="form-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={isLoading}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Frequency</label>
          <select
            className="form-select"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            disabled={isLoading}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      <div className="form-group form-checkbox">
        <input
          type="checkbox"
          id="hasTarget"
          checked={hasTarget}
          onChange={(e) => setHasTarget(e.target.checked)}
          disabled={isLoading}
        />
        <label htmlFor="hasTarget">Set a target value</label>
      </div>

      {hasTarget && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Target</label>
            <input
              type="number"
              className="form-input"
              placeholder="100"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              disabled={isLoading}
              min="1"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Unit</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., pages, hours"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      )}

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
          {isLoading ? 'Creating...' : 'Create Goal'}
        </button>
      </div>
    </form>
  );
};

export default GoalForm;
