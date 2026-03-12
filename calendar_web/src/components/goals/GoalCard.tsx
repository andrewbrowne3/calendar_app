import { Check, Trash2 } from 'lucide-react';
import type { Goal } from '../../types';
import { COLORS } from '../../utils/config';
import './GoalCard.css';

interface GoalCardProps {
  goal: Goal;
  onToggleCompletion: (goalId: string) => void;
  onDelete: (goalId: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onToggleCompletion,
  onDelete,
}) => {
  const priorityColor = COLORS.PRIORITY[goal.priority] || COLORS.PRIMARY;

  const formatProgress = () => {
    if (goal.target_value) {
      return `${goal.current_value}/${goal.target_value} ${goal.unit || ''}`;
    }
    return `${goal.progress_percentage}%`;
  };

  return (
    <div className={`goal-card ${goal.is_completed ? 'completed' : ''}`}>
      <button
        className={`goal-checkbox ${goal.is_completed ? 'checked' : ''}`}
        onClick={() => onToggleCompletion(goal.id)}
        style={{ borderColor: priorityColor }}
      >
        {goal.is_completed && <Check size={14} color="white" />}
      </button>

      <div className="goal-content">
        <div className="goal-header">
          <h3 className="goal-title">{goal.title}</h3>
          <span
            className="goal-priority"
            style={{ backgroundColor: priorityColor }}
          >
            {goal.priority}
          </span>
        </div>

        {goal.description && (
          <p className="goal-description">{goal.description}</p>
        )}

        <div className="goal-meta">
          <span className="goal-frequency">{goal.frequency}</span>
          <span className="goal-progress">{formatProgress()}</span>
        </div>

        {goal.target_value && (
          <div className="goal-progress-bar">
            <div
              className="goal-progress-fill"
              style={{
                width: `${goal.progress_percentage}%`,
                backgroundColor: priorityColor,
              }}
            />
          </div>
        )}
      </div>

      <button
        className="goal-delete"
        onClick={() => onDelete(goal.id)}
        title="Delete goal"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default GoalCard;
