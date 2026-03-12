import { NavLink, useNavigate } from 'react-router-dom';
import { Calendar, Target, MessageSquare, User, LogOut, DollarSign } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/goals', icon: Target, label: 'Goals' },
    { path: '/finances', icon: DollarSign, label: 'Finances' },
    { path: '/chat', icon: MessageSquare, label: 'AI Assistant' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Calendar size={32} color="#2196F3" />
          <span className="sidebar-logo-text">Friday</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
