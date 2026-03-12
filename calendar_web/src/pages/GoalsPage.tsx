import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useGoals } from '../hooks/useGoals';
import Modal from '../components/common/Modal';
import GoalCard from '../components/goals/GoalCard';
import GoalForm from '../components/goals/GoalForm';
import type { Goal } from '../types';
import toast from 'react-hot-toast';
import './GoalsPage.css';

export const GoalsPage: React.FC = () => {
  const {
    activeGoals,
    completedGoals,
    isLoading,
    loadGoals,
    addGoal,
    deleteGoal,
    toggleGoalCompletion,
  } = useGoals();

  const [showCompleted, setShowCompleted] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const displayGoals = showCompleted ? completedGoals : activeGoals;

  const handleRefresh = async () => {
    try {
      await loadGoals();
      toast.success('Goals refreshed');
    } catch {
      toast.error('Failed to refresh');
    }
  };

  const handleCreateGoal = async (goalData: {
    title: string;
    description: string;
    priority: string;
    frequency: string;
    target_value?: number;
    unit?: string;
  }) => {
    try {
      await addGoal({
        title: goalData.title,
        description: goalData.description,
        priority: goalData.priority as Goal['priority'],
        frequency: goalData.frequency as Goal['frequency'],
        target_value: goalData.target_value,
        unit: goalData.unit,
        color: '#2196F3',
        current_value: 0,
        start_date: new Date().toISOString().split('T')[0],
      });
      toast.success('Goal created');
      setShowCreateModal(false);
    } catch {
      toast.error('Failed to create goal');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
        toast.success('Goal deleted');
      } catch {
        toast.error('Failed to delete goal');
      }
    }
  };

  const handleToggleCompletion = (goalId: string) => {
    toggleGoalCompletion(goalId);
  };

  return (
    <div className="goals-page">
      <div className="goals-header">
        <div className="goals-header-left">
          <h1 className="goals-title">Goals</h1>
          <p className="goals-subtitle">
            {activeGoals.length} active &bull; {completedGoals.length} completed
          </p>
        </div>
        <div className="goals-actions">
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? 'spinning' : ''} />
          </button>
          <button
            className="create-goal-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />
            New Goal
          </button>
        </div>
      </div>

      <div className="goals-filter">
        <button
          className={`filter-btn ${!showCompleted ? 'active' : ''}`}
          onClick={() => setShowCompleted(false)}
        >
          Active ({activeGoals.length})
        </button>
        <button
          className={`filter-btn ${showCompleted ? 'active' : ''}`}
          onClick={() => setShowCompleted(true)}
        >
          Completed ({completedGoals.length})
        </button>
      </div>

      <div className="goals-list">
        {displayGoals.length === 0 ? (
          <div className="empty-state">
            <h3>{showCompleted ? 'No completed goals yet' : 'No active goals'}</h3>
            <p>
              {showCompleted
                ? 'Complete some goals to see them here!'
                : 'Create your first goal to get started'}
            </p>
            {!showCompleted && (
              <button
                className="create-goal-btn"
                onClick={() => setShowCreateModal(true)}
              >
                Create Goal
              </button>
            )}
          </div>
        ) : (
          displayGoals.map((goal: Goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onToggleCompletion={handleToggleCompletion}
              onDelete={handleDeleteGoal}
            />
          ))
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Goal"
      >
        <GoalForm
          onSubmit={handleCreateGoal}
          onCancel={() => setShowCreateModal(false)}
          isLoading={isLoading}
        />
      </Modal>
    </div>
  );
};

export default GoalsPage;
