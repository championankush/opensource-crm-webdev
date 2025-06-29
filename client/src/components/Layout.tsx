import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const navLinks = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Contacts', path: '/contacts' },
  { name: 'Leads', path: '/leads' },
  { name: 'Deals', path: '/deals' },
  { name: 'Tasks', path: '/tasks' },
  { name: 'Users', path: '/users' },
  { name: 'Profile', path: '/profile' },
];

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header navLinks={navLinks} />
      <main className="pt-20 max-w-7xl mx-auto w-full">
        <div className="container mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout; 