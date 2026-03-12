import { User, Mail, Clock, Calendar, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppDispatch';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import './ProfilePage.css';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { logout, isLoading } = useAuth();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await logout();
        toast.success('Logged out successfully');
        navigate('/login');
      } catch {
        toast.error('Failed to logout');
      }
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="profile-page">
      <h1 className="profile-title">Profile</h1>

      <div className="profile-card">
        <div className="profile-avatar">
          {user.profile_picture ? (
            <img src={user.profile_picture} alt={user.full_name} />
          ) : (
            <div className="avatar-placeholder">
              <User size={48} />
            </div>
          )}
        </div>

        <div className="profile-info">
          <h2 className="profile-name">{user.full_name || user.username}</h2>
          <p className="profile-email">{user.email}</p>
        </div>
      </div>

      <div className="profile-details">
        <h3 className="section-title">Account Details</h3>

        <div className="detail-row">
          <div className="detail-icon">
            <Mail size={20} />
          </div>
          <div className="detail-content">
            <span className="detail-label">Email</span>
            <span className="detail-value">{user.email}</span>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-icon">
            <User size={20} />
          </div>
          <div className="detail-content">
            <span className="detail-label">Username</span>
            <span className="detail-value">{user.username}</span>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-icon">
            <Clock size={20} />
          </div>
          <div className="detail-content">
            <span className="detail-label">Timezone</span>
            <span className="detail-value">{user.timezone}</span>
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-icon">
            <Calendar size={20} />
          </div>
          <div className="detail-content">
            <span className="detail-label">Member since</span>
            <span className="detail-value">{formatDate(user.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <button
          className="logout-btn"
          onClick={handleLogout}
          disabled={isLoading}
        >
          <LogOut size={20} />
          {isLoading ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
