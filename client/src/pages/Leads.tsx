import React from 'react';

const sampleLeads = [
  { id: 1, name: 'David Kim', email: 'david@example.com', status: 'New', source: 'Website' },
  { id: 2, name: 'Emma Brown', email: 'emma@example.com', status: 'Contacted', source: 'Referral' },
  { id: 3, name: 'Frank Green', email: 'frank@example.com', status: 'Qualified', source: 'Event' },
];

const statusColors: Record<string, string> = {
  'New': 'bg-blue-100 text-blue-800',
  'Contacted': 'bg-yellow-100 text-yellow-800',
  'Qualified': 'bg-green-100 text-green-800',
};

const Leads: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition">Add Lead</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {sampleLeads.map((lead) => (
          <div key={lead.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-2 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-lg font-bold text-green-700">
                {lead.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="font-semibold text-lg text-gray-900">{lead.name}</div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>{lead.status}</div>
              </div>
            </div>
            <div className="text-sm text-gray-700">📧 {lead.email}</div>
            <div className="text-sm text-gray-700">Source: {lead.source}</div>
            <div className="flex gap-2 mt-4">
              <button className="px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 text-xs font-medium">Edit</button>
              <button className="px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 text-xs font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leads; 