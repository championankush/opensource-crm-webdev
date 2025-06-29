import React from 'react';

const sampleTasks = [
  { id: 1, title: 'Follow up with Alice', due: '2024-07-01', status: 'Pending', assigned: 'Bob Smith' },
  { id: 2, title: 'Send proposal to Emma', due: '2024-07-03', status: 'Completed', assigned: 'Carol Lee' },
  { id: 3, title: 'Schedule demo', due: '2024-07-05', status: 'In Progress', assigned: 'David Kim' },
  { id: 4, title: 'Call new lead', due: '2024-07-06', status: 'Pending', assigned: 'Emma Brown' },
  { id: 5, title: 'Demo with client', due: '2024-07-07', status: 'In Progress', assigned: 'Frank Green' },
];

const statusColumns = [
  { label: 'Pending', color: 'bg-yellow-100', border: 'border-yellow-300' },
  { label: 'In Progress', color: 'bg-blue-100', border: 'border-blue-300' },
  { label: 'Completed', color: 'bg-green-100', border: 'border-green-300' },
];

const Tasks: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Tasks (Kanban Board)</h1>
      <div className="flex gap-6 overflow-x-auto">
        {statusColumns.map((col) => (
          <div key={col.label} className={`flex-1 min-w-[300px] ${col.color} ${col.border} border rounded-lg p-4 shadow-sm`}>
            <h2 className="font-semibold text-lg mb-4">{col.label}</h2>
            <div className="flex flex-col gap-4">
              {sampleTasks.filter((t) => t.status === col.label).map((task) => (
                <div key={task.id} className="bg-white rounded p-4 shadow flex flex-col gap-1 border border-slate-200">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-slate-500">Due: {task.due}</div>
                  <div className="text-xs text-slate-400">Assigned: {task.assigned}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tasks; 