import React from 'react';

const user = {
  name: 'Admin User',
  email: 'admin@crm.com',
  role: 'Admin',
  avatar: 'https://ui-avatars.com/api/?name=Admin+User',
  joined: '2024-01-01',
};

const roleColors: Record<string, string> = {
  'Admin': 'bg-blue-100 text-blue-800',
  'Sales': 'bg-green-100 text-green-800',
  'Support': 'bg-yellow-100 text-yellow-800',
};

const Profile: React.FC = () => {
  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md flex flex-col items-center gap-4">
        <img
          src={user.avatar}
          alt="Avatar"
          className="w-24 h-24 rounded-full mb-2 border-4 border-blue-200 shadow"
        />
        <h2 className="text-2xl font-bold mb-1 text-gray-900">{user.name}</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>{user.role}</span>
        <p className="text-gray-500 mb-2">{user.email}</p>
        <p className="text-xs text-gray-400 mb-4">Joined: {user.joined}</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">Edit Profile</button>
      </div>
    </div>
  );
};

export default Profile; 