import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';

interface NavLink {
  name: string;
  path: string;
}

const Header: React.FC<{ navLinks: NavLink[] }> = ({ navLinks }) => {
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = [
    { id: 1, type: 'task', message: 'New task assigned: Call client', time: '2m ago' },
    { id: 2, type: 'deal', message: 'Deal closed: Acme Corp', time: '1h ago' },
    { id: 3, type: 'reminder', message: 'Follow up with John Doe', time: '3h ago' },
  ];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (value.trim() === '') {
      setResults(null);
      setShowDropdown(false);
      return;
    }
    timeoutRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(value)}`)
        .then(res => res.json())
        .then(data => {
          setResults(data);
          setShowDropdown(true);
        });
    }, 300);
  };

  const handleResultClick = (type: string, id: number) => {
    setShowDropdown(false);
    setSearch('');
    setResults(null);
    if (type === 'contacts') window.location.href = `/contacts/${id}`;
    if (type === 'leads') window.location.href = `/leads/${id}`;
    if (type === 'deals') window.location.href = `/deals/${id}`;
    if (type === 'tasks') window.location.href = `/tasks/${id}`;
  };

  return (
    <header className="w-full bg-white dark:bg-gray-900 shadow flex items-center justify-between px-6 py-3">
      <div className="flex-1 flex items-center">
        <div className="font-bold text-xl text-blue-600 mr-8">Open Source CRM</div>
        <nav className="flex gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`font-medium hover:text-blue-600 transition-colors ${location.pathname === link.path ? 'text-blue-600' : 'text-slate-700'}`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-md">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={handleSearch}
            onFocus={() => search && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Search contacts, leads, deals, tasks..."
            className="w-full px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
          {showDropdown && results && (
            <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {['contacts', 'leads', 'deals', 'tasks'].map(type =>
                results[type] && results[type].length > 0 ? (
                  <div key={type}>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">{type}</div>
                    {results[type].map((item: any) => (
                      <button
                        key={item.id}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 transition"
                        onMouseDown={() => handleResultClick(type, item.id)}
                      >
                        {type === 'contacts' && `${item.first_name} ${item.last_name} (${item.email})`}
                        {type === 'leads' && `${item.name} (${item.status})`}
                        {type === 'deals' && `${item.title} (${item.stage})`}
                        {type === 'tasks' && `${item.title} (${item.status})`}
                      </button>
                    ))}
                  </div>
                ) : null
              )}
              {['contacts', 'leads', 'deals', 'tasks'].every(type => !results[type] || results[type].length === 0) && (
                <div className="px-4 py-2 text-gray-400 text-sm">No results found.</div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-end">
        {/* Notifications Bell */}
        <div className="relative">
          <button
            className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-gray-800 focus:outline-none"
            onClick={() => setNotifOpen(v => !v)}
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6 text-gray-600 dark:text-gray-200" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">{notifications.length}</span>
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
              <div className="px-4 py-2 font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700">Notifications</div>
              {notifications.length === 0 ? (
                <div className="px-4 py-4 text-gray-400 text-sm">No notifications.</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-gray-700 transition">
                    {/* Icon by type */}
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: n.type === 'task' ? '#3b82f6' : n.type === 'deal' ? '#10b981' : '#f59e42' }}></span>
                    <div className="flex-1">
                      <div className="text-sm text-gray-800 dark:text-gray-100">{n.message}</div>
                      <div className="text-xs text-gray-400 mt-1">{n.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 