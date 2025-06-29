import React from 'react';

const sampleUsers = [
  { id: 1, name: 'Admin User', email: 'admin@crm.com', role: 'Admin', joined: '2024-01-01' },
  { id: 2, name: 'Sales Rep', email: 'sales@crm.com', role: 'Sales', joined: '2024-02-15' },
  { id: 3, name: 'Support Agent', email: 'support@crm.com', role: 'Support', joined: '2024-03-10' },
];

const roleColors: Record<string, string> = {
  'Admin': 'bg-blue-100 text-blue-800',
  'Sales': 'bg-green-100 text-green-800',
  'Support': 'bg-yellow-100 text-yellow-800',
};

const Users: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition">Add User</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {sampleUsers.map((user) => (
          <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-2 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-700">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="font-semibold text-lg text-gray-900">{user.name}</div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>{user.role}</div>
              </div>
            </div>
            <div className="text-sm text-gray-700">📧 {user.email}</div>
            <div className="text-sm text-gray-700">Joined: {user.joined}</div>
            <div className="flex gap-2 mt-4">
              <button className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 text-xs font-medium">Edit</button>
              <button className="px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 text-xs font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Users; 