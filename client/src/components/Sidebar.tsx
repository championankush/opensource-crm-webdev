import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Users, 
  UserPlus, 
  Briefcase, 
  CheckSquare, 
  Settings,
  X,
  BarChart3
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/contacts', icon: Users, label: 'Contacts' },
    { path: '/leads', icon: UserPlus, label: 'Leads' },
    { path: '/deals', icon: Briefcase, label: 'Deals' },
    { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { path: '/users', icon: Settings, label: 'Users' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${open ? 'sidebar-open' : ''} lg:translate-x-0`}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">CRM</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`
                }
                onClick={onClose}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <NavLink
              to="/profile"
              className="sidebar-item"
              onClick={onClose}
            >
              <Users className="h-5 w-5 mr-3" />
              Profile
            </NavLink>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 