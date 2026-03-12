import { useAppSelector } from '../../hooks/useAppDispatch';
import { User, Bell } from 'lucide-react';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">Friday Calendar</h1>
      </div>
      <div className="navbar-right">
        <button className="navbar-icon-btn">
          <Bell size={20} />
        </button>
        <div className="navbar-user">
          <User size={20} />
          <span className="navbar-user-name">
            {user?.first_name || user?.email || 'User'}
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
