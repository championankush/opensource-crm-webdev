import React from 'react';

const sampleContacts = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', phone: '555-1234', company: 'Acme Inc.' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', phone: '555-5678', company: 'Globex Corp.' },
  { id: 3, name: 'Carol Lee', email: 'carol@example.com', phone: '555-8765', company: 'Initech' },
];

const Contacts: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">Add Contact</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {sampleContacts.map((contact) => (
          <div key={contact.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-2 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-700">
                {contact.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="font-semibold text-lg text-gray-900">{contact.name}</div>
                <div className="text-sm text-gray-500">{contact.company}</div>
              </div>
            </div>
            <div className="text-sm text-gray-700">📧 {contact.email}</div>
            <div className="text-sm text-gray-700">📞 {contact.phone}</div>
            <div className="flex gap-2 mt-4">
              <button className="px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-xs font-medium">Edit</button>
              <button className="px-3 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100 text-xs font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Contacts; 