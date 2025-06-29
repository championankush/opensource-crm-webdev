import React from 'react';

const sampleDeals = [
  { id: 1, name: 'Website Redesign', value: '$5,000', stage: 'Negotiation', owner: 'Alice Johnson' },
  { id: 2, name: 'CRM Implementation', value: '$12,000', stage: 'Proposal', owner: 'Bob Smith' },
  { id: 3, name: 'Annual Subscription', value: '$2,400', stage: 'Closed Won', owner: 'Carol Lee' },
];

const stageColors: Record<string, string> = {
  'Negotiation': 'bg-blue-100 text-blue-800',
  'Proposal': 'bg-yellow-100 text-yellow-800',
  'Closed Won': 'bg-green-100 text-green-800',
};

const Deals: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Deals</h1>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition">Add Deal</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {sampleDeals.map((deal) => (
          <div key={deal.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-2 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-lg font-bold text-purple-700">
                {deal.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="font-semibold text-lg text-gray-900">{deal.name}</div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${stageColors[deal.stage] || 'bg-gray-100 text-gray-800'}`}>{deal.stage}</div>
              </div>
            </div>
            <div className="text-sm text-gray-700">Value: {deal.value}</div>
            <div className="text-sm text-gray-700">Owner: {deal.owner}</div>
            <div className="flex gap-2 mt-4">
              <button className="px-3 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 text-xs font-medium">Edit</button>
              <button className="px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 text-xs font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Deals; 