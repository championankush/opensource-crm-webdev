import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  CheckCircle,
  Calendar,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface DashboardData {
  stats: {
    totalContacts: number;
    totalLeads: number;
    totalDeals: number;
    totalTasks: number;
  };
  recentActivities: Array<{
    id: number;
    type: string;
    description: string;
    time: string;
  }>;
  topDeals: Array<{
    id: number;
    name: string;
    value: string;
    stage: string;
  }>;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const dashboardData = await response.json();
          setData(dashboardData);
        } else {
          // Use sample data if API fails
          setData({
            stats: {
              totalContacts: 1247,
              totalLeads: 89,
              totalDeals: 23,
              totalTasks: 45
            },
            recentActivities: [
              { id: 1, type: 'contact', description: 'New contact added: Alice Johnson', time: '2 hours ago' },
              { id: 2, type: 'deal', description: 'Deal closed: Website Redesign ($5,000)', time: '4 hours ago' },
              { id: 3, type: 'task', description: 'Task completed: Follow up with client', time: '6 hours ago' },
              { id: 4, type: 'lead', description: 'Lead qualified: Emma Brown', time: '1 day ago' }
            ],
            topDeals: [
              { id: 1, name: 'Enterprise CRM Implementation', value: '$25,000', stage: 'Negotiation' },
              { id: 2, name: 'Website Redesign Project', value: '$12,000', stage: 'Proposal' },
              { id: 3, name: 'Annual Software License', value: '$8,400', stage: 'Closed Won' },
              { id: 4, name: 'Consulting Services', value: '$6,500', stage: 'Qualification' }
            ]
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Use sample data on error
        setData({
          stats: {
            totalContacts: 1247,
            totalLeads: 89,
            totalDeals: 23,
            totalTasks: 45
          },
          recentActivities: [
            { id: 1, type: 'contact', description: 'New contact added: Alice Johnson', time: '2 hours ago' },
            { id: 2, type: 'deal', description: 'Deal closed: Website Redesign ($5,000)', time: '4 hours ago' },
            { id: 3, type: 'task', description: 'Task completed: Follow up with client', time: '6 hours ago' },
            { id: 4, type: 'lead', description: 'Lead qualified: Emma Brown', time: '1 day ago' }
          ],
          topDeals: [
            { id: 1, name: 'Enterprise CRM Implementation', value: '$25,000', stage: 'Negotiation' },
            { id: 2, name: 'Website Redesign Project', value: '$12,000', stage: 'Proposal' },
            { id: 3, name: 'Annual Software License', value: '$8,400', stage: 'Closed Won' },
            { id: 4, name: 'Consulting Services', value: '$6,500', stage: 'Qualification' }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contact': return <Users className="w-4 h-4" />;
      case 'deal': return <DollarSign className="w-4 h-4" />;
      case 'task': return <CheckCircle className="w-4 h-4" />;
      case 'lead': return <Target className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Closed Won': return 'bg-green-100 text-green-800';
      case 'Negotiation': return 'bg-blue-100 text-blue-800';
      case 'Proposal': return 'bg-yellow-100 text-yellow-800';
      case 'Qualification': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
        <p className="text-blue-100 text-lg">Here's what's happening with your CRM today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Contacts</p>
            <p className="text-2xl font-bold text-gray-900">{data.stats.totalContacts.toLocaleString()}</p>
            <p className="text-xs text-green-600 mt-1">+12% from last month</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Active Leads</p>
            <p className="text-2xl font-bold text-gray-900">{data.stats.totalLeads}</p>
            <p className="text-xs text-green-600 mt-1">+8% from last month</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Open Deals</p>
            <p className="text-2xl font-bold text-gray-900">{data.stats.totalDeals}</p>
            <p className="text-xs text-green-600 mt-1">+15% from last month</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
              <CheckCircle className="w-6 h-6 text-orange-600" />
            </div>
            <ArrowDownRight className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Pending Tasks</p>
            <p className="text-2xl font-bold text-gray-900">{data.stats.totalTasks}</p>
            <p className="text-xs text-red-600 mt-1">-3% from last month</p>
          </div>
        </div>
      </div>

      {/* Recent Activities and Top Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activities</h2>
            <p className="text-sm text-gray-600 mt-1">Latest updates from your CRM</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Deals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Top Deals</h2>
            <p className="text-sm text-gray-600 mt-1">Your highest value opportunities</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.topDeals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{deal.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{deal.value}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(deal.stage)}`}>
                    {deal.stage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
            <Users className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-700">Add Contact</span>
          </button>
          <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 group">
            <Target className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-700">Create Lead</span>
          </button>
          <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group">
            <DollarSign className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-700">New Deal</span>
          </button>
          <button className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 group">
            <CheckCircle className="w-8 h-8 text-orange-600 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium text-gray-700">Add Task</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 